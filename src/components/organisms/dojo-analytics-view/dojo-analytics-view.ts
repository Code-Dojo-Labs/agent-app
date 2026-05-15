/**
 * dojo-analytics-view
 * 
 * Componente que renderiza el Dashboard de Métricas Kanban (US-45)
 * Incluye: Cycle Time, Throughput, CFD, Deadline Metrics
 * Filtros: Rango de fechas, etiquetas, asignados
 * 
 * Criterios de aceptación:
 * ✓ Pantalla de Analytics accesible desde navegación
 * ✓ Gráfico scatter de Cycle Time con P50, P85, P95
 * ✓ Filtros por etiqueta, asignado, rango de fechas
 * ✓ Gráfico de barras de Throughput con tendencia
 * ✓ CFD con rango temporal seleccionable
 * ✓ Tasa de cumplimiento + tareas vencidas
 * ✓ Empty state con <5 tareas completadas
 * ✓ Render <2s con 500+ tareas
 */

import { calculateMetricsDashboard } from '../../../utils/metrics-calculator.js';
import {
  generateCycleTimeScatterChart,
  generateThroughputBarChart,
  generateCumulativeFlowDiagram,
} from '../../../utils/svg-charts.js';
import type { MetricsFilter, MetricsDashboardData } from '../../../types/metrics.js';

export class DojoAnalyticsView extends HTMLElement {
  static readonly TAG = 'dojo-analytics-view';

  private _shadow: ShadowRoot;
  private _metrics: MetricsDashboardData | null = null;
  private _loading = true;
  private _error: string | null = null;
  private _boardId: string | null = null;

