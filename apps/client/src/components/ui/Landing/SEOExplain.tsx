import { CheckCircle2 } from 'lucide-react';

const features = [
    "Technical SEO Analysis",
    "Content Optimization",
    "Backlink Monitoring",
    "Competitor Analysis",
    "Keyword Research",
    "Mobile Performance"
];

export default function SEOExplain() {
    return (
        <section className="py-24 bg-gray-50 dark:bg-white/5">
            <div className="w-full max-w-7xl mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-indigo-600 dark:from-white dark:to-indigo-400">
                            Complete SEO Intelligence
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                            Rank Orbit goes beyond basic audits. Our AI analyzes thousands of data points to provide actionable insights that actually move the needle. From technical fixes to content strategy, we cover it all.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {features.map((feature, idx) => (
                                <div key={idx} className="flex items-center space-x-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl blur-2xl opacity-20 dark:opacity-30"></div>
                        <div className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl bg-white dark:bg-black/50">
                            {/* Using a placeholder div since we don't have an image file yet, or I can use a screenshot I captured? 
                               Actually I'll use a CSS mockup for now to avoid broken images. */}
                            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-black p-8 flex items-center justify-center">
                                <div className="text-center space-y-4">
                                    <div className="inline-block p-4 rounded-full bg-indigo-500/10 text-indigo-500 mb-4 animate-pulse">
                                        <div className="w-12 h-12 rounded-full border-4 border-current border-t-transparent animate-spin"></div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Analyzing Your Success</h3>
                                    <p className="text-gray-500">AI-Powered Insights in Real-time</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
