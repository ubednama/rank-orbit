'use client';

import { motion } from 'framer-motion';
import { Github, Linkedin, MessageSquare, Send, Twitter } from 'lucide-react';

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-gray-50 dark:bg-black pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
                    
                    {/* Left Column: Developer Info & Founder Bio */}
                    <motion.div 
                         initial={{ opacity: 0, x: -20 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                            Building the Future of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Accessible SEO</span>
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                            Rank Orbit wasn't built by a faceless corporation. It started as a passion project to solve a simple problem: <span className="font-bold text-gray-900 dark:text-white">SEO tools are too complex and expensive.</span> My mission is to democratize search engine optimization for builders, creators, and startups.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Live Chat</h3>
                                    <p className="text-gray-600 dark:text-gray-400 flex items-center">
                                        Coming Soon 
                                        <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                                            Beta
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Founder Section */}
                        <div className="mt-12 p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ubednama</h3>
                                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Engineer. Learning new things.</p>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">
                                "I build tools that I wish I had when I started. Rank Orbit is the culmination of years of experience in full-stack development and growth hacking. Let's connect and build something amazing."
                            </p>
                            
                            <div className="flex space-x-3">
                                <a href="https://github.com/ubednama" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" aria-label="Github">
                                    <Github className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                </a>
                                <a href="https://linkedin.com/in/ubed9" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" aria-label="LinkedIn">
                                    <Linkedin className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                </a>
                                <a href="https://x.com/__ubednama" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" aria-label="X (Twitter)">
                                    <Twitter className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                </a>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-xl shadow-indigo-500/5 backdrop-blur-sm"
                    >
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Send us a message</h2>
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white" placeholder="John" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white" placeholder="Doe" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                <input type="email" className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white" placeholder="john@example.com" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                                <textarea rows={4} className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white resize-none" placeholder="Tell us how we can help..."></textarea>
                            </div>

                            <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-4 rounded-xl flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02]">
                                <span>Send Message</span>
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
