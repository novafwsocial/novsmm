"use client";


import { Calendar, User, ArrowRight, Newspaper } from "lucide-react";

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
};

export function BlogList({ posts }: { posts: BlogPost[] }) {
  if (!posts || posts.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-muted/20 p-12 text-center">
        <Newspaper className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">No posts yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We're working on great content for you. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-6">
      {posts.map((post, i) => (
        <a
          key={post.id}
          href={`/blog/${post.slug}`}
          className="group fm-fade-up flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-5 transition-shadow hover:shadow-md sm:flex-row sm:items-start sm:gap-5 sm:p-6" style={{ animationDuration: "0.5s", animationDelay: `${i * 0.08}s` }}
          
        >
          <div className="flex-1">
            {post.category && (
              <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {post.category}
              </span>
            )}
            <h2 className="mt-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                {post.excerpt}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              {post.authorId && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  NOVSMM Team
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(post.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary sm:block" />
        </a>
      ))}
    </div>
  );
}
