import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";

interface ErrorStateProps {
  error: string;
  isNetworkError: boolean;
}

export function ErrorState({ error, isNetworkError }: ErrorStateProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pt-24 min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold">
          {isNetworkError ? "Connection Lost" : "Audit Failed"}
        </h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => window.history.back()} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    </div>
  );
}
