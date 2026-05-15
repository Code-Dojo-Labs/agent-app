/**
 * SVG Chart Generator para Dashboard de Métricas Kanban (US-45)
 * Genera gráficos scatter, barras y áreas sin dependencias externas
 */

// ============================================================================
// UTILIDADES COMUNES
// ============================================================================

interface ChartConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

interface Scale {
  min: number;
  max: number;
  domain: [number, number];
  range: [number, number];
}

/**
 * Crea una escala lineal para mapear valores a píxeles
 * 
 * ✅ Maneja caso borde: Si max === min, devuelve función que mapea al centro del rango
 * para evitar división por cero (Infinity).
 */
function createScale(min: number, max: number, domainMin: number, domainMax: number): (v: number) => number {
  if (max === min) {
    // Caso borde: todos los valores son iguales → devolver centro del rango
    const center = (domainMin + domainMax) / 2;
    return () => center;
  }
  const scale = (domainMax - domainMin) / (max - min);
  return (v) => domainMin + (v - min) * scale;
}

/**
 * Formatea un número para eje Y (ej: 3.2d, 12 tasks)
 */
function formatAxisLabel(value: number, type: 'days' | 'count' | 'percentage'): string {
  switch (type) {
    case 'days':
      return value.toFixed(1) + 'd';
    case 'percentage':
      return value.toFixed(0) + '%';
    case 'count':
    default:
      return Math.round(value).toString();
  }
}

// ============================================================================
// SCATTER CHART (CYCLE TIME)
// ============================================================================

export function generateCycleTimeScatterChart(
  data: Array<{ days: number; index: number }>,
  percentiles: { p50: number; p85: number; p95: number },
  width = 600,
  height = 300,
): string {
  const config: ChartConfig = {
    width,
    height,
    margin: { top: 20, right: 40, bottom: 50, left: 60 },
  };

  const plotWidth = config.width - config.margin.left - config.margin.right;
  const plotHeight = config.height - config.margin.top - config.margin.bottom;

  if (data.length === 0) {
    return createEmptyChart(config);
  }

  // Escalas
  const maxDays = Math.max(...data.map((d) => d.days), percentiles.p95);
  const xScale = createScale(0, data.length - 1, 0, plotWidth);
  const yScale = createScale(0, maxDays * 1.1, plotHeight, 0);

  // Elemento SVG raíz con atributos de accesibilidad (WCAG 2.1 AA - 1.1.1 Non-text Content)
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" role="img" aria-label="Cycle time distribution: P50 ${percentiles.p50.toFixed(1)}d, P85 ${percentiles.p85.toFixed(1)}d, P95 ${percentiles.p95.toFixed(1)}d" preserveAspectRatio="xMidYMid meet" class="chart-scatter">`;
  svg += `<title>Cycle Time Distribution</title>`;
  svg += `<desc>Scatter plot showing cycle time for ${data.length} completed tasks. P50: ${percentiles.p50.toFixed(1)} days, P85: ${percentiles.p85.toFixed(1)} days, P95: ${percentiles.p95.toFixed(1)} days.</desc>`;

  // Fondo
  svg += `<rect width="${config.width}" height="${config.height}" fill="var(--dojo-bg, #fff)"/>`;

  // Grupo principal
  svg += `<g transform="translate(${config.margin.left}, ${config.margin.top})">`;

  // Líneas de percentiles (P50, P85, P95)
  const percentileColors = { p50: '#9ca3af', p85: '#f59e0b', p95: '#ef4444' };
  for (const [key, value] of Object.entries(percentiles)) {
    const y = yScale(value);
    const color = percentileColors[key as keyof typeof percentileColors];
    svg += `<line x1="0" y1="${y}" x2="${plotWidth}" y2="${y}" stroke="${color}" stroke-dasharray="4" opacity="0.6"/>`;
    svg += `<text x="${plotWidth + 5}" y="${y + 4}" font-size="11" fill="${color}">${key.toUpperCase()}: ${value.toFixed(1)}d</text>`;
  }

  // Puntos de datos (scatter)
  for (const point of data) {
    const x = xScale(point.index);
    const y = yScale(point.days);
    svg += `<circle cx="${x}" cy="${y}" r="3" fill="var(--dojo-primary, #3b82f6)" opacity="0.7" class="chart-point"/>`;
  }

  // Eje X
  svg += `<line x1="0" y1="${plotHeight}" x2="${plotWidth}" y2="${plotHeight}" stroke="var(--dojo-border, #e5e7eb)"/>`;

  // Eje Y
  svg += `<line x1="0" y1="0" x2="0" y2="${plotHeight}" stroke="var(--dojo-border, #e5e7eb)"/>`;

  // Labels eje Y
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const value = (maxDays * i) / yTicks;
    const y = yScale(value);
    svg += `<line x1="-5" y1="${y}" x2="0" y2="${y}" stroke="var(--dojo-border, #e5e7eb)"/>`;
    svg += `<text x="-10" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--dojo-text, #666)">${formatAxisLabel(value, 'days')}</text>`;
  }

  // Label eje X (con muestreo)
  const xLabelInterval = Math.ceil(data.length / 6);
  for (let i = 0; i < data.length; i += xLabelInterval) {
    const x = xScale(i);
    svg += `<line x1="${x}" y1="${plotHeight}" x2="${x}" y2="${plotHeight + 5}" stroke="var(--dojo-border, #e5e7eb)"/>`;
    svg += `<text x="${x}" y="${plotHeight + 20}" text-anchor="middle" font-size="10" fill="var(--dojo-text, #666)">Task ${i + 1}</text>`;
  }

  svg += `</g>`;
  svg += `</svg>`;

  return svg;
}

