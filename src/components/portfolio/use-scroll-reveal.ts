"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

let scrollTriggerRegistered = false;

function ensureScrollTriggerRegistered() {
  if (scrollTriggerRegistered) return;
  gsap.registerPlugin(ScrollTrigger);
  scrollTriggerRegistered = true;
}

/**
 * DESIGN.md Motion: reveal sutil (fade + rise) al entrar cada sección en
 * viewport, `once: true`, gateado por `prefers-reduced-motion`. Sin motion
 * (o sin JS), el contenido queda visible de inmediato — nunca depende de la
 * animación para ser usable.
 */
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      ensureScrollTriggerRegistered();
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!ref.current) return;
        gsap.from(ref.current, {
          autoAlpha: 0,
          y: 24,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            once: true,
          },
        });
        return () => mm.kill();
      });
    },
    { scope: ref },
  );

  return ref;
}
