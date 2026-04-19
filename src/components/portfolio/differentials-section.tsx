import { Eye, Gauge, Handshake, Layers3 } from "lucide-react";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
};

const items = [
  { key: "transparency", Icon: Eye, tone: "primary" as const, span: "md:col-span-7" },
  { key: "customDev", Icon: Layers3, tone: "tertiary" as const, span: "md:col-span-5" },
  { key: "trifecta", Icon: Handshake, tone: "secondary" as const, span: "md:col-span-5" },
  { key: "futureProof", Icon: Gauge, tone: "glow" as const, span: "md:col-span-7" },
] as const;

function toneClasses(tone: (typeof items)[number]["tone"]) {
  switch (tone) {
    case "primary":
      return {
        shell:
          "bg-surface-container-low border-outline-variant/20 hover:border-primary/40",
        icon: "bg-primary/10 text-primary",
      };
    case "tertiary":
      return {
        shell:
          "bg-surface-container-highest/30 border-outline-variant/20 hover:border-tertiary/40",
        icon: "bg-tertiary/10 text-tertiary",
      };
    case "secondary":
      return {
        shell:
          "bg-surface-container-low border-outline-variant/20 hover:border-secondary/40 overflow-hidden",
        icon: "bg-secondary/10 text-secondary",
      };
    case "glow":
      return {
        shell:
          "signature-glow border border-transparent shadow-lg shadow-primary/10",
        icon: "bg-white/20 text-on-primary-fixed",
      };
  }
}

export function DifferentialsSection({ locale }: Props) {
  return (
    <section
      className="relative mx-auto max-w-[90rem] border-t border-outline-variant/10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      aria-labelledby="differentials-heading"
    >
      <div className="grid-overlay pointer-events-none absolute inset-0 opacity-20" aria-hidden />

      <div className="relative z-10">
        <div className="mb-10 sm:mb-12">
          <span className="mb-3 block font-label text-[10px] font-normal uppercase tracking-[0.3em] text-primary">
            {t(locale, "differentials.eyebrow")}
          </span>
          <h2
            id="differentials-heading"
            className="font-headline text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
          >
            {t(locale, "differentials.title")}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
            {t(locale, "differentials.subtitle")}
          </p>
        </div>

        <ul className="grid list-none gap-4 p-0 md:grid-cols-12 md:gap-6 md:auto-rows-[280px]" aria-label={t(locale, "differentials.listAria")}>
          {items.map(({ key, Icon, tone, span }) => {
            const c = toneClasses(tone);
            const isGlow = tone === "glow";
            return (
              <li
                key={key}
                className={`${span} group rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 sm:p-8 ${c.shell}`}
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`flex size-11 items-center justify-center rounded-lg ${c.icon} ${isGlow ? "backdrop-blur" : ""}`}
                      aria-hidden
                    >
                      <Icon className="size-5" strokeWidth={2.2} aria-hidden />
                    </span>
                    <span className={`font-mono text-[10px] ${isGlow ? "text-on-primary-fixed/60" : "text-outline"}`}>
                      {t(locale, `differentials.items.${key}.tag`)}
                    </span>
                  </div>

                  <div className={isGlow ? "text-on-primary-fixed" : ""}>
                    <h3 className={`mt-6 font-headline text-xl font-bold sm:text-2xl ${isGlow ? "" : "text-on-surface"}`}>
                      {t(locale, `differentials.items.${key}.title`)}
                    </h3>
                    <p
                      className={`mt-3 text-sm leading-relaxed ${isGlow ? "text-on-primary-fixed/80 font-medium" : "text-on-surface-variant"}`}
                    >
                      {t(locale, `differentials.items.${key}.description`)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

