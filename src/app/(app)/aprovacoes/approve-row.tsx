"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { approveFromQueueAction } from "./actions";

export function ApproveRow({ reqId }: { reqId: string }) {
  const action = approveFromQueueAction.bind(null, reqId);
  const [open, setOpen] = useState(false);

  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      {open && (
        <Input name="comment" placeholder="Parecer (opcional)" className="h-8 w-48 text-xs" />
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-neutral-400 hover:text-blue-600"
      >
        {open ? "ocultar" : "+ parecer"}
      </button>
      <Button type="submit" name="decision" value="aprovada" size="sm">
        <CheckCircle2 size={13} /> Aprovar
      </Button>
      <Button type="submit" name="decision" value="reprovada" size="sm" variant="danger">
        <XCircle size={13} /> Reprovar
      </Button>
    </form>
  );
}
