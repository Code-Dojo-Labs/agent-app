/**
 * Calculadora de métricas para el Dashboard Kanban (US-45)
 * Procesa activity_log de IndexedDB y calcula Cycle Time, Throughput, CFD, etc.
 * 
 * Optimizado para renderizar en <2 segundos con 500+ tareas
 */

import type {
  CycleTimeData,
  PercentileData,
  ThroughputData,
  CFDData,
  DeadlineMetrics,
  MetricsFilter,
  MetricsDashboardData,
} from '../types/metrics';
import type { Task, ActivityEvent } from '../types/models';
import { getAllTasks, getTaskById } from '../db/task.repository';
import { getActivitiesByDateRange } from '../db/activity.repository';
import { getAllColumns } from '../db/column.repository';

// ============================================================================
// PARSERS & HELPERS
// ============================================================================

/**
 * Parse timestamp seguro (ISO string → número)
 */
function parseTimestamp(input: string | number): number {
  if (typeof input === 'number') return input;
  return new Date(input).getTime();
}

/**
 * Calcula Cycle Time en horas y días para una tarea
 * Busca evento "status_change" con payload.to === "En progreso" → payload.to === "Hecho"
 */
function calculateCycleTime(
  activities: ActivityEvent[],
): { hours: number; days: number } | null {
  const statusChanges = activities.filter(
    (a) => a.type === 'status_change' && a.payload?.to,
  );

  const inProgressEvent = statusChanges.find(
    (a) => a.payload.to === 'En progreso',
  );
  const doneEvent = statusChanges.find((a) => a.payload.to === 'Hecho');

  if (!inProgressEvent?.createdAt || !doneEvent?.createdAt) return null;

  const startTime = parseTimestamp(inProgressEvent.createdAt);
  const endTime = parseTimestamp(doneEvent.createdAt);
  const milliseconds = endTime - startTime;

  if (milliseconds < 0) return null; // Dato inválido

  const hours = milliseconds / (1000 * 60 * 60);
  const days = hours / 24;

  return { hours, days };
}

/**
 * Calcula percentiles P50, P85, P95 de un array ordenado
 */
function calculatePercentiles(values: number[]): PercentileData {
  if (values.length === 0) {
    return { p50: 0, p85: 0, p95: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const p50Index = Math.floor(sorted.length * 0.5);
  const p85Index = Math.floor(sorted.length * 0.85);
  const p95Index = Math.floor(sorted.length * 0.95);

  return {
    p50: sorted[p50Index] || 0,
    p85: sorted[p85Index] || 0,
    p95: sorted[p95Index] || 0,
  };
}

/**
 * Agrupa tareas por semana ISO (lunes = inicio)
 */
function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
  return weekStart.getTime();
}

/**
 * Formatea una semana como "May 05-11"
 */
function formatWeekLabel(weekStart: number): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart + 6 * 24 * 60 * 60 * 1000);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  const endStr = end.toLocaleDateString('en-US', { day: '2-digit' });
  return `${startStr}-${endStr}`;
}

// ============================================================================
// CALCULADORES PRINCIPALES
// ============================================================================

/**
 * Calcula Cycle Time de todas las tareas completadas en el rango
 */
export async function calculateCycleTimeMetrics(
  tasks: Task[],
  activities: Map<string, ActivityEvent[]>,
  filter: MetricsFilter,
): Promise<{
  data: CycleTimeData[];
  percentiles: PercentileData;
  average: number;
}> {
  const cycleTimeValues: number[] = [];
  const cycleTimeData: CycleTimeData[] = [];

  for (const task of tasks) {
    const taskActivities = activities.get(task.id) || [];
    const cycleTime = calculateCycleTime(taskActivities);

    if (!cycleTime) continue;

    const lastCompletedEvent = taskActivities.find(
      (a) => a.type === 'status_change' && a.payload?.to === 'Hecho',
    );
    if (!lastCompletedEvent?.createdAt) continue;

    const completedAt = parseTimestamp(lastCompletedEvent.createdAt);

    // Filtrar por rango de fechas si existe
    if (filter.startDate && completedAt < filter.startDate) continue;
    if (filter.endDate && completedAt > filter.endDate) continue;

    cycleTimeValues.push(cycleTime.days);
    cycleTimeData.push({
      taskId: task.id,
      taskTitle: task.title,
      completedAt,
      cycleTimeHours: cycleTime.hours,
      cycleTimeDays: cycleTime.days,
    });
  }

  const percentiles = calculatePercentiles(cycleTimeValues);
  const average = cycleTimeValues.length > 0
    ? cycleTimeValues.reduce((a, b) => a + b, 0) / cycleTimeValues.length
    : 0;

  return {
    data: cycleTimeData.sort((a, b) => b.completedAt - a.completedAt),
    percentiles,
    average,
  };
}