// ============================================================================
// BAR CHART (THROUGHPUT)
// ============================================================================

export function generateThroughputBarChart(
  data: Array<{ weekLabel: string; completedCount: number; index: number }>,
  average: number,
  width = 600,
  height = 300,
): string {
  const config: ChartConfig = {
    width,
    height,
    margin: { top: 20, right: 40, bottom: 50, left: 60 },
  };

  const plotWidth = config.width - config.margin.left - config.margin.right;
  const plotHeight = config.height - config.margin.top - config.margin.bottom;

  if (data.length === 0) {
    return createEmptyChart(config);
  }

  const maxCount = Math.max(...data.map((d) => d.completedCount), average) * 1.2;
  const barWidth = Math.max(plotWidth / data.length - 4, 1);
  const xScale = createScale(0, data.length - 1, 0, plotWidth);
  const yScale = createScale(0, maxCount, plotHeight, 0);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" role="img" aria-label="Weekly throughput: ${average.toFixed(1)} tasks per week on average across ${data.length} weeks" preserveAspectRatio="xMidYMid meet" class="chart-bar">`;
  svg += `<title>Weekly Throughput</title>`;
  svg += `<desc>Bar chart showing tasks completed per week. Average throughput: ${average.toFixed(1)} tasks/week over ${data.length} weeks.</desc>`;

  svg += `<rect width="${config.width}" height="${config.height}" fill="var(--dojo-bg, #fff)"/>`;

  svg += `<g transform="translate(${config.margin.left}, ${config.margin.top})">`;

  // Línea de promedio (trend)
  const trendY = yScale(average);
  svg += `<line x1="0" y1="${trendY}" x2="${plotWidth}" y2="${trendY}" stroke="#10b981" stroke-dasharray="4" opacity="0.6"/>`;
  svg += `<text x="5" y="${trendY - 5}" font-size="11" fill="#10b981">Avg: ${average.toFixed(1)}</text>`;

  // Barras
  for (const bar of data) {
    const x = xScale(bar.index);
    const barHeight = yScale(0) - yScale(bar.completedCount);
    const barX = x - barWidth / 2;

    svg += `<rect x="${barX}" y="${yScale(bar.completedCount)}" width="${barWidth}" height="${barHeight}" fill="var(--dojo-primary, #3b82f6)" opacity="0.8" class="chart-bar-item"/>`;
  }

  // Eje X
  svg += `<line x1="0" y1="${plotHeight}" x2="${plotWidth}" y2="${plotHeight}" stroke="var(--dojo-border, #e5e7eb)"/>`;

  // Eje Y
  svg += `<line x1="0" y1="0" x2="0" y2="${plotHeight}" stroke="var(--dojo-border, #e5e7eb)"/>`;

  // Labels eje Y
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const value = (maxCount * i) / yTicks;
    const y = yScale(value);
    svg += `<line x1="-5" y1="${y}" x2="0" y2="${y}" stroke="var(--dojo-border, #e5e7eb)"/>`;
    svg += `<text x="-10" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--dojo-text, #666)">${formatAxisLabel(value, 'count')}</text>`;
  }

  // Labels eje X (semanas)
  const labelInterval = Math.ceil(data.length / 6);
  for (let i = 0; i < data.length; i += labelInterval) {
    const x = xScale(i);
    svg += `<text x="${x}" y="${plotHeight + 20}" text-anchor="middle" font-size="10" fill="var(--dojo-text, #666)">${data[i].weekLabel}</text>`;
  }

  svg += `</g>`;
  svg += `</svg>`;

  return svg;
}

// ============================================================================
// AREA CHART (CFD)
// ============================================================================

