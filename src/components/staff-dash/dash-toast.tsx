"use client";

import { useCallback, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { prefersReducedMotion } from "@/components/staff-dash/dash-motion";

export type DashToastTone = "success" | "error";

export type DashToast = {
  id: number;
  tone: DashToastTone;
  message: string;
};

const AUTO_DISMISS_MS = 5000;
/** DESIGN.md: cola de máximo 2 toasts visibles, nunca apilar más. */
const MAX_VISIBLE = 2;

let nextToastId = 1;

/**
 * Estado de toasts por pantalla (sin Context: cada client-root del dashboard
 * tiene un único viewport, no hay árboles intermedios que lo necesiten).
 */
export function useDashToasts() {
  const [toasts, setToasts] = useState<DashToast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((tone: DashToastTone, message: string) => {
    const toast: DashToast = { id: nextToastId++, tone, message };
    setToasts((current) => [...current, toast].slice(-MAX_VISIBLE));
  }, []);

  return { toasts, pushToast, dismissToast };
}

type ToastItemProps = {
  toast: DashToast;
  closeLabel: string;
  onDismiss: (id: number) => void;
};

function ToastItem({ toast, closeLabel, onDismiss }: ToastItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    if (ref.current && !prefersReducedMotion()) {
      gsap.to(ref.current, {
        autoAlpha: 0,
        y: 12,
        duration: 0.2,
        ease: "power2.inOut",
        onComplete: () => onDismiss(toast.id),
      });
    } else {
      onDismiss(toast.id);
    }
  }, [onDismiss, toast.id]);

  useGSAP(
    () => {
      if (ref.current && !prefersReducedMotion()) {
        gsap.from(ref.current, { autoAlpha: 0, y: 16, duration: 0.2, ease: "power2.out" });
      }
      const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
      return () => window.clearTimeout(timer);
    },
    { scope: ref },
  );

  const toneClass =
    toast.tone === "success"
      ? "border-l-dash-success"
      : "border-l-dash-error";

  return (
    <div
      ref={ref}
      className={`pointer-events-auto flex min-w-64 max-w-sm items-start gap-3 rounded-lg border border-dash-border border-l-4 ${toneClass} bg-dash-surface px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)]`}
    >
      <p className="flex-1 text-[13px] leading-snug text-dash-text">{toast.message}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={closeLabel}
        className="-m-1 rounded-lg p-1 text-dash-muted transition-colors hover:text-dash-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

type DashToastViewportProps = {
  toasts: DashToast[];
  closeLabel: string;
  onDismiss: (id: number) => void;
};

/** Bottom-right en desktop, bottom-center en mobile (DESIGN.md). */
export function DashToastViewport({ toasts, closeLabel, onDismiss }: DashToastViewportProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:inset-x-auto md:bottom-6 md:right-6 md:items-end"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} closeLabel={closeLabel} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
