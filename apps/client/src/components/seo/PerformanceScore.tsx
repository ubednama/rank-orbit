"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";
import { cn } from "@/lib/utils";

import PerformanceScoreSkeleton from "@/components/loading/PerformanceScoreSkeleton";

export default function PerformanceScore({
  score,
  loading,
  className,
}: {
  score: number | undefined;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "md:col-span-1 border-indigo-500/20 bg-indigo-500/5 backdrop-blur-md relative overflow-hidden group",
        className,
      )}
    >
      <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="p-2 sm:pb-2">
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
              <span
                className={`text-2xl md:text-6xl font-black ${
                  (score || 0) >= 90
                    ? "text-green-600 dark:text-green-500"
                    : (score || 0) >= 50
                      ? "text-yellow-600 dark:text-yellow-500"
                      : "text-red-600 dark:text-red-500"
                }`}
              >
                {Math.round(score || 0)}
              </span>
              <span className="text-base sm:text-lg text-muted-foreground font-medium">/ 100</span>
            </div>
            <div className="mt-4 h-2 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  (score || 0) >= 90
                    ? "bg-green-500"
                    : (score || 0) >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${Math.round(score || 0)}%` }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
