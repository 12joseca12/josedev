"use client";

import { useId, useState, type FormEvent } from "react";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
};

type TabId = "general" | "project" | "work";

const fieldClass =
  "w-full rounded-xl border border-outline-variant/35 bg-surface-container-low px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-colors focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/25";

const labelClass =
  "mb-1.5 block font-label text-[10px] font-medium uppercase tracking-widest text-outline";

const SERVICE_KEYS = [
  "ui",
  "fe",
  "be",
  "supabase",
  "seo",
  "perf",
  "admin",
  "maint",
  "auto",
  "cms",
] as const;

const TECH_KEYS = ["react", "next", "rn", "ts", "supabase", "node", "other"] as const;

export function ContactSection({ locale }: Props) {
  const baseId = useId();
  const [tab, setTab] = useState<TabId>("general");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const tabOrder: TabId[] = ["general", "project", "work"];

  const [general, setGeneral] = useState({
    name: "",
    email: "",
    company: "",
    reason: "",
    message: "",
  });

  const [project, setProject] = useState({
    name: "",
    email: "",
    company: "",
    projectType: "",
    status: "",
    budget: "",
    timeline: "",
    hasDesign: "",
    needsMaintenance: "",
    description: "",
    services: [] as string[],
  });

  const [work, setWork] = useState({
    name: "",
    email: "",
    company: "",
    opportunity: "",
    modality: "",
    salaryBudget: "",
    message: "",
    tech: [] as string[],
    techOther: "",
  });

  function toggleProjectService(key: (typeof SERVICE_KEYS)[number]) {
    setProject((p) => ({
      ...p,
      services: p.services.includes(key) ? p.services.filter((k) => k !== key) : [...p.services, key],
    }));
  }

  function toggleWorkTech(key: (typeof TECH_KEYS)[number]) {
    setWork((w) => ({
      ...w,
      tech: w.tech.includes(key) ? w.tech.filter((k) => k !== key) : [...w.tech, key],
    }));
  }

  async function handleSubmit(e: FormEvent, kind: TabId) {
    e.preventDefault();
    setBusy(true);
    setDone(false);
    await new Promise((r) => setTimeout(r, 450));
    setBusy(false);
    setDone(true);
    void kind;
  }

  const tabs: { id: TabId; label: string; desc: string }[] = [
    { id: "general", label: t(locale, "contact.tabs.general"), desc: t(locale, "contact.tabs.generalDesc") },
    { id: "project", label: t(locale, "contact.tabs.project"), desc: t(locale, "contact.tabs.projectDesc") },
    { id: "work", label: t(locale, "contact.tabs.work"), desc: t(locale, "contact.tabs.workDesc") },
  ];

  return (
    <section
      id="contact"
      className="mx-auto max-w-[90rem] scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      aria-labelledby={`${baseId}-heading`}
    >
      <div className="mb-8 max-w-2xl sm:mb-10">
        <span className="mb-3 block font-label text-[10px] font-normal uppercase tracking-widest text-primary">
          {t(locale, "contact.eyebrow")}
        </span>
        <h2 id={`${baseId}-heading`} className="font-headline text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          {t(locale, "contact.title")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant sm:text-base">
          {t(locale, "contact.subtitle")}
        </p>
      </div>

      <div className="glass-card rounded-2xl border border-outline-variant/25 p-5 shadow-[0_0_48px_rgba(0,0,0,0.2)] sm:p-8 lg:p-10">
        <div
          role="tablist"
          aria-label={t(locale, "contact.tabsListAria")}
          className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:flex-wrap sm:gap-4"
          onKeyDown={(e) => {
            const idx = tabOrder.indexOf(tab);
            if (idx < 0) return;
            const move = (nextIdx: number) => {
              const next = tabOrder[(nextIdx + tabOrder.length) % tabOrder.length];
              setTab(next);
              setDone(false);
              requestAnimationFrame(() => {
                document.getElementById(`${baseId}-tab-${next}`)?.focus();
              });
            };
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              move(idx + 1);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              move(idx - 1);
            } else if (e.key === "Home") {
              e.preventDefault();
              move(0);
            } else if (e.key === "End") {
              e.preventDefault();
              move(tabOrder.length - 1);
            }
          }}
        >
          {tabs.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${item.id}`}
                data-hover-label={item.label}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => {
                  setTab(item.id);
                  setDone(false);
                }}
                className={`flex flex-1 flex-col rounded-xl border px-4 py-3 text-left transition-all duration-300 sm:min-w-[min(100%,220px)] sm:flex-[1_1_200px] lg:max-w-sm ${
                  selected
                    ? "border-primary/40 bg-surface-container-high shadow-[0_0_28px_rgba(0,229,255,0.12)]"
                    : "border-outline-variant/20 bg-surface-container-low/40 hover:border-outline-variant/40 hover:bg-surface-container-low"
                }`}
              >
                <span className="font-headline text-sm font-bold text-on-surface">{item.label}</span>
                <span className="mt-1 text-xs leading-snug text-on-surface-variant">{item.desc}</span>
              </button>
            );
          })}
        </div>

        {done ? (
          <div
            className="rounded-xl border border-tertiary/30 bg-surface-container-low/80 px-4 py-6 sm:px-6"
            role="status"
          >
            <p className="font-headline text-lg font-bold text-primary">{t(locale, "contact.successTitle")}</p>
            <p className="mt-2 text-sm text-on-surface-variant">{t(locale, "contact.successBody")}</p>
            <button
              type="button"
              data-hover-label={t(locale, "contact.reset")}
              className="mt-4 rounded-lg border border-outline-variant/35 px-4 py-2 font-headline text-sm font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
              onClick={() => setDone(false)}
            >
              {t(locale, "contact.reset")}
            </button>
          </div>
        ) : null}

        <div className={done ? "hidden" : "space-y-8"}>
          {/* Panel 1 */}
          <div
            id={`${baseId}-panel-general`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-general`}
            aria-label={t(locale, "contact.panelGeneralAria")}
            hidden={tab !== "general"}
            className={tab === "general" ? "block" : "hidden"}
          >
            <form className="grid gap-5 sm:grid-cols-2 sm:gap-6" onSubmit={(e) => handleSubmit(e, "general")}>
              <div className="sm:col-span-1">
                <label htmlFor={`${baseId}-g-name`} className={labelClass}>
                  {t(locale, "contact.field.name")}
                </label>
                <input
                  id={`${baseId}-g-name`}
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={general.name}
                  onChange={(e) => setGeneral((s) => ({ ...s, name: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-1">
                <label htmlFor={`${baseId}-g-email`} className={labelClass}>
                  {t(locale, "contact.field.email")}
                </label>
                <input
                  id={`${baseId}-g-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={general.email}
                  onChange={(e) => setGeneral((s) => ({ ...s, email: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${baseId}-g-company`} className={labelClass}>
                  {t(locale, "contact.field.companyOptional")}
                </label>
                <input
                  id={`${baseId}-g-company`}
                  name="company"
                  type="text"
                  autoComplete="organization"
                  value={general.company}
                  onChange={(e) => setGeneral((s) => ({ ...s, company: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${baseId}-g-reason`} className={labelClass}>
                  {t(locale, "contact.field.reason")}
                </label>
                <select
                  id={`${baseId}-g-reason`}
                  name="reason"
                  required
                  value={general.reason}
                  onChange={(e) => setGeneral((s) => ({ ...s, reason: e.target.value }))}
                  className={`${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23bac9cc'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="">{t(locale, "contact.field.selectPlaceholder")}</option>
                  <option value="services">{t(locale, "contact.general.reason.services")}</option>
                  <option value="pricing">{t(locale, "contact.general.reason.pricing")}</option>
                  <option value="technical">{t(locale, "contact.general.reason.technical")}</option>
                  <option value="meeting">{t(locale, "contact.general.reason.meeting")}</option>
                  <option value="other">{t(locale, "contact.general.reason.other")}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${baseId}-g-message`} className={labelClass}>
                  {t(locale, "contact.field.message")}
                </label>
                <textarea
                  id={`${baseId}-g-message`}
                  name="message"
                  required
                  rows={5}
                  value={general.message}
                  onChange={(e) => setGeneral((s) => ({ ...s, message: e.target.value }))}
                  className={`${fieldClass} min-h-[120px] resize-y`}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={busy}
                  data-hover-label={busy ? t(locale, "contact.submitting") : t(locale, "contact.submit")}
                  className="signature-glow w-full rounded-xl px-6 py-3.5 font-headline text-sm font-bold text-on-primary-fixed shadow-[0_8px_28px_rgba(0,229,255,0.2)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_36px_rgba(0,229,255,0.35)] disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
                >
                  {busy ? t(locale, "contact.submitting") : t(locale, "contact.submit")}
                </button>
              </div>
            </form>
          </div>

          {/* Panel 2 */}
          <div
            id={`${baseId}-panel-project`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-project`}
            aria-label={t(locale, "contact.panelProjectAria")}
            hidden={tab !== "project"}
            className={tab === "project" ? "block" : "hidden"}
          >
            <form className="grid gap-5 sm:grid-cols-2 sm:gap-6" onSubmit={(e) => handleSubmit(e, "project")}>
              <div>
                <label htmlFor={`${baseId}-p-name`} className={labelClass}>
                  {t(locale, "contact.field.name")}
                </label>
                <input
                  id={`${baseId}-p-name`}
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={project.name}
                  onChange={(e) => setProject((s) => ({ ...s, name: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor={`${baseId}-p-email`} className={labelClass}>
                  {t(locale, "contact.field.email")}
                </label>
                <input
                  id={`${baseId}-p-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={project.email}
                  onChange={(e) => setProject((s) => ({ ...s, email: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${baseId}-p-company`} className={labelClass}>
                  {t(locale, "contact.field.companyBrand")}
                </label>
                <input
                  id={`${baseId}-p-company`}
                  name="company"
                  type="text"
                  autoComplete="organization"
                  required
                  value={project.company}
                  onChange={(e) => setProject((s) => ({ ...s, company: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor={`${baseId}-p-type`} className={labelClass}>
                  {t(locale, "contact.field.projectType")}
                </label>
                <select
                  id={`${baseId}-p-type`}
                  name="projectType"
                  required
                  value={project.projectType}
                  onChange={(e) => setProject((s) => ({ ...s, projectType: e.target.value }))}
                  className={`${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23bac9cc'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="">{t(locale, "contact.field.selectPlaceholder")}</option>
                  <option value="landing">{t(locale, "contact.project.type.landing")}</option>
                  <option value="corporate">{t(locale, "contact.project.type.corporate")}</option>
                  <option value="ecommerce">{t(locale, "contact.project.type.ecommerce")}</option>
                  <option value="webapp">{t(locale, "contact.project.type.webapp")}</option>
                  <option value="mobile">{t(locale, "contact.project.type.mobile")}</option>
                  <option value="automation">{t(locale, "contact.project.type.automation")}</option>
                  <option value="redesign">{t(locale, "contact.project.type.redesign")}</option>
                  <option value="other">{t(locale, "contact.project.type.other")}</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${baseId}-p-status`} className={labelClass}>
                  {t(locale, "contact.field.status")}
                </label>
                <select
                  id={`${baseId}-p-status`}
                  name="status"
                  required
                  value={project.status}
                  onChange={(e) => setProject((s) => ({ ...s, status: e.target.value }))}
                  className={`${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23bac9cc'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="">{t(locale, "contact.field.selectPlaceholder")}</option>
                  <option value="idea">{t(locale, "contact.project.status.idea")}</option>
                  <option value="briefing">{t(locale, "contact.project.status.briefing")}</option>
                  <option value="design">{t(locale, "contact.project.status.design")}</option>
                  <option value="improve">{t(locale, "contact.project.status.improve")}</option>
                  <option value="partial">{t(locale, "contact.project.status.partial")}</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${baseId}-p-budget`} className={labelClass}>
                  {t(locale, "contact.field.budget")}
                </label>
                <select
                  id={`${baseId}-p-budget`}
                  name="budget"
                  required
                  value={project.budget}
                  onChange={(e) => setProject((s) => ({ ...s, budget: e.target.value }))}
                  className={`${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23bac9cc'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="">{t(locale, "contact.field.selectPlaceholder")}</option>
                  <option value="b1">{t(locale, "contact.project.budget.b1")}</option>
                  <option value="b2">{t(locale, "contact.project.budget.b2")}</option>
                  <option value="b3">{t(locale, "contact.project.budget.b3")}</option>
                  <option value="b4">{t(locale, "contact.project.budget.b4")}</option>
                  <option value="b5">{t(locale, "contact.project.budget.b5")}</option>
                  <option value="discuss">{t(locale, "contact.project.budget.discuss")}</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${baseId}-p-timeline`} className={labelClass}>
                  {t(locale, "contact.field.timeline")}
                </label>
                <select
                  id={`${baseId}-p-timeline`}
                  name="timeline"
                  required
                  value={project.timeline}
                  onChange={(e) => setProject((s) => ({ ...s, timeline: e.target.value }))}
                  className={`${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23bac9cc'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="">{t(locale, "contact.field.selectPlaceholder")}</option>
                  <option value="asap">{t(locale, "contact.project.timeline.asap")}</option>
                  <option value="w2_4">{t(locale, "contact.project.timeline.w2_4")}</option>
                  <option value="m1_2">{t(locale, "contact.project.timeline.m1_2")}</option>
                  <option value="open">{t(locale, "contact.project.timeline.open")}</option>
                </select>
              </div>
              <fieldset className="sm:col-span-2">
                <legend className={`${labelClass} mb-3`}>{t(locale, "contact.field.services")}</legend>
                <p className="mb-3 text-xs text-on-surface-variant">{t(locale, "contact.field.multiHint")}</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {SERVICE_KEYS.map((key) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant/25 bg-surface-container-low/50 px-3 py-2.5 transition-colors hover:border-primary/30 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30"
                    >
                      <input
                        type="checkbox"
                        checked={project.services.includes(key)}
                        onChange={() => toggleProjectService(key)}
                        className="mt-0.5 size-4 shrink-0 rounded border-outline-variant text-primary-container focus:ring-primary/40"
                      />
                      <span className="text-sm text-on-surface">{t(locale, `contact.project.services.${key}`)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor={`${baseId}-p-design`} className={labelClass}>
                  {t(locale, "contact.field.hasDesign")}
                </label>
                <select
                  id={`${baseId}-p-design`}
                  name="hasDesign"
                  required
                  value={project.hasDesign}
                  onChange={(e) => setProject((s) => ({ ...s, hasDesign: e.target.value }))}
                  className={`${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23bac9cc'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="">{t(locale, "contact.field.selectPlaceholder")}</option>
                  <option value="yes">{t(locale, "contact.project.design.yes")}</option>
                  <option value="no">{t(locale, "contact.project.design.no")}</option>
                  <option value="partial">{t(locale, "contact.project.design.partial")}</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${baseId}-p-maint`} className={labelClass}>
                  {t(locale, "contact.field.maintenance")}
                </label>
                <select
                  id={`${baseId}-p-maint`}
                  name="needsMaintenance"
                  required
                  value={project.needsMaintenance}
                  onChange={(e) => setProject((s) => ({ ...s, needsMaintenance: e.target.value }))}
                  className={`${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23bac9cc'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="">{t(locale, "contact.field.selectPlaceholder")}</option>
                  <option value="yes">{t(locale, "contact.project.maintenance.yes")}</option>
                  <option value="no">{t(locale, "contact.project.maintenance.no")}</option>
                  <option value="maybe">{t(locale, "contact.project.maintenance.maybe")}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${baseId}-p-desc`} className={labelClass}>
                  {t(locale, "contact.field.description")}
                </label>
                <p className="mb-2 text-xs text-on-surface-variant">{t(locale, "contact.field.descriptionHint")}</p>
                <textarea
                  id={`${baseId}-p-desc`}
                  name="description"
                  required
                  rows={6}
                  value={project.description}
                  onChange={(e) => setProject((s) => ({ ...s, description: e.target.value }))}
                  className={`${fieldClass} min-h-[140px] resize-y`}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={busy}
                  data-hover-label={busy ? t(locale, "contact.submitting") : t(locale, "contact.submit")}
                  className="signature-glow w-full rounded-xl px-6 py-3.5 font-headline text-sm font-bold text-on-primary-fixed shadow-[0_8px_28px_rgba(0,229,255,0.2)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_36px_rgba(0,229,255,0.35)] disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
                >
                  {busy ? t(locale, "contact.submitting") : t(locale, "contact.submit")}
                </button>
              </div>
            </form>
          </div>

          {/* Panel 3 */}
          <div
            id={`${baseId}-panel-work`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-work`}
            aria-label={t(locale, "contact.panelWorkAria")}
            hidden={tab !== "work"}
            className={tab === "work" ? "block" : "hidden"}
          >
            <form className="grid gap-5 sm:grid-cols-2 sm:gap-6" onSubmit={(e) => handleSubmit(e, "work")}>
              <div>
                <label htmlFor={`${baseId}-w-name`} className={labelClass}>
                  {t(locale, "contact.field.name")}
                </label>
                <input
                  id={`${baseId}-w-name`}
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={work.name}
                  onChange={(e) => setWork((s) => ({ ...s, name: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor={`${baseId}-w-email`} className={labelClass}>
                  {t(locale, "contact.field.email")}
                </label>
                <input
                  id={`${baseId}-w-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={work.email}
                  onChange={(e) => setWork((s) => ({ ...s, email: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${baseId}-w-company`} className={labelClass}>
                  {t(locale, "contact.field.company")}
                </label>
                <input
                  id={`${baseId}-w-company`}
                  name="company"
                  type="text"
                  autoComplete="organization"
                  required
                  value={work.company}
                  onChange={(e) => setWork((s) => ({ ...s, company: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor={`${baseId}-w-opp`} className={labelClass}>
                  {t(locale, "contact.field.opportunity")}
                </label>
                <select
                  id={`${baseId}-w-opp`}
                  name="opportunity"
                  required
                  value={work.opportunity}
                  onChange={(e) => setWork((s) => ({ ...s, opportunity: e.target.value }))}
                  className={`${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23bac9cc'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="">{t(locale, "contact.field.selectPlaceholder")}</option>
                  <option value="employment">{t(locale, "contact.work.opportunity.employment")}</option>
                  <option value="freelance">{t(locale, "contact.work.opportunity.freelance")}</option>
                  <option value="collab">{t(locale, "contact.work.opportunity.collab")}</option>
                  <option value="partner">{t(locale, "contact.work.opportunity.partner")}</option>
                  <option value="sub">{t(locale, "contact.work.opportunity.sub")}</option>
                  <option value="other">{t(locale, "contact.work.opportunity.other")}</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${baseId}-w-mod`} className={labelClass}>
                  {t(locale, "contact.field.modality")}
                </label>
                <select
                  id={`${baseId}-w-mod`}
                  name="modality"
                  required
                  value={work.modality}
                  onChange={(e) => setWork((s) => ({ ...s, modality: e.target.value }))}
                  className={`${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23bac9cc'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="">{t(locale, "contact.field.selectPlaceholder")}</option>
                  <option value="remote">{t(locale, "contact.work.modality.remote")}</option>
                  <option value="hybrid">{t(locale, "contact.work.modality.hybrid")}</option>
                  <option value="onsite">{t(locale, "contact.work.modality.onsite")}</option>
                </select>
              </div>
              <fieldset className="sm:col-span-2">
                <legend className={`${labelClass} mb-3`}>{t(locale, "contact.field.technologies")}</legend>
                <p className="mb-3 text-xs text-on-surface-variant">{t(locale, "contact.field.technologiesHint")}</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {TECH_KEYS.map((key) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant/25 bg-surface-container-low/50 px-3 py-2.5 transition-colors hover:border-primary/30 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30"
                    >
                      <input
                        type="checkbox"
                        checked={work.tech.includes(key)}
                        onChange={() => toggleWorkTech(key)}
                        className="mt-0.5 size-4 shrink-0 rounded border-outline-variant text-primary-container focus:ring-primary/40"
                      />
                      <span className="text-sm text-on-surface">{t(locale, `contact.work.tech.${key}`)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="sm:col-span-2">
                <label htmlFor={`${baseId}-w-techother`} className={labelClass}>
                  {t(locale, "contact.field.techOther")}
                </label>
                <input
                  id={`${baseId}-w-techother`}
                  name="techOther"
                  type="text"
                  value={work.techOther}
                  onChange={(e) => setWork((s) => ({ ...s, techOther: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${baseId}-w-salary`} className={labelClass}>
                  {t(locale, "contact.field.salaryBudget")}
                </label>
                <input
                  id={`${baseId}-w-salary`}
                  name="salaryBudget"
                  type="text"
                  value={work.salaryBudget}
                  onChange={(e) => setWork((s) => ({ ...s, salaryBudget: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${baseId}-w-msg`} className={labelClass}>
                  {t(locale, "contact.field.messageWork")}
                </label>
                <textarea
                  id={`${baseId}-w-msg`}
                  name="message"
                  required
                  rows={5}
                  value={work.message}
                  onChange={(e) => setWork((s) => ({ ...s, message: e.target.value }))}
                  className={`${fieldClass} min-h-[120px] resize-y`}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={busy}
                  data-hover-label={busy ? t(locale, "contact.submitting") : t(locale, "contact.submit")}
                  className="signature-glow w-full rounded-xl px-6 py-3.5 font-headline text-sm font-bold text-on-primary-fixed shadow-[0_8px_28px_rgba(0,229,255,0.2)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_36px_rgba(0,229,255,0.35)] disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
                >
                  {busy ? t(locale, "contact.submitting") : t(locale, "contact.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
