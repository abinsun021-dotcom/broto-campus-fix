import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, AlertCircle, Tag, Paperclip, Image, Download, ChevronDown, ChevronUp, Settings, User, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ManageComplaintModal from "./ManageComplaintModal";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
}

interface ComplaintCardProps {
  complaint: any;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  showAttachments?: boolean;
  showManage?: boolean;
  userRole?: "student" | "staff" | "admin";
  onUpdate?: () => void;
}

export default function ComplaintCard({
  complaint,
  getStatusColor,
  getStatusIcon,
  showAttachments = true,
  showManage = false,
  userRole = "student",
  onUpdate,
}: ComplaintCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-warning text-warning-foreground";
      case "medium":
        return "bg-info text-info-foreground";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const fetchAttachments = async () => {
    if (!showAttachments) return;
    
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase
        .from("attachments")
        .select("id, file_name, file_path, file_type, file_size")
        .eq("complaint_id", complaint.id);

      if (error) {
        console.error("Error fetching attachments:", error);
        return;
      }

      setAttachments(data || []);

      // Generate signed URLs for each attachment
      if (data && data.length > 0) {
        const urls: Record<string, string> = {};
        for (const attachment of data) {
          const { data: signedData, error: signError } = await supabase.storage
            .from("complaint-attachments")
            .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry

          if (!signError && signedData) {
            urls[attachment.id] = signedData.signedUrl;
          }
        }
        setSignedUrls(urls);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  useEffect(() => {
    if (expanded && attachments.length === 0) {
      fetchAttachments();
    }
  }, [expanded]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (fileType: string) => fileType.startsWith("image/");

  return (
    <Card className="shadow-elegant border-border/50 transition-smooth hover:shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-2 truncate">{complaint.title}</h3>
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
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Tag className="w-4 h-4" />
            <span>{complaint.category}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(complaint.created_at), "MMM dd, yyyy")}</span>
          </div>
        </div>

        {/* Resolution Info */}
        {complaint.resolved_at && (
          <div className="mt-4 bg-green-500/5 border border-green-500/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Resolved</span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {complaint.resolved_by && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>By: {complaint.resolved_by}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(complaint.resolved_at), "MMM dd, yyyy HH:mm")}</span>
              </div>
            </div>
            {/* Admin-only resolution note */}
            {complaint.resolution_note && (userRole === "admin" || userRole === "staff") && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Admin Note:</p>
                <p className="text-sm text-muted-foreground bg-background/50 p-2 rounded">
                  {complaint.resolution_note}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Manage Button */}
        {showManage && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManageModal(true)}
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Complaint
            </Button>
          </div>
        )}

        {showAttachments && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                View Details & Attachments
              </span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {expanded && (
              <div className="mt-4 space-y-4">
                {/* Full Description */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Full Description</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {complaint.description}
                  </p>
                </div>

                {/* Attachments */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Attachments</h4>
                  {loadingAttachments ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : attachments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No attachments</p>
                  ) : (
                    <div className="grid gap-3">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="bg-muted/50 rounded-lg overflow-hidden"
                        >
                          {isImage(attachment.file_type) && signedUrls[attachment.id] ? (
                            <div className="space-y-2">
                              <img
                                src={signedUrls[attachment.id]}
                                alt={attachment.file_name}
                                className="w-full max-h-64 object-contain bg-background"
                                onError={(e) => {
                                  console.error("Image load error for:", attachment.file_name);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <div className="flex items-center justify-between p-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Image className="w-4 h-4" />
                                  <span className="truncate max-w-[200px]">{attachment.file_name}</span>
                                  <span className="text-muted-foreground">
                                    ({formatFileSize(attachment.file_size)})
                                  </span>
                                </div>
                                <a
                                  href={signedUrls[attachment.id]}
                                  download={attachment.file_name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
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
                                <span className="text-muted-foreground">
                                  ({formatFileSize(attachment.file_size)})
                                </span>
                              </div>
                              {signedUrls[attachment.id] && (
                                <a
                                  href={signedUrls[attachment.id]}
                                  download={attachment.file_name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
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
          </div>
        )}
      </CardContent>

      {/* Manage Modal */}
      {showManage && (
        <ManageComplaintModal
          complaint={complaint}
          open={showManageModal}
          onClose={() => setShowManageModal(false)}
          onSuccess={() => onUpdate?.()}
          userRole={userRole}
        />
      )}
    </Card>
  );
}