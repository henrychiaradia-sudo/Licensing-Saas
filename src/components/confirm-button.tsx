"use client";

import * as React from "react";
import { Button } from "@/components/ui";

type Props = React.ComponentProps<typeof Button> & { message: string };

/** Botão de submit que pede confirmação (window.confirm) antes de enviar o form. */
export function ConfirmButton({ message, children, onClick, ...props }: Props) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
