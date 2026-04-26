"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Smartphone } from "lucide-react";
import MetadataChecksSkeleton from "@/components/loading/MetadataChecksSkeleton";
import { SeoMetadata as Metadata } from "@shared/types";

export default function MetadataChecks({
  data,
  loading,
}: {
  data: Metadata | undefined;
  loading?: boolean;
}) {
  if (loading) {
    return <MetadataChecksSkeleton />;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-indigo-100 dark:border-white/10 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-pink-500" />
            <span>On-Page Metadata</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Title Tag
            </span>
            <div className="text-sm bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-white/5 p-3 rounded-md font-medium text-gray-900 dark:text-gray-200">
              {data.title || <span className="text-red-500 italic">Missing</span>}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Meta Description
            </span>
            <div className="text-sm bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-white/5 p-3 rounded-md text-gray-600 dark:text-gray-300 leading-relaxed">
              {data.description || <span className="text-red-500 italic">Missing</span>}
            </div>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              H1 Headings
            </span>
            <div className="flex flex-wrap gap-2">
              {(data.h1 || []).map((h: string, i: number) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  {h}
                </Badge>
              ))}
              {(!data.h1 || data.h1.length === 0) && (
                <span className="text-sm text-red-500 font-medium">No H1 tags found</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-md border-indigo-100 dark:border-white/10 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-blue-500" />
            <span>Media Check</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y divide-gray-100 dark:divide-white/5">
          <div className="flex justify-between items-center py-3">
            <span className="text-sm">Images Found</span>
            <Badge variant="outline">{data.images?.length || 0}</Badge>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-sm text-red-600 dark:text-red-400">Missing Alt Text</span>
            <Badge variant={data.missing_alt_count > 0 ? "destructive" : "secondary"}>
              {data.missing_alt_count || 0}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
