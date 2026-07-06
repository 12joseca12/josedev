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

  const [tasksResult, allCommentsResult] = await Promise.all([
    listTasks(client.id),
    listComments(client.id, undefined),
  ]);
  if (!tasksResult.ok) return { status: "error" };

  const tasks = tasksResult.data;
  const allComments = allCommentsResult.ok ? allCommentsResult.data : [];

  // listComments(clientId, undefined) trae TODOS los comentarios del cliente
  // (generales + de todas las tareas) en un solo round-trip; agrupamos acá
  // client-side por taskId en vez de re-fetchear uno por tarea (evita el N+1).
  const commentsByTask = new Map<string, ClientTaskCommentDTO[]>();
  const generalComments: ClientTaskCommentDTO[] = [];
  for (const comment of allComments) {
    if (comment.taskId === null) {
      generalComments.push(comment);
      continue;
    }
    const existing = commentsByTask.get(comment.taskId);
    if (existing) {
      existing.push(comment);
    } else {
      commentsByTask.set(comment.taskId, [comment]);
    }
  }

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
