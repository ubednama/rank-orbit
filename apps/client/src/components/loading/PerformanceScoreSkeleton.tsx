import { Skeleton } from "@/components/ui/skeleton";

export default function PerformanceScoreSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline space-x-2">
        <Skeleton className="h-14 w-24" />
        <Skeleton className="h-6 w-12" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}
