import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";

function SkeletonMetricCard({ delay, className }: { delay: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="h-full bg-white/40 dark:bg-white/5 backdrop-blur-md border-gray-200/50 dark:border-white/10 transition-colors overflow-hidden relative">
        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
            delay: delay * 0.2,
          }}
        />

        {/* Header: icon + title */}
        <CardHeader className="pb-1 p-2 md:pb-2 md:p-6 relative z-10">
          <div className="flex items-start gap-1 md:gap-2">
            <motion.div
              className="w-3 h-3 md:w-4 md:h-4 bg-gray-200/60 dark:bg-white/10 rounded shrink-0 mt-[2px]"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="h-3 md:h-4 w-24 md:w-36 bg-gray-200/60 dark:bg-white/10 rounded-md"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
            />
          </div>
        </CardHeader>

        {/* Content: value (text-xl md:text-3xl equivalent) + badge */}
        <CardContent className="p-2 md:p-6 pt-0 md:pt-0 relative z-10">
          <motion.div
            className="h-7 w-16 md:h-9 md:w-20 bg-gray-200/60 dark:bg-white/10 rounded-md"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="mt-1 md:mt-2 h-4 md:h-5 w-12 md:w-16 bg-gray-200/40 dark:bg-white/5 rounded-full"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function CoreWebVitalsSkeleton() {
  const cols = [
    "col-span-4 md:col-span-3",
    "col-span-4 md:col-span-3",
    "col-span-4 md:col-span-3",
    "col-span-4 md:col-span-3",
    "col-span-4 md:col-span-3",
    "col-span-4 md:col-span-3",
  ];
  return (
    <>
      {cols.map((cls, i) => (
        <SkeletonMetricCard key={i} delay={i * 0.05} className={cls} />
      ))}
    </>
  );
}
