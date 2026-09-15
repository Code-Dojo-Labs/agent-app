# Improvement 19 — Gestión independiente de etiquetas (label manager)

> **Área**: Gestión de tareas / UI  
> **Prioridad**: Alta  
> **Estado**: Propuesto  
> **Referencia**: US-09, US-10, US-11, US-12, US-13

---

## Problema que resuelve

Actualmente, las etiquetas solo se pueden crear desde la opción **"Crear tarea"**. No existe un lugar dedicado para:

- **Crear etiquetas** de forma aislada sin crear una tarea
- **Editar etiquetas** existentes (cambiar nombre o color)
- **Eliminar etiquetas** de forma masiva
- **Visualizar todas las etiquetas** en uso
- **Gestionar la paleta de colores** de forma centralizada

**Síntomas observados:**
- Usuario no puede preparar etiquetas antes de crear tareas
- Si se equivoca al crear una etiqueta, no hay forma de editarla (solo crear y eliminar)
- Difícil de auditar qué etiquetas existen y cuáles están en desuso
- Workflow no intuitivo para gestión de etiquetas

---

## Propuesta de solución

Crear una **nueva sección "Gestionar Etiquetas"** accesible desde el menú principal que permita:

### 1. Vista de listado de etiquetas

```
┌─────────────────────────────────┐
│ Gestionar Etiquetas             │
├─────────────────────────────────┤
│ [+ Nueva etiqueta]              │
├─────────────────────────────────┤
│ ☑ Bug       [Rojo]      x  ✏️   │
│ ☑ Feature   [Azul]      x  ✏️   │
│ ☐ WIP       [Amarillo]  x  ✏️   │
│                                 │
│ Etiquetas sin usar (2)          │
│ ─────────────────────────────    │
│ ☐ Deprecated [Gris]    x  ✏️    │
│ ☐ Testing    [Verde]   x  ✏️    │
└─────────────────────────────────┘
```

### 2. Crear nueva etiqueta

Modal o inline form:
```
┌──────────────────────────────────┐
│ Nueva etiqueta                   │
├──────────────────────────────────┤
│ Nombre: [Bug           ]         │
│ Color:  [● Rojo]  [Otros]        │
│                                  │
│ Vista previa:                    │
│ ┌──────────────┐                 │
│ │ Bug          │                 │
│ └──────────────┘                 │
│                                  │
│ [Cancelar] [Crear]               │
└──────────────────────────────────┘
```

### 3. Editar etiqueta

Permite cambiar nombre y color.

### 4. Eliminar etiqueta

Con advertencia si la etiqueta está siendo usada en tareas:
```
⚠️ La etiqueta "WIP" se usa en 3 tareas.
¿Deseas eliminarla de todas ellas y borrar la etiqueta?

[Cancelar] [Eliminar]
```

### Acceso a la función

En el menú principal o sidebar, agregar una opción:
```
┌─────────────────────────────────┐
│ Tablero                         │
│ Crear tarea                     │
│ ───────────────────────────────│
│ 🏷️  Gestionar etiquetas        │
│ ⚙️  Configuración               │
└─────────────────────────────────┘
```

---

## Cambios en el código

Se requiere crear:
- `src/components/pages/label-manager-page.ts` (Nueva página)
- `src/components/organisms/label-list.ts` (Lista de etiquetas)
- `src/components/organisms/label-form.ts` (Formulario crear/editar)
- `src/styles/label-manager.css` (Estilos)
- Ruta en el router: `/labels` o `/settings/labels`

---

## Criterios de aceptación

```gherkin
Feature: Gestión independiente de etiquetas

  Scenario: Ver listado de etiquetas
    Given el usuario navega a "Gestionar Etiquetas"
    When la vista carga
    Then ve todas las etiquetas existentes
    And se agrupan en "En uso" y "Sin usar"
    And cada etiqueta muestra nombre, color, count de uso, opciones edit/delete

  Scenario: Crear nueva etiqueta
    When el usuario hace clic en [+ Nueva etiqueta]
    Then se abre un modal o inline form
    And puede ingresar nombre (ej: "Urgent")
    And puede seleccionar color de una paleta o custom
    And ve una vista previa en tiempo real
    And al hacer clic [Crear], la etiqueta se agrega a la base de datos

  Scenario: Editar etiqueta existente
    When el usuario hace clic en ✏️ en una etiqueta
    Then se abre el formulario con datos precargados
    And puede cambiar nombre y color
    And al guardar, se actualiza en todas las tareas que la usan

  Scenario: Eliminar etiqueta sin uso
    Given una etiqueta no se usa en ninguna tarea
    When el usuario hace clic en x (delete)
    Then se solicita confirmación
    And al confirmar, se elimina sin efectos secundarios

  Scenario: Eliminar etiqueta en uso
    Given una etiqueta se usa en 5 tareas
    When el usuario hace clic en x (delete)
    Then aparece un modal diciendo "Usada en 5 tareas"
    And ofrece opciones: Cancelar o Eliminar
    And si elige Eliminar, se quita de todas las tareas y se borra la etiqueta

  Scenario: Integración con crear tarea
    Given el usuario está creando una tarea
    When selecciona una etiqueta
    Then ve tanto etiquetas existentes como la opción [+ Nueva]
    And puede crear una etiqueta en línea sin navegar a otra página
    And la etiqueta se agrega al listado central automáticamente
```

---

## Impacto técnico

- **Scope**: Nueva página + 2-3 componentes nuevos + actualización del router
- **Breaking changes**: Ninguno (feature aditiva)
- **Performance**: Insignificante (hasta 50 etiquetas típicamente)
- **Data migration**: No requiere (reutiliza almacenamiento existente de etiquetas)

---

## Notas UX

- La sección de "Sin usar" debe ser colapsable para no abrumar visualmente
- Agregar contador de tareas junto al nombre: "Bug (12)"
- Permitir buscar/filtrar etiquetas por nombre
- Considerar permitir reordenar etiquetas (drag & drop) para priorizar las más usadas
