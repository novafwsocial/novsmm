import { Metadata } from "next";
import { db } from "@/lib/db";
import { BlogList } from "@/components/novsmm/blog-list";

export const metadata: Metadata = {
  title: "Blog · NOVSMM",
  description: "Social media marketing insights, growth strategies, and platform updates from the NOVSMM team.",
  openGraph: {
    title: "NOVSMM Blog",
    description: "Social media marketing insights, growth strategies, and platform updates.",
    url: "https://novsmm.shop/blog",
  },
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  // Fetch published blog posts from CMS
  const posts = await db.cmsContent.findMany({
    where: {
      type: "blog_post",
      status: "published",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      body: true,
      category: true,
      tags: true,
      authorId: true,
      createdAt: true,
    },
  }).catch(() => []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            ← Back to NOVSMM
          </a>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Blog</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">NOVSMM Blog</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Social media marketing insights, growth strategies, and platform updates.
        </p>

        <BlogList posts={posts as any} />
      </main>
    </div>
  );
}
