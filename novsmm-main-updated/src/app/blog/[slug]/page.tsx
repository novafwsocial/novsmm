import { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/novsmm/blog-article";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.cmsContent.findFirst({
    where: { slug, type: "blog_post", status: "published" },
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
  }).catch(() => null);

  if (!post) {
    return { title: "Post not found · NOVSMM Blog" };
  }

  return {
    title: `${post.title} · NOVSMM Blog`,
    description: post.excerpt ?? "NOVSMM Blog",
    openGraph: {
      title: post.title,
      description: post.excerpt ?? "",
      url: `https://novsmm.shop/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await db.cmsContent.findFirst({
    where: { slug, type: "blog_post", status: "published" },
  }).catch(() => null);

  if (!post) notFound();

  return <BlogArticle post={post as any} />;
}