/**
 * Calcula Throughput (tareas completadas por semana) con línea de tendencia
 */
export function calculateThroughputMetrics(
  cycleTimeData: CycleTimeData[],
): {
  data: ThroughputData[];
  averagePerWeek: number;
  trend: number;
} {
  const weekMap = new Map<number, number>();

  // Agrupar tareas completadas por semana
  for (const item of cycleTimeData) {
    const weekStart = getWeekStart(item.completedAt);
    weekMap.set(weekStart, (weekMap.get(weekStart) || 0) + 1);
  }

  // Ordenar semanas cronológicamente
  const weeks = Array.from(weekMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([weekStart, count]) => ({
      weekStart,
      weekEnd: weekStart + 6 * 24 * 60 * 60 * 1000,
      completedCount: count,
      weekLabel: formatWeekLabel(weekStart),
    }));

  const average = weeks.length > 0
    ? weeks.reduce((sum, w) => sum + w.completedCount, 0) / weeks.length
    : 0;

  // Calcular tendencia (últimas 2 semanas vs promedio histórico)
  let trend = 0;
  if (weeks.length >= 2) {
    const last2Weeks = weeks.slice(-2).reduce((sum, w) => sum + w.completedCount, 0) / 2;
    trend = average > 0 ? ((last2Weeks - average) / average) * 100 : 0;
  }

  return { data: weeks, averagePerWeek: average, trend };
}

/**
 * Calcula Cumulative Flow Diagram (CFD)
 * Simula snapshots diarios del estado de columnas
 */
