import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  label: string;
};

/** Marco de dispositivo móvil para preview estática o iframe del emulador. */
export function PhoneDeviceFrame({ children, label }: Props) {
  return (
    <div
      className="mx-auto w-full max-w-[17.5rem] sm:max-w-[19rem]"
      role="img"
      aria-label={label}
    >
      <div className="relative rounded-[2.25rem] border-[3px] border-outline-variant/50 bg-device-frame-bezel p-2 shadow-[0_32px_80px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:rounded-[2.5rem] sm:p-2.5">
        <div
          className="pointer-events-none absolute left-1/2 top-2.5 z-20 h-[1.35rem] w-[5.5rem] -translate-x-1/2 rounded-full bg-device-frame-bezel sm:top-3"
          aria-hidden
        />
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.65rem] bg-terminal-panel sm:rounded-[1.85rem]">
          {children}
        </div>
      </div>
    </div>
  );
}
