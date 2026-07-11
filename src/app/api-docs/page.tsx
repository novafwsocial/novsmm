import { Metadata } from "next";
import { ApiDocsClient } from "@/components/novsmm/api-docs-page";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "Complete NOVSMM API v1 documentation — endpoints, authentication, examples, and rate limits for reseller integrations.",
  robots: { index: true, follow: true },
};

export default function ApiDocsPage() {
  return <ApiDocsClient />;
}
