'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Search, Zap, Shield, BarChart } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Hero() {
    const [url, setUrl] = useState('');
    const router = useRouter();

    const handleAnalyze = (e: React.FormEvent) => {
        e.preventDefault();
        if (url) {
            // Redirect to dashboard with query param or handled state
            // For now, let's assume dashboard handles ?url=...
            router.push(`/dashboard?url=${encodeURIComponent(url)}`);
        }
    };

    return (
        <section className="relative min-h-screen flex flex-col justify-center items-center pt-20 overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-[128px] pointer-events-none" />

            <div className="w-full max-w-7xl mx-auto px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="inline-flex items-center space-x-2 bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-md shadow-sm">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Rank Orbit v2.0 Now Live</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
                        Master Your SEO <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                            With AI Precision
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
                        Instant, automated SEO audits powered by advanced AI. Uncover hidden opportunities, optimize performance, and rank higher.
                    </p>

                    <form onSubmit={handleAnalyze} className="max-w-xl mx-auto relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-30 dark:opacity-70 group-hover:opacity-60 dark:group-hover:opacity-100 blur transition duration-200" />
                        <div className="relative flex items-center bg-white dark:bg-black rounded-full p-2 border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-none">
                            <Search className="w-5 h-5 text-gray-400 ml-4" />
                            <input
                                type="url"
                                placeholder="Enter your website URL (e.g. https://example.com)"
                                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 px-4 py-2 outline-none"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                required
                            />
                            <button
                                type="submit"
                                className="bg-gray-900 dark:bg-white text-white dark:text-black rounded-full px-6 py-3 font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center space-x-2"
                            >
                                <span>Audit</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </form>

                    {/* Stats / Trust Badges */}
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto text-gray-500 text-sm">
                        <div className="flex items-center justify-center space-x-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span>Lightning Fast Analysis</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                            <Shield className="w-4 h-4 text-green-400" />
                            <span>Enterprise-grade Security</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                            <BarChart className="w-4 h-4 text-blue-400" />
                            <span>Actionable Insights</span>
                        </div>
                    </div>

                </motion.div>
            </div>
        </section>
    );
}
