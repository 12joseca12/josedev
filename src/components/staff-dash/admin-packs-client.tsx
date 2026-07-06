"use client";

import { useId, useState, type FormEvent } from "react";

import { DashToastViewport, useDashToasts } from "@/components/staff-dash/dash-toast";
import { useAdminPacks } from "@/components/staff-dash/use-admin-packs";
import { formatLeadMonto } from "@/lib/leads-kanban";
import { parseMoney } from "@/lib/money";
import type { Locale, PackExtraDTO, PackTemplateDTO } from "@/lib/types";
import { upsertPackExtra, upsertPackTemplate } from "@/services/clients-api";
import { t } from "@/services/literals";

type Props = { locale: Locale };

const secondaryButtonClass =
  "rounded-lg border border-dash-border px-3 py-2 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:opacity-50";

const primaryButtonClass =
  "rounded-lg bg-dash-accent px-3 py-2 text-[13px] font-medium text-dash-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:opacity-50";

const fieldClass =
  "min-h-11 w-full rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent";

const labelClass = "mb-1.5 block font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted";

type TemplateForm = {
  id?: string;
  slug: string;
  nombre: string;
  descripcion: string;
  precioBase: string;
  orden: string;
  activo: boolean;
};

type ExtraForm = {
  id?: string;
  slug: string;
  nombre: string;
  descripcion: string;
  precio: string;
  activo: boolean;
};

const EMPTY_TEMPLATE_FORM: TemplateForm = {
  slug: "",
  nombre: "",
  descripcion: "",
  precioBase: "",
  orden: "0",
  activo: true,
};

const EMPTY_EXTRA_FORM: ExtraForm = {
  slug: "",
  nombre: "",
  descripcion: "",
  precio: "",
  activo: true,
};

