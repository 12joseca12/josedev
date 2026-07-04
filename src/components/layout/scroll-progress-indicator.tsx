type ScrollProgressOrientation = "horizontal" | "vertical";

type Props = {
  orientation: ScrollProgressOrientation;
  progress: number;
  hasOverflow: boolean;
  className?: string;
};

/**
 * Indicador de progreso de scroll (misma estética que la barra superior de la página).
 */
export function ScrollProgressIndicator({
  orientation,
  progress,
  hasOverflow,
  className = "",
}: Props) {
  const horizontal = orientation === "horizontal";

  return (
    <div
      className={`pointer-events-none transition-opacity duration-300 ease-out ${
        hasOverflow ? "opacity-100" : "opacity-0"
      } ${horizontal ? "h-[3px] w-full" : "h-full w-[3px]"} ${className}`.trim()}
      aria-hidden="true"
    >
      <div
        className={`h-full w-full bg-outline-variant/25 ${
          horizontal
            ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            : "shadow-[inset_1px_0_0_rgba(255,255,255,0.04)]"
        }`}
      >
        <div
          className={`scroll-progress-fill h-full w-full will-change-transform transition-[transform] duration-150 ease-out motion-reduce:transition-none ${
            horizontal
              ? "origin-left rounded-r-sm bg-gradient-to-r from-primary-container via-tertiary to-primary"
              : "origin-top rounded-b-sm bg-gradient-to-b from-primary-container via-tertiary to-primary"
          }`}
          style={{ transform: horizontal ? `scaleX(${progress})` : `scaleY(${progress})` }}
        />
      </div>
    </div>
  );
}
