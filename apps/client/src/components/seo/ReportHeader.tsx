import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Globe, Calendar, Clock, Download, ArrowRight } from "lucide-react";
import { SeoMetadata } from "@shared/types";
import { toast } from "sonner";

interface ReportHeaderProps {
  url: string;
  metadata?: SeoMetadata | null;
  loading: boolean;
}

export function ReportHeader({ url, metadata: _metadata, loading }: ReportHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    setMounted(true);
    setDateStr(new Date().toLocaleDateString());
    setTimeStr(
      new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", hour12: true }),
    );
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Globe className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          SEO Audit Report
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-mono truncate" title={url}>
              {url}
            </span>
          </span>
          <span className="items-center gap-1.5 hidden sm:flex">
            <Calendar className="w-3.5 h-3.5" />
            {mounted ? dateStr : "Loading..."}
          </span>
          <span className="items-center gap-1.5 hidden sm:flex">
            <Clock className="w-3.5 h-3.5" />
            {mounted ? timeStr : "Loading..."}
          </span>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          variant="outline"
          className="border-gray-200 dark:border-white/30"
          onClick={() => toast.info("PDF Export coming soon!")}
          disabled={loading}
        >
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
        <Button
          className="bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 text-black dark:text-white border border-indigo-400/20 dark:border-white/30 shadow-sm shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all duration-300 transform hover:scale-[1.02]"
          onClick={() => (window.location.href = "/")}
        >
          New Audit
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
