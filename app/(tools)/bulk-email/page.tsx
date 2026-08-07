import type { Metadata } from "next";

import ExcelToJson from "@/components/excel-to-json";

export const metadata: Metadata = {
  title: "Bulk Email",
};

export default function BulkEmailPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ExcelToJson />
    </div>
  );
}
