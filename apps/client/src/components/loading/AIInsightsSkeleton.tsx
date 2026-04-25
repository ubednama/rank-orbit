import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function AIInsightsSectionSkeleton() {
  return (
    <Card className="h-full bg-white/40 dark:bg-white/5 backdrop-blur-md border-indigo-500/20 shadow-xl shadow-indigo-500/5 overflow-hidden relative">
      {/* Animated gradient shimmer overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <CardHeader className="relative z-10 space-y-3">
        <motion.div
          className="h-8 w-48 bg-gray-200/60 dark:bg-white/10 rounded-md"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.div
          className="h-4 w-64 bg-gray-200/40 dark:bg-white/5 rounded-full"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      </CardHeader>

      <CardContent className="space-y-6 relative z-10">
        {/* Pulsating Score Circle */}
        <motion.div
          className="h-28 w-full bg-gradient-to-br from-indigo-200/40 to-purple-200/40 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-2xl flex items-center justify-center"
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-300/60 to-purple-300/60 dark:from-indigo-400/20 dark:to-purple-400/20"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 3, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        </motion.div>

        {/* Summary Skeleton with wave effect */}
        <motion.div
          className="h-32 w-full bg-gradient-to-br from-gray-200/40 to-gray-300/40 dark:from-white/5 dark:to-white/10 rounded-2xl"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Staggered Recommendations Skeleton */}
        <div className="grid gap-3">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="h-20 w-full bg-gradient-to-r from-gray-200/40 to-gray-300/40 dark:from-white/5 dark:to-white/10 rounded-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: [0.5, 0.8, 0.5],
                x: 0,
              }}
              transition={{
                opacity: {
                  duration: 1.5,
                  repeat: Infinity,
                  delay: index * 0.2,
                },
                x: { duration: 0.5, delay: index * 0.15 },
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
