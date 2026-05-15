# IMP-14 — Dashboard de Métricas Kanban: Cycle Time, Throughput y Burndown

> Versión: 1.0
> Fecha: 2026-05-12
> Estado: Propuesta

---

## Problema que Resuelve

La aplicación gestiona tareas eficientemente, pero **no ofrece visibilidad del rendimiento del flujo de trabajo**. Los usuarios no pueden responder preguntas como:

- ¿Cuánto tiempo tardé en completar tareas esta semana?
- ¿Cuáles son mis cuellos de botella (columnas donde las tareas se estancan)?
- ¿A qué ritmo estoy completando trabajo? ¿Es sostenible?
- ¿Qué porcentaje de mis tareas se completan antes de su fecha límite?

Sin estas métricas, la gestión es reactiva. Con ellas, se puede **mejorar el proceso continuamente** (filosofía Kaizen del método Kanban).

---

## Propuesta de Solución

Crear una pantalla de **Analytics / Dashboard** accesible desde la barra de navegación principal, con visualizaciones interactivas calculadas a partir del historial de actividad existente (`activity_log`).

### Métricas Propuestas

#### 1. Cycle Time (Tiempo de Ciclo)
**Definición:** Tiempo entre que una tarea entra en "En progreso" y se marca como "Hecha".

- Gráfico de dispersión (scatter plot) de las últimas N tareas completadas.
- Líneas de percentil P50, P85, P95 para predecir tiempos futuros.
- Filtrable por etiqueta, persona asignada o rango de fechas.

#### 2. Lead Time (Tiempo de Entrega)
**Definición:** Tiempo total desde la creación de la tarea hasta su finalización.

- Histograma de distribución de Lead Time.
- Comparativa Lead Time vs Cycle Time (cuánto tiempo pasan las tareas esperando vs siendo trabajadas).

#### 3. Throughput (Velocidad de Entrega)
**Definición:** Número de tareas completadas por unidad de tiempo (día/semana).

- Gráfico de barras apiladas por semana.
- Línea de tendencia (media móvil de 4 semanas).
- Desglose por columna de destino (completadas en "Hecho" vs archivadas).

#### 4. Cumulative Flow Diagram (CFD)
**Definición:** Área apilada que muestra la distribución de tareas por columna a lo largo del tiempo.

- Permite identificar cuellos de botella visualmente (cuando un área crece sin que la de arriba crezca).
- Rango temporal seleccionable (última semana, mes, trimestre).

#### 5. Tasa de Cumplimiento de Fechas Límite
- % de tareas completadas antes de su `due_date`.
- Tareas vencidas pendientes (con enlace directo a la tarea).

### Componentes de UI

```
┌────────────────────────────────────────────────────────┐
│  📊 Analytics — [Último mes ▾]   [Tablero: Principal ▾]│
├──────────────┬──────────────┬──────────────┬───────────┤
│  Cycle Time  │  Throughput  │  Completadas │  En curso │
│  P85: 3.2d   │  8.4 / sem   │  47 tareas   │  12       │
├──────────────┴──────────────┴──────────────┴───────────┤
│                                                        │
│        Cumulative Flow Diagram                         │
│        ┌────────────────────────────────────┐          │
│        │▓▓▓▓▓▓▓▓▓▓ Hecho                    │          │
│        │░░░░░ En revisión                   │          │
│        │▒▒▒▒▒▒▒▒▒▒ En progreso              │          │
│        │████ Por hacer                      │          │
│        └────────────────────────────────────┘          │
│                                                        │
├────────────────────────┬───────────────────────────────┤
│   Cycle Time Scatter   │   Throughput por semana       │
│   ·   ·  ·             │   ████ ██ ████ ██             │
│     ·   · P85─────     │                               │
└────────────────────────┴───────────────────────────────┘
```

### Implementación Técnica

#### Fuente de Datos
- Calcular métricas a partir de `activity_log` (ya registra cambios de columna con timestamp).
- Enriquecer el log con eventos `task_moved_to_in_progress` y `task_completed` si no existen.

#### Librería de Gráficos
- Usar **D3.js** (ligero, sin dependencias de framework) o **Chart.js** (más fácil de integrar).
- Preferencia: **Chart.js v4** por su menor curva de aprendizaje y soporte nativo de Web Components.

#### Nuevo Componente

```
src/components/organisms/dojo-analytics/
  dojo-analytics.ts          — Componente principal (pantalla)
  dojo-analytics.css
  dojo-cycle-time-chart.ts   — Gráfico scatter de cycle time
  dojo-throughput-chart.ts   — Barras de throughput
  dojo-cfd-chart.ts          — Cumulative Flow Diagram
```

#### Cálculo de Métricas (Web Worker)
Para no bloquear el hilo principal con cálculos sobre datasets grandes, los cálculos se ejecutan en un **Web Worker**:

```typescript
// src/workers/metrics.worker.ts
self.onmessage = ({ data: { activityLog, tasks } }) => {
  const cycleTimeData = calculateCycleTime(activityLog, tasks);
  const throughputData = calculateThroughput(activityLog);
  const cfdData = calculateCFD(activityLog, tasks);
  self.postMessage({ cycleTimeData, throughputData, cfdData });
};
```

---

## Criterios de Aceptación

- [ ] Existe una pantalla de Analytics accesible desde la navegación principal.
- [ ] Se muestran al menos 5 métricas: Cycle Time (P85), Lead Time, Throughput semanal, CFD y tasa de cumplimiento de fechas.
- [ ] Los gráficos son interactivos (tooltip al hover con datos del punto).
- [ ] El rango temporal es seleccionable: última semana, último mes, últimos 3 meses, todo el tiempo.
- [ ] Los cálculos no bloquean la UI (Web Worker o cálculo asíncrono).
- [ ] Cuando no hay suficientes datos (< 5 tareas completadas), se muestra un estado vacío informativo.
- [ ] Los gráficos son responsivos y se adaptan a pantallas móviles.
- [ ] El dashboard es exportable como imagen PNG (opcional, vía `canvas.toBlob()`).

---

## Dependencias

- US-20 (Historial de actividad) debe estar implementado y registrar cambios de columna con timestamp.
- Para métricas precisas de Cycle Time, el `activity_log` debe registrar cuando una tarea entra y sale de cada columna.

---

## Valor de Negocio

Esta funcionalidad transforma la app de una simple **lista de tareas** a una herramienta de **gestión de flujo de trabajo** con capacidad de mejora continua. Es el diferenciador que justifica el uso de la app frente a alternativas como Trello o Notion, especialmente para usuarios con mentalidad de ingeniería/agilidad.
