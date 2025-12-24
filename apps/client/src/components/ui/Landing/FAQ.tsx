'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
    {
        question: "How is Rank Orbit different from Ahrefs or SEMrush?",
        answer: "Rank Orbit focuses on providing AI-powered, actionable insights rather than just raw data. We use advanced LLMs to explain *why* an issue matters and exactly *how* to fix it, making it perfect for developers and business owners."
    },
    {
        question: "Do I need to install anything on my website?",
        answer: "No installation required! Rank Orbit runs entirely in the cloud. You simply provide your URL, and our crawlers analyze your site externally, just like a search engine would."
    },
    {
        question: "Can I use Rank Orbit for client reporting?",
        answer: "Absolutely. Our Pro and Enterprise plans include white-label reporting, allowing you to generate branded PDF reports to share directly with your clients."
    },
    {
        question: "Is there a free trial?",
        answer: "Yes, our Starter plan is completely free forever. It includes 5 audits per month so you can test the waters. We also offer a 14-day free trial for our Pro plan."
    },
    {
        question: "How often should I audit my site?",
        answer: "We recommend a comprehensive audit at least once a month, or whenever you make significant changes to your website's content or structure."
    }
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="py-24 bg-gray-50 dark:bg-black relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1/3 h-full bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />
             <div className="absolute bottom-0 right-0 w-1/3 h-1/2 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[128px] pointer-events-none" />

            <div className="w-full max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        Have a question? We're here to help.
                    </p>
                </div>

                <div className="max-w-3xl mx-auto space-y-4">
                    {faqs.map((faq, index) => (
                        <div 
                            key={index} 
                            className="bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm hover:border-indigo-500/30 transition-colors"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group"
                            >
                                <span className="font-semibold text-gray-900 dark:text-white text-lg pr-8 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{faq.question}</span>
                                {openIndex === index ? (
                                    <Minus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                                )}
                            </button>
                            <AnimatePresence>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                    >
                                        <div className="px-6 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-white/5 pt-4">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
