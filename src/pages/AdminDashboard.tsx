import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, LogOut, AlertCircle, Clock, CheckCircle, XCircle, Filter, ChevronDown, ChevronUp, Calendar, Tag, Paperclip, Image, Download } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import DashboardFooter from "@/components/DashboardFooter";
import { format } from "date-fns";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [expandedComplaint, setExpandedComplaint] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [updateNote, setUpdateNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
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
      .maybeSingle();

    if (roleData?.role !== "admin") {
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
      .select("*")
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

  const fetchAttachments = async (complaintId: string) => {
    const { data, error } = await supabase
      .from("attachments")
      .select("id, file_name, file_path, file_type, file_size")
      .eq("complaint_id", complaintId);

    if (error) {
      console.error("Error fetching attachments:", error);
      return;
    }

    setAttachments(prev => ({ ...prev, [complaintId]: data || [] }));

    // Generate signed URLs
    if (data && data.length > 0) {
      for (const attachment of data) {
        const { data: signedData, error: signError } = await supabase.storage
          .from("complaint-attachments")
          .createSignedUrl(attachment.file_path, 3600);

        if (!signError && signedData) {
          setSignedUrls(prev => ({ ...prev, [attachment.id]: signedData.signedUrl }));
        }
      }
    }
  };

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    setUpdatingStatus(complaintId);
    try {
      const updateData: any = { 
        status: newStatus as "open" | "in_progress" | "resolved" | "closed" 
      };
      
      // Include resolution note if provided
      if (updateNote.trim()) {
        updateData.resolution_note = updateNote.trim();
      }

      const { error: updateError } = await supabase
        .from("complaints")
        .update(updateData)
        .eq("id", complaintId);

      if (updateError) throw updateError;

      // Add event/note if provided
      if (updateNote.trim()) {
        await supabase.from("complaint_events").insert({
          complaint_id: complaintId,
          event_type: "status_change",
          comment: updateNote,
          new_value: newStatus,
          created_by: user?.id,
        });
      }

      toast({
        title: "Success",
        description: `Status updated to ${newStatus.replace("_", " ")}`,
      });

      setUpdateNote("");
      fetchComplaints();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "in_progress": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "resolved": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "closed": return "bg-muted text-muted-foreground border-border";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertCircle className="w-4 h-4" />;
      case "in_progress": return <Clock className="w-4 h-4" />;
      case "resolved": return <CheckCircle className="w-4 h-4" />;
      case "closed": return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-orange-500/10 text-orange-600";
      case "medium": return "bg-blue-500/10 text-blue-600";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const toggleExpanded = (complaintId: string) => {
    if (expandedComplaint === complaintId) {
      setExpandedComplaint(null);
    } else {
      setExpandedComplaint(complaintId);
      if (!attachments[complaintId]) {
        fetchAttachments(complaintId);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (fileType: string) => fileType.startsWith("image/");

  // Get unique categories from complaints
  const categories = [...new Set(complaints.map(c => c.category))];

  // Filter complaints
  const filteredComplaints = complaints.filter(complaint => {
    if (statusFilter !== "all" && complaint.status !== statusFilter) return false;
    if (categoryFilter !== "all" && complaint.category !== categoryFilter) return false;
    if (priorityFilter !== "all" && complaint.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">BrotoCare</h1>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1">All Student Complaints</h2>
          <p className="text-muted-foreground">View and manage all complaints from students</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{complaints.length}</div>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("open")}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{complaints.filter(c => c.status === "open").length}</div>
              <p className="text-sm text-muted-foreground">Open</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("in_progress")}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{complaints.filter(c => c.status === "in_progress").length}</div>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("resolved")}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{complaints.filter(c => c.status === "resolved").length}</div>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              {(statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setCategoryFilter("all");
                    setPriorityFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredComplaints.length} of {complaints.length} complaints
        </p>

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
                {complaints.length === 0 ? "No student complaints have been submitted" : "No complaints match your filters"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredComplaints.map((complaint) => (
              <Card key={complaint.id} className="shadow-elegant border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-2 truncate">{complaint.title}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {complaint.description}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Badge className={getStatusColor(complaint.status)} variant="secondary">
                        <span className="mr-1">{getStatusIcon(complaint.status)}</span>
                        {complaint.status.replace("_", " ")}
                      </Badge>
                      <Badge className={getPriorityColor(complaint.priority)} variant="secondary">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {complaint.priority}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      <span>{complaint.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(complaint.created_at), "MMM dd, yyyy HH:mm")}</span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(complaint.id)}
                    className="w-full justify-between"
                  >
                    <span>Manage Complaint</span>
                    {expandedComplaint === complaint.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>

                  {expandedComplaint === complaint.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Full Description */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Full Description</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {complaint.description}
                        </p>
                      </div>

                      {/* Resolution Info */}
                      {complaint.resolved_at && (
                        <div className="bg-green-500/5 border border-green-500/20 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-green-600 mb-2">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Resolution Details</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            {complaint.resolved_by && (
                              <span>Resolved by: {complaint.resolved_by}</span>
                            )}
                            <span>On: {format(new Date(complaint.resolved_at), "MMM dd, yyyy HH:mm")}</span>
                          </div>
                          {complaint.resolution_note && (
                            <p className="text-sm text-muted-foreground mt-2 bg-background/50 p-2 rounded">
                              {complaint.resolution_note}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Status Update */}
                      <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                        <h4 className="text-sm font-medium">Update Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {["open", "in_progress", "resolved", "closed"].map((status) => (
                            <Button
                              key={status}
                              variant={complaint.status === status ? "default" : "outline"}
                              size="sm"
                              disabled={updatingStatus === complaint.id}
                              onClick={() => handleStatusUpdate(complaint.id, status)}
                              className="capitalize"
                            >
                              {getStatusIcon(status)}
                              <span className="ml-1">{status.replace("_", " ")}</span>
                            </Button>
                          ))}
                        </div>
                        <Textarea
                          placeholder="Add a note (optional)..."
                          value={updateNote}
                          onChange={(e) => setUpdateNote(e.target.value)}
                          rows={2}
                          className="mt-2"
                        />
                      </div>

                      {/* Attachments */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Attachments</h4>
                        {!attachments[complaint.id] ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : attachments[complaint.id].length === 0 ? (
                          <p className="text-sm text-muted-foreground">No attachments</p>
                        ) : (
                          <div className="grid gap-3">
                            {attachments[complaint.id].map((attachment) => (
                              <div key={attachment.id} className="bg-muted/50 rounded-lg overflow-hidden">
                                {isImage(attachment.file_type) && signedUrls[attachment.id] ? (
                                  <div className="space-y-2">
                                    <img
                                      src={signedUrls[attachment.id]}
                                      alt={attachment.file_name}
                                      className="w-full max-h-64 object-contain bg-background"
                                    />
                                    <div className="flex items-center justify-between p-2">
                                      <div className="flex items-center gap-2 text-sm">
                                        <Image className="w-4 h-4" />
                                        <span className="truncate max-w-[200px]">{attachment.file_name}</span>
                                        <span className="text-muted-foreground">({formatFileSize(attachment.file_size)})</span>
                                      </div>
                                      <a href={signedUrls[attachment.id]} download={attachment.file_name} target="_blank" rel="noopener noreferrer">
                                        <Button variant="ghost" size="sm">
                                          <Download className="w-4 h-4" />
                                        </Button>
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Paperclip className="w-4 h-4" />
                                      <span className="truncate max-w-[200px]">{attachment.file_name}</span>
                                      <span className="text-muted-foreground">({formatFileSize(attachment.file_size)})</span>
                                    </div>
                                    {signedUrls[attachment.id] && (
                                      <a href={signedUrls[attachment.id]} download={attachment.file_name} target="_blank" rel="noopener noreferrer">
                                        <Button variant="ghost" size="sm">
                                          <Download className="w-4 h-4 mr-1" />
                                          Download
                                        </Button>
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <DashboardFooter />
    </div>
  );
}