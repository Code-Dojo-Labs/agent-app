import { getColumnsByBoard } from '../db/column.repository.js';
import { getAllTasks } from '../db/task.repository.js';
import type { Task } from '../types/models.js';
import { onMultipleSync } from './broadcast-sync.js';

const SESSION_PROMPT_DISMISSED_KEY = 'dojo:notifications-prompt-dismissed';
const PERIODIC_SYNC_TAG = 'dojo-task-notifications';

export interface NotificationTaskSummary {
  id: string;
  boardId: string;
  title: string;
  dueDate: string;
  statusName: string;
}

function canUseSessionStorage(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const storage = window.sessionStorage;
    const testKey = `${SESSION_PROMPT_DISMISSED_KEY}:probe`;
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function isNotifiableTask(task: Task): task is Task & { dueDate: string } {
  return Boolean(task.dueDate && task.notifications !== false);
}

async function postToServiceWorker(message: unknown): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const target = registration.active ?? registration.waiting ?? registration.installing ?? navigator.serviceWorker.controller;
  target?.postMessage(message);
}

async function registerPeriodicTaskNotificationSync(): Promise<void> {
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker.ready;
  const periodicSync = (registration as ServiceWorkerRegistration & {
    periodicSync?: { register(tag: string, options?: { minInterval: number }): Promise<void> };
  }).periodicSync;

  if (!periodicSync) return;

  try {
    await periodicSync.register(PERIODIC_SYNC_TAG, { minInterval: 60 * 60 * 1000 });
  } catch {
    // Silencio: algunos navegadores requieren permisos/flags adicionales.
  }
}

export function canUseTaskNotifications(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator;
}

export async function collectNotificationTaskSummaries(): Promise<NotificationTaskSummary[]> {
  const eligibleTasks = (await getAllTasks()).filter(isNotifiableTask);
  if (eligibleTasks.length === 0) return [];

  const boardIds = [...new Set(eligibleTasks.map(task => task.boardId))];
  const boardColumns = await Promise.all(boardIds.map(async (boardId) => [boardId, await getColumnsByBoard(boardId)] as const));
  const columnNameById = new Map<string, string>();

  for (const [, columns] of boardColumns) {
    columns.forEach(column => columnNameById.set(column.id, column.name));
  }

  return eligibleTasks
    .map(task => ({
      id: task.id,
      boardId: task.boardId,
      title: task.title,
      dueDate: task.dueDate,
      statusName: columnNameById.get(task.statusId) ?? 'Sin estado',
    }))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export async function syncTaskNotifications(): Promise<void> {
  if (!canUseTaskNotifications()) return;

  const tasks = await collectNotificationTaskSummaries();
  await postToServiceWorker({ type: 'dojo:notifications-sync', tasks });

  if (Notification.permission === 'granted') {
    await registerPeriodicTaskNotificationSync();
  }
}

export async function initializeTaskNotifications(): Promise<() => void> {
  if (!canUseTaskNotifications()) return () => {};

  let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleSync = (): void => {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      syncDebounceTimer = null;
      void syncTaskNotifications();
    }, 120);
  };

  const unsubscribe = onMultipleSync({
    'task:created': scheduleSync,
    'task:updated': scheduleSync,
    'task:deleted': scheduleSync,
    'column:created': scheduleSync,
    'column:updated': scheduleSync,
    'column:deleted': scheduleSync,
    'board:created': scheduleSync,
    'board:updated': scheduleSync,
    'board:deleted': scheduleSync,
  });

  await syncTaskNotifications();
  return () => {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = null;
    }
    unsubscribe();
  };
}

export function dismissTaskNotificationPromptForSession(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(SESSION_PROMPT_DISMISSED_KEY, '1');
}

export function clearTaskNotificationPromptDismissal(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(SESSION_PROMPT_DISMISSED_KEY);
}

export function hasDismissedTaskNotificationPromptForSession(): boolean {
  return canUseSessionStorage() && sessionStorage.getItem(SESSION_PROMPT_DISMISSED_KEY) === '1';
}

export async function shouldPromptForTaskNotifications(): Promise<boolean> {
  if (!canUseTaskNotifications()) return false;
  if (Notification.permission !== 'default') return false;
  if (hasDismissedTaskNotificationPromptForSession()) return false;

  const tasks = await collectNotificationTaskSummaries();
  return tasks.length > 0;
}

export async function requestTaskNotificationPermission(): Promise<NotificationPermission> {
  if (!canUseTaskNotifications()) return 'denied';

  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    clearTaskNotificationPromptDismissal();
    await syncTaskNotifications();
    return permission;
  }

  dismissTaskNotificationPromptForSession();
  return permission;
}