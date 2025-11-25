import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";

interface ComplaintFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const categories = [
  "Infrastructure",
  "Facilities",
  "Equipment",
  "Safety",
  "Maintenance",
  "Cleanliness",
  "Other",
];

export default function ComplaintForm({ onSuccess, onCancel }: ComplaintFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create complaint
      const { data: complaint, error: complaintError } = await supabase
        .from("complaints")
        .insert({
          title,
          description,
          category,
          priority,
          reporter_id: user.id,
        })
        .select()
        .single();

      if (complaintError) throw complaintError;

      // Upload files if any
      if (files.length > 0 && complaint) {
        for (const file of files) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${user.id}/${complaint.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("complaint-attachments")
            .upload(fileName, file);

          if (uploadError) {
            console.error("File upload error:", uploadError);
            continue;
          }

          await supabase.from("attachments").insert({
            complaint_id: complaint.id,
            file_name: file.name,
            file_path: fileName,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.id,
          });
        }
      }

      toast({
        title: "Success!",
        description: "Your complaint has been submitted successfully.",
      });

      onSuccess();
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
    <Card className="mb-6 shadow-elegant border-border/50">
      <CardHeader>
        <CardTitle>Submit New Complaint</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="transition-smooth"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Detailed explanation of the complaint..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="transition-smooth"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="transition-smooth">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)} required>
                <SelectTrigger className="transition-smooth">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="files">Attachments (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="files"
                type="file"
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("files")?.click()}
                className="transition-smooth"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
              <span className="text-sm text-muted-foreground">
                {files.length} file(s) selected
              </span>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="gradient-primary border-0 transition-smooth hover:opacity-90"
            >
              {loading ? "Submitting..." : "Submit Complaint"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