export async function calculateCFDMetrics(
  tasks: Task[],
  activities: Map<string, ActivityEvent[]>,
  columns: any[],
  filter: MetricsFilter,
): Promise<{
  data: CFDData[];
  bottlenecks: Array<{ column: string; daysStalled: number }>;
}> {
  const startDate = filter.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 días
  const endDate = filter.endDate || Date.now();

  // Mapeo statusId → column name
  const statusIdToName = new Map<string, string>();
  for (const col of columns) {
    statusIdToName.set(col.id, col.name);
  }

  const columnNames = columns.map((c) => c.name).sort();
  const cfdData: CFDData[] = [];

  // Crear snapshots cada día
  let currentTime = Math.floor(startDate / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
  while (currentTime <= endDate) {
    const byColumn: Record<string, number> = {};

    for (const columnName of columnNames) {
      let count = 0;
      for (const task of tasks) {
        const taskActivities = activities.get(task.id) || [];
        const statusAtTime = taskActivities
          .filter((a) => parseTimestamp(a.createdAt) <= currentTime)
          .reverse()
          .find((a) => a.type === 'status_change');

        // Determinar el estado de la tarea en este momento
        const currentStatus = statusAtTime?.payload?.to || 
          statusIdToName.get(task.statusId) || '';

        if (currentStatus === columnName) {
          count++;
        }
      }
      byColumn[columnName] = count;
    }

    cfdData.push({ timestamp: currentTime, byColumn });
    currentTime += 24 * 60 * 60 * 1000; // Siguiente día
  }

  // Detectar cuellos de botella (columnas que crecen sin moverse)
  const bottlenecks: Array<{ column: string; daysStalled: number }> = [];
  for (const column of columnNames) {
    let stalled = 0;
    let lastCount = -1;
    for (const point of cfdData) {
      const count = point.byColumn[column] || 0;
      if (count === lastCount && count > 5) {
        stalled++;
      } else {
        lastCount = count;
      }
    }
    if (stalled >= 3) {
      bottlenecks.push({ column, daysStalled: stalled });
    }
  }

  return { data: cfdData, bottlenecks };
}

/**
 * Calcula métricas de cumplimiento de fechas límite
 */
export function calculateDeadlineMetrics(
  tasks: Task[],
  cycleTimeData: CycleTimeData[],
): DeadlineMetrics {
  const tasksWithDeadline = tasks.filter((t) => t.dueDate);
  const completedWithDeadline = cycleTimeData.filter((ct) =>
    tasks.find((t) => t.id === ct.taskId && t.dueDate),
  );

  let completedOnTime = 0;
  const overdueTasks = [];

  for (const completed of completedWithDeadline) {
    const task = tasks.find((t) => t.id === completed.taskId);
    if (!task?.dueDate) continue;

    const dueTime = parseTimestamp(task.dueDate);
    if (completed.completedAt <= dueTime) {
      completedOnTime++;
    }
  }

  // Tareas aún pendientes con fecha vencida
  const now = Date.now();
  const completedTaskIds = new Set(cycleTimeData.map((ct) => ct.taskId));
  
  for (const task of tasks) {
    // Saltar si ya está completada (aparece en cycleTimeData)
    if (completedTaskIds.has(task.id) || !task.dueDate) continue;
    
    const dueTime = parseTimestamp(task.dueDate);
    if (dueTime < now) {
      const daysOverdue = Math.floor((now - dueTime) / (1000 * 60 * 60 * 24));
      overdueTasks.push({
        taskId: task.id,
        taskTitle: task.title,
        dueDate: task.dueDate,
        daysOverdue,
      });
    }
  }

  const total = completedWithDeadline.length;
  const onTimePercentage = total > 0 ? (completedOnTime / total) * 100 : 0;

  return {
    onTimePercentage,
    totalWithDeadline: tasksWithDeadline.length,
    completedOnTime,
    overdueTasks: overdueTasks.sort((a, b) => b.daysOverdue - a.daysOverdue),
  };
}

// ============================================================================
// API PRINCIPAL
// ============================================================================

/**
 * Calcula todas las métricas del dashboard en paralelo
 * Optimizado para completarse en <2 segundos con 500+ tareas
 */
export async function calculateMetricsDashboard(
  boardId?: string,
  filter: MetricsFilter = {},
): Promise<MetricsDashboardData> {
  const startTime = performance.now();

  // Cargar datos en paralelo
  const [tasks, columns] = await Promise.all([getAllTasks(), getAllColumns()]);

  // Filtrar tareas por tablero si es necesario
  const tasksInBoard = boardId
    ? tasks.filter((t) => t.boardId === boardId)
    : tasks;

  // Cargar actividades de las últimas 90 días
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const activities = await getActivitiesByDateRange(ninetyDaysAgo, Date.now());

  // Mapear actividades por taskId para acceso O(1)
  const activitiesByTask = new Map<string, ActivityEvent[]>();
  for (const activity of activities) {
    if (!activitiesByTask.has(activity.taskId)) {
      activitiesByTask.set(activity.taskId, []);
    }
    activitiesByTask.get(activity.taskId)!.push(activity);
  }

  // Calcular métricas en paralelo
  const [cycleTimeMetrics, cfdMetrics] = await Promise.all([
    calculateCycleTimeMetrics(tasksInBoard, activitiesByTask, filter),
    calculateCFDMetrics(tasksInBoard, activitiesByTask, columns, filter),
  ]);

  const throughputMetrics = calculateThroughputMetrics(cycleTimeMetrics.data);
  const deadlineMetrics = calculateDeadlineMetrics(
    tasksInBoard,
    cycleTimeMetrics.data,
  );

  const endTime = performance.now();
  console.log(`[Metrics] Calculated in ${(endTime - startTime).toFixed(2)}ms`);

  return {
    cycleTime: {
      data: cycleTimeMetrics.data,
      percentiles: cycleTimeMetrics.percentiles,
      average: cycleTimeMetrics.average,
      count: cycleTimeMetrics.data.length,
    },
    throughput: throughputMetrics,
    cfd: cfdMetrics,
    deadlines: deadlineMetrics,
    dateRange: {
      start: filter.startDate || ninetyDaysAgo,
      end: filter.endDate || Date.now(),
      label: filter.startDate ? 'Custom' : 'Last 90 days',
    },
  };
}
