/**
 * US-30 BROADCAST SYNC — Documentación Técnica
 * 
 * Sistema de sincronización automática entre pestañas mediante BroadcastChannel API.
 * Permite mantener coherencia de datos sin dependencias externas ni servidor.
 *
 * @author builder
 * @date 2026-04-01
 * @references US-30
 */

# Sistema de Sincronización entre Pestañas (US-30)

## Arquitectura

### Componentes principales

1. **BroadcastSyncService** (`src/utils/broadcast-sync.ts`)
   - Singleton que gestiona el canal BroadcastChannel 'kanban-sync'
   - Emite y escucha eventos de modificación de datos
   - API tipo Observer Pattern para suscripciones

2. **Repository Interceptors** 
   - Integrados en todos los repositorios IndexedDB
   - Emiten eventos automáticamente tras operaciones CRUD
   - Eventos tipificados: `task:created`, `column:updated`, etc.

3. **UISyncManager** (`src/utils/ui-sync.ts`)
   - Escucha eventos de BroadcastChannel
   - Refresca automáticamente componentes afectados
   - Soporte para callbacks personalizados

## API de Sincronización

### Emisión de Eventos (Repositorios)

```typescript
import { emitSync } from '../utils/broadcast-sync.js';

// Emitir evento de creación
emitSync('task:created', task.id, task);

// Emitir evento de actualización
emitSync('task:updated', task.id, updatedTask);

// Emitir evento de eliminación
emitSync('task:deleted', taskId);
```

### Escucha de Eventos (Componentes)

```typescript
import { onSync, onMultipleSync } from '../utils/broadcast-sync.js';

// Suscribirse a un evento específico
const unsubscribe = onSync('task:created', (event) => {
  console.log('Nueva tarea creada:', event.payload);
  this.refreshTasksList();
});

// Suscribirse a múltiples eventos
const cleanup = onMultipleSync({
  'task:created': (event) => this.handleTaskCreated(event),
  'task:updated': (event) => this.handleTaskUpdated(event),
  'task:deleted': (event) => this.handleTaskDeleted(event)
});
```

### Refresco automático de UI

```typescript
// El UISyncManager se encarga automáticamente de:
// 1. Escuchar eventos de BroadcastChannel
// 2. Identificar componentes afectados
// 3. Llamar método refresh() si existe
// 4. Emitir evento 'sync-refresh' como fallback

// Componentes compatibles deben implementar:
class DojoKanbanBoard extends HTMLElement {
  public async refresh(): Promise<void> {
    // Recargar datos desde IndexedDB
    // Re-renderizar UI
  }
}
```

## Ciclo de Vida

### 1. Inicialización (main.ts)
```typescript
import { initializeUISync } from './utils/ui-sync.js';

// Inicializar una vez al arrancar la app
initializeUISync();
```

### 2. Operación CRUD
```typescript
// Usuario modifica una tarea en Pestaña A
await updateTask('uuid-123', { title: 'Nuevo título' });

// Automáticamente:
// 1. Repositorio emite: emitSync('task:updated', 'uuid-123', updatedTask)
// 2. BroadcastChannel propaga a Pestaña B
// 3. UISyncManager recibe evento en Pestaña B
// 4. Llama refresh() en componentes dojo-kanban-board, dojo-task-card
```

### 3. Actualización de UI
```typescript
// En Pestaña B (automático):
dojoKanbanBoard.refresh() // Recarga datos desde IndexedDB
dojoTaskCard.refresh()    // Actualiza tarjeta específica
```

## Eventos Soportados

| Tipo de Evento | Entidad | Payload | Componentes Afectados |
|---|---|---|---|
| `task:created` | Task | Task completa | kanban-board, kanban-column |
| `task:updated` | Task | Task actualizada | task-card, task-detail, kanban-board |
| `task:deleted` | Task | Solo ID | kanban-board, kanban-column |
| `task:reordered` | Task | `{ orderedIds: string[] }` | kanban-column |
| `column:created` | Column | Column completa | kanban-board, column-dialog |
| `column:updated` | Column | Column actualizada | kanban-board, kanban-column |
| `column:deleted` | Column | Solo ID | kanban-board |
| `label:created` | Label | Label completa | task-card, task-dialog, label-manager |
| `label:updated` | Label | Label actualizada | task-card, task-detail |
| `label:deleted` | Label | Solo ID | task-card, task-detail, label-manager |
| `board:created` | Board | Board completo | board-selector |
| `board:updated` | Board | Board actualizado | board-selector, kanban-board |
| `board:deleted` | Board | Solo ID | board-selector |

## Consideraciones Técnicas  

### Performance
- Eventos se propagan solo a pestañas del mismo origen
- Ignore eventos de la misma pestaña (evita loops infinitos)
- Refresco selectivo por tipo de componente
- Operaciones IndexedDB optimizadas (paralelas cuando es posible)

### Compatibilidad
- BroadcastChannel: Chrome 54+, Firefox 38+, Safari 15.4+
- Degradación elegante: funciona sin sincronización en navegadores legacy
- No requiere polyfills ni dependencias externas

### Debug y Monitoreo
```typescript
// Logs automáticos en consola:
// [UI-Sync] Task created: uuid-123
// [Kanban Board] Refrescando datos desde IndexedDB (US-30)
// [Kanban Board] Refresco completado correctamente

// Eventos de debug disponibles:
window.addEventListener('sync-refresh', (e) => {
  console.log('Componente actualizado por sync:', e.target);
});
```

## Extensibilidad

### Callback Personalizado
```typescript
import { registerEntitySync } from '../utils/ui-sync.js';

// Registrar lógica custom para sincronización de tareas
registerEntitySync('task', {
  components: ['custom-task-widget'],
  onSync: (event) => {
    if (event.type === 'task:updated') {
      // Lógica personalizada
      showNotification('Tarea actualizada remotamente');
    }
  }
});
```

### Nuevos Tipos de Evento
```typescript
// En repository personalizado:
emitSync('custom:event', entityId, customPayload);

// En UISyncManager, agregar handler:
'custom:event': (event) => this.handleCustomEvent(event)
```