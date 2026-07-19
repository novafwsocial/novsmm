"use client";

import { Calendar, User, ArrowLeft, Tag } from "lucide-react";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  category?: string;
  tags?: string;
  authorId?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export function BlogArticle({ post }: { post: BlogPost }) {
  // Simple markdown-ish renderer (content stored as text/HTML in CMS)
  const renderContent = (content: string) => {
    // Split by double newlines for paragraphs
    const blocks = content.split(/\n\n+/);
    return blocks.map((block, i) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Headings
      if (trimmed.startsWith("### ")) {
        return <h3 key={i} className="mt-6 text-lg font-semibold text-foreground">{trimmed.slice(4)}</h3>;
      }
      if (trimmed.startsWith("## ")) {
        return <h2 key={i} className="mt-8 text-xl font-bold text-foreground">{trimmed.slice(3)}</h2>;
      }
      if (trimmed.startsWith("# ")) {
        return <h1 key={i} className="mt-8 text-2xl font-bold text-foreground">{trimmed.slice(2)}</h1>;
      }

      // Lists
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed.split(/\n[-*] /).filter(Boolean);
        return (
          <ul key={i} className="mt-3 list-disc space-y-1 pl-6 text-sm leading-relaxed text-muted-foreground">
            {items.map((item, j) => <li key={j}>{item.trim()}</li>)}
          </ul>
        );
      }

      // Blockquotes
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={i} className="mt-4 border-l-4 border-primary/30 pl-4 text-sm italic text-muted-foreground">
            {trimmed.slice(2)}
          </blockquote>
        );
      }

      // Regular paragraph
      return <p key={i} className="mt-3 text-sm leading-relaxed text-muted-foreground">{trimmed}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/blog" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Blog</span>
          </a>
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            NOVSMM
          </a>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {post.category && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Tag className="h-3 w-3" />
            {post.category}
          </span>
        )}

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>

        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          {post.authorId && (
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              NOVSMM Team
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(post.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {post.excerpt && (
          <p className="mt-6 text-lg leading-relaxed text-foreground/80">{post.excerpt}</p>
        )}

        <div className="mt-8 prose prose-sm max-w-none">
          {renderContent(post.body)}
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <a href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to all posts
          </a>
        </div>
      </article>
    </div>
  );
}