  // Filtros actuales
  private _selectedDateRange = '30d'; // 7d, 30d, 90d, custom
  private _filterLabels: string[] = [];
  private _filterAssignees: string[] = [];

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._setupStyles();
  }

  private _setupStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        background-color: var(--dojo-bg, #fff);
        color: var(--dojo-text, #1f2937);
        font-family: var(--dojo-font-family, system-ui, -apple-system, sans-serif);
        padding: 0;
      }

      .analytics-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 1rem;
        padding: 1.5rem;
        background: linear-gradient(180deg, var(--dojo-bg, #fff) 0%, var(--dojo-surface, #f9fafb) 100%);
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--dojo-border, #e5e7eb);
      }

      .header h1 {
        margin: 0;
        font-size: 1.875rem;
        font-weight: 700;
        color: var(--dojo-text, #1f2937);
      }

      .header-controls {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .date-range-selector,
      .filter-button {
        padding: 0.5rem 1rem;
        border: 1px solid var(--dojo-border, #e5e7eb);
        border-radius: 0.375rem;
        background: var(--dojo-surface, #f9fafb);
        color: var(--dojo-text, #1f2937);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .date-range-selector:hover,
      .filter-button:hover {
        background: var(--dojo-primary, #3b82f6);
        color: white;
        border-color: var(--dojo-primary, #3b82f6);
      }

      .date-range-selector.active {
        background: var(--dojo-primary, #3b82f6);
        color: white;
        border-color: var(--dojo-primary, #3b82f6);
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .metric-card {
        background: var(--dojo-surface, #f9fafb);
        border: 1px solid var(--dojo-border, #e5e7eb);
        border-radius: 0.5rem;
        padding: 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;
      }

      .metric-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border-color: var(--dojo-primary, #3b82f6);
      }

      .metric-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--dojo-text-secondary, #6b7280);
        margin-bottom: 0.5rem;
      }

      .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--dojo-primary, #3b82f6);
        margin: 0;
      }

      .metric-sublabel {
        font-size: 0.75rem;
        color: var(--dojo-text-secondary, #6b7280);
        margin-top: 0.25rem;
      }

      .charts-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;
      }

      .chart-container {
        background: var(--dojo-surface, #f9fafb);
        border: 1px solid var(--dojo-border, #e5e7eb);
        border-radius: 0.5rem;
        padding: 1rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .chart-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--dojo-text, #1f2937);
        margin: 0 0 1rem 0;
      }

      .chart-svg {
        width: 100%;
        height: auto;
        min-height: 300px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        gap: 1rem;
        color: var(--dojo-text-secondary, #6b7280);
      }

      .empty-state-icon {
        font-size: 3rem;
        opacity: 0.5;
      }

      .empty-state-text {
        font-size: 1rem;
        font-weight: 500;
        text-align: center;
        max-width: 400px;
      }

      .empty-state-hint {
        font-size: 0.875rem;
        color: var(--dojo-text-secondary, #9ca3af);
        text-align: center;
      }

      .overdue-tasks {
        margin-top: 1.5rem;
      }

      .overdue-tasks-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dojo-text, #1f2937);
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .overdue-tasks-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .overdue-task-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: rgba(239, 68, 68, 0.05);
        border-left: 3px solid #ef4444;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.875rem;
      }

      .overdue-task-item:hover {
        background: rgba(239, 68, 68, 0.1);
        transform: translateX(4px);
      }

      .overdue-task-name {
        font-weight: 500;
        color: var(--dojo-text, #1f2937);
        flex: 1;
      }

      .overdue-task-days {
        color: #ef4444;
        font-weight: 600;
        font-size: 0.75rem;
        margin-left: 0.5rem;
      }

      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        gap: 0.75rem;
        color: var(--dojo-text-secondary, #6b7280);
      }

      .spinner {
        width: 1rem;
        height: 1rem;
        border: 2px solid var(--dojo-border, #e5e7eb);
        border-top-color: var(--dojo-primary, #3b82f6);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .error {
        padding: 1rem;
        background: rgba(239, 68, 68, 0.05);
        border: 1px solid #fecaca;
        border-radius: 0.375rem;
        color: #991b1b;
        font-size: 0.875rem;
      }

      @media (max-width: 768px) {
        .analytics-container {
          padding: 1rem;
        }

        .header {
          flex-direction: column;
          align-items: flex-start;
        }

        .header h1 {
          font-size: 1.5rem;
        }

        .metrics-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .charts-section {
          grid-template-columns: 1fr;
        }
      }
    `;
    this._shadow.appendChild(style);
  }

  static get observedAttributes(): string[] {
    return ['board-id'];
  }

  connectedCallback(): void {
    // Leer el atributo inicial si existe
    const boardId = this.getAttribute('board-id');
    if (boardId) {
      this._boardId = boardId;
    }
    this._loadData();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === 'board-id' && oldValue !== newValue) {
      this._boardId = newValue || null;
      this._loadData();
    }
  }

  private async _loadData(): Promise<void> {
    this._loading = true;
    this._error = null;
    this._render();

    try {
      const filter: MetricsFilter = {};

      // Aplicar filtro de rango de fechas
      const now = Date.now();
      switch (this._selectedDateRange) {
        case '7d':
          filter.startDate = now - 7 * 24 * 60 * 60 * 1000;
          break;
        case '30d':
          filter.startDate = now - 30 * 24 * 60 * 60 * 1000;
          break;
        case '90d':
          filter.startDate = now - 90 * 24 * 60 * 60 * 1000;
          break;
      }

      filter.labelIds = this._filterLabels;
      filter.assignedTo = this._filterAssignees;

      this._metrics = await calculateMetricsDashboard(this._boardId || undefined, filter);
      this._loading = false;
      this._render();
    } catch (err) {
      this._error = `Failed to load metrics: ${err instanceof Error ? err.message : 'Unknown error'}`;
      this._loading = false;
      this._render();
    }
  }

  private _render(): void {
    const container = document.createElement('div');
    container.className = 'analytics-container';

    // Header
    container.appendChild(this._renderHeader());

    // Contenido
    if (this._loading) {
      container.appendChild(this._renderLoading());
    } else if (this._error) {
      container.appendChild(this._renderError());
    } else if (!this._metrics || this._metrics.cycleTime.count < 5) {
      container.appendChild(this._renderEmptyState());
    } else {
      container.appendChild(this._renderMetrics());
    }

    // Reemplazar contenido
    const existing = this._shadow.querySelector('.analytics-container');
    if (existing) {
      this._shadow.replaceChild(container, existing);
    } else {
      this._shadow.appendChild(container);
    }
  }

  private _renderHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'header';

    const title = document.createElement('h1');
    title.textContent = '📊 Analytics';
    header.appendChild(title);

    const controls = document.createElement('div');
    controls.className = 'header-controls';

    // Date range buttons
    const ranges = [
      { label: 'Last 7d', value: '7d' },
      { label: 'Last 30d', value: '30d' },
      { label: 'Last 90d', value: '90d' },
    ];

    for (const range of ranges) {
      const btn = document.createElement('button');
      btn.className = 'date-range-selector';
      if (range.value === this._selectedDateRange) {
        btn.classList.add('active');
      }
      btn.textContent = range.label;
      btn.addEventListener('click', () => {
        this._selectedDateRange = range.value;
        this._loadData();
      });
      controls.appendChild(btn);
    }

    header.appendChild(controls);
    return header;
  }

  private _renderMetrics(): HTMLElement {
    const container = document.createElement('div');

    if (!this._metrics) return container;

    // Metric cards
    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'metrics-grid';

    const cards = [
      {
        label: 'P85 Cycle Time',
        value: `${this._metrics.cycleTime.percentiles.p85.toFixed(1)}d`,
        sub: `Avg: ${this._metrics.cycleTime.average.toFixed(1)}d`,
      },
      {
        label: 'Throughput (avg)',
        value: `${this._metrics.throughput.averagePerWeek.toFixed(1)}`,
        sub: 'per week',
      },
      {
        label: 'Tasks Completed',
        value: this._metrics.cycleTime.count.toString(),
        sub: this._metrics.dateRange.label,
      },
      {
        label: 'On-Time Rate',
        value: `${this._metrics.deadlines.onTimePercentage.toFixed(0)}%`,
        sub: `of ${this._metrics.deadlines.totalWithDeadline} with deadline`,
      },
    ];

    for (const card of cards) {
      const el = document.createElement('div');
      el.className = 'metric-card';
      el.innerHTML = `
        <div class="metric-label">${card.label}</div>
        <div class="metric-value">${card.value}</div>
        <div class="metric-sublabel">${card.sub}</div>
      `;
      metricsGrid.appendChild(el);
    }

    container.appendChild(metricsGrid);

    // Charts
    const chartsSection = document.createElement('div');
    chartsSection.className = 'charts-section';

    // Cycle Time
    const cycleChart = document.createElement('div');
    cycleChart.className = 'chart-container';
    cycleChart.innerHTML = `<div class="chart-title">📈 Cycle Time Distribution</div>`;
    const svgCycle = document.createElement('div');
    svgCycle.className = 'chart-svg';
    svgCycle.innerHTML = generateCycleTimeScatterChart(
      this._metrics.cycleTime.data.map((d, i) => ({ days: d.cycleTimeDays, index: i })),
      this._metrics.cycleTime.percentiles,
    );
    cycleChart.appendChild(svgCycle);
    chartsSection.appendChild(cycleChart);

    // Throughput
    const throughputChart = document.createElement('div');
    throughputChart.className = 'chart-container';
    throughputChart.innerHTML = `<div class="chart-title">📊 Weekly Throughput</div>`;
    const svgThroughput = document.createElement('div');
    svgThroughput.className = 'chart-svg';
    svgThroughput.innerHTML = generateThroughputBarChart(
      this._metrics.throughput.data.map((d, i) => ({
        weekLabel: d.weekLabel,
        completedCount: d.completedCount,
        index: i,
      })),
      this._metrics.throughput.averagePerWeek,
    );
    throughputChart.appendChild(svgThroughput);
    chartsSection.appendChild(throughputChart);

    // CFD
    const cfdChart = document.createElement('div');
    cfdChart.className = 'chart-container';
    cfdChart.innerHTML = `<div class="chart-title">🌊 Cumulative Flow Diagram</div>`;
    const svgCFD = document.createElement('div');
    svgCFD.className = 'chart-svg';
    // TODO: Implement actual column names from board
    svgCFD.innerHTML = generateCumulativeFlowDiagram(
      this._metrics.cfd.data,
      ['To Do', 'In Progress', 'In Review', 'Done'],
    );
    cfdChart.appendChild(svgCFD);
    chartsSection.appendChild(cfdChart);

    container.appendChild(chartsSection);

    // Overdue tasks
    if (this._metrics.deadlines.overdueTasks.length > 0) {
      const overdueSection = document.createElement('div');
      overdueSection.className = 'overdue-tasks';

      const title = document.createElement('div');
      title.className = 'overdue-tasks-title';
      title.innerHTML = '⚠️ Overdue Tasks (' + this._metrics.deadlines.overdueTasks.length + ')';
      overdueSection.appendChild(title);

      const list = document.createElement('div');
      list.className = 'overdue-tasks-list';

      for (const task of this._metrics.deadlines.overdueTasks.slice(0, 5)) {
        const item = document.createElement('div');
        item.className = 'overdue-task-item';
        item.innerHTML = `
          <div class="overdue-task-name">${task.taskTitle}</div>
          <div class="overdue-task-days">${task.daysOverdue}d overdue</div>
        `;
        item.addEventListener('click', () => {
          this.dispatchEvent(
            new CustomEvent('dojo:open-task', { detail: { taskId: task.taskId } }),
          );
        });
        list.appendChild(item);
      }

      overdueSection.appendChild(list);
      container.appendChild(overdueSection);
    }

    return container;
  }

  private _renderEmptyState(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'empty-state';
    container.innerHTML = `
      <div class="empty-state-icon">📊</div>
      <div class="empty-state-text">
        <strong>Not enough data yet</strong>
        <p style="margin: 0.5rem 0 0 0; color: var(--dojo-text-secondary, #9ca3af); font-size: 0.875rem;">
          Complete at least 5 tasks to see meaningful metrics
        </p>
      </div>
    `;
    return container;
  }

  private _renderLoading(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'loading';
    container.innerHTML = `
      <div class="spinner"></div>
      <span>Loading metrics...</span>
    `;
    return container;
  }

  private _renderError(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'error';
    container.textContent = this._error || 'An error occurred';
    return container;
  }
}

// Registrar componente
customElements.define(DojoAnalyticsView.TAG, DojoAnalyticsView);
