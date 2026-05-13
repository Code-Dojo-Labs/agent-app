# US-41 — Animaciones y Micro-interacciones Modernas

> **Área**: UI / Motion Design  
> **Prioridad**: Media  
> **Referencia**: [improvements-10-smooth-animations.md](../requirements/improvements-10-smooth-animations.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** que las interacciones (apertura de modales, creación/eliminación de tareas, notificaciones) tengan animaciones fluidas,  
**para** que la aplicación se sienta pulida, moderna y proporcione retroalimentación visual clara de cada acción.

---

## Criterios de aceptación

```gherkin
Feature: Sistema centralizado de animaciones CSS

  Scenario: Apertura de modal con animación de entrada
    Given el usuario hace clic en "Nueva tarea"
    When el modal de creación se abre
    Then aparece con animación slide-up-in (opacity 0→1, translateY 12px→0)
    And la duración es 200ms o menos

  Scenario: Cierre de modal con animación de salida
    Given un modal abierto
    When el usuario lo cierra (botón X o Escape)
    Then el modal desaparece con animación slide-down-out
    And el backdrop se desvanece con fade-out

  Scenario: Tarjeta nueva aparece con animación pop-in
    Given el usuario crea una nueva tarea
    When la tarjeta se inserta en la columna
    Then aparece con animación pop-in (scale 0.85→1.04→1, opacity 0→1)

  Scenario: Eliminación de tarjeta con animación de salida
    Given el usuario confirma eliminar una tarea
    When la tarjeta se elimina del DOM
    Then primero se anima con fade-out + collapse de altura
    And luego se elimina del DOM

  Scenario: Toast / Snackbar de feedback
    Given el usuario completa una acción (guardar, eliminar, mover)
    When la operación termina exitosamente
    Then aparece un toast en la esquina inferior derecha con mensaje de confirmación
    And el toast se auto-cierra tras 3 segundos
    And tiene animación de entrada y salida

  Scenario: Respeto a prefers-reduced-motion
    Given el sistema operativo tiene activada la preferencia de movimiento reducido
    When el usuario interactúa con cualquier elemento animado
    Then las animaciones se deshabilitan o reducen a simples fade in/out
    And la funcionalidad no se ve afectada

  Scenario: Animaciones definidas centralmente
    Given el archivo src/styles/animations.css
    Then contiene como mínimo las keyframes: slide-up-in, slide-down-out, pop-in, fade-in, shake
    And todos los componentes reutilizan estas clases en lugar de definir animaciones propias
```

---

## Notas técnicas

- Crear `src/styles/animations.css` con todas las keyframes.
- Importar en `main.ts` o en el punto de entrada de estilos globales.
- Aplicar clase CSS al elemento y removerla al completar la animación (`animationend` event).
- Usar `@media (prefers-reduced-motion: reduce)` en todas las definiciones.
