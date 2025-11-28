import { Heart } from "lucide-react";

export default function DashboardFooter() {
  return (
    <footer className="border-t bg-card/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Powered by</span>
            <a 
              href="https://brototype.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline transition-colors"
            >
              Brototype
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-destructive fill-destructive" />
            <span>for students</span>
          </div>
          <a 
            href="mailto:support@brototype.com" 
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Need help? Contact Support
          </a>
        </div>
      </div>
    </footer>
  );
}
