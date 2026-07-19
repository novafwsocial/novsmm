import { Metadata } from "next";
import { ChangelogClient } from "@/components/novsmm/changelog-page";

export const metadata: Metadata = {
  title: "Changelog",
  description: "NOVSMM platform updates, new features, and improvements over time.",
  robots: { index: true, follow: true },
};

export default function ChangelogPage() {
  return <ChangelogClient />;
}
