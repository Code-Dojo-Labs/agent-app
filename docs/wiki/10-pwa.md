# Uso como aplicación PWA

Dojo Kanban es una **Progressive Web App (PWA)**: puedes instalarla en tu escritorio o móvil y usarla sin conexión a internet como si fuera una app nativa.

## Instalar en escritorio (Chrome / Edge)

1. Abre la aplicación en el navegador.
2. En la barra de dirección aparece el ícono **Instalar** (⊕).
3. Haz clic y confirma la instalación.
4. La app se abre en su propia ventana, sin barra del navegador.

```
Chrome ──────────────────────────────────────────
  [ dojo-kanban.app ]                       [ ⊕ ]
──────────────────────────────────────────────────
              ↑ clic aquí para instalar
```

## Instalar en móvil (Android / iOS)

**Android (Chrome):**
1. Toca el menú `⋮` → **Añadir a pantalla de inicio**.
2. Confirma. El ícono aparece en tu launcher.

**iOS (Safari):**
1. Toca el botón **Compartir** → **Añadir a pantalla de inicio**.
2. Confirma. La app se abre en modo pantalla completa.

## Uso sin conexión

Una vez instalada o visitada al menos una vez, la app funciona **completamente offline**:

| Acción | ¿Disponible offline? |
|--------|----------------------|
| Ver tableros y tareas | ✅ |
| Crear, editar, mover tareas | ✅ |
| Eliminar tareas y columnas | ✅ |
| Sincronización con Supabase | ❌ (se aplaza hasta tener conexión) |

El Service Worker almacena todos los recursos estáticos y los datos se persisten en IndexedDB, por lo que no se pierde nada al perder la conexión.

## Actualizar la app

Cuando hay una nueva versión disponible, aparece un **banner de actualización** en la parte superior. Haz clic en **Actualizar** para recargar con la versión más reciente.

## FAQ

**¿Necesito crear una cuenta para instalar la PWA?**  
No. La instalación es independiente de la configuración de Supabase.

**¿Los datos se pierden al reinstalar?**  
No si usas Supabase. En modo local, los datos están en IndexedDB del navegador; desinstalar la app no los elimina.

**¿Funciona en todos los navegadores?**  
La instalación PWA requiere Chrome, Edge o Safari. Firefox soporta el modo offline pero no la instalación como app nativa.
