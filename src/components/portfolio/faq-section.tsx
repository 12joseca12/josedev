"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";

type Props = {
  locale: Locale;
};

const ITEM_KEYS = [
  "projectTypes",
  "cost",
  "timeline",
  "maintenance",
  "remote",
] as const;

type ItemKey = (typeof ITEM_KEYS)[number];

export function FaqSection({ locale }: Props) {
  const baseId = useId();
  const [open, setOpen] = useState<ItemKey | null>(null);
  const revealRef = useScrollReveal<HTMLDivElement>();

  function toggle(key: ItemKey) {
    setOpen((prev) => (prev === key ? null : key));
  }

  return (
    <section
      id="faq"
      className="mx-auto max-w-content scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      aria-labelledby={`${baseId}-heading`}
    >
      <div ref={revealRef}>
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <span className="mb-3 block font-dash-sans text-[10px] font-normal uppercase tracking-widest text-dash-accent-text">
            {t(locale, "faq.eyebrow")}
          </span>
          <h2
            id={`${baseId}-heading`}
            className="font-headline text-2xl font-bold tracking-tight text-dash-text sm:text-3xl lg:text-4xl"
          >
            {t(locale, "faq.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-dash-muted sm:text-base">
            {t(locale, "faq.subtitle")}
          </p>
        </div>

        <ul
          className="mx-auto max-w-3xl list-none space-y-3 p-0"
          aria-label={t(locale, "faq.listAria")}
        >
          {ITEM_KEYS.map((key) => {
            const isOpen = open === key;
            const panelId = `${baseId}-panel-${key}`;
            const buttonId = `${baseId}-btn-${key}`;
            const question = t(locale, `faq.q.${key}`);
            return (
              <li
                key={key}
                className={`group/item rounded-md border transition-colors duration-200 ${
                  isOpen ? "border-dash-accent bg-dash-surface" : "border-dash-border bg-dash-surface hover:border-dash-accent/60"
                }`}
              >
                <h3 className="font-headline text-base font-semibold sm:text-lg">
                  <button
                    type="button"
                    id={buttonId}
                    data-hover-label={question}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    aria-label={
                      isOpen
                        ? `${t(locale, "faq.collapse")}: ${question}`
                        : `${t(locale, "faq.expand")}: ${question}`
                    }
                    onClick={() => toggle(key)}
                    className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left text-dash-text transition-colors sm:px-5 sm:py-5"
                  >
                    <span className="min-w-0 flex-1 leading-snug">{question}</span>
                    <span
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-sm border transition-colors duration-200 ${
                        isOpen
                          ? "border-dash-accent bg-dash-accent/10 text-dash-accent-text"
                          : "border-dash-border text-dash-muted group-hover/item:border-dash-accent/60 group-hover/item:text-dash-accent-text"
                      }`}
                      aria-hidden
                    >
                      <ChevronDown
                        className={`size-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                        strokeWidth={2.25}
                      />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="border-t border-dash-border px-4 pb-4 pt-0 text-sm leading-relaxed text-dash-muted sm:px-5 sm:pb-5 sm:text-base">
                      {t(locale, `faq.a.${key}`)}
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
