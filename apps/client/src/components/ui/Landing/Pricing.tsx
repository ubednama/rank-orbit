'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const plans = [
    {
        name: 'Starter',
        price: 'Free',
        description: 'Perfect for individuals and hobbyists.',
        features: [
            '5 SEO Audits / month',
            'Basic Lighthouse Analysis',
            'AI-Powered Summary',
            'PDF Export',
        ],
        notIncluded: [
            'Historical Data',
            'Competitor Analysis',
            'API Access',
        ],
        cta: 'Get Started',
        popular: false,
    },
    {
        name: 'Pro',
        price: '$29',
        period: '/month',
        description: 'For professionals and growing agencies.',
        features: [
            '50 SEO Audits / month',
            'Advanced AI Insights',
            'Historical Performance Tracking',
            'Priority Support',
            'API Access',
        ],
        notIncluded: [
            'White-label Reports',
        ],
        cta: 'Coming Soon',
        popular: true,
        disabled: true // Coming soon
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        description: 'For large teams and high-volume needs.',
        features: [
            'Unlimited Audits',
            'Custom Integrations',
            'White-label Reports',
            'Dedicated Account Manager',
            'SLA Support',
        ],
        notIncluded: [],
        cta: 'Contact Sales',
        popular: false,
        disabled: true
    }
];

export default function Pricing() {
    return (
        <section id="pricing" className="py-24 relative overflow-hidden bg-gray-50 dark:bg-black transition-colors duration-300">
            {/* Background Gradients */}
            <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-purple-500/10 dark:bg-purple-500/10 rounded-full blur-[128px]" />
            <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-indigo-500/10 dark:bg-indigo-500/10 rounded-full blur-[128px]" />

            <div className="w-full max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                        Simple, transparent pricing
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        Start for free, upgrade as you grow. No hidden fees.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative p-8 rounded-2xl border backdrop-blur-sm flex flex-col ${plan.popular
                                ? 'bg-white dark:bg-white/10 border-indigo-500/50 shadow-2xl shadow-indigo-500/10'
                                : 'bg-white/50 dark:bg-white/5 border-gray-200 dark:border-white/10'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{plan.description}</p>
                                <div className="flex items-baseline">
                                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                                    {plan.period && <span className="text-gray-500 ml-1">{plan.period}</span>}
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start">
                                        <Check className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mr-3 shrink-0" />
                                        <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                                    </li>
                                ))}
                                {plan.notIncluded.map((feature, i) => (
                                    <li key={i} className="flex items-start opacity-50">
                                        <X className="w-5 h-5 text-gray-400 dark:text-gray-600 mr-3 shrink-0" />
                                        <span className="text-gray-500 dark:text-gray-500 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                disabled={plan.disabled}
                                onClick={async () => {
                                    if (plan.name === 'Pro') {
                                        try {
                                            // Get token from Clerk
                                            const res = await fetch('/api/subscriptions/checkout', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ priceId: 'price_1Qd...' }) // Replace with env or real ID
                                            });
                                            const data = await res.json();
                                            if (data.url) window.location.href = data.url;
                                        } catch (e) {
                                            console.error('Checkout failed', e);
                                        }
                                    }
                                }}
                                className={`w-full py-3 rounded-xl font-medium transition-all ${plan.popular
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-70 disabled:hover:bg-gray-900'
                                    : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-gray-100'
                                    }`}
                            >
                                {plan.cta}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
