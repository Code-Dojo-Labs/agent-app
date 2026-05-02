# IMP-09 — Sistema de Avatares Generativos Coloridos

> **Área:** UI / Gestión de Personas  
> **Prioridad:** Media  
> **Estado:** Propuesta  
> **Fecha:** 2026-05-01

---

## Problema que resuelve

El sistema actual de personas (`Person`) usa un emoji seleccionado manualmente (o una inicial) como avatar. Esto genera:

- **Emojis inconsistentes**: Un usuario elige 🦊 y otro 🚀, sin una identidad visual coherente.
- **Sin identidad de color por persona**: No hay forma de reconocer rápidamente a una persona por un color distintivo cuando aparece en múltiples tarjetas.
- **Chips de asignados poco informativos**: En la tarjeta solo se muestra `🦊 Ana Torres`, que ocupa más espacio del necesario.
- **Sin soporte para imágenes de perfil**: No hay forma de que un usuario suba una imagen real.

Apps como **Linear**, **Jira**, **Notion** y **GitHub** usan avatares circulares con iniciales + color de fondo generado a partir del nombre, resultando en una identidad visual única y reconocible por persona.

---

## Propuesta de Solución

### 1. Avatar Generativo por Iniciales

Generar automáticamente un **avatar circular** con:
- Las iniciales del nombre (máx. 2 letras): `"Ana Torres"` → `AT`
- Un color de fondo determinístico basado en el nombre (hash → HSL)
- Texto blanco o negro según contraste (WCAG AA)

```
┌──────────────────────────────────┐
│                                  │
│   ╔═══╗   ╔═══╗   ╔═══╗         │
│   ║ AT║   ║ JM║   ║ CR║   +3    │
│   ╚═══╝   ╚═══╝   ╚═══╝         │
│   Ana     Juan    Carlos         │
│                                  │
└──────────────────────────────────┘
Paleta automática: #4F46E5 / #059669 / #DC2626 / #D97706 / #7C3AED...
```

### 2. Algoritmo de Color Determinístico

```typescript
function nameToColor(name: string): string {
  // Hash simple del nombre → ángulo en HSL
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) & 0xFFFFFF;
  const hue = hash % 360;
  // Saturación y luminosidad fijas para colores vividos pero accesibles
  return `hsl(${hue}, 65%, 45%)`;
}
```

Esto garantiza que `"Ana Torres"` siempre tenga el mismo color, en cualquier dispositivo o sesión.

### 3. Componente `<dojo-avatar>`

Nuevo átomo Web Component:

```html
<!-- Modo iniciales (por defecto) -->
<dojo-avatar name="Ana Torres" size="32"></dojo-avatar>

<!-- Modo imagen (si el usuario sube foto) -->
<dojo-avatar name="Ana Torres" src="/avatars/ana.jpg" size="32"></dojo-avatar>

<!-- Modo apilado (grupo de avatares en tarjeta) -->
<dojo-avatar-group>
  <dojo-avatar name="Ana Torres" size="24"></dojo-avatar>
  <dojo-avatar name="Juan Méndez" size="24"></dojo-avatar>
  <dojo-avatar name="+3" size="24" overflow></dojo-avatar>
</dojo-avatar-group>
```

### 4. Grupo de Avatares en Tarjeta (Avatar Stack)

En `dojo-task-card`, cuando hay múltiples asignados, mostrarlos apilados con solapamiento:

```
[ AT ][ JM ][ CR ][+2]
  ↕ solapamiento 6px
```

Máximo 3 avatares visibles + badge `+N` si hay más.

### 5. Soporte de Imagen de Perfil (extensión futura)

El campo `avatar` en el modelo `Person` actualmente almacena un emoji o inicial. Se puede extender a una URL de imagen (Data URL de base64 o URL externa):

```typescript
interface Person {
  avatar: string; // Emoji | Inicial | URL de imagen | Data URL
}
```

El componente `<dojo-avatar>` detecta si el valor es una URL y renderiza un `<img>` en lugar de las iniciales.

---

## Criterios de Aceptación

- [ ] Existe el átomo `<dojo-avatar>` con atributos `name`, `size` y `src` (opcional).
- [ ] El color de fondo del avatar se genera de forma determinística desde el nombre.
- [ ] El color de texto (blanco/negro) se selecciona automáticamente para cumplir WCAG AA.
- [ ] Los mismos nombres siempre producen el mismo color en cualquier sesión.
- [ ] En `dojo-task-card`, los asignados se muestran como avatares circulares apilados.
- [ ] Cuando hay más de 3 asignados, se muestra `+N` como badge adicional.
- [ ] El panel de gestión de personas muestra el avatar generativo en la lista.
- [ ] El selector de asignados en el diálogo de creación muestra avatares en lugar de emojis.
- [ ] Existe `<dojo-avatar-group>` para renderizar grupos de avatares solapados.
- [ ] El componente es compatible con modo oscuro.

---

## Impacto Estimado

| Aspecto | Impacto |
|---|---|
| Identidad visual | ⬆️ Alto — personas reconocibles al instante |
| Profesionalismo | ⬆️ Alto — estética de app moderna tipo Linear/Jira |
| Usabilidad | ⬆️ Medio — más info visible en tarjeta sin texto |
| Espacio en tarjeta | ⬆️ Positivo — avatares ocupan menos que `emoji + nombre` |
| Esfuerzo de implementación | Medio — nuevo componente + migración de chips |
