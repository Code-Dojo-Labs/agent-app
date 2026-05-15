/**
 * Tipos e interfaces para el Dashboard de Métricas Kanban (US-45)
 * Incluye cálculos de Cycle Time, Throughput, CFD y métricas de cumplimiento
 */

export interface CycleTimeData {
  taskId: string;
  taskTitle: string;
  completedAt: number; // timestamp
  cycleTimeHours: number;
  cycleTimeDays: number;
}

export interface PercentileData {
  p50: number;
  p85: number;
  p95: number;
}

export interface ThroughputData {
  weekStart: number; // timestamp
  weekEnd: number; // timestamp
  completedCount: number;
  weekLabel: string; // ej: "May 05-11"
}

export interface CFDPoint {
  timestamp: number;
  columnName: string;
  count: number;
}

export interface CFDData {
  timestamp: number;
  byColumn: Record<string, number>; // ej: { "To Do": 5, "In Progress": 3, "Done": 12 }
}

export interface DeadlineMetrics {
  onTimePercentage: number;
  totalWithDeadline: number;
  completedOnTime: number;
  overdueTasks: Array<{
    taskId: string;
    taskTitle: string;
    dueDate: string;
    daysOverdue: number;
  }>;
}

export interface MetricsFilter {
  labelIds?: string[];
  assignedTo?: string[];
  startDate?: number; // timestamp
  endDate?: number; // timestamp
}

export interface MetricsDashboardData {
  cycleTime: {
    data: CycleTimeData[];
    percentiles: PercentileData;
    average: number;
    count: number;
  };
  throughput: {
    data: ThroughputData[];
    averagePerWeek: number;
    trend: number; // variación porcentual últimas 2 semanas
  };
  cfd: {
    data: CFDData[];
    bottlenecks: Array<{ column: string; daysStalled: number }>;
  };
  deadlines: DeadlineMetrics;
  dateRange: {
    start: number;
    end: number;
    label: string;
  };
}
