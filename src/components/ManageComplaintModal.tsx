import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, CheckCircle, XCircle, User, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ManageComplaintModalProps {
  complaint: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userRole: "student" | "staff" | "admin";
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open", icon: AlertCircle },
  { value: "in_progress", label: "In Progress", icon: Clock },
  { value: "resolved", label: "Resolved", icon: CheckCircle },
  { value: "closed", label: "Closed", icon: XCircle },
];

export default function ManageComplaintModal({
  complaint,
  open,
  onClose,
  onSuccess,
  userRole,
}: ManageComplaintModalProps) {
  const [status, setStatus] = useState(complaint.status);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Students can only change to "closed" (or "resolved" if allowed)
  const allowedStatuses = userRole === "student" 
    ? ["closed", "resolved"] 
    : STATUS_OPTIONS.map(s => s.value);

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case "open": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "in_progress": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "resolved": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "closed": return "bg-muted text-muted-foreground border-border";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleSave = async () => {
    if (status === complaint.status && !note.trim()) {
      toast({
        title: "No changes",
        description: "Please change the status or add a note",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        status: status as "open" | "in_progress" | "resolved" | "closed",
      };

      // Add resolution note if provided
      if (note.trim()) {
        updateData.resolution_note = note.trim();
      }

      const { error } = await supabase
        .from("complaints")
        .update(updateData)
        .eq("id", complaint.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Complaint status updated to ${status.replace("_", " ")}`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating complaint:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update complaint",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Complaint</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Complaint Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium mb-1">{complaint.title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">{complaint.description}</p>
          </div>

          {/* Resolution Info (if resolved) */}
          {complaint.resolved_at && (
            <div className="bg-green-500/5 border border-green-500/20 p-3 rounded-lg space-y-2">
              <h4 className="text-sm font-medium text-green-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Resolution Details
              </h4>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>Resolved by: {complaint.resolved_by || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(complaint.resolved_at), "MMM dd, yyyy HH:mm")}</span>
                </div>
              </div>
              {complaint.resolution_note && (
                <p className="text-sm bg-background/50 p-2 rounded">
                  {complaint.resolution_note}
                </p>
              )}
            </div>
          )}

          {/* Current Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current Status:</span>
            <Badge className={getStatusColor(complaint.status)} variant="secondary">
              {complaint.status.replace("_", " ")}
            </Badge>
          </div>

          {/* Status Select */}
          <div className="space-y-2">
            <Label htmlFor="status">Change Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isAllowed = allowedStatuses.includes(option.value);
                  return (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={!isAllowed}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{option.label}</span>
                        {!isAllowed && <span className="text-xs text-muted-foreground">(Admin only)</span>}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {userRole === "student" && (
              <p className="text-xs text-muted-foreground">
                As a student, you can mark your complaint as "Resolved" or "Closed"
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Resolution Note (Optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this status change..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}