import { motion } from "framer-motion";

export default function PerformanceScoreSkeleton() {
  return (
    <>
      {/* Score number skeleton */}
      <div className="flex items-baseline space-x-2">
        <motion.div
          className="h-12 w-20 bg-gray-200/60 dark:bg-white/10 rounded-md"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="h-5 w-10 bg-gray-200/40 dark:bg-white/5 rounded-md"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Progress bar skeleton */}
      <div className="mt-4 h-2 w-full bg-gray-200/60 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full w-1/2 bg-gray-300/60 dark:bg-white/20 rounded-full"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </>
  );
}
