import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, AlertCircle, Tag } from "lucide-react";

interface ComplaintCardProps {
  complaint: any;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
}

export default function ComplaintCard({
  complaint,
  getStatusColor,
  getStatusIcon,
}: ComplaintCardProps) {
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
      </CardContent>
    </Card>
  );
}
