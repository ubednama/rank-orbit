import { AlertTriangle, BookOpen, Eye, FileText, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReadabilityStats } from "@shared/types";

interface ReadabilityAnalysisProps {
  stats: ReadabilityStats | null;
}

export function ReadabilityAnalysis({ stats }: ReadabilityAnalysisProps) {
  if (!stats) return null;
  const getDifficulty = (grade: number) => {
    if (grade <= 6)
      return {
        label: "Very Easy",
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-100 dark:bg-green-900/30",
      };
    if (grade <= 8)
      return {
        label: "Standard",
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-900/30",
      };
    if (grade <= 12)
      return {
        label: "Complex",
        color: "text-yellow-600 dark:text-yellow-400",
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
      };
    return {
      label: "Academic",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
    };
  };

  const difficulty = getDifficulty(stats.grade);

  return (
    <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-indigo-500/20 shadow-xl shadow-indigo-500/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100">
          <Eye className="w-5 h-5 text-indigo-500" />
          Content Observability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-indigo-50/50 dark:border-white/5 shadow-sm space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <BookOpen className="w-3 h-3" /> Grade Level
            </div>
            <div className={cn("text-2xl font-bold tracking-tight", difficulty.color)}>
              {stats.grade}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "border-0 font-medium px-2 py-0.5 h-auto text-xs",
                difficulty.bg,
                difficulty.color,
              )}
            >
              {difficulty.label}
            </Badge>
          </div>

          <div className="p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-indigo-50/50 dark:border-white/5 shadow-sm space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <FileText className="w-3 h-3" /> Word Count
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.wordCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">
              ~{stats.avgSentenceLength} words/sentence
            </div>
          </div>
        </div>

        {/* Keyword Density */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-semibold text-sm text-gray-700 dark:text-gray-300">
            <Layers className="w-4 h-4 text-indigo-500" />
            Keyword Density Map
          </h4>
          <div className="p-2 rounded-xl bg-white/60 dark:bg-white/5 border border-indigo-50/50 dark:border-white/5 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {stats.density.map((k) => (
                <Badge
                  key={k.word}
                  variant="secondary"
                  className={cn(
                    "px-2.5 py-1 text-xs font-normal border transition-colors cursor-default",
                    k.percent > 4
                      ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50"
                      : "bg-indigo-50/50 hover:bg-indigo-50 text-indigo-900 border-indigo-100/50 dark:bg-white/5 dark:text-indigo-200 dark:border-white/10",
                  )}
                >
                  {k.word}
                  <span className="ml-1.5 opacity-60 text-[10px]">{k.percent.toFixed(1)}%</span>
                  {k.percent > 4 && <AlertTriangle className="w-3 h-3 ml-1 text-red-500 inline" />}
                </Badge>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-lg">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
              <p>
                Keywords appearing more than 4% may signal "keyword stuffing" to search engines. Aim
                for natural variety.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
