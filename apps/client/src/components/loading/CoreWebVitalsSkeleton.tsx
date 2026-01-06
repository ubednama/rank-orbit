import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, LayoutPanelLeft, Clock } from "lucide-react";

// Using internal Card structure for consistency with the main component
function SkeletonCard({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-gray-200/50 dark:border-white/10 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
          <Icon className="w-4 h-4 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-9 w-20 bg-gray-200/60 dark:bg-white/10 rounded-md animate-pulse" />
        <div className="h-5 w-24 bg-gray-200/40 dark:bg-white/5 rounded-full mt-2 animate-pulse" />
      </CardContent>
    </Card>
  );
}

export default function CoreWebVitalsSkeleton() {
  return (
    <>
      <SkeletonCard title="Largest Contentful Paint" icon={Timer} />
      <SkeletonCard title="Cumulative Layout Shift" icon={LayoutPanelLeft} />
      <SkeletonCard title="Total Blocking Time" icon={Clock} />
    </>
  );
}
