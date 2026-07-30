"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui";

export function DataExportButton({ data, filename }: { data: unknown; filename: string }) {
  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <Button type="button" onClick={download}>
      <Download size={15} /> Baixar meus dados (JSON)
    </Button>
  );
}
