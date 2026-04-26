import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function MetadataChecksSkeleton() {
  return (
    <div className="space-y-6">
      {/* On-Page Metadata Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-indigo-100 dark:border-white/10 overflow-hidden relative shadow-sm">
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />

          <CardHeader className="relative z-10">
            {/* Title: icon + "On-Page Metadata" */}
            <div className="flex items-center space-x-2">
              <motion.div
                className="w-5 h-5 bg-gray-200/60 dark:bg-white/10 rounded"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="h-6 w-36 bg-gray-200/60 dark:bg-white/10 rounded-md"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-5 relative z-10">
            {/* Title Tag field */}
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-200/40 dark:bg-white/5 rounded-full animate-pulse" />
              <motion.div
                className="h-10 w-full bg-gray-200/60 dark:bg-white/10 rounded-md"
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            </div>

            {/* Meta Description field */}
            <div className="space-y-2">
              <div className="h-3 w-36 bg-gray-200/40 dark:bg-white/5 rounded-full animate-pulse" />
              <motion.div
                className="h-20 w-full bg-gray-200/60 dark:bg-white/10 rounded-md"
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            {/* H1 Headings */}
            <div>
              <div className="h-3 w-24 bg-gray-200/40 dark:bg-white/5 rounded-full mb-2 animate-pulse" />
              <div className="flex gap-2">
                {[64, 80].map((width, idx) => (
                  <motion.div
                    key={idx}
                    className="h-6 bg-gray-200/60 dark:bg-white/10 rounded-full"
                    style={{ width }}
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: idx * 0.2,
                    }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Media Check Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-indigo-100 dark:border-white/10 overflow-hidden relative shadow-sm">
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
              delay: 0.3,
            }}
          />

          <CardHeader className="relative z-10">
            {/* Title: icon + "Media Check" */}
            <div className="flex items-center space-x-2">
              <motion.div
                className="w-5 h-5 bg-gray-200/60 dark:bg-white/10 rounded"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="h-6 w-28 bg-gray-200/60 dark:bg-white/10 rounded-md"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-0 divide-y divide-gray-100 dark:divide-white/5 relative z-10">
            {/* Row 1: Images Found */}
            <motion.div
              className="flex justify-between items-center py-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                className="h-4 w-28 bg-gray-200/60 dark:bg-white/10 rounded-md"
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="h-5 w-8 bg-gray-200/60 dark:bg-white/10 rounded-md"
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>

            {/* Row 2: Missing Alt Text */}
            <motion.div
              className="flex justify-between items-center py-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="h-4 w-36 bg-gray-200/60 dark:bg-white/10 rounded-md"
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="h-5 w-8 bg-gray-200/60 dark:bg-white/10 rounded-md"
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
