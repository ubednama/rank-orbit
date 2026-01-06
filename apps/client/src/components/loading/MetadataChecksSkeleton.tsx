import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MetadataChecksSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-gray-200/50 dark:border-white/10">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div>
            <Skeleton className="h-3 w-24 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-gray-200/50 dark:border-white/10">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-0 divide-y divide-gray-100 dark:divide-white/5">
          <div className="flex justify-between items-center py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="flex justify-between items-center py-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-8" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
