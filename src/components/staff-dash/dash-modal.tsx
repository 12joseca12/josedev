"use client";

import { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { prefersReducedMotion } from "@/components/staff-dash/dash-motion";

type DashModalProps = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Modal del dashboard — reservado para confirmaciones one-way/financieras
 * (DESIGN.md: cerrar lead, revertir cierre). Backdrop dim + scale-in GSAP,
 * Escape/backdrop cierran, foco entra al abrir y vuelve al disparador al
 * cerrar (el disparador es document.activeElement en el momento de montar).
 */
export function DashModal({ title, closeLabel, onClose, children }: DashModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    // Primero un campo real; el botón × del header solo como último recurso.
    const firstField =
      dialog?.querySelector<HTMLElement>("input, select, textarea") ??
      dialog?.querySelector<HTMLElement>("form button, [data-modal-action]");
    (firstField ?? dialog)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    if (backdropRef.current) {
      gsap.from(backdropRef.current, { autoAlpha: 0, duration: 0.18, ease: "power2.out" });
    }
    if (dialogRef.current) {
      gsap.from(dialogRef.current, {
        autoAlpha: 0,
        scale: 0.96,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={backdropRef}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-dash-border bg-dash-surface p-6 shadow-[0_32px_80px_rgba(0,0,0,0.6)] focus:outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-dash-mono text-base font-bold text-dash-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-m-1.5 rounded-lg p-1.5 text-dash-muted transition-colors hover:text-dash-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
