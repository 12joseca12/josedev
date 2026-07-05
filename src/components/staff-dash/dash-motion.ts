/**
 * Gate de accesibilidad para todo el motion GSAP del dashboard (DESIGN.md:
 * `prefers-reduced-motion` desactiva cualquier animación no esencial —
 * el contenido tiene que ser 100% usable sin motion).
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
