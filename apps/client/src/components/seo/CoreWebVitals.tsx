import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Timer, LayoutPanelLeft, Clock, Accessibility, Gauge, Activity } from "lucide-react";
import { LighthouseMetrics } from "@shared/types";
import CoreWebVitalsSkeleton from "@/components/loading/CoreWebVitalsSkeleton";

interface CoreWebVitalsProps {
  metrics?: LighthouseMetrics;
  isLoading?: boolean;
}

function getStatus(key: keyof LighthouseMetrics, value: string | number): string {
  if (value === "N/A" || value === undefined) return "Unknown";

  const num = typeof value === "string" ? parseFloat(value) : value;

  // 0-100 Scores
  if (key === "accessibility_score") {
    if (num >= 90) return "Excellent";
    if (num >= 50) return "Moderate";
    return "Poor";
  }

  // Web Vitals
  if (key === "lcp") {
    // units: s
    if (num <= 2.5) return "Good";
    if (num <= 4.0) return "Needs Work";
    return "Poor";
  }

  if (key === "cls") {
    // unitless
    if (num <= 0.1) return "Good";
    if (num <= 0.25) return "Needs Work";
    return "Poor";
  }

  if (key === "fcp") {
    // units: s
    if (num <= 1.8) return "Good";
    if (num <= 3.0) return "Needs Work";
    return "Poor";
  }

  if (key === "speed_index") {
    // units: s
    if (num <= 3.4) return "Good";
    if (num <= 5.8) return "Needs Work";
    return "Poor";
  }

  if (key === "tbt") {
    // units: ms
    if (num <= 200) return "Good";
    if (num <= 600) return "Needs Work";
    return "Poor";
  }

  return "Unknown";
}

function MetricCard({
  title,
  icon: Icon,
  metric,
  className,
}: {
  title: string;
  icon: React.ElementType;
  metric?: { value: string | number; status: string };
  className?: string;
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
    <Card
      className={cn(
        "bg-white/40 dark:bg-white/5 backdrop-blur-md border-gray-200/50 dark:border-white/10 hover:border-indigo-500/30 transition-colors",
        className,
      )}
    >
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

export default function CoreWebVitals({ metrics, isLoading }: CoreWebVitalsProps) {
  if (isLoading) {
    return <CoreWebVitalsSkeleton />;
  }

  if (!metrics) return null;

  return (
    <>
      <MetricCard
        title="Accessibility"
        icon={Accessibility}
        metric={{
          value: metrics.accessibility_score,
          status: getStatus("accessibility_score", metrics.accessibility_score),
        }}
        className="col-span-4 md:col-span-3"
      />
      <MetricCard
        title="Largest Contentful Paint"
        icon={Timer}
        metric={{ value: metrics.lcp, status: getStatus("lcp", metrics.lcp) }}
        className="col-span-4 md:col-span-3"
      />
      <MetricCard
        title="Cumulative Layout Shift"
        icon={LayoutPanelLeft}
        metric={{ value: metrics.cls, status: getStatus("cls", metrics.cls) }}
        className="col-span-3 md:col-span-3"
      />
      <MetricCard
        title="Total Blocking Time"
        icon={Clock}
        metric={{ value: metrics.tbt, status: getStatus("tbt", metrics.tbt) }}
        className="col-span-3 md:col-span-3"
      />
      <MetricCard
        title="First Contentful Paint"
        icon={Gauge}
        metric={{ value: metrics.fcp, status: getStatus("fcp", metrics.fcp) }}
        className="col-span-3 md:col-span-3"
      />
      <MetricCard
        title="Speed Index"
        icon={Activity}
        metric={{
          value: metrics.speed_index,
          status: getStatus("speed_index", metrics.speed_index),
        }}
        className="col-span-3 md:col-span-3"
      />
    </>
  );
}
