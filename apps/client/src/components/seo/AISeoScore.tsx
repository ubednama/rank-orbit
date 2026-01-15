import { AIAnalysis } from "@shared/types";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

interface AISeoScoreProps {
  data: AIAnalysis;
}

export default function AISeoScore({ data }: AISeoScoreProps) {
  if (data.seo_score === undefined) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="bg-linear-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/20 p-0 sm:p-6 rounded-2xl sm:border border-indigo-100/50 dark:border-white/5">
      <div className="block md:flex md:justify-between md:items-center md:flex-row-reverse">
        <div className="float-right ml-4 mb-2 md:float-none md:ml-0 md:mb-0 text-right shrink-0">
          <div className={`text-3xl font-bold ${getScoreColor(data.seo_score)}`}>
            {data.seo_score}/100
          </div>
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
            AI SEO Score
          </span>
        </div>
        {data.score_rationale && (
          <div className="text-sm text-muted-foreground max-w-xl mt-1 leading-snug">
            <MarkdownRenderer>{data.score_rationale}</MarkdownRenderer>
          </div>
        )}
      </div>
    </div>
  );
}
