import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, LogOut, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import ComplaintForm from "@/components/ComplaintForm";
import ComplaintCard from "@/components/ComplaintCard";

export default function StudentDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "student") {
      navigate(`/${roleData?.role || "auth"}`);
      return;
    }

    setUser(user);
    fetchComplaints(user.id);
  };

  const fetchComplaints = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("reporter_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch complaints",
        variant: "destructive",
      });
    } else {
      setComplaints(data || []);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-info text-info-foreground";
      case "in_progress":
        return "bg-warning text-warning-foreground";
      case "resolved":
        return "bg-success text-success-foreground";
      case "closed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="w-4 h-4" />;
      case "in_progress":
        return <AlertCircle className="w-4 h-4" />;
      case "resolved":
      case "closed":
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const stats = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === "open").length,
    inProgress: complaints.filter((c) => c.status === "in_progress").length,
    resolved: complaints.filter((c) => c.status === "resolved" || c.status === "closed").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">BrotoCare</h1>
              <p className="text-sm text-muted-foreground">Student Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardDescription>Total Complaints</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/50 border-info/30">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-info" />
                Open
              </CardDescription>
              <CardTitle className="text-3xl text-info">{stats.open}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/50 border-warning/30">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                In Progress
              </CardDescription>
              <CardTitle className="text-3xl text-warning">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/50 border-success/30">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Resolved
              </CardDescription>
              <CardTitle className="text-3xl text-success">{stats.resolved}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">My Complaints</h2>
            <p className="text-muted-foreground">Track and manage your submitted issues</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gradient-primary border-0 transition-smooth hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Complaint
          </Button>
        </div>

        {showForm && (
          <ComplaintForm
            onSuccess={() => {
              setShowForm(false);
              if (user) fetchComplaints(user.id);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : complaints.length === 0 ? (
          <Card className="shadow-elegant border-border/50">
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No complaints yet</h3>
              <p className="text-muted-foreground mb-6">
                Submit your first complaint to get started
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="gradient-primary border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Submit Complaint
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
