"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, LayoutPanelLeft, Clock } from "lucide-react";
import { LighthouseMetrics } from "@shared/types";
import CoreWebVitalsSkeleton from "@/components/loading/CoreWebVitalsSkeleton";

interface CoreWebVitalsProps {
  data?: LighthouseMetrics;
  isLoading?: boolean;
}

// No data card showing placeholder message
function NoDataCard({
  title,
  icon: Icon,
  target,
}: {
  title: string;
  icon: React.ElementType;
  target: string;
}) {
  return (
    <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-gray-200/50 dark:border-white/10 transition-colors">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
          <Icon className="w-4 h-4 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-400 dark:text-gray-600">—</div>
        <Badge variant="secondary" className="mt-2 opacity-60">
          {target}
        </Badge>
      </CardContent>
    </Card>
  );
}

export default function CoreWebVitals({ data, isLoading }: CoreWebVitalsProps) {
  // Loading skeleton state
  if (isLoading) {
    return <CoreWebVitalsSkeleton />;
  }

  // No data state - show placeholder cards
  if (!data) {
    return (
      <>
        <NoDataCard title="Largest Contentful Paint" icon={Timer} target="Target: < 2.5s" />
        <NoDataCard title="Cumulative Layout Shift" icon={LayoutPanelLeft} target="Target: < 0.1" />
        <NoDataCard title="Total Blocking Time" icon={Clock} target="Target: < 200ms" />
      </>
    );
  }

  // Data available - show actual values
  return (
    <>
      <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-gray-200/50 dark:border-white/10 hover:border-indigo-500/30 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
            <Timer className="w-4 h-4 mr-2" />
            Largest Contentful Paint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.lcp || "N/A"}</div>
          <Badge
            variant={data.lcp && parseFloat(data.lcp) <= 2.5 ? "outline-solid" : "secondary"}
            className="mt-2"
          >
            Target: &lt; 2.5s
          </Badge>
        </CardContent>
      </Card>
      <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-gray-200/50 dark:border-white/10 hover:border-indigo-500/30 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
            <LayoutPanelLeft className="w-4 h-4 mr-2" />
            Cumulative Layout Shift
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.cls || "N/A"}</div>
          <Badge
            variant={data.cls && parseFloat(data.cls) <= 0.1 ? "outline-solid" : "secondary"}
            className="mt-2"
          >
            Target: &lt; 0.1
          </Badge>
        </CardContent>
      </Card>
      <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-gray-200/50 dark:border-white/10 hover:border-indigo-500/30 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Total Blocking Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.tbt || "N/A"}</div>
          <Badge
            variant={data.tbt && parseInt(data.tbt) <= 200 ? "outline-solid" : "secondary"}
            className="mt-2"
          >
            Target: &lt; 200ms
          </Badge>
        </CardContent>
      </Card>
    </>
  );
}
