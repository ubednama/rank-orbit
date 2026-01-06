import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AIInsightsSectionSkeleton() {
  return (
    <Card className="h-full bg-white/40 dark:bg-white/5 backdrop-blur-md border-indigo-500/20 shadow-xl shadow-indigo-500/5">
      <CardHeader>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Skeleton */}
        <Skeleton className="h-28 w-full rounded-2xl" />

        {/* Summary Skeleton */}
        <Skeleton className="h-32 w-full rounded-2xl" />

        {/* Recommendations Skeleton */}
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}
