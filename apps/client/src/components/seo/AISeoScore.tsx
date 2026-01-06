import { AIAnalysis } from '@shared/types';

interface AISeoScoreProps {
    data: AIAnalysis;
}

export default function AISeoScore({ data }: AISeoScoreProps) {
    if (data.seo_score === undefined) return null;

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 50) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-2xl border border-indigo-100/50 dark:border-white/5">
            <div className="flex justify-between items-center">
                {data.score_rationale && (
                    <p className="text-sm text-muted-foreground max-w-xl mt-1 leading-snug">
                        {data.score_rationale}
                    </p>
                )}
                <div className="text-right">
                    <div className={`text-3xl font-bold ${getScoreColor(data.seo_score)}`}>
                        {data.seo_score}/100
                    </div>
                    <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">AI SEO Score</span>
                </div>
            </div>
        </div>
    );
}
