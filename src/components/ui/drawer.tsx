"use client";

import * as React from "react";
import {
  OverlayCloseButton,
  OverlayDescription,
  OverlayHeader,
  OverlayShell,
  OverlayTitle,
} from "./overlay-primitive";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ open, onOpenChange, children, className }: DrawerProps) {
  return (
    <OverlayShell
      open={open}
      onOpenChange={onOpenChange}
      variant="drawer"
      contentClassName={className}
      showHandleBar
    >
      {children}
    </OverlayShell>
  );
}

export const DrawerHeader = OverlayHeader;
export const DrawerTitle = OverlayTitle;
export const DrawerDescription = OverlayDescription;

export function DrawerCloseButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <OverlayCloseButton
      onClick={onClick}
      ariaLabel="Fechar painel"
      className={className}
    />
  );
}
