# Improvement 18 — Diseño 100% responsivo (mobile-first)

> **Área**: UI / UX / Responsive Design  
> **Prioridad**: Crítica  
> **Estado**: Propuesto  
> **Referencia**: US-01, US-31 (PWA)

---

## Problema que resuelve

El diseño actual no es completamente responsivo. La aplicación funciona en desktop pero presenta problemas en tablets y dispositivos móviles:

**Síntomas observados:**
- Elementos se solapan en pantallas pequeñas
- Tareas y controles no son clickeables cómodamente en móvil
- Textos se cortan o se hacen ilegibles
- No hay adaptación del layout del tablero Kanban para dispositivos pequeños
- Scroll horizontal innecesario
- Filtros y opciones de menú no se adaptan bien

---

## Propuesta de solución

Implementar una **estrategia mobile-first** que garantice que la aplicación sea funcional y usable en todos los tamaños de pantalla.

### Breakpoints a soportar

```
Mobile:     < 640px    (smartphones)
Tablet:     640px-1024px
Desktop:    > 1024px
Desktop XL: > 1440px
```

### Cambios principales por viewport

#### Mobile (< 640px)
- **Tablero Kanban**: Scroll horizontal de columnas (una columna visible a la vez)
- **Botones**: Altura mínima 44px (Apple HIG)
- **Inputs**: Tamaño de fuente 16px (para evitar zoom del navegador)
- **Modales**: Ancho 95vw, altura máxima 90vh
- **Filtros**: Usar el combo desplegable (IMP-17) en lugar de lista horizontal
- **Sidebar/Menú**: Colapsable a hamburguesa
- **Cards**: Ancho completo con padding mínimo

#### Tablet (640px - 1024px)
- **Tablero Kanban**: 2-3 columnas visibles, scroll suave si hay más
- **Modales**: Ancho máximo 90vw, altura máxima 85vh
- **Grid layouts**: Ajustar a 2 columnas para vistas de lista
- **Espacio**: Padding aumentado a 16px

#### Desktop (> 1024px)
- **Tablero Kanban**: Todas las columnas visibles con scroll si es necesario
- **Layout**: Desktop optimizado actual
- **Modales**: Ancho máximo 800px

### Tareas específicas

1. **Media queries**: Auditar todos los archivos CSS en `src/styles/` y `src/components/`
2. **Flexbox/Grid**: Asegurar layouts flexibles con `flex-wrap: wrap` y `grid-auto-flow`
3. **Font sizing**: Usar `clamp()` para tamaños de fuente responsivos
4. **Images/Icons**: SVG escalable (responsive) en lugar de sizes fijos
5. **Espaciado**: Usar custom properties escalables
6. **Viewport meta tag**: Verificar `<meta name="viewport" content="width=device-width, initial-scale=1">`
7. **Touch targets**: Mínimo 44x44px para elementos interactivos
8. **Viewport units**: Cambiar viewport height con `100dvh` (dynamic viewport height) si es necesario

---

## Archivo CSS propuesto

Se creará/actualizará `src/styles/responsive.css`:

```css
/* Mobile-first base */
* {
  box-sizing: border-box;
}

body {
  font-size: clamp(14px, 2vw, 16px);
}

/* Botones */
button {
  min-height: 44px;
  min-width: 44px;
}

/* Inputs */
input, textarea, select {
  font-size: 16px; /* Evita zoom en iOS */
}

/* Tablero Kanban */
.kanban-board {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}

.kanban-column {
  flex: 0 0 100%; /* Mobile: una columna a la vez */
  scroll-snap-align: start;
}

@media (min-width: 640px) {
  .kanban-column {
    flex: 0 0 calc(50% - 8px); /* Tablet: 2 columnas */
  }
}

@media (min-width: 1024px) {
  .kanban-column {
    flex: 0 0 calc(33.33% - 8px); /* Desktop: 3 columnas */
  }
}

/* Modales */
dialog {
  width: min(95vw, 800px);
  max-height: min(90dvh, 95vh);
}

/* Filtros */
@media (max-width: 639px) {
  .filter-bar {
    flex-direction: column;
    gap: 12px;
  }
}
```

---

## Criterios de aceptación

```gherkin
Feature: Diseño responsivo en todos los dispositivos

  Scenario: Vista en smartphone (iPhone 12, 390px)
    Given la aplicación está abierta en un dispositivo móvil
    When el usuario navega el tablero Kanban
    Then ve una columna a la vez con scroll horizontal
    And puede interactuar con todos los controles cómodamente
    And el texto es legible sin zoom

  Scenario: Vista en tablet (iPad, 768px)
    Given la aplicación está abierta en una tablet
    When el usuario ve el tablero
    Then ve 2 columnas lado a lado
    And hay espacio suficiente para leer y interactuar
    And no hay scroll horizontal innecesario

  Scenario: Vista en desktop (1400px)
    Given la aplicación está abierta en desktop
    When el usuario ve el tablero
    Then ve 3+ columnas según disponibilidad
    And el layout optimizado se aplica

  Scenario: Modal en diferentes tamaños
    When el usuario abre un modal de edición
    Then en móvil ocupa 95vw
    And en tablet ocupa máximo 90vw
    And en desktop ocupa máximo 800px
    And es scrolleable si el contenido excede la altura

  Scenario: Inputs en móvil
    When el usuario escribe en un input
    Then la fuente es de mínimo 16px
    And el navegador no hace zoom automático
```

---

## Impacto técnico

- **Scope**: Auditoría completa de CSS + refactor de media queries
- **Breaking changes**: Ninguno (mejora de experiencia)
- **Performance**: Positivo (menos overflow, mejor scroll)
- **Testing**: Requiere pruebas en múltiples dispositivos físicos

---

## Herramientas de validación

- Chrome DevTools: Device Mode
- Firefox Responsive Design Mode
- BrowserStack para testing real en dispositivos
- Lighthouse (mobile performance audit)

---

## Referencias

- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Apple Human Interface Guidelines: Sizes](https://developer.apple.com/design/human-interface-guidelines/foundations/layout/)
- [Google Material Design: Responsive behavior](https://material.io/design/layout/responsive-layout-grid.html)
