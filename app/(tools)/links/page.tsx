import type { Metadata } from "next";

import LinkGenerator from "@/components/link-generator";

export const metadata: Metadata = {
  title: "Link Generator",
};

export default function LinksPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <LinkGenerator />
    </div>
  );
}