export function generateCumulativeFlowDiagram(
  data: Array<{ timestamp: number; byColumn: Record<string, number> }>,
  columnNames: string[],
  width = 600,
  height = 300,
): string {
  const config: ChartConfig = {
    width,
    height,
    margin: { top: 20, right: 40, bottom: 50, left: 60 },
  };

  const plotWidth = config.width - config.margin.left - config.margin.right;
  const plotHeight = config.height - config.margin.top - config.margin.bottom;

  if (data.length === 0) {
    return createEmptyChart(config);
  }

  // Calcular totales acumulativos
  const maxTotal = Math.max(
    ...data.map((d) => Object.values(d.byColumn).reduce((a, b) => a + b, 0)),
  );

  const xScale = createScale(0, data.length - 1, 0, plotWidth);
  const yScale = createScale(0, maxTotal * 1.1, plotHeight, 0);

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" role="img" aria-label="Cumulative flow diagram across ${columnNames.length} columns: ${columnNames.join(', ')}" preserveAspectRatio="xMidYMid meet" class="chart-cfd">`;
  svg += `<title>Cumulative Flow Diagram</title>`;
  svg += `<desc>Stacked area chart showing task accumulation across workflow columns: ${columnNames.join(', ')}. Data points: ${data.length}.</desc>`;

  svg += `<rect width="${config.width}" height="${config.height}" fill="var(--dojo-bg, #fff)"/>`;

  svg += `<g transform="translate(${config.margin.left}, ${config.margin.top})">`;

  // Renderizar áreas apiladas
  const cumulativeData: Array<Record<string, number>> = [];
  for (const point of data) {
    const cumulative: Record<string, number> = {};
    let total = 0;
    for (const column of columnNames) {
      total += point.byColumn[column] || 0;
      cumulative[column] = total;
    }
    cumulativeData.push(cumulative);
  }

  // Dibujar áreas de atrás hacia adelante
  for (let colIdx = columnNames.length - 1; colIdx >= 0; colIdx--) {
    const column = columnNames[colIdx];
    const color = colors[colIdx % colors.length];

    // Construir path del área
    let pathD = `M 0 ${yScale(cumulativeData[0][column])}`;

    for (let i = 1; i < cumulativeData.length; i++) {
      const x = xScale(i);
      const y = yScale(cumulativeData[i][column]);
      pathD += ` L ${x} ${y}`;
    }

    // Cerrar el área
    for (let i = cumulativeData.length - 1; i >= 0; i--) {
      const x = xScale(i);
      const prevY = colIdx > 0 ? yScale(cumulativeData[i][columnNames[colIdx - 1]]) : yScale(0);
      pathD += ` L ${x} ${prevY}`;
    }
    pathD += ' Z';

    svg += `<path d="${pathD}" fill="${color}" opacity="0.7" class="cfd-area"/>`;
  }

  // Eje X
  svg += `<line x1="0" y1="${plotHeight}" x2="${plotWidth}" y2="${plotHeight}" stroke="var(--dojo-border, #e5e7eb)"/>`;

  // Eje Y
  svg += `<line x1="0" y1="0" x2="0" y2="${plotHeight}" stroke="var(--dojo-border, #e5e7eb)"/>`;

  // Labels eje Y
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const value = (maxTotal * i) / yTicks;
    const y = yScale(value);
    svg += `<line x1="-5" y1="${y}" x2="0" y2="${y}" stroke="var(--dojo-border, #e5e7eb)"/>`;
    svg += `<text x="-10" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--dojo-text, #666)">${formatAxisLabel(value, 'count')}</text>`;
  }

  svg += `</g>`;

  // Leyenda
  let legendX = config.margin.left;
  let legendY = config.height - 20;
  for (let i = 0; i < columnNames.length; i++) {
    const color = colors[i % colors.length];
    svg += `<rect x="${legendX}" y="${legendY}" width="12" height="12" fill="${color}" opacity="0.7"/>`;
    svg += `<text x="${legendX + 16}" y="${legendY + 10}" font-size="10" fill="var(--dojo-text, #666)">${columnNames[i]}</text>`;
    legendX += Math.max(120, columnNames[i].length * 8);
  }

  svg += `</svg>`;

  return svg;
}

// ============================================================================
// ESTADO VACÍO
// ============================================================================

function createEmptyChart(config: ChartConfig): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" role="img" aria-label="No data available" class="chart-empty">
      <title>No data available</title>
      <rect width="${config.width}" height="${config.height}" fill="var(--dojo-bg, #f9fafb)"/>
      <text x="${config.width / 2}" y="${config.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="var(--dojo-text-secondary, #9ca3af)">
        No data available
      </text>
    </svg>
  `;
}
