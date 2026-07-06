"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClientDTO, ClientPackExtraDTO, ClientTaskCommentDTO, ClientTaskDTO, PackExtraDTO } from "@/lib/types";
import { getClient, listComments, listPack, listPackExtras, listTasks } from "@/services/clients-api";

type AdminClientDetailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "not-found" }
  | {
      status: "ready";
      client: ClientDTO;
      tasks: ClientTaskDTO[];
      generalComments: ClientTaskCommentDTO[];
      commentsByTask: Map<string, ClientTaskCommentDTO[]>;
      extras: ClientPackExtraDTO[];
      catalogExtras: PackExtraDTO[];
    };

async function fetchAdminClientDetail(clientId: string): Promise<AdminClientDetailState> {
  const clientResult = await getClient(clientId);
  if (!clientResult.ok) return { status: "error" };
  const client = clientResult.data;
  if (!client) return { status: "not-found" };

  const [tasksResult, generalCommentsResult, extrasResult, catalogExtrasResult] = await Promise.all([
    listTasks(client.id),
    listComments(client.id, undefined),
    listPack(client.id),
    listPackExtras(),
  ]);

  if (!tasksResult.ok || !generalCommentsResult.ok || !extrasResult.ok || !catalogExtrasResult.ok) {
    return { status: "error" };
  }

  const tasks = tasksResult.data;
  const commentsByTask = new Map<string, ClientTaskCommentDTO[]>();
  await Promise.all(
    tasks.map(async (task) => {
      const result = await listComments(client.id, task.id);
      if (result.ok) commentsByTask.set(task.id, result.data);
    }),
  );

  // `listComments(clientId, undefined)` trae todos los comentarios del cliente
  // (generales + de tarea); acá nos quedamos solo con los generales (task_id null).
  const generalComments = generalCommentsResult.data.filter((comment) => comment.taskId === null);

  return {
    status: "ready",
    client,
    tasks,
    generalComments,
    commentsByTask,
    extras: extrasResult.data,
    catalogExtras: catalogExtrasResult.data.filter((extra) => extra.activo),
  };
}

/** Mismo patrón fetch-hook + `reloadKey` que `useLeadsData`/`useMyTasks` — refetch completo tras cada mutación admin. */
export function useAdminClientDetail(clientId: string) {
  const [state, setState] = useState<AdminClientDetailState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await fetchAdminClientDetail(clientId);
      if (mounted) setState(next);
    })();
    return () => {
      mounted = false;
    };
  }, [clientId, reloadKey]);

  return { state, reload };
}
