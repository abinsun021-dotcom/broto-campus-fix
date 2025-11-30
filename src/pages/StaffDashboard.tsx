import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, LogOut, Clock, CheckCircle2, AlertCircle, Filter } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import ComplaintCard from "@/components/ComplaintCard";
import DashboardFooter from "@/components/DashboardFooter";
import brotoHelpLogo from "@/assets/broto-help-logo.png";

export default function StaffDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [updateNote, setUpdateNote] = useState("");
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

    if (roleData?.role !== "staff" && roleData?.role !== "admin") {
      navigate(`/${roleData?.role || "auth"}`);
      return;
    }

    setUser(user);
    fetchComplaints();
  };

  const fetchComplaints = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("complaints")
      .select("*, profiles!complaints_reporter_id_fkey(full_name)")
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

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("complaints")
        .update({ status: newStatus as any })
        .eq("id", complaintId);

      if (error) throw error;

      if (updateNote.trim()) {
        await supabase.from("complaint_events").insert({
          complaint_id: complaintId,
          event_type: "comment",
          comment: updateNote,
          created_by: user?.id,
        });
        setUpdateNote("");
      }

      toast({
        title: "Success",
        description: "Complaint status updated successfully",
      });

      fetchComplaints();
      setSelectedComplaint(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
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

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === "all") return true;
    return c.status === statusFilter;
  });

  const stats = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === "open").length,
    inProgress: complaints.filter((c) => c.status === "in_progress").length,
    resolved: complaints.filter((c) => c.status === "resolved" || c.status === "closed").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={brotoHelpLogo} 
              alt="Broto-Help 24x7 Logo" 
              className="h-10 w-auto"
            />
            <div>
              <p className="text-sm text-muted-foreground">Staff Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
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
            <h2 className="text-2xl font-bold mb-1">All Complaints</h2>
            <p className="text-muted-foreground">Review and manage student complaints</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredComplaints.length === 0 ? (
          <Card className="shadow-elegant border-border/50">
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No complaints found</h3>
              <p className="text-muted-foreground">
                {statusFilter === "all" 
                  ? "There are no complaints to display"
                  : `No complaints with status: ${statusFilter}`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredComplaints.map((complaint) => (
              <div key={complaint.id}>
                <div
                  onClick={() => setSelectedComplaint(
                    selectedComplaint?.id === complaint.id ? null : complaint
                  )}
                  className="cursor-pointer"
                >
                  <ComplaintCard
                    complaint={complaint}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                  />
                </div>
                
                {selectedComplaint?.id === complaint.id && (
                  <Card className="mt-4 border-primary/20 shadow-lg">
                    <CardHeader>
                      <CardTitle>Update Complaint Status</CardTitle>
                      <CardDescription>
                        Reported by: {complaint.profiles?.full_name || "Unknown"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>New Status</Label>
                        <Select
                          defaultValue={complaint.status}
                          onValueChange={(value) => handleStatusUpdate(complaint.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Add Note (optional)</Label>
                        <Textarea
                          placeholder="Add a note about this update..."
                          value={updateNote}
                          onChange={(e) => setUpdateNote(e.target.value)}
                          rows={3}
                        />
                      </div>
                      
                      <Button
                        variant="outline"
                        onClick={() => setSelectedComplaint(null)}
                      >
                        Close
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <DashboardFooter />
    </div>
  );
}