export function AdminPacksClient({ locale }: Props) {
  const { state, reload } = useAdminPacks();
  const { toasts, pushToast, dismissToast } = useDashToasts();
  const [busy, setBusy] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(EMPTY_TEMPLATE_FORM);
  const [extraForm, setExtraForm] = useState<ExtraForm>(EMPTY_EXTRA_FORM);

  const templateSlugId = useId();
  const templateNombreId = useId();
  const templateDescripcionId = useId();
  const templatePrecioId = useId();
  const templateOrdenId = useId();
  const extraSlugId = useId();
  const extraNombreId = useId();
  const extraDescripcionId = useId();
  const extraPrecioId = useId();

  if (state.status === "loading") {
    return <p className="text-[13px] text-dash-muted">{t(locale, "adminPacks.loading")}</p>;
  }

  if (state.status === "error") {
    return (
      <div className="border-l-4 border-dash-error bg-dash-surface px-4 py-3">
        <p className="text-[13px] text-dash-text">{t(locale, "adminPacks.loadError")}</p>
        <button type="button" onClick={reload} className={`mt-2 ${secondaryButtonClass}`}>
          {t(locale, "adminPacks.retry")}
        </button>
      </div>
    );
  }

  const { templates, extras } = state;

  function editTemplate(template: PackTemplateDTO) {
    setTemplateForm({
      id: template.id,
      slug: template.slug,
      nombre: template.nombre,
      descripcion: template.descripcion ?? "",
      precioBase: template.precioBase !== null ? String(template.precioBase) : "",
      orden: String(template.orden),
      activo: template.activo,
    });
  }

  function editExtra(extra: PackExtraDTO) {
    setExtraForm({
      id: extra.id,
      slug: extra.slug,
      nombre: extra.nombre,
      descripcion: extra.descripcion ?? "",
      precio: extra.precio !== null ? String(extra.precio) : "",
      activo: extra.activo,
    });
  }

  async function onSubmitTemplate(event: FormEvent) {
    event.preventDefault();
    const slug = templateForm.slug.trim();
    const nombre = templateForm.nombre.trim();
    if (!slug || !nombre) return;
    const orden = Number.parseInt(templateForm.orden, 10);
    setBusy(true);
    const result = await upsertPackTemplate({
      id: templateForm.id,
      slug,
      nombre,
      descripcion: templateForm.descripcion.trim() || null,
      precioBase: parseMoney(templateForm.precioBase),
      orden: Number.isFinite(orden) ? orden : 0,
      activo: templateForm.activo,
    });
    setBusy(false);
    pushToast(
      result.ok ? "success" : "error",
      result.ok ? t(locale, "adminPacks.toastTemplateSaved") : t(locale, "adminPacks.actionError"),
    );
    if (result.ok) setTemplateForm(EMPTY_TEMPLATE_FORM);
    reload();
  }

  async function onSubmitExtra(event: FormEvent) {
    event.preventDefault();
    const slug = extraForm.slug.trim();
    const nombre = extraForm.nombre.trim();
    if (!slug || !nombre) return;
    setBusy(true);
    const result = await upsertPackExtra({
      id: extraForm.id,
      slug,
      nombre,
      descripcion: extraForm.descripcion.trim() || null,
      precio: parseMoney(extraForm.precio),
      activo: extraForm.activo,
    });
    setBusy(false);
    pushToast(
      result.ok ? "success" : "error",
      result.ok ? t(locale, "adminPacks.toastExtraSaved") : t(locale, "adminPacks.actionError"),
    );
    if (result.ok) setExtraForm(EMPTY_EXTRA_FORM);
    reload();
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-5">
        <h1 className="font-dash-mono text-xl font-bold text-dash-text">{t(locale, "adminPacks.title")}</h1>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "adminPacks.subtitle")}</p>
      </header>

      {/* Pack templates */}
      <section className="mb-8 rounded-xl border border-dash-border bg-dash-surface p-4">
        <h2 className="mb-3 font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">
          {t(locale, "adminPacks.templatesSectionTitle")}
        </h2>

        {templates.length === 0 ? (
          <p className="mb-3 text-[13px] text-dash-muted">{t(locale, "adminPacks.emptyTemplates")}</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dash-border bg-dash-bg p-3"
              >
                <div>
                  <p className="text-[13px] font-medium text-dash-text">
                    {template.nombre}{" "}
                    {!template.activo ? (
                      <span className="ml-1 rounded border border-dash-muted px-1 text-[10px] uppercase tracking-wide text-dash-muted">
                        {t(locale, "adminPacks.inactiveBadge")}
                      </span>
                    ) : null}
                  </p>
                  <p className="font-dash-data text-[13px] tabular-nums text-dash-muted">
                    {formatLeadMonto(template.precioBase, locale)} · {t(locale, "adminPacks.ordenLabel")}{" "}
                    {template.orden}
                  </p>
                </div>
                <button type="button" onClick={() => editTemplate(template)} className={secondaryButtonClass}>
                  {t(locale, "adminPacks.editButton")}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onSubmitTemplate} className="flex flex-col gap-3 border-t border-dash-border pt-4">
          <p className="text-[13px] font-medium text-dash-text">
            {templateForm.id ? t(locale, "adminPacks.editTemplateTitle") : t(locale, "adminPacks.newTemplateTitle")}
          </p>
          <div>
            <label htmlFor={templateSlugId} className={labelClass}>
              {t(locale, "adminPacks.slugLabel")}
            </label>
            <input
              id={templateSlugId}
              type="text"
              required
              value={templateForm.slug}
              onChange={(event) => setTemplateForm((current) => ({ ...current, slug: event.target.value }))}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={templateNombreId} className={labelClass}>
              {t(locale, "adminPacks.nombreLabel")}
            </label>
            <input
              id={templateNombreId}
              type="text"
              required
              value={templateForm.nombre}
              onChange={(event) => setTemplateForm((current) => ({ ...current, nombre: event.target.value }))}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={templateDescripcionId} className={labelClass}>
              {t(locale, "adminPacks.descripcionLabel")}
            </label>
            <textarea
              id={templateDescripcionId}
              rows={2}
              value={templateForm.descripcion}
              onChange={(event) => setTemplateForm((current) => ({ ...current, descripcion: event.target.value }))}
              className={`${fieldClass} resize-y`}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1">
              <label htmlFor={templatePrecioId} className={labelClass}>
                {t(locale, "adminPacks.precioBaseLabel")}
              </label>
              <input
                id={templatePrecioId}
                type="text"
                inputMode="decimal"
                value={templateForm.precioBase}
                onChange={(event) => setTemplateForm((current) => ({ ...current, precioBase: event.target.value }))}
                className={`${fieldClass} font-dash-data tabular-nums`}
              />
            </div>
            <div className="w-24">
              <label htmlFor={templateOrdenId} className={labelClass}>
                {t(locale, "adminPacks.ordenLabel")}
              </label>
              <input
                id={templateOrdenId}
                type="text"
                inputMode="numeric"
                value={templateForm.orden}
                onChange={(event) => setTemplateForm((current) => ({ ...current, orden: event.target.value }))}
                className={`${fieldClass} font-dash-data tabular-nums`}
              />
            </div>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-[13px] text-dash-text">
            <input
              type="checkbox"
              checked={templateForm.activo}
              onChange={(event) => setTemplateForm((current) => ({ ...current, activo: event.target.checked }))}
              className="size-5 rounded border-dash-border"
            />
            {t(locale, "adminPacks.activoLabel")}
          </label>
          <div className="flex gap-2">
            {templateForm.id ? (
              <button
                type="button"
                onClick={() => setTemplateForm(EMPTY_TEMPLATE_FORM)}
                className={secondaryButtonClass}
              >
                {t(locale, "adminPacks.cancelEdit")}
              </button>
            ) : null}
            <button type="submit" disabled={busy} className={`min-h-11 ${primaryButtonClass}`}>
              {templateForm.id ? t(locale, "adminPacks.saveButton") : t(locale, "adminPacks.createButton")}
            </button>
          </div>
        </form>
      </section>

      {/* Pack extras */}
      <section className="rounded-xl border border-dash-border bg-dash-surface p-4">
        <h2 className="mb-3 font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">
          {t(locale, "adminPacks.extrasSectionTitle")}
        </h2>

        {extras.length === 0 ? (
          <p className="mb-3 text-[13px] text-dash-muted">{t(locale, "adminPacks.emptyExtras")}</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {extras.map((extra) => (
              <li
                key={extra.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dash-border bg-dash-bg p-3"
              >
                <div>
                  <p className="text-[13px] font-medium text-dash-text">
                    {extra.nombre}{" "}
                    {!extra.activo ? (
                      <span className="ml-1 rounded border border-dash-muted px-1 text-[10px] uppercase tracking-wide text-dash-muted">
                        {t(locale, "adminPacks.inactiveBadge")}
                      </span>
                    ) : null}
                  </p>
                  <p className="font-dash-data text-[13px] tabular-nums text-dash-muted">
                    {formatLeadMonto(extra.precio, locale)}
                  </p>
                </div>
                <button type="button" onClick={() => editExtra(extra)} className={secondaryButtonClass}>
                  {t(locale, "adminPacks.editButton")}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onSubmitExtra} className="flex flex-col gap-3 border-t border-dash-border pt-4">
          <p className="text-[13px] font-medium text-dash-text">
            {extraForm.id ? t(locale, "adminPacks.editExtraTitle") : t(locale, "adminPacks.newExtraTitle")}
          </p>
          <div>
            <label htmlFor={extraSlugId} className={labelClass}>
              {t(locale, "adminPacks.slugLabel")}
            </label>
            <input
              id={extraSlugId}
              type="text"
              required
              value={extraForm.slug}
              onChange={(event) => setExtraForm((current) => ({ ...current, slug: event.target.value }))}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={extraNombreId} className={labelClass}>
              {t(locale, "adminPacks.nombreLabel")}
            </label>
            <input
              id={extraNombreId}
              type="text"
              required
              value={extraForm.nombre}
              onChange={(event) => setExtraForm((current) => ({ ...current, nombre: event.target.value }))}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={extraDescripcionId} className={labelClass}>
              {t(locale, "adminPacks.descripcionLabel")}
            </label>
            <textarea
              id={extraDescripcionId}
              rows={2}
              value={extraForm.descripcion}
              onChange={(event) => setExtraForm((current) => ({ ...current, descripcion: event.target.value }))}
              className={`${fieldClass} resize-y`}
            />
          </div>
          <div>
            <label htmlFor={extraPrecioId} className={labelClass}>
              {t(locale, "adminPacks.precioLabel")}
            </label>
            <input
              id={extraPrecioId}
              type="text"
              inputMode="decimal"
              value={extraForm.precio}
              onChange={(event) => setExtraForm((current) => ({ ...current, precio: event.target.value }))}
              className={`${fieldClass} font-dash-data tabular-nums`}
            />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-[13px] text-dash-text">
            <input
              type="checkbox"
              checked={extraForm.activo}
              onChange={(event) => setExtraForm((current) => ({ ...current, activo: event.target.checked }))}
              className="size-5 rounded border-dash-border"
            />
            {t(locale, "adminPacks.activoLabel")}
          </label>
          <div className="flex gap-2">
            {extraForm.id ? (
              <button type="button" onClick={() => setExtraForm(EMPTY_EXTRA_FORM)} className={secondaryButtonClass}>
                {t(locale, "adminPacks.cancelEdit")}
              </button>
            ) : null}
            <button type="submit" disabled={busy} className={`min-h-11 ${primaryButtonClass}`}>
              {extraForm.id ? t(locale, "adminPacks.saveButton") : t(locale, "adminPacks.createButton")}
            </button>
          </div>
        </form>
      </section>

      <DashToastViewport toasts={toasts} closeLabel={t(locale, "adminPacks.closeDialog")} onDismiss={dismissToast} />
    </div>
  );
}
