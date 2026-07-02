"use client";

import { Maximize2, Minimize2, PictureInPicture2, X } from "lucide-react";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";
import type { TerminalViewMode } from "@/components/terminal/terminal-chat-view-mode";

export type TerminalChatTrafficLightsProps = {
  locale: Locale;
  viewMode: TerminalViewMode;
  onClose: () => void;
  onYellow: () => void;
  onGreen: () => void;
};

const TRAFFIC_BTN =
  "flex size-5 shrink-0 items-center justify-center rounded-full transition-[filter,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-[1.375rem]";

export function TerminalChatTrafficLights({ locale, viewMode, onClose, onYellow, onGreen }: TerminalChatTrafficLightsProps) {
  const greenLabel =
    viewMode === "fullscreen"
      ? t(locale, "terminalChat.restoreAria")
      : t(locale, "terminalChat.fullscreenAria");
  const yellowLabel =
    viewMode === "pip"
      ? t(locale, "terminalChat.pipRestoreAria")
      : t(locale, "terminalChat.pipAria");

  return (
    <div
      className="flex shrink-0 items-center gap-2.5"
      role="toolbar"
      aria-label={t(locale, "terminalChat.trafficLightsAria")}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        className={`${TRAFFIC_BTN} bg-mac-close hover:shadow-[0_0_16px_rgba(255,95,87,0.85)]`}
        aria-label={t(locale, "terminalChat.closeAria")}
      >
        <X className="size-3 text-mac-close-icon sm:size-3.5" strokeWidth={3} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onYellow}
        className={`${TRAFFIC_BTN} bg-mac-minimize hover:shadow-[0_0_16px_rgba(254,188,46,0.85)]`}
        aria-label={yellowLabel}
      >
        <PictureInPicture2 className="size-3 text-mac-minimize-icon sm:size-3.5" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onGreen}
        className={`${TRAFFIC_BTN} bg-mac-maximize hover:shadow-[0_0_16px_rgba(40,200,64,0.85)]`}
        aria-label={greenLabel}
      >
        {viewMode === "fullscreen" ? (
          <Minimize2 className="size-3 text-mac-maximize-icon sm:size-3.5" strokeWidth={2.5} aria-hidden />
        ) : (
          <Maximize2 className="size-3 text-mac-maximize-icon sm:size-3.5" strokeWidth={2.5} aria-hidden />
        )}
      </button>
    </div>
  );
}
