"use client";

import { useActionState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { addCommentAction, type FormState } from "./actions";

export function CommentForm({ eventId }: { eventId: string }) {
  const action = addCommentAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) ref.current?.reset();
  }, [pending, state.error]);

  return (
    <form ref={ref} action={formAction} className="flex flex-wrap items-center gap-2">
      <Input
        name="message"
        placeholder="Escreva um comentário para a equipe…"
        className="h-9 flex-1"
        required
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <Send size={13} /> {pending ? "…" : "Comentar"}
      </Button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
