"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClientTaskCommentDTO, ClientTaskDTO } from "@/lib/types";
import { getMyProject, listComments, listTasks } from "@/services/clients-api";

type MyTasksState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-client" }
  | {
      status: "ready";
      clientId: string;
      tasks: ClientTaskDTO[];
      generalComments: ClientTaskCommentDTO[];
      commentsByTask: Map<string, ClientTaskCommentDTO[]>;
    };

async function fetchMyTasks(): Promise<MyTasksState> {
  const projectResult = await getMyProject();
  if (!projectResult.ok) return { status: "error" };
  const client = projectResult.data;
  if (!client) return { status: "no-client" };

  const [tasksResult, generalCommentsResult] = await Promise.all([
    listTasks(client.id),
    listComments(client.id, undefined),
  ]);
  if (!tasksResult.ok) return { status: "error" };

  const tasks = tasksResult.data;
  const commentsByTask = new Map<string, ClientTaskCommentDTO[]>();
  await Promise.all(
    tasks.map(async (task) => {
      const result = await listComments(client.id, task.id);
      if (result.ok) commentsByTask.set(task.id, result.data);
    }),
  );

  // Comentarios generales = los que tienen task_id null; listComments(clientId, undefined)
  // trae todos, así que filtramos acá lo que no tiene tarea asociada.
  const generalComments = generalCommentsResult.ok
    ? generalCommentsResult.data.filter((comment) => comment.taskId === null)
    : [];

  return { status: "ready", clientId: client.id, tasks, generalComments, commentsByTask };
}

/** Mismo patrón `reload`/`reloadKey` que `useLeadsData` — refetch completo tras cada mutación. */
export function useMyTasks() {
  const [state, setState] = useState<MyTasksState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await fetchMyTasks();
      if (mounted) setState(next);
    })();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  return { state, reload };
}
