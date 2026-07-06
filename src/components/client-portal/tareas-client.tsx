"use client";

import { DashToastViewport, useDashToasts } from "@/components/staff-dash/dash-toast";
import type { ClientTaskEstado, Locale } from "@/lib/types";
import { t } from "@/services/literals";

import { CommentThread } from "./comment-thread";
import { useMyTasks } from "./use-my-tasks";

type Props = { locale: Locale };

const ESTADO_LITERAL_KEY: Record<ClientTaskEstado, string> = {
  pendiente: "clientPortal.estadoPendiente",
  en_curso: "clientPortal.estadoEnCurso",
  hecho: "clientPortal.estadoHecho",
};

const ESTADO_TONE_CLASS: Record<ClientTaskEstado, string> = {
  pendiente: "border-dash-border text-dash-muted",
  en_curso: "border-dash-accent text-dash-accent-text",
  hecho: "border-dash-success text-dash-success",
};

function TaskEstadoBadge({ estado, locale }: { estado: ClientTaskEstado; locale: Locale }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-dash-mono text-[10px] font-medium uppercase tracking-wide ${ESTADO_TONE_CLASS[estado]}`}
    >
      {t(locale, ESTADO_LITERAL_KEY[estado])}
    </span>
  );
}

export function TareasClient({ locale }: Props) {
  const { state, reload } = useMyTasks();
  const { toasts, pushToast, dismissToast } = useDashToasts();

  function onPosted() {
    pushToast("success", t(locale, "clientPortal.toastCommentSent"));
    reload();
  }

  function onError() {
    pushToast("error", t(locale, "clientPortal.actionError"));
  }

  if (state.status === "loading") {
    return <p className="text-[13px] text-dash-muted">{t(locale, "clientPortal.loading")}</p>;
  }

  if (state.status === "error") {
    return (
      <div className="border-l-4 border-dash-error bg-dash-surface px-4 py-3">
        <p className="text-[13px] text-dash-text">{t(locale, "clientPortal.loadError")}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-2 rounded-lg border border-dash-border px-3 py-1.5 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        >
          {t(locale, "clientPortal.retry")}
        </button>
      </div>
    );
  }

  if (state.status === "no-client") {
    return (
      <div className="rounded-xl border border-dash-border bg-dash-surface p-5">
        <p className="text-[13px] font-medium text-dash-text">{t(locale, "clientPortal.noProjectTitle")}</p>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "clientPortal.noProjectBody")}</p>
      </div>
    );
  }

  const { clientId, tasks, generalComments, commentsByTask } = state;

  return (
    <div className="max-w-3xl">
      <header className="mb-5">
        <h1 className="font-dash-mono text-xl font-bold text-dash-text">{t(locale, "clientPortal.tareasH1")}</h1>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "clientPortal.tareasSubtitle")}</p>
      </header>

      {tasks.length === 0 ? (
        <p className="text-[13px] text-dash-muted">{t(locale, "clientPortal.emptyTareas")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-xl border border-dash-border bg-dash-surface p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h2 className="text-[14px] font-semibold text-dash-text">{task.titulo}</h2>
                <TaskEstadoBadge estado={task.estado} locale={locale} />
              </div>
              {task.descripcion ? (
                <p className="mb-3 text-[13px] leading-snug text-dash-muted">{task.descripcion}</p>
              ) : null}
              <CommentThread
                locale={locale}
                clientId={clientId}
                taskId={task.id}
                title={t(locale, "clientPortal.taskCommentsTitle")}
                comments={commentsByTask.get(task.id) ?? []}
                onPosted={onPosted}
                onError={onError}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <CommentThread
          locale={locale}
          clientId={clientId}
          title={t(locale, "clientPortal.generalCommentsTitle")}
          comments={generalComments}
          onPosted={onPosted}
          onError={onError}
        />
      </div>

      <DashToastViewport toasts={toasts} closeLabel={t(locale, "clientPortal.closeDialog")} onDismiss={dismissToast} />
    </div>
  );
}
