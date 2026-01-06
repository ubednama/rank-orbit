"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

import PerformanceScoreSkeleton from "@/components/loading/PerformanceScoreSkeleton";

export default function PerformanceScore({
  score,
  loading,
}: {
  score: number | undefined;
  loading?: boolean;
}) {
  return (
    <Card className="md:col-span-1 border-indigo-500/20 bg-indigo-500/5 backdrop-blur-md relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
          <Award className="w-4 h-4 mr-2 text-indigo-500" />
          Performance Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <PerformanceScoreSkeleton />
        ) : (
          <>
            <div className="flex items-baseline space-x-2">
              <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-600">
                {Math.round(score || 0)}
              </span>
              <span className="text-lg text-muted-foreground font-medium">/ 100</span>
            </div>
            <div className="mt-4 h-2 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-1000"
                style={{ width: `${Math.round(score || 0)}%` }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
