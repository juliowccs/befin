"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  OverlayCloseButton,
  OverlayDescription,
  OverlayHeader,
  OverlayShell,
  OverlayTitle,
} from "./overlay-primitive";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  return (
    <OverlayShell
      open={open}
      onOpenChange={onOpenChange}
      variant="dialog"
      contentClassName={className}
    >
      {children}
    </OverlayShell>
  );
}

export const DialogHeader = OverlayHeader;
export const DialogTitle = OverlayTitle;
export const DialogDescription = OverlayDescription;

export function DialogCloseButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <OverlayCloseButton
      onClick={onClick}
      ariaLabel="Fechar janela"
      className={className}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5",
        className
      )}
      {...props}
    />
  );
}
