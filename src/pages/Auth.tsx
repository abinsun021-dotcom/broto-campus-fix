import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, FileText } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const { data: rolesData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .single();

          const role = rolesData?.role || "student";
          navigate(`/${role}`);
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "You can now log in with your credentials.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">BrotoCare</h1>
          <p className="text-muted-foreground">
            Student complaint management system
          </p>
        </div>

        <Card className="shadow-elegant border-border/50">
          <CardHeader>
            <CardTitle>{isLogin ? "Welcome back" : "Create account"}</CardTitle>
            <CardDescription>
              {isLogin
                ? "Sign in to your account to continue"
                : "Sign up to submit and track complaints"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="transition-smooth"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="transition-smooth"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="transition-smooth"
                />
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary border-0 transition-smooth hover:opacity-90"
                disabled={loading}
              >
                {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
              </Button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline transition-smooth"
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-info/10 border border-info/20 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-info shrink-0 mt-0.5" />
          <div className="text-sm text-info-foreground">
            <p className="font-medium mb-1">For testing purposes:</p>
            <p>Email confirmation is disabled. You can sign in immediately after creating an account.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
