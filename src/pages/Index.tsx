import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Shield, Users, Clock, CheckCircle2, BarChart3 } from "lucide-react";
import brotoHelpLogo from "@/assets/broto-help-logo.png";

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData?.role) {
        navigate(`/${roleData.role}`);
      }
    }
  };

  const features = [
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Submit Complaints",
      description: "Easily report issues with detailed descriptions and attachments",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Track Progress",
      description: "Real-time updates on your complaint status from submission to resolution",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Private",
      description: "Your data is protected with enterprise-grade security",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Staff Management",
      description: "Efficient complaint handling and assignment system for staff",
    },
    {
      icon: <CheckCircle2 className="w-6 h-6" />,
      title: "Resolution Timeline",
      description: "Complete history of actions taken on each complaint",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Analytics",
      description: "Insights and reports on complaint trends and resolution times",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={brotoHelpLogo} 
              alt="Broto-Help 24x7 Logo" 
              className="h-10 w-auto"
            />
            <span className="font-bold text-xl text-foreground">Broto-Help 24x7</span>
          </div>
          <Button
            onClick={() => navigate("/auth")}
            className="gradient-primary border-0 transition-smooth hover:opacity-90"
          >
            Get Started
          </Button>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-6 animate-in fade-in slide-in-from-top-4 duration-1000">
              <img 
                src={brotoHelpLogo} 
                alt="Broto-Help 24x7 Logo" 
                className="h-20 w-auto"
              />
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 animate-in fade-in slide-in-from-top-6 duration-1000 delay-100">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Broto-Help 24x7</span>
              <span className="block text-foreground mt-2">
                Brototype Students Complaint System
              </span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-8 duration-1000 delay-200">
              Broto-Help 24x7 provides a structured, trackable, and transparent process for handling
              student complaints at Brototype. Submit, track, and resolve issues efficiently.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-top-10 duration-1000 delay-300">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="gradient-primary border-0 text-lg px-8 py-6 transition-smooth hover:opacity-90"
              >
                Sign Up Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 py-6 transition-smooth"
              >
                Sign In
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Powerful Features</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage complaints effectively from submission to resolution
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-card border border-border/50 shadow-elegant transition-smooth hover:shadow-xl hover:-translate-y-1"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 text-white">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center gradient-card rounded-3xl p-12 shadow-xl border border-border/50">
            <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-muted-foreground mb-8 text-lg">
              Join Broto-Help 24x7 today and experience efficient complaint management
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="gradient-primary border-0 text-lg px-8 py-6 transition-smooth hover:opacity-90"
            >
              Create Your Account
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 Broto-Help 24x7. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}