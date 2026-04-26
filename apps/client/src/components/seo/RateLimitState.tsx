import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";

export function RateLimitState() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pt-24 min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-lg">
        <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-6 ring-8 ring-orange-50 dark:ring-orange-900/10">
          <Lock className="w-10 h-10 text-orange-600 dark:text-orange-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Limit Reached</h2>
          <p className="text-muted-foreground text-lg">
            You've reached your free audit limit for this month. Sign up to unlock more audits and
            access advanced features.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="w-full sm:w-auto"
          >
            Go Home
          </Button>
          <Button
            onClick={() => (window.location.href = "/api/auth/login")}
            className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white border-0"
          >
            Sign Up Free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
