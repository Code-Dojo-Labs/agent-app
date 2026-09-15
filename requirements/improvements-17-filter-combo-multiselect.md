# Improvement 17 — Filtros de múltiple selección con combo desplegable

> **Área**: UI / UX  
> **Prioridad**: Alta  
> **Estado**: Propuesto  
> **Referencia**: US-15 (Extension)

---

## Problema que resuelve

Actualmente en la sección de **Filtros**, las opciones de **Prioridad** y **Etiquetas** se listan todas juntas de forma horizontal o vertical, ocupando mucho espacio en pantalla.

**Síntomas observados:**
- Los filtros ocupan demasiado espacio vertical/horizontal
- Difícil de usar en dispositivos móviles
- No hay límite visual claro de dónde terminan los filtros
- Interfaz no escalable si se agregan más opciones

---

## Propuesta de solución

Transformar los selectores de **Prioridad** y **Etiquetas** en componentes **combo de múltiple selección** (dropdown colapsable) que:

1. **Mostrará**: Un campo colapsable con el resumen de selecciones (ej: "2 prioridades seleccionadas")
2. **Al expandir**: Listará todas las opciones con checkboxes
3. **Permite**: Seleccionar/deseleccionar múltiples opciones sin cerrar el dropdown
4. **Ocupa**: ~40-50px de altura en estado colapsado vs. los 150-200px actuales

### Comportamiento funcional

#### Estado colapsado:
```
┌────────────────────────────────┐
│ Prioridad  ▼  (Baja, Media)    │
└────────────────────────────────┘
```

#### Estado expandido:
```
┌────────────────────────────────┐
│ Prioridad  ▲                   │
├────────────────────────────────┤
│ ☐ Baja                         │
│ ☑ Media                        │
│ ☑ Alta                         │
│ ☐ Urgente                      │
└────────────────────────────────┘
```

### Reglas de negocio

- Al hacer clic fuera del dropdown, se cierra automáticamente.
- El estado de selección se persiste en el filtro global.
- Se puede limpiar la selección con un botón "Limpiar filtro" o mediante "x" en cada tag.
- Los cambios se aplican en tiempo real (sin botón "Aplicar").

---

## Cambios en el código

Se requiere crear o actualizar:
- `src/components/organisms/filter-bar/filter-combo.ts` (Nuevo componente)
- `src/components/organisms/filter-bar/filter-bar.ts` (Refactor para usar filter-combo)
- `src/styles/filter-combo.css` (Estilos nuevos)

---

## Criterios de aceptación

```gherkin
Feature: Filtros con combo de múltiple selección

  Scenario: Ver filtro colapsado
    Given el usuario está en la vista de tablero
    When no hay filtros aplicados
    Then el combo de Prioridad muestra "Prioridad ▼ (Ninguno)"
    And el combo de Etiquetas muestra "Etiquetas ▼ (Ninguno)"

  Scenario: Expandir combo de Prioridad
    When el usuario hace clic en "Prioridad ▼"
    Then se despliega una lista con ☐ Baja, ☐ Media, ☐ Alta, ☐ Urgente
    And cada opción es clickeable para seleccionar

  Scenario: Aplicar filtro de Prioridad
    Given el combo está expandido
    When el usuario marca ☑ Media y ☑ Alta
    Then el combo se actualiza mostrando "Prioridad ▼ (2 seleccionadas)"
    And las tareas se filtran inmediatamente

  Scenario: Limpiar filtro
    Given hay filtros aplicados
    When el usuario hace clic en "Limpiar" (o x)
    Then se deselecciona todo
    And el combo vuelve a mostrar "(Ninguno)"

  Scenario: Cerrar combo al hacer clic fuera
    Given el combo está expandido
    When el usuario hace clic fuera del combo
    Then el combo se cierra automáticamente
```

---

## Impacto técnico

- **Scope**: Creación de nuevo componente + refactor de filter-bar
- **Breaking changes**: No (backward compatible)
- **Performance**: Insignificante (dropdown con <10 opciones)
- **Responsive**: Recomendado usar `max-height: 60vh` para no ocultar contenido en móvil

---

## Notas de diseño

- Usar el mismo sistema de tokens de color (`--dojo-primary`, `--dojo-surface`, etc.)
- Shadow/z-index: Asegurar que el dropdown se posiciona por encima de otras UI
- Accesibilidad: Usar atributos ARIA (`aria-expanded`, `aria-label`) para screen readers
