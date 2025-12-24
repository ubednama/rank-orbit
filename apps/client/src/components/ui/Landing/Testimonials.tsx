'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

const testimonials = [
    {
        name: "Aisha Khan",
        role: "SEO Specialist @ GrowthHub",
        content: "Rank Orbit is a game changer for our agency. The multilingual support and deep insights have helped us scale our operations across the MENA region.",
        stars: 5,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aisha"
    },
    {
        name: "Wei Zhang",
        role: "Tech Lead @ InnovationLabs",
        content: "I love the developer-first approach. The API documentation is top-notch, and integrating the audit results into our CI/CD pipeline was seamless.",
        stars: 5,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wei"
    },
    {
        name: "Raj Patel",
        role: "Founder @ StartUpIndia",
        content: "As a bootstrap founder, I needed an affordable yet powerful tool. Rank Orbit delivered exactly that. My organic traffic doubled in just 4 months.",
        stars: 5,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Raj"
    },
    {
        name: "Fatima Al-Sayed",
        role: "Content Manager @ DubaiMedia",
        content: "The content gap analysis helped us uncover keywords we never thought of. It's incredibly intuitive and the reporting features are beautiful.",
        stars: 5,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima"
    },
    {
        name: "Liam O'Connor",
        role: "Marketing Director @ TechFlow",
        content: "Finally, an SEO tool that actionable. It doesn't just dump data; it tells you exactly what to fix. Highly recommended for any marketing team.",
        stars: 4,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Liam"
    },
    {
        name: "Chen Wei",
        role: "E-commerce Manager",
        content: "Our product pages instantly ranked higher after implementing the schema suggestions. The ROI on this tool is insane.",
        stars: 5,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chen"
    }
];

export default function Testimonials() {
    // Duplicate for infinite scroll effect
    const allTestimonials = [...testimonials, ...testimonials, ...testimonials];
    const controls = useAnimationControls();
    const [isPaused, setIsPaused] = useState(false);
    
    // Auto scroll logic
    useEffect(() => {
        if (!isPaused) {
            controls.start({
                x: "-50%",
                transition: {
                    duration: 40,
                    ease: "linear",
                    repeat: Infinity,
                }
            });
        } else {
            controls.stop();
        }
    }, [controls, isPaused]);

    return (
        <section className="py-24 bg-white dark:bg-black relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent"></div>
            
            <div className="w-full max-w-7xl mx-auto px-6 relative z-10 mb-12">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                        Loved by thousands of <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Global Creators</span>
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        Empowering comprehensive SEO strategies for everyone, everywhere.
                    </p>
                </div>
            </div>

            {/* Carousel Container */}
            <div 
                className="w-full overflow-hidden relative cursor-grab active:cursor-grabbing"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
            >
                 {/* Gradients for fade effect */}
                 <div className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-white dark:from-black to-transparent z-20 pointer-events-none" />
                 <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white dark:from-black to-transparent z-20 pointer-events-none" />

                <motion.div 
                    className="flex space-x-6 px-6 w-max"
                    animate={controls}
                    drag="x"
                    dragConstraints={{ left: -2000, right: 0 }}
                >
                    {allTestimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            className="w-[300px] md:w-[400px] flex-shrink-0 p-8 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-indigo-500/50 transition-colors select-none"
                            whileHover={{ scale: 1.02, backgroundColor: "var(--hover-bg)" }}
                        >
                            <div className="flex space-x-1 mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`w-5 h-5 ${i < testimonial.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} 
                                    />
                                ))}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 text-lg mb-6 leading-relaxed line-clamp-4">
                                "{testimonial.content}"
                            </p>
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                                     <img src={testimonial.image} alt={testimonial.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
