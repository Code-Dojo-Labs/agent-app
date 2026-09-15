# filter-combo & dojo-filter-bar — Documentación Técnica

## Resumen

Implementación de componentes Web Component para filtros con combo desplegable (IMP-17, Issue #120).

### Componentes creados

1. **filter-combo.ts** — Molécula reutilizable
2. **filter-bar.ts** — Organismo que integra filter-combo
3. **index.ts** — Exportaciones

---

## filter-combo

### Descripción

Componente reutilizable de combo desplegable para múltiple selección. Encapsula toda la lógica de:
- Dropdown colapsable con checkbox list
- Resumen dinámico (ej: "Prioridad ▼ (2 seleccionadas)")
- Cambios en tiempo real sin botón "Aplicar"
- Botón "Limpiar" integrado
- Cierre automático al hacer clic fuera

### Atributos HTML

```html
<filter-combo 
  label="Prioridad"
  placeholder="(Ninguno)">
</filter-combo>
```

| Atributo    | Tipo   | Descripción                        | Default    |
|-------------|--------|------------------------------------|-----------  |
| `label`     | string | Etiqueta visible en el botón       | ""         |
| `placeholder` | string | Texto cuando no hay selección    | "(Ninguno)" |

### Propiedades JS

```typescript
interface FilterOption {
  id: string;        // Identificador único
  label: string;     // Texto visible
  icon?: string;     // Ícono opcional (emoji, etc.)
}

// Establecer opciones
combo.options = [
  { id: 'low', label: 'Baja', icon: '⬇️' },
  { id: 'medium', label: 'Media', icon: '➡️' },
  { id: 'high', label: 'Alta', icon: '⬆️' },
  { id: 'urgent', label: 'Urgente', icon: '🔥' },
];

// Acceso a selección
combo.selectedIds              // Set<string>
combo.selectedIdsList          // string[]
```

### Métodos públicos

```typescript
// Limpiar selección
combo.clear(): void

// Expandir/contraer dropdown
combo.toggle(): void
```

### Eventos

```typescript
// Cambio de selección
combo.addEventListener('dojo:filter-changed', (evt) => {
  const { selectedIds } = evt.detail;
  console.log('Seleccionados:', selectedIds); // string[]
});

// Limpieza
combo.addEventListener('dojo:filter-cleared', () => {
  console.log('Filtro limpiado');
});
```

### Estilos

Todas las propiedades CSS usadas:

- `--dojo-bg` — Color de fondo general
- `--dojo-surface` — Color de superficie (botones, dropdown)
- `--dojo-border` — Color de bordes
- `--dojo-text-primary` — Texto principal
- `--dojo-text-secondary` — Texto secundario
- `--dojo-primary` — Color principal (hover, selected)
- `--dojo-radius-sm` — Radio de esquina pequeño

### Accesibilidad

- `aria-haspopup="listbox"` — En el botón toggle
- `aria-expanded` — Indica estado abierto/cerrado
- `aria-label` — En botones e inputs
- `role="listbox"` — En dropdown
- `role="option"` — En checkboxes
- Navegación por teclado (Tab, Enter, Escape)
- Cierre automático al hacer clic fuera

---

## dojo-filter-bar

### Descripción

Organismo que integra:
1. Input de búsqueda con debounce (300ms)
2. filter-combo para Prioridad
3. filter-combo para Etiquetas
4. Botón "Limpiar todos"

### Uso

```html
<dojo-filter-bar></dojo-filter-bar>
```

```typescript
import { DojoFilterBar } from './dojo-filter-bar/index.js';

const bar = document.querySelector('dojo-filter-bar') as DojoFilterBar;

// Establecer etiquetas disponibles
bar.setLabels([
  { id: '1', name: 'Bug', color: '#FF0000' },
  { id: '2', name: 'Feature', color: '#00FF00' },
]);

// Leer valores
console.log(bar.searchText);              // string
console.log(bar.selectedPriorities);      // Set<Priority>
console.log(bar.selectedLabelIds);        // Set<string>

// Establecer valores programáticamente
bar.searchText = 'new search';
bar.selectedPriorities = new Set(['high', 'urgent']);
bar.selectedLabelIds = new Set(['1', '2']);

// Limpiar todo
bar.clearAll();
```

### Eventos

```typescript
// Cambio en filtros
bar.addEventListener('dojo:filter-changed', (evt) => {
  const { type, selectedIds } = evt.detail;
  // type: 'priority' | 'labels'
  // selectedIds: string[]
});

// Cambio en búsqueda
bar.addEventListener('dojo:search-changed', (evt) => {
  const { searchText } = evt.detail;
  // searchText: string (con debounce de 300ms)
});

// Limpieza total
bar.addEventListener('dojo:filter-cleared', () => {
  console.log('Todos los filtros limpiados');
});
```

### CSS Custom Properties

Heredadas de filter-combo y amplificadas en dojo-filter-bar:

```css
:root {
  --dojo-bg: #ffffff;
  --dojo-surface: #f5f5f5;
  --dojo-border: #e0e0e0;
  --dojo-text-primary: #212121;
  --dojo-text-secondary: #757575;
  --dojo-primary: #1D4ED8;
  --dojo-radius-sm: 4px;
}
```

---

## Criterios de aceptación (Issue #120)

✅ El combo de Prioridad muestra "Prioridad ▼ (Ninguno)" cuando no hay filtros
✅ Al hacer clic en el combo se despliega la lista con checkboxes
✅ Al marcar opciones, el combo actualiza el resumen y filtra inmediatamente
✅ Existe botón "Limpiar" que resetea la selección
✅ El combo se cierra automáticamente al hacer clic fuera
✅ Atributos ARIA (`aria-expanded`, `aria-label`) presentes
✅ El dropdown respeta responsive design (max-height: 60vh en móvil)

---

## Arquitectura

### Estructura de carpetas

```
src/components/organisms/dojo-filter-bar/
├── filter-combo.ts          # Molécula (componente reutilizable)
├── filter-bar.ts            # Organismo (integra filter-combo)
└── index.ts                 # Exportaciones
```

### Patrones

- **Web Components nativos**: Sin librerías externas (React, Lit, etc.)
- **Shadow DOM**: Encapsulación total de estilos
- **TypeScript**: Tipado estricto
- **Events API**: Custom events con `CustomEvent`
- **CSS Custom Properties**: Soporte para theming

---

## Próximos pasos

### Integración con dojo-list-view

El dojo-list-view actual usa una barra de filtros inline. Para usar dojo-filter-bar:

1. Reemplazar `_buildFilterBar()` en dojo-list-view
2. Usar `<dojo-filter-bar>` en lugar de construir elementos dinámicamente
3. Escuchar eventos `dojo:filter-changed` y `dojo:search-changed`

Ejemplo:

```typescript
// En dojo-list-view
private _filterBar: DojoFilterBar | null = null;

connectedCallback() {
  // ... 
  this._filterBar = this._shadow.querySelector('dojo-filter-bar');
  this._filterBar?.addEventListener('dojo:filter-changed', (evt) => {
    // Actualizar filtros
  });
  this._filterBar?.addEventListener('dojo:search-changed', (evt) => {
    // Búsqueda con debounce
  });
}
```

---

## Testing

### Casos de prueba manuales

1. **Expandir/contraer dropdown**
   - Clic en botón: abre dropdown
   - Clic fuera: cierra dropdown
   - Escape: cierra dropdown (opcional, implementar si se requiere)

2. **Selección múltiple**
   - Marcar opciones actualiza el resumen
   - Resumen muestra "1 seleccionada" o "N seleccionadas"
   - Sin cambios se limpia automáticamente

3. **Limpiar filtro**
   - Clic en "Limpiar" resetea checkboxes
   - Evento `dojo:filter-cleared` se dispara

4. **Búsqueda**
   - Input emite `dojo:search-changed` con debounce (300ms)

5. **Accesibilidad**
   - Navegación por Tab
   - Aria-labels visibles en lectores de pantalla
   - Contraste suficiente (WCAG AA mínimo)

---

## Notas de desarrollo

- ✅ TypeScript compilado sin errores
- ✅ Shadow DOM para aislamiento de estilos
- ✅ Sin dependencias externas
- ✅ Responsive design (mobile-first)
- ✅ ARIA attributes para accesibilidad
- ✅ Eventos personalizados con `bubbles: true, composed: true`
- ⚠️ Requiere polyfills para navegadores antiguos (Web Components)
