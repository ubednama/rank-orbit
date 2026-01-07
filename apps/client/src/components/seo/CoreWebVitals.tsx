import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, LayoutPanelLeft, Clock, Zap, Accessibility, Gauge, Activity } from "lucide-react";
import { TechnicalAnalysis } from "@shared/types";
import CoreWebVitalsSkeleton from "@/components/loading/CoreWebVitalsSkeleton";

interface CoreWebVitalsProps {
  analysis?: TechnicalAnalysis;
  isLoading?: boolean;
}

function MetricCard({
  title,
  icon: Icon,
  metric,
}: {
  title: string;
  icon: React.ElementType;
  metric?: { value: string | number; status: string };
}) {
  const statusColors = {
    Excellent:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    Good: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    "Needs Work":
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    Moderate:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    Poor: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    Critical:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  };

  const status = metric?.status || "Unknown";
  const colorClass =
    statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-700";

  return (
    <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-gray-200/50 dark:border-white/10 hover:border-indigo-500/30 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
          <Icon className="w-4 h-4 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{metric?.value || "—"}</div>
        {metric && (
          <Badge variant="outline" className={`mt-2 ${colorClass} border shadow-none`}>
            {status}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export default function CoreWebVitals({ analysis, isLoading }: CoreWebVitalsProps) {
  if (isLoading) {
    return <CoreWebVitalsSkeleton />;
  }

  // If no analysis (e.g. error or not started), show empty or handled by parent
  // We can show placeholders if analysis is missing but isLoading is false
  if (!analysis) return null;

  return (
    <>
      <MetricCard title="Performance" icon={Zap} metric={analysis.Performance} />
      <MetricCard title="Accessibility" icon={Accessibility} metric={analysis.Accessibility} />
      <MetricCard title="Largest Contentful Paint" icon={Timer} metric={analysis.LCP} />
      <MetricCard title="Cumulative Layout Shift" icon={LayoutPanelLeft} metric={analysis.CLS} />
      <MetricCard title="Total Blocking Time" icon={Clock} metric={analysis.TBT} />
      <MetricCard title="First Contentful Paint" icon={Gauge} metric={analysis.FCP} />
      <MetricCard title="Speed Index" icon={Activity} metric={analysis["Speed Index"]} />
    </>
  );
}
