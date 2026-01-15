import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Smartphone, Monitor } from "lucide-react"; // Import missing icons
import { cn } from "@/lib/utils";

interface SocialPreviewProps {
  title: string;
  description: string;
  image?: string;
  url: string;
}

export function SocialPreview({ title, description, image, url }: SocialPreviewProps) {
  const [imageRatio, setImageRatio] = useState<number | null>(null);

  useEffect(() => {
    if (image) {
      const img = new Image();
      img.src = image;
      img.onload = () => {
        setImageRatio(img.width / img.height);
      };
    }
  }, [image]);

  const isValidRatio = imageRatio ? Math.abs(imageRatio - 1.91) < 0.2 : true;
  const hostname = url ? new URL(url).hostname : "example.com";

  return (
    <div className="space-y-10 p-5 bg-card border rounded-xl shadow-sm">
      {/* Google Search Previews */}
      <div className="space-y-4">
        <h4 className="font-semibold text-lg flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-blue-500" />
          Google Search Result Preview
        </h4>
        <div className="flex justify-between gap-6 bg-gray-50 dark:bg-black/20 p-6 rounded-xl border border-dashed">
          {/* Mobile Result */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> Mobile
            </div>
            <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-lg shadow-sm max-w-[360px] mx-auto border dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                  Fav
                </div>
                <div>
                  <div className="text-xs text-gray-800 dark:text-gray-200">{hostname}</div>
                  <div className="text-xs text-gray-500">{url || "https://example.com"}</div>
                </div>
              </div>
              <div className="text-[#1a0dab] dark:text-[#8ab4f8] font-medium text-lg leading-tight mb-1 truncate hover:underline cursor-pointer">
                {title}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-snug">
                {description}
              </div>
            </div>
          </div>

          {/* Desktop Result */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Monitor className="w-3 h-3" /> Desktop
            </div>
            <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-lg shadow-sm border dark:border-gray-700">
              <div className="flex flex-col mb-1">
                <div className="text-sm text-gray-800 dark:text-gray-200">{hostname}</div>
                <div className="text-xs text-gray-500 mb-1">{url || "https://example.com"}</div>
              </div>
              <div className="text-[#1a0dab] dark:text-[#8ab4f8] font-medium text-xl leading-tight mb-1 hover:underline cursor-pointer">
                {title}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-snug max-w-[600px]">
                {description}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media Previews */}
      <div className="border-t pt-6 space-y-4">
        <h4 className="font-semibold text-lg flex items-center gap-2">
          <Monitor className="w-5 h-5 text-indigo-500" />
          Social Media Sharing
        </h4>
        <div className="flex justify-between gap-1 gap-y-8">
          {/* Twitter Card */}
          <div className="space-y-1">
            <div className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium">
              Twitter (X) Large Card
            </div>
            <div className="bg-black border dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm max-w-[400px] mx-auto">
              {image ? (
                <div className="relative aspect-[1.91/1] bg-gray-800 overflow-hidden">
                  <img src={image} alt="OG" className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="aspect-[1.91/1] bg-gray-800 flex items-center justify-center text-gray-500 text-sm">
                  No Image
                </div>
              )}
              <div className="p-4 bg-white dark:bg-black">
                <div className="uppercase text-gray-500 text-xs mb-1 font-medium">{hostname}</div>
                <div className="font-bold text-black dark:text-white leading-tight mb-1 truncate">
                  {title}
                </div>
                <div className="text-gray-500 text-sm line-clamp-2">{description}</div>
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="space-y-1">
            <div className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium">
              LinkedIn Post
            </div>
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden shadow-sm max-w-[400px] mx-auto">
              {image ? (
                <div className="relative aspect-[1.91/1] bg-gray-200 overflow-hidden">
                  <img src={image} alt="OG" className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="aspect-[1.91/1] bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                  No Image
                </div>
              )}
              <div className="p-3 bg-gray-100 dark:bg-gray-700">
                <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                  {title}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 truncate">
                  {hostname}
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1">
            <div className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium">
              WhatsApp Shared Link
            </div>
            <div className="bg-[#E5DDD5] dark:bg-[#0b141a] p-4 rounded-xl shadow-inner max-w-[320px] mx-auto">
              <div className="bg-white dark:bg-[#202c33] rounded-lg p-1 overflow-hidden shadow-sm ml-auto">
                {image ? (
                  <div className="relative h-32 bg-gray-200 rounded-md overflow-hidden mb-1">
                    <img src={image} alt="OG" className="object-cover w-full h-full" />
                  </div>
                ) : null}
                <div className="px-2 pb-2">
                  <div className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight mb-1 line-clamp-2">
                    {title}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 leading-snug">
                    {description}
                  </div>
                  <div className="text-gray-400 text-[10px] mt-1 truncate">{url.toLowerCase()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Panel */}
      <div className="border-t pt-6">
        <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wider mb-4">
          Meta Data Health Check
        </h4>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Image Check */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
            <div
              className={cn(
                "p-1.5 rounded-full shrink-0",
                image ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600",
              )}
            >
              {image ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>
            <div>
              <p className="font-medium text-sm">OG Image</p>
              <p className="text-xs text-muted-foreground">
                {image ? "Present via og:image tag." : "Missing og:image tag."}
              </p>
            </div>
          </div>

          {/* Ratio Check */}
          {image && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
              <div
                className={cn(
                  "p-1.5 rounded-full shrink-0",
                  isValidRatio ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600",
                )}
              >
                {isValidRatio ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">Image Ratio</p>
                <p className="text-xs text-muted-foreground">
                  {isValidRatio
                    ? "Optimal 1.91:1"
                    : `Current ${imageRatio?.toFixed(2)}:1 (Rec: 1.91:1)`}
                </p>
              </div>
            </div>
          )}

          {/* Title Length */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
            <div
              className={cn(
                "p-1.5 rounded-full shrink-0",
                title.length > 10 && title.length < 70
                  ? "bg-green-100 text-green-600"
                  : "bg-yellow-100 text-yellow-600",
              )}
            >
              {title.length > 10 && title.length < 70 ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">Title Length</p>
              <p className="text-xs text-muted-foreground">{title.length} chars (Rec: 50-60)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
