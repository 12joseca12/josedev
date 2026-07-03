/** Purely decorative macOS-style traffic-light dots (no interaction) — used by mockups like the hero terminal preview. For the real interactive close/PIP/fullscreen controls, see `TerminalChatTrafficLights`. */
export function TerminalTrafficDots() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <div className="size-2.5 rounded-full bg-mac-close/90 shadow-[0_0_6px_rgba(255,95,87,0.45)] sm:size-3" />
      <div className="size-2.5 rounded-full bg-mac-minimize/90 shadow-[0_0_6px_rgba(254,188,46,0.35)] sm:size-3" />
      <div className="size-2.5 rounded-full bg-mac-maximize/90 shadow-[0_0_6px_rgba(40,200,64,0.35)] sm:size-3" />
    </div>
  );
}
