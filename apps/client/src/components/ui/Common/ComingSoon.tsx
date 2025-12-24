'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';

interface ComingSoonProps {
    title: string;
    description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-black px-4 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full"
            >
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-8 text-indigo-600 dark:text-indigo-400">
                    <Construction className="w-10 h-10" />
                </div>

                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    {title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                    {description}
                </p>

                <Link
                    href="/"
                    className="inline-flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Home</span>
                </Link>
            </motion.div>
        </div>
    );
}
