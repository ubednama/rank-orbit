import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export type MarkdownComponentProps = ComponentPropsWithoutRef<"div"> & { node?: unknown };

interface MarkdownRendererProps {
  children: string;
  className?: string;
  components?: Components;
}

export function MarkdownRenderer({ children, className, components }: MarkdownRendererProps) {
  return (
    <div className={cn("prose dark:prose-invert max-w-none text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }: MarkdownComponentProps) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-indigo-100/50 dark:border-white/10">
              <table className="w-full text-left" {...props} />
            </div>
          ),
          thead: ({ node, ...props }: MarkdownComponentProps) => (
            <thead
              className="bg-indigo-50/80 dark:bg-white/10 text-xs uppercase font-semibold tracking-wider text-indigo-900 dark:text-indigo-100"
              {...props}
            />
          ),
          th: ({ node, ...props }: MarkdownComponentProps) => (
            <th
              className="px-4 py-2 border-b border-indigo-100/50 dark:border-white/10 whitespace-nowrap"
              {...props}
            />
          ),
          td: ({ node, ...props }: MarkdownComponentProps) => (
            <td
              className="px-4 py-1.5 border-b border-indigo-50/50 dark:border-white/5"
              {...props}
            />
          ),
          tr: ({ node, ...props }: MarkdownComponentProps) => (
            <tr
              className="hover:bg-indigo-50/30 dark:hover:bg-white/5 transition-colors"
              {...props}
            />
          ),
          h1: ({ node, ...props }: MarkdownComponentProps) => (
            <h1
              className="text-2xl font-bold text-foreground mt-8 mb-4 border-b border-gray-200 dark:border-gray-800 pb-2"
              {...props}
            />
          ),
          h2: ({ node, ...props }: MarkdownComponentProps) => (
            <h2
              className="text-xl font-semibold text-indigo-700 dark:text-indigo-400 mt-6 mb-3"
              {...props}
            />
          ),
          h3: ({ node, ...props }: MarkdownComponentProps) => (
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2" {...props} />
          ),
          p: ({ node, ...props }: MarkdownComponentProps) => (
            <p className="mb-4 text-muted-foreground leading-relaxed" {...props} />
          ),
          ul: ({ node, ...props }: MarkdownComponentProps) => (
            <ul
              className="list-disc list-outside ml-6 mb-4 space-y-1 text-muted-foreground"
              {...props}
            />
          ),
          li: ({ node, ...props }: MarkdownComponentProps) => <li className="pl-1" {...props} />,
          strong: ({ node, ...props }: MarkdownComponentProps) => (
            <strong className="font-semibold text-indigo-700 dark:text-indigo-300" {...props} />
          ),
          b: ({ node, ...props }: MarkdownComponentProps) => (
            <strong className="font-semibold text-indigo-700 dark:text-indigo-300" {...props} />
          ),
          ...components,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
