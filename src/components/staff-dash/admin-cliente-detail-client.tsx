"use client";

import { useId, useMemo, useState, type FormEvent } from "react";

import { DashModal } from "@/components/staff-dash/dash-modal";
import { DashToastViewport, useDashToasts } from "@/components/staff-dash/dash-toast";
import { useAdminClientDetail } from "@/components/staff-dash/use-admin-client-detail";
import { phaseLabel, phaseOrder } from "@/lib/client-portal/phases";
import { formatLeadMonto } from "@/lib/leads-kanban";
import { parseMoney } from "@/lib/money";
import type {
  ClientPackExtraDTO,
  ClientPackExtraEstado,
  ClientTaskDTO,
  ClientTaskEstado,
  Locale,
  ProjectPhase,
} from "@/lib/types";
import {
  addExtra,
  createTask,
  postAdminComment,
  updatePhase,
  updateTask,
} from "@/services/clients-api";
import { t } from "@/services/literals";

import {
  approveExtraDirect,
  provisionAccess,
  rejectExtra,
  sendExtraToPipeline,
} from "@/app/[locale]/admin/clientes/[id]/actions";

type Props = { locale: Locale; clientId: string };

const secondaryButtonClass =
  "rounded-lg border border-dash-border px-3 py-2 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:opacity-50";

const primaryButtonClass =
  "rounded-lg bg-dash-accent px-3 py-2 text-[13px] font-medium text-dash-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:opacity-50";

const dangerButtonClass =
  "rounded-lg bg-dash-error px-3 py-2 text-[13px] font-medium text-dash-text transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:opacity-50";

const TASK_ESTADO_LITERAL_KEY: Record<ClientTaskEstado, string> = {
  pendiente: "adminClienteDetail.taskEstadoPendiente",
  en_curso: "adminClienteDetail.taskEstadoEnCurso",
  hecho: "adminClienteDetail.taskEstadoHecho",
};

const EXTRA_ESTADO_LITERAL_KEY: Record<ClientPackExtraEstado, string> = {
  incluido: "adminClienteDetail.extraEstadoIncluido",
  solicitado: "adminClienteDetail.extraEstadoSolicitado",
  activo: "adminClienteDetail.extraEstadoActivo",
  rechazado: "adminClienteDetail.extraEstadoRechazado",
};

const EXTRA_ESTADO_TONE_CLASS: Record<ClientPackExtraEstado, string> = {
  incluido: "border-dash-border text-dash-muted",
  solicitado: "border-dash-warning text-dash-warning",
  activo: "border-dash-success text-dash-success",
  rechazado: "border-dash-error text-dash-error",
};

type ModalState =
  | { kind: "reject"; extra: ClientPackExtraDTO }
  | { kind: "pipeline"; extra: ClientPackExtraDTO }
  | null;

function formatCommentDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminClienteDetailClient({ locale, clientId }: Props) {
  const { state, reload } = useAdminClientDetail(clientId);
  const { toasts, pushToast, dismissToast } = useDashToasts();
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  // Form locales (nueva tarea, comentario, nuevo acceso, agregar extra, aprobar-directo monto)
  const [newTaskTitulo, setNewTaskTitulo] = useState("");
  const [newTaskDescripcion, setNewTaskDescripcion] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentInternal, setCommentInternal] = useState(false);
  const [accessEmail, setAccessEmail] = useState("");
  const [addExtraId, setAddExtraId] = useState("");
  const [addExtraGratis, setAddExtraGratis] = useState(true);
  const [addExtraMonto, setAddExtraMonto] = useState("");
  const [approveMontoByExtra, setApproveMontoByExtra] = useState<Record<string, string>>({});

  const phaseSelectId = useId();
  const taskTituloId = useId();
  const taskDescripcionId = useId();
  const commentId = useId();
  const accessEmailId = useId();
  const addExtraSelectId = useId();
  const addExtraMontoId = useId();

  const catalogExtraById = useMemo(() => {
    if (state.status !== "ready") return new Map<string, { nombre: string; precio: number | null }>();
    return new Map(state.catalogExtras.map((extra) => [extra.id, { nombre: extra.nombre, precio: extra.precio }]));
  }, [state]);

  if (state.status === "loading") {
    return <p className="text-[13px] text-dash-muted">{t(locale, "adminClienteDetail.loading")}</p>;
  }

  if (state.status === "not-found") {
    return (
      <div className="border-l-4 border-dash-warning bg-dash-surface px-4 py-3">
        <p className="text-[13px] text-dash-text">{t(locale, "adminClienteDetail.notFound")}</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="border-l-4 border-dash-error bg-dash-surface px-4 py-3">
        <p className="text-[13px] text-dash-text">{t(locale, "adminClienteDetail.loadError")}</p>
        <button type="button" onClick={reload} className={`mt-2 ${secondaryButtonClass}`}>
          {t(locale, "adminClienteDetail.retry")}
        </button>
      </div>
    );
  }

  const { client, tasks, generalComments, commentsByTask, extras, catalogExtras } = state;

  async function runAction(action: () => Promise<{ ok: boolean; message?: string }>, toastOkKey: string) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.ok) {
      pushToast("success", t(locale, toastOkKey));
    } else {
      pushToast("error", `${t(locale, "adminClienteDetail.actionError")}${result.message ? ` (${result.message})` : ""}`);
    }
    setModal(null);
    reload();
  }

  async function onChangePhase(phase: ProjectPhase) {
    if (phase === client.projectPhase) return;
    await runAction(() => updatePhase(client.id, phase), "adminClienteDetail.toastPhaseChanged");
  }

  function onSubmitNewTask(event: FormEvent) {
    event.preventDefault();
    const titulo = newTaskTitulo.trim();
    if (!titulo) return;
    void runAction(async () => {
      const result = await createTask(client.id, titulo, newTaskDescripcion.trim() || undefined);
      if (result.ok) {
        setNewTaskTitulo("");
        setNewTaskDescripcion("");
      }
      return result;
    }, "adminClienteDetail.toastTaskCreated");
  }

  async function onChangeTaskEstado(task: ClientTaskDTO, estado: ClientTaskEstado) {
    if (estado === task.estado) return;
    await runAction(() => updateTask(task.id, { estado }), "adminClienteDetail.toastTaskUpdated");
  }

  function onSubmitComment(event: FormEvent) {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body) return;
    void runAction(async () => {
      const result = await postAdminComment(client.id, body, commentInternal, undefined);
      if (result.ok) {
        setCommentBody("");
        setCommentInternal(false);
      }
      return result;
    }, "adminClienteDetail.toastCommentPosted");
  }

  function onSubmitAccess(event: FormEvent) {
    event.preventDefault();
    const email = accessEmail.trim();
    if (!email) return;
    void runAction(async () => {
      const result = await provisionAccess(client.id, email);
      if (result.ok) setAccessEmail("");
      return result;
    }, "adminClienteDetail.toastAccessProvisioned");
  }

  function onSubmitAddExtra(event: FormEvent) {
    event.preventDefault();
    if (!addExtraId) return;
    const monto = addExtraGratis ? null : parseMoney(addExtraMonto);
    if (!addExtraGratis && (monto == null || monto <= 0)) return;
    void runAction(async () => {
      const result = await addExtra(client.id, addExtraId, {
        gratis: addExtraGratis,
        monto: addExtraGratis ? null : (monto as number),
        estado: "incluido",
      });
      if (result.ok) {
        setAddExtraId("");
        setAddExtraGratis(true);
        setAddExtraMonto("");
      }
      return result;
    }, "adminClienteDetail.toastExtraAdded");
  }

  async function onApproveDirect(extra: ClientPackExtraDTO) {
    const rawMonto = approveMontoByExtra[extra.id] ?? "";
    const monto = parseMoney(rawMonto);
    if (monto == null || monto <= 0) {
      pushToast("error", t(locale, "adminClienteDetail.montoInvalid"));
      return;
    }
    await runAction(() => approveExtraDirect(extra.id, monto), "adminClienteDetail.toastExtraApproved");
  }

  async function onConfirmPipeline() {
    if (modal?.kind !== "pipeline") return;
    await runAction(() => sendExtraToPipeline(modal.extra.id), "adminClienteDetail.toastExtraSentToPipeline");
  }

  async function onConfirmReject() {
    if (modal?.kind !== "reject") return;
    await runAction(() => rejectExtra(modal.extra.id), "adminClienteDetail.toastExtraRejected");
  }

  function extraName(extra: ClientPackExtraDTO): string {
    return extra.packExtra?.nombre ?? catalogExtraById.get(extra.packExtraId)?.nombre ?? extra.packExtraId;
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-5">
        <h1 className="font-dash-mono text-xl font-bold text-dash-text">{t(locale, "adminClienteDetail.title")}</h1>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "adminClienteDetail.subtitle")}</p>
      </header>

      {/* Fase */}
      <section className="mb-6 rounded-xl border border-dash-border bg-dash-surface p-4">
        <h2 className="mb-3 font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">
          {t(locale, "adminClienteDetail.phaseSectionTitle")}
        </h2>
        <label htmlFor={phaseSelectId} className="mb-1.5 block text-[13px] text-dash-text">
          {t(locale, "adminClienteDetail.phaseLabel")}
        </label>
        <select
          id={phaseSelectId}
          value={client.projectPhase}
          disabled={busy}
          onChange={(event) => void onChangePhase(event.target.value as ProjectPhase)}
          className="min-h-11 w-full max-w-xs rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:opacity-50"
        >
          {phaseOrder.map((phase) => (
            <option key={phase} value={phase}>
              {phaseLabel(phase)}
            </option>
          ))}
        </select>
      </section>

      {/* Acceso */}
      <section className="mb-6 rounded-xl border border-dash-border bg-dash-surface p-4">
        <h2 className="mb-3 font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">
          {t(locale, "adminClienteDetail.accessSectionTitle")}
        </h2>
        {client.userId ? (
          <p className="text-[13px] text-dash-success">{t(locale, "adminClienteDetail.accessAlready")}</p>
        ) : (
          <form onSubmit={onSubmitAccess} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor={accessEmailId}
                className="mb-1.5 block font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted"
              >
                {t(locale, "adminClienteDetail.accessEmailLabel")}
              </label>
              <input
                id={accessEmailId}
                type="email"
                required
                autoComplete="off"
                value={accessEmail}
                onChange={(event) => setAccessEmail(event.target.value)}
                placeholder={t(locale, "adminClienteDetail.accessEmailPlaceholder")}
                className="w-full min-h-11 rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
              />
            </div>
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {t(locale, "adminClienteDetail.accessSubmit")}
            </button>
          </form>
        )}
      </section>

      {/* Tareas */}
      <section className="mb-6 rounded-xl border border-dash-border bg-dash-surface p-4">
        <h2 className="mb-3 font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">
          {t(locale, "adminClienteDetail.tasksSectionTitle")}
        </h2>

        {tasks.length === 0 ? (
          <p className="mb-3 text-[13px] text-dash-muted">{t(locale, "adminClienteDetail.emptyTasks")}</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {tasks.map((task) => {
              const taskSelectId = `task-estado-${task.id}`;
              return (
                <li key={task.id} className="rounded-lg border border-dash-border bg-dash-bg p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-dash-text">{task.titulo}</p>
                      {task.descripcion ? (
                        <p className="mt-0.5 text-[13px] text-dash-muted">{task.descripcion}</p>
                      ) : null}
                    </div>
                    <label htmlFor={taskSelectId} className="sr-only">
                      {t(locale, "adminClienteDetail.taskEstadoLabel")}
                    </label>
                    <select
                      id={taskSelectId}
                      value={task.estado}
                      disabled={busy}
                      onChange={(event) => void onChangeTaskEstado(task, event.target.value as ClientTaskEstado)}
                      className="min-h-11 rounded-lg border border-dash-border bg-dash-bg px-2 py-1.5 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:opacity-50"
                    >
                      {(Object.keys(TASK_ESTADO_LITERAL_KEY) as ClientTaskEstado[]).map((estado) => (
                        <option key={estado} value={estado}>
                          {t(locale, TASK_ESTADO_LITERAL_KEY[estado])}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(commentsByTask.get(task.id) ?? []).length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-1.5 border-t border-dash-border pt-2">
                      {(commentsByTask.get(task.id) ?? []).map((comment) => (
                        <li key={comment.id} className="text-[13px] text-dash-muted">
                          {comment.internal ? (
                            <span className="mr-1 rounded border border-dash-warning px-1 text-[10px] uppercase tracking-wide text-dash-warning">
                              {t(locale, "adminClienteDetail.internalBadge")}
                            </span>
                          ) : null}
                          {comment.body}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={onSubmitNewTask} className="flex flex-col gap-2 border-t border-dash-border pt-3">
          <label
            htmlFor={taskTituloId}
            className="font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted"
          >
            {t(locale, "adminClienteDetail.newTaskTituloLabel")}
          </label>
          <input
            id={taskTituloId}
            type="text"
            required
            value={newTaskTitulo}
            onChange={(event) => setNewTaskTitulo(event.target.value)}
            placeholder={t(locale, "adminClienteDetail.newTaskTituloPlaceholder")}
            className="min-h-11 rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
          />
          <label
            htmlFor={taskDescripcionId}
            className="font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted"
          >
            {t(locale, "adminClienteDetail.newTaskDescripcionLabel")}
          </label>
          <textarea
            id={taskDescripcionId}
            value={newTaskDescripcion}
            onChange={(event) => setNewTaskDescripcion(event.target.value)}
            rows={2}
            placeholder={t(locale, "adminClienteDetail.newTaskDescripcionPlaceholder")}
            className="resize-y rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
          />
          <button type="submit" disabled={busy} className={`self-start min-h-11 ${primaryButtonClass}`}>
            {t(locale, "adminClienteDetail.newTaskSubmit")}
          </button>
        </form>
      </section>

      {/* Comentarios generales */}
      <section className="mb-6 rounded-xl border border-dash-border bg-dash-surface p-4">
        <h2 className="mb-3 font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">
          {t(locale, "adminClienteDetail.commentsSectionTitle")}
        </h2>

        {generalComments.length === 0 ? (
          <p className="mb-3 text-[13px] text-dash-muted">{t(locale, "adminClienteDetail.emptyComments")}</p>
        ) : (
          <ul className="mb-3 flex flex-col gap-2">
            {generalComments.map((comment) => (
              <li key={comment.id} className="rounded-lg border border-dash-border bg-dash-bg px-3 py-2">
                <div className="mb-1 flex items-center gap-2">
                  {comment.internal ? (
                    <span className="rounded border border-dash-warning px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-dash-warning">
                      {t(locale, "adminClienteDetail.internalBadge")}
                    </span>
                  ) : null}
                  <span className="font-dash-data text-[11px] tabular-nums text-dash-muted">
                    {formatCommentDate(comment.createdAt, locale)}
                  </span>
                </div>
                <p className="text-[13px] leading-snug text-dash-text">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onSubmitComment} className="flex flex-col gap-2 border-t border-dash-border pt-3">
          <label
            htmlFor={commentId}
            className="font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted"
          >
            {t(locale, "adminClienteDetail.commentLabel")}
          </label>
          <textarea
            id={commentId}
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            rows={2}
            placeholder={t(locale, "adminClienteDetail.commentPlaceholder")}
            className="resize-y rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
          />
          <label className="flex min-h-11 items-center gap-2 text-[13px] text-dash-text">
            <input
              type="checkbox"
              checked={commentInternal}
              onChange={(event) => setCommentInternal(event.target.checked)}
              className="size-5 rounded border-dash-border"
            />
            {t(locale, "adminClienteDetail.internalToggleLabel")}
          </label>
          <button type="submit" disabled={busy} className={`self-start min-h-11 ${primaryButtonClass}`}>
            {t(locale, "adminClienteDetail.commentSubmit")}
          </button>
        </form>
      </section>

      {/* Extras */}
      <section className="mb-6 rounded-xl border border-dash-border bg-dash-surface p-4">
        <h2 className="mb-3 font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">
          {t(locale, "adminClienteDetail.extrasSectionTitle")}
        </h2>

        {extras.length === 0 ? (
          <p className="mb-3 text-[13px] text-dash-muted">{t(locale, "adminClienteDetail.emptyExtras")}</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-3">
            {extras.map((extra) => (
              <li key={extra.id} className="rounded-lg border border-dash-border bg-dash-bg p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-dash-text">{extraName(extra)}</p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-dash-mono text-[10px] font-medium uppercase tracking-wide ${EXTRA_ESTADO_TONE_CLASS[extra.estado]}`}
                  >
                    {t(locale, EXTRA_ESTADO_LITERAL_KEY[extra.estado])}
                  </span>
                </div>
                {extra.monto !== null ? (
                  <p className="mb-2 font-dash-data text-[13px] tabular-nums text-dash-muted">
                    {formatLeadMonto(extra.monto, locale)}
                  </p>
                ) : null}

                {extra.estado === "solicitado" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor={`approve-monto-${extra.id}`} className="sr-only">
                      {t(locale, "adminClienteDetail.montoLabel")}
                    </label>
                    <input
                      id={`approve-monto-${extra.id}`}
                      type="text"
                      inputMode="decimal"
                      placeholder={t(locale, "adminClienteDetail.montoLabel")}
                      value={approveMontoByExtra[extra.id] ?? ""}
                      onChange={(event) =>
                        setApproveMontoByExtra((current) => ({ ...current, [extra.id]: event.target.value }))
                      }
                      className="min-h-11 w-28 rounded-lg border border-dash-border bg-dash-surface px-2 py-1.5 font-dash-data text-[13px] tabular-nums text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onApproveDirect(extra)}
                      className={primaryButtonClass}
                    >
                      {t(locale, "adminClienteDetail.approveDirectButton")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setModal({ kind: "pipeline", extra })}
                      className={secondaryButtonClass}
                    >
                      {t(locale, "adminClienteDetail.sendToPipelineButton")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setModal({ kind: "reject", extra })}
                      className={dangerButtonClass}
                    >
                      {t(locale, "adminClienteDetail.rejectButton")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onSubmitAddExtra} className="flex flex-col gap-2 border-t border-dash-border pt-3">
          <label
            htmlFor={addExtraSelectId}
            className="font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted"
          >
            {t(locale, "adminClienteDetail.addExtraLabel")}
          </label>
          <select
            id={addExtraSelectId}
            value={addExtraId}
            onChange={(event) => setAddExtraId(event.target.value)}
            className="min-h-11 rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
          >
            <option value="">{t(locale, "adminClienteDetail.addExtraPlaceholder")}</option>
            {catalogExtras.map((extra) => (
              <option key={extra.id} value={extra.id}>
                {extra.nombre}
              </option>
            ))}
          </select>
          <label className="flex min-h-11 items-center gap-2 text-[13px] text-dash-text">
            <input
              type="checkbox"
              checked={addExtraGratis}
              onChange={(event) => setAddExtraGratis(event.target.checked)}
              className="size-5 rounded border-dash-border"
            />
            {t(locale, "adminClienteDetail.addExtraGratisLabel")}
          </label>
          {!addExtraGratis ? (
            <>
              <label
                htmlFor={addExtraMontoId}
                className="font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted"
              >
                {t(locale, "adminClienteDetail.montoLabel")}
              </label>
              <input
                id={addExtraMontoId}
                type="text"
                inputMode="decimal"
                value={addExtraMonto}
                onChange={(event) => setAddExtraMonto(event.target.value)}
                className="w-32 min-h-11 rounded-lg border border-dash-border bg-dash-bg px-3 py-2 font-dash-data text-[13px] tabular-nums text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
              />
            </>
          ) : null}
          <button
            type="submit"
            disabled={busy || !addExtraId}
            className={`self-start min-h-11 ${primaryButtonClass}`}
          >
            {t(locale, "adminClienteDetail.addExtraSubmit")}
          </button>
        </form>
      </section>

      {modal?.kind === "pipeline" ? (
        <DashModal
          title={t(locale, "adminClienteDetail.pipelineModalTitle")}
          closeLabel={t(locale, "adminClienteDetail.closeDialog")}
          onClose={() => setModal(null)}
        >
          <p className="mb-5 text-[13px] text-dash-muted">
            {t(locale, "adminClienteDetail.pipelineModalBody").replace("{name}", extraName(modal.extra))}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              data-modal-action
              onClick={() => setModal(null)}
              className={secondaryButtonClass}
            >
              {t(locale, "adminClienteDetail.cancel")}
            </button>
            <button type="button" disabled={busy} onClick={() => void onConfirmPipeline()} className={primaryButtonClass}>
              {t(locale, "adminClienteDetail.pipelineModalConfirm")}
            </button>
          </div>
        </DashModal>
      ) : null}

      {modal?.kind === "reject" ? (
        <DashModal
          title={t(locale, "adminClienteDetail.rejectModalTitle")}
          closeLabel={t(locale, "adminClienteDetail.closeDialog")}
          onClose={() => setModal(null)}
        >
          <p className="mb-5 text-[13px] text-dash-muted">
            {t(locale, "adminClienteDetail.rejectModalBody").replace("{name}", extraName(modal.extra))}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              data-modal-action
              onClick={() => setModal(null)}
              className={secondaryButtonClass}
            >
              {t(locale, "adminClienteDetail.cancel")}
            </button>
            <button type="button" disabled={busy} onClick={() => void onConfirmReject()} className={dangerButtonClass}>
              {t(locale, "adminClienteDetail.rejectModalConfirm")}
            </button>
          </div>
        </DashModal>
      ) : null}

      <DashToastViewport
        toasts={toasts}
        closeLabel={t(locale, "adminClienteDetail.closeDialog")}
        onDismiss={dismissToast}
      />
    </div>
  );
}
