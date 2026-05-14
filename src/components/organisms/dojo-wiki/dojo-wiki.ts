/**
 * dojo-wiki — Organismo
 *
 * Panel de guía de usuario / wiki accesible desde el encabezado de la app.
 * Muestra las secciones de ayuda en un panel lateral con navegación por índice.
 *
 * ## API pública
 * | Método | Descripción                |
 * |--------|----------------------------|
 * | show() | Abre el panel de ayuda     |
 * | hide() | Cierra el panel de ayuda   |
 *
 * ## Atributos observados
 * | Atributo | Valores          | Descripción       |
 * |----------|------------------|-------------------|
 * | open     | presente/ausente | Panel visible      |
 *
 * ## Atajos de teclado
 * | Tecla   | Acción                          |
 * |---------|---------------------------------|
 * | Escape  | Cierra el panel                 |
 * | ?       | Abre el panel (global, US-27)   |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-primary, --dojo-shadow, --dojo-radius
 */

// ── Tipos internos ─────────────────────────────────────────────────────────

interface WikiSection {
  id: string;
  title: string;
  icon: string;
  /** Contenido en HTML (pre-compilado desde Markdown). */
  html: string;
}

// ── Contenido de la wiki ──────────────────────────────────────────────────
// El contenido se embebe directamente en el componente para garantizar
// la disponibilidad offline (PWA — US-31) sin fetch ni dependencias externas.

const WIKI_SECTIONS: WikiSection[] = [
  {
    id: 'inicio-rapido',
    title: 'Inicio rápido',
    icon: '🚀',
    html: `
      <h2>Inicio rápido</h2>
      <p>Empieza a usar Dojo Kanban en cinco pasos.</p>

      <h3>1. Crear un tablero</h3>
      <p>Al abrir la aplicación verás el <strong>Selector de tableros</strong>.
      Haz clic en <strong>"Nuevo tablero"</strong> para crear el primero.</p>

      <h3>2. Añadir columnas</h3>
      <p>El tablero incluye columnas por defecto (<em>Por hacer</em>, <em>En progreso</em>, <em>Hecho</em>).
      Añade más con el botón <strong>"+ Columna"</strong> al final del tablero.</p>

      <h3>3. Crear tu primera tarea</h3>
      <p>Haz clic en <strong>"+ Tarea"</strong> en cualquier columna. El único campo obligatorio
      es el <strong>título</strong>; el resto son opcionales.</p>

      <h3>4. Organizar las tareas</h3>
      <p>Arrastra y suelta las tarjetas entre columnas para actualizar su estado.</p>

      <h3>5. Explorar el resto</h3>
      <ul>
        <li>Usa <kbd>Cmd / Ctrl + K</kbd> para la paleta de comandos.</li>
        <li>Accede a <strong>Etiquetas</strong>, <strong>Proyectos</strong> y <strong>Personas</strong> desde el encabezado.</li>
        <li>Exporta e importa datos con <strong>📤 Exportar</strong> / <strong>📥 Importar</strong>.</li>
      </ul>
    `,
  },
  {
    id: 'gestion-columnas',
    title: 'Gestión de columnas',
    icon: '📋',
    html: `
      <h2>Gestión de columnas</h2>
      <p>Las columnas representan los estados del flujo de trabajo de tu tablero.</p>

      <h3>Crear una columna</h3>
      <ol>
        <li>Haz clic en <strong>"+ Columna"</strong> al final del tablero.</li>
        <li>Escribe el nombre en el diálogo.</li>
        <li>Confirma con <strong>Crear</strong> o pulsa <kbd>Enter</kbd>.</li>
      </ol>

      <h3>Renombrar una columna</h3>
      <ol>
        <li>Haz clic en el menú <strong>⋮</strong> de la cabecera de la columna.</li>
        <li>Selecciona <strong>Renombrar</strong> y edita el nombre.</li>
      </ol>

      <h3>Eliminar una columna</h3>
      <ol>
        <li>Abre el menú <strong>⋮</strong> de la columna.</li>
        <li>Selecciona <strong>Eliminar</strong> y confirma el diálogo de alerta.</li>
      </ol>
      <p class="warning">⚠️ La eliminación es irreversible — se eliminarán también todas las tareas contenidas.</p>

      <h3>Reordenar columnas</h3>
      <p>Arrastra la cabecera de la columna hacia la izquierda o la derecha para cambiar su posición.</p>
    `,
  },
  {
    id: 'gestion-tareas',
    title: 'Gestión de tareas',
    icon: '✅',
    html: `
      <h2>Gestión de tareas</h2>

      <h3>Crear una tarea</h3>
      <p>Haz clic en <strong>"+ Tarea"</strong> en la columna deseada y completa los campos:</p>
      <table>
        <thead><tr><th>Campo</th><th>Req.</th><th>Descripción</th></tr></thead>
        <tbody>
          <tr><td>Título</td><td>✅</td><td>Nombre breve y descriptivo</td></tr>
          <tr><td>Descripción</td><td>—</td><td>Soporta formato <strong>Markdown</strong></td></tr>
          <tr><td>Prioridad</td><td>—</td><td>Urgente · Alta · Media · Baja</td></tr>
          <tr><td>Etiquetas</td><td>—</td><td>Una o varias etiquetas existentes</td></tr>
          <tr><td>Fecha límite</td><td>—</td><td>Fecha de vencimiento con alerta visual</td></tr>
          <tr><td>Proyecto</td><td>—</td><td>Agrupación de tareas</td></tr>
          <tr><td>Asignados</td><td>—</td><td>Personas responsables</td></tr>
        </tbody>
      </table>

      <h3>Editar una tarea</h3>
      <p>Haz clic sobre la tarjeta para abrir el panel de detalle y modifica cualquier campo.</p>

      <h3>Eliminar una tarea</h3>
      <p>Abre el detalle → botón <strong>🗑️ Eliminar</strong> → confirma en el diálogo.</p>

      <h3>Subtareas</h3>
      <p>En el detalle puedes añadir subtareas (checklist). El progreso se muestra en la tarjeta.</p>

      <h3>Historial de actividad</h3>
      <p>El panel de detalle registra todos los cambios realizados sobre la tarea con fecha y descripción.</p>
    `,
  },
  {
    id: 'etiquetas',
    title: 'Etiquetas',
    icon: '🏷️',
    html: `
      <h2>Etiquetas</h2>
      <p>Las etiquetas permiten categorizar y filtrar tareas visualmente.</p>

      <h3>Crear una etiqueta</h3>
      <ol>
        <li>Haz clic en <strong>🏷️ Gestionar etiquetas</strong> en el encabezado.</li>
        <li>Haz clic en <strong>"Nueva etiqueta"</strong>.</li>
        <li>Escribe un nombre y selecciona un color con contraste WCAG AA.</li>
        <li>Confirma con <strong>Crear</strong>.</li>
      </ol>

      <h3>Asignar etiquetas a una tarea</h3>
      <p>Al <strong>crear</strong> o <strong>editar</strong> una tarea usa el selector de etiquetas.
      Puedes asignar <strong>múltiples etiquetas</strong> a la misma tarea.</p>

      <h3>Editar una etiqueta</h3>
      <p>En el panel de etiquetas, haz clic en ✏️ de la etiqueta deseada. Los cambios se
      propagan inmediatamente a todas las tareas que la usen.</p>

      <h3>Eliminar una etiqueta</h3>
      <p>Haz clic en 🗑️ en el panel de etiquetas. La etiqueta se retira de todas las tareas asociadas.</p>

      <h3>Etiquetas por defecto</h3>
      <p>Al iniciar la app se crean: <strong>Bug</strong>, <strong>Feature</strong>,
      <strong>Mejora</strong>, <strong>Documentación</strong> y <strong>Urgente</strong>.</p>
    `,
  },
  {
    id: 'drag-and-drop',
    title: 'Drag & Drop',
    icon: '↕️',
    html: `
      <h2>Drag &amp; Drop</h2>

      <h3>Mover una tarea entre columnas</h3>
      <ol>
        <li>Mantén pulsado el botón del ratón sobre la tarjeta.</li>
        <li>Arrastra hacia la columna destino.</li>
        <li>Suelta cuando la columna esté resaltada.</li>
      </ol>
      <p>La tarea se inserta al final de la columna y el cambio se persiste automáticamente.</p>

      <h3>Reordenar tareas dentro de una columna</h3>
      <p>Arrastra la tarjeta hacia arriba o hacia abajo dentro de la misma columna y suelta en la posición deseada.</p>

      <h3>Reordenar columnas</h3>
      <p>Haz clic y mantén pulsado sobre la <strong>cabecera</strong> de la columna, luego arrástrala a la posición deseada.</p>

      <h3>Modo sin ratón</h3>
      <p>Si no puedes usar drag &amp; drop, usa el <strong>menú contextual ⋮</strong> de la tarjeta y selecciona
      <strong>Mover a →</strong> para elegir la columna destino.</p>
    `,
  },
  {
    id: 'filtros-busqueda',
    title: 'Filtros y búsqueda',
    icon: '🔍',
    html: `
      <h2>Filtros y búsqueda</h2>

      <h3>Barra de filtros del tablero</h3>
      <p>Situada en la parte superior del tablero, filtra las tareas visibles en tiempo real.</p>
      <ul>
        <li><strong>Texto:</strong> filtra por título o descripción (debounce 200 ms, sin distinguir mayúsculas).</li>
        <li><strong>Etiqueta:</strong> selecciona una o varias etiquetas — los filtros son acumulativos (AND).</li>
        <li><strong>Prioridad:</strong> limita las tareas a un nivel de prioridad concreto.</li>
        <li><strong>Limpiar:</strong> haz clic en "Limpiar" o vacía el campo para restablecer la vista.</li>
      </ul>

      <h3>Paleta de comandos global</h3>
      <p>Abre con <kbd>Cmd + K</kbd> (Mac) o <kbd>Ctrl + K</kbd> (Windows/Linux).</p>
      <ul>
        <li>Busca tareas por título o descripción en <strong>todos los tableros</strong>.</li>
        <li>Navega con <kbd>↑</kbd> / <kbd>↓</kbd> y abre con <kbd>Enter</kbd>.</li>
        <li>Cierra con <kbd>Escape</kbd>.</li>
        <li>Si no hay resultados, puedes <strong>crear la tarea</strong> directamente desde la paleta.</li>
      </ul>
    `,
  },
  {
    id: 'atajos-teclado',
    title: 'Atajos de teclado',
    icon: '⌨️',
    html: `
      <h2>Atajos de teclado</h2>

      <h3>Globales</h3>
      <table>
        <thead><tr><th>Atajo</th><th>Acción</th></tr></thead>
        <tbody>
          <tr><td><kbd>Cmd / Ctrl + K</kbd></td><td>Abrir / cerrar la paleta de comandos</td></tr>
          <tr><td><kbd>Escape</kbd></td><td>Cerrar el diálogo, panel o paleta activa</td></tr>
          <tr><td><kbd>?</kbd></td><td>Abrir esta guía de usuario</td></tr>
        </tbody>
      </table>

      <h3>Paleta de comandos</h3>
      <table>
        <thead><tr><th>Atajo</th><th>Acción</th></tr></thead>
        <tbody>
          <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Navegar entre resultados</td></tr>
          <tr><td><kbd>Enter</kbd></td><td>Abrir la tarea seleccionada</td></tr>
          <tr><td><kbd>Escape</kbd></td><td>Cerrar la paleta</td></tr>
        </tbody>
      </table>

      <h3>Diálogos y paneles</h3>
      <table>
        <thead><tr><th>Atajo</th><th>Acción</th></tr></thead>
        <tbody>
          <tr><td><kbd>Escape</kbd></td><td>Cerrar el diálogo activo</td></tr>
          <tr><td><kbd>Tab</kbd></td><td>Siguiente elemento interactivo</td></tr>
          <tr><td><kbd>Shift + Tab</kbd></td><td>Elemento interactivo anterior</td></tr>
          <tr><td><kbd>Enter</kbd> / <kbd>Espacio</kbd></td><td>Activar el botón enfocado</td></tr>
        </tbody>
      </table>

      <p class="note">En macOS usa <kbd>Cmd</kbd>; en Windows y Linux usa <kbd>Ctrl</kbd>.</p>
    `,
  },
  {
    id: 'busqueda-global',
    title: 'Búsqueda global',
    icon: '🔍',
    html: `
      <h2>Búsqueda global y paleta de comandos</h2>
      <p>Usa <kbd>Cmd / Ctrl + K</kbd> para abrir la <strong>paleta de comandos global</strong> y buscar tareas, tableros o acciones en toda la aplicación.</p>

      <h3>Cómo usar la paleta</h3>
      <ol>
        <li>Pulsa <kbd>Cmd / Ctrl + K</kbd> (o haz clic en el ícono 🔍 del encabezado).</li>
        <li>Escribe el nombre de una tarea, tablero o acción.</li>
        <li>Navega con <kbd>↑</kbd> / <kbd>↓</kbd> y abre con <kbd>Enter</kbd>.</li>
        <li>Cierra con <kbd>Escape</kbd> o clic fuera de la paleta.</li>
      </ol>

      <h3>Tipos de búsqueda</h3>
      <table>
        <thead><tr><th scope="col">Búsqueda</th><th scope="col">Cómo</th></tr></thead>
        <tbody>
          <tr><td>Por título</td><td>Escribe el texto directamente</td></tr>
          <tr><td>Por descripción</td><td>Escribe el texto — resultados secundarios</td></tr>
          <tr><td>Por etiqueta</td><td>Escribe <code>#nombre-etiqueta</code></td></tr>
        </tbody>
      </table>
      <p class="note">Si no hay resultados, puedes crear la tarea directamente desde la paleta.</p>
    `,
  },
  {
    id: 'assignees',
    title: 'Asignación de personas',
    icon: '👤',
    html: `
      <h2>Asignación de personas</h2>
      <p>Asigna una o más personas a cada tarea para distribuir el trabajo y ver quién es responsable directamente desde la tarjeta del tablero.</p>

      <h3>Crear una persona</h3>
      <ol>
        <li>Accede a <strong>Ajustes → Personas</strong> (o desde el selector en el detalle de una tarea).</li>
        <li>Haz clic en <strong>Nueva persona</strong>.</li>
        <li>Introduce el nombre y opcionalmente un emoji o inicial para el avatar.</li>
        <li>Confirma. La persona queda guardada en IndexedDB.</li>
      </ol>

      <h3>Asignar personas a una tarea</h3>
      <ol>
        <li>Abre el detalle de la tarea.</li>
        <li>En la sección <strong>Asignados</strong>, haz clic en el selector.</li>
        <li>Selecciona una o varias personas de la lista.</li>
      </ol>

      <h3>Ver asignados en el tablero</h3>
      <p>Los avatares aparecen en la esquina inferior derecha de la tarjeta. Si hay más de tres asignados se muestra <strong>+N</strong>.</p>

      <h3>Filtrar por persona</h3>
      <p>Usa el <strong>panel de filtros</strong> (ícono embudo) y selecciona una persona para mostrar solo sus tareas en el tablero activo.</p>
      <p class="note">El directorio de personas es global a todos los tableros.</p>
    `,
  },
  {
    id: 'pwa',
    title: 'Usar como app (PWA)',
    icon: '📱',
    html: `
      <h2>Usar como app (PWA)</h2>
      <p>Dojo Kanban es una <strong>Progressive Web App</strong>: puedes instalarla en tu escritorio o móvil y usarla sin conexión como si fuera una app nativa.</p>

      <h3>Instalar en escritorio (Chrome / Edge)</h3>
      <ol>
        <li>Abre la app en el navegador.</li>
        <li>Haz clic en el ícono <strong>⊕ Instalar</strong> en la barra de dirección.</li>
        <li>Confirma la instalación. La app se abre en su propia ventana.</li>
      </ol>

      <h3>Instalar en móvil</h3>
      <ul>
        <li><strong>Android (Chrome):</strong> menú <strong>⋮ → Añadir a pantalla de inicio</strong>.</li>
        <li><strong>iOS (Safari):</strong> botón <strong>Compartir → Añadir a pantalla de inicio</strong>.</li>
      </ul>

      <h3>Funcionalidad offline</h3>
      <table>
        <thead><tr><th scope="col">Acción</th><th scope="col">¿Disponible offline?</th></tr></thead>
        <tbody>
          <tr><td>Ver tableros y tareas</td><td>✅</td></tr>
          <tr><td>Crear, editar, mover tareas</td><td>✅</td></tr>
          <tr><td>Sincronización con Supabase</td><td>⏳ Se aplaza hasta tener conexión</td></tr>
        </tbody>
      </table>

      <h3>Actualizar la app</h3>
      <p>Cuando hay una nueva versión, aparece un <strong>banner de actualización</strong>. Haz clic en <strong>Actualizar</strong> para recargar con la última versión.</p>
    `,
  },
  {
    id: 'wip-limits',
    title: 'Límites WIP',
    icon: '🚦',
    html: `
      <h2>Límites WIP por columna</h2>
      <p>Los <strong>límites WIP</strong> (Work In Progress) establecen un máximo de tareas por columna para identificar cuellos de botella y mantener un flujo sostenible.</p>

      <h3>Configurar el límite al crear una columna</h3>
      <ol>
        <li>Haz clic en <strong>"+ Columna"</strong>.</li>
        <li>Rellena el campo opcional <strong>Límite WIP</strong> con un número entero positivo.</li>
        <li>Confirma la creación.</li>
      </ol>

      <h3>Configurar el límite en una columna existente</h3>
      <ol>
        <li>Abre el menú <strong>⋮</strong> de la columna → <strong>Editar columna</strong>.</li>
        <li>Modifica el campo <strong>Límite WIP</strong>.</li>
        <li>Guarda los cambios.</li>
      </ol>

      <h3>Estados visuales del contador</h3>
      <table>
        <thead><tr><th scope="col">Estado</th><th scope="col">Color</th></tr></thead>
        <tbody>
          <tr><td>Dentro del límite</td><td>Normal</td></tr>
          <tr><td>En el límite exacto</td><td>Amarillo / advertencia</td></tr>
          <tr><td>Superado</td><td>Rojo — banner de alerta</td></tr>
        </tbody>
      </table>
      <p class="note">El límite WIP no bloquea el drag &amp; drop; muestra una alerta visual cuando se supera.</p>

      <h3>Eliminar el límite</h3>
      <p>Edita la columna y deja el campo <strong>Límite WIP</strong> vacío.</p>
    `,
  },
  {
    id: 'vista-lista',
    title: 'Vista de lista',
    icon: '☰',
    html: `
      <h2>Vista de lista / tabla</h2>
      <p>Cambia entre el tablero Kanban y una <strong>vista de lista</strong> con todas las tareas en formato tabla ordenable.</p>

      <h3>Cambiar de vista</h3>
      <p>Usa los botones en la barra superior del tablero:</p>
      <ul>
        <li><strong>📋 Tablero</strong> — vista Kanban por columnas.</li>
        <li><strong>☰ Lista</strong> — vista tabla con filas ordenables.</li>
      </ul>
      <p>La preferencia se guarda automáticamente por tablero.</p>

      <h3>Columnas disponibles</h3>
      <table>
        <thead><tr><th scope="col">Columna</th><th scope="col">Ordenable</th></tr></thead>
        <tbody>
          <tr><td>Título</td><td>✅</td></tr>
          <tr><td>Estado</td><td>✅</td></tr>
          <tr><td>Prioridad</td><td>✅</td></tr>
          <tr><td>Etiquetas</td><td>—</td></tr>
          <tr><td>Asignados</td><td>—</td></tr>
          <tr><td>Vencimiento</td><td>✅</td></tr>
        </tbody>
      </table>

      <h3>Ordenar</h3>
      <p>Haz clic en el encabezado de una columna para ordenar: primer clic ↑, segundo ↓, tercer clic sin orden.</p>

      <h3>Acciones desde la lista</h3>
      <p>Cada fila tiene un menú <strong>⋮</strong> con las acciones: <strong>Abrir detalle</strong>, <strong>Cambiar estado</strong> y <strong>Eliminar</strong>.</p>
    `,
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones',
    icon: '🔔',
    html: `
      <h2>Notificaciones de vencimiento</h2>
      <p>Dojo Kanban puede enviarte <strong>notificaciones del navegador</strong> cuando una tarea está próxima a vencer o ha vencido, incluso con la app en segundo plano.</p>

      <h3>Activar notificaciones</h3>
      <ol>
        <li>La app mostrará una solicitud de permiso la primera vez que detecte tareas con fecha de vencimiento.</li>
        <li>Haz clic en <strong>Permitir</strong> para activar los recordatorios.</li>
        <li>Si lo omitiste, puedes activarlo desde <strong>Ajustes → Notificaciones</strong>.</li>
      </ol>

      <h3>Tipos de notificaciones</h3>
      <table>
        <thead><tr><th scope="col">Momento</th><th scope="col">Mensaje</th></tr></thead>
        <tbody>
          <tr><td>24 h antes</td><td>⏰ "La tarea <em>X</em> vence mañana"</td></tr>
          <tr><td>Al vencer</td><td>🔴 "La tarea <em>X</em> ha vencido"</td></tr>
        </tbody>
      </table>
      <p>Cada notificación incluye el botón <strong>Abrir tarea</strong>.</p>

      <h3>Desactivar notificaciones</h3>
      <p>Ve a <strong>Ajustes → Notificaciones</strong> y desactiva el interruptor, o revoca el permiso desde la configuración del navegador.</p>

      <p class="note">Las notificaciones cuando la app está cerrada solo funcionan si tienes la <strong>PWA instalada</strong>.</p>
    `,
  },
  {
    id: 'modal-edicion',
    title: 'Modal de edición',
    icon: '📝',
    html: `
      <h2>Modal ampliado de edición</h2>
      <p>Al hacer clic sobre una tarjeta, el panel de detalle se abre como un <strong>modal de pantalla completa</strong> (90 % del viewport) para trabajar cómodamente con descripciones extensas, subtareas e historial.</p>

      <h3>Estructura del modal</h3>
      <ul>
        <li><strong>Header fijo</strong> — título de la tarea y botón de cierre.</li>
        <li><strong>Área de contenido con scroll</strong> — descripción Markdown, subtareas, asignados, etiquetas, fecha de vencimiento e historial.</li>
        <li><strong>Footer fijo</strong> — botones Guardar y Cancelar.</li>
      </ul>

      <h3>Cerrar el modal</h3>
      <table>
        <thead><tr><th scope="col">Acción</th><th scope="col">Resultado</th></tr></thead>
        <tbody>
          <tr><td>Clic en <strong>✕</strong></td><td>Cierra el modal</td></tr>
          <tr><td>Clic en el backdrop</td><td>Cierra el modal</td></tr>
          <tr><td><kbd>Escape</kbd></td><td>Cierra el modal</td></tr>
        </tbody>
      </table>
      <p class="note">Si hay cambios sin guardar, se mostrará un aviso de confirmación antes de cerrar.</p>
    `,
  },
  {
    id: 'templates-tareas',
    title: 'Plantillas de tareas',
    icon: '📄',
    html: `
      <h2>Plantillas de tareas</h2>
      <p>Guarda configuraciones predefinidas de tarea para reutilizarlas en tickets recurrentes como <em>Bug Report</em>, <em>Feature</em> o <em>Revisión</em>.</p>

      <h3>Crear una plantilla</h3>
      <ol>
        <li>Ve a <strong>Ajustes → Plantillas</strong>.</li>
        <li>Haz clic en <strong>Nueva plantilla</strong>.</li>
        <li>Rellena: <strong>nombre</strong> (obligatorio), descripción Markdown, prioridad, etiquetas y asignados.</li>
        <li>Guarda.</li>
      </ol>

      <h3>Usar una plantilla al crear una tarea</h3>
      <ol>
        <li>Abre el diálogo <strong>Nueva tarea</strong>.</li>
        <li>Haz clic en <strong>Usar plantilla</strong> y selecciona una de la lista.</li>
        <li>Los campos se rellenan automáticamente. Ajusta lo necesario y confirma.</li>
      </ol>

      <h3>Editar y eliminar plantillas</h3>
      <p>Desde <strong>Ajustes → Plantillas</strong> cada entrada tiene los botones <strong>Editar</strong> y <strong>Eliminar</strong>. La eliminación no afecta a las tareas ya creadas con esa plantilla.</p>
      <p class="note">Las plantillas son globales a todos los tableros.</p>
    `,
  },
  {
    id: 'columnas-defecto',
    title: 'Columnas por defecto',
    icon: '📐',
    html: `
      <h2>Columnas por defecto</h2>
      <p>Cuando creas un <strong>nuevo tablero</strong>, se inicializa automáticamente con cuatro columnas estandarizadas:</p>

      <table>
        <thead><tr><th scope="col">Orden</th><th scope="col">Nombre</th><th scope="col">Uso sugerido</th></tr></thead>
        <tbody>
          <tr><td>1</td><td><strong>Backlog</strong></td><td>Tareas pendientes de planificar</td></tr>
          <tr><td>2</td><td><strong>En progreso</strong></td><td>Tareas actualmente en desarrollo</td></tr>
          <tr><td>3</td><td><strong>En revisión</strong></td><td>Tareas esperando revisión</td></tr>
          <tr><td>4</td><td><strong>Hecho</strong></td><td>Tareas finalizadas y validadas</td></tr>
        </tbody>
      </table>

      <h3>Personalizar</h3>
      <p>Las columnas por defecto son solo un punto de partida. Puedes:</p>
      <ul>
        <li><strong>Renombrar</strong> cualquier columna desde su menú <strong>⋮ → Editar</strong>.</li>
        <li><strong>Eliminar</strong> las que no necesites.</li>
        <li><strong>Añadir</strong> nuevas con <strong>"+ Columna"</strong>.</li>
        <li><strong>Reordenar</strong> arrastrando la cabecera.</li>
      </ul>
      <p class="note">Los tableros creados antes de esta versión no se ven afectados.</p>
    `,
  },
];

// ── Clase ──────────────────────────────────────────────────────────────────

export class DojoWiki extends HTMLElement {
  static readonly TAG = 'dojo-wiki';

  static get observedAttributes(): string[] { return ['open']; }

  private _shadow: ShadowRoot;
  private _activeSectionId = WIKI_SECTIONS[0].id;
  /** Elemento que tenía el foco antes de abrir el panel. */
  private _previousFocus: HTMLElement | null = null;

  // ── Keyboard handler (referencia estable para cleanup) ─────────────────

  private _onDocKeydown = (e: KeyboardEvent): void => {
    // '?' abre la wiki (cuando no hay otro diálogo activo ni se está escribiendo)
    if (e.key === '?' && !this.hasAttribute('open')) {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return;
      e.preventDefault();
      this.show();
      return;
    }

    if (!this.hasAttribute('open')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.hide();
    }

    // Focus trap (WCAG 2.1 SC 2.1.2)
    if (e.key === 'Tab') {
      const panel = this._shadow.querySelector<HTMLElement>('.panel');
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.offsetParent !== null);
      if (focusable.length < 2) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      const active = this._shadow.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
    document.addEventListener('keydown', this._onDocKeydown);
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this._onDocKeydown);
  }

  attributeChangedCallback(name: string, _old: string | null, newVal: string | null): void {
    if (name !== 'open') return;
    const panel    = this._shadow.querySelector<HTMLElement>('.panel');
    const backdrop = this._shadow.querySelector<HTMLElement>('.backdrop');
    const isOpen   = newVal !== null;
    if (panel) {
      panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      if (isOpen) panel.removeAttribute('inert');
      else        panel.setAttribute('inert', '');
    }
    if (backdrop) backdrop.classList.toggle('visible', isOpen);
  }

  // ── API pública ──────────────────────────────────────────────────────────

  show(sectionId?: string): void {
    if (sectionId) this._activeSectionId = sectionId;
    this._previousFocus = document.activeElement as HTMLElement;
    this.setAttribute('open', '');
    this._updateContent();
    requestAnimationFrame(() => {
      this._shadow.querySelector<HTMLButtonElement>('.panel-close')?.focus();
    });
  }

  hide(): void {
    this.removeAttribute('open');
    this._previousFocus?.focus();
    this._previousFocus = null;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  private _render(): void {
    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      /* ── Backdrop ─────────────────────────────────────────────── */
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        z-index: 200;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      .backdrop.visible {
        opacity: 1;
        pointer-events: auto;
      }

      /* ── Panel lateral ────────────────────────────────────────── */
      .panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(720px, 100vw);
        z-index: 201;
        background: var(--dojo-surface);
        border-left: 1px solid var(--dojo-border);
        box-shadow: -4px 0 24px rgba(0,0,0,0.12);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.22s ease;
      }
      :host([open]) .panel {
        transform: translateX(0);
      }

      /* ── Cabecera del panel ───────────────────────────────────── */
      .panel-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0 1.25rem;
        height: 52px;
        border-bottom: 1px solid var(--dojo-border);
        flex-shrink: 0;
      }
      .panel-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        flex: 1;
      }
      .panel-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: var(--dojo-radius-sm, 4px);
        background: transparent;
        color: var(--dojo-text-secondary);
        font-size: 1.25rem;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
        flex-shrink: 0;
      }
      .panel-close:hover {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
      }
      .panel-close:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* ── Cuerpo: sidebar + contenido ─────────────────────────── */
      .panel-body {
        display: flex;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      /* ── Sidebar de navegación ───────────────────────────────── */
      .sidebar {
        width: 220px;
        flex-shrink: 0;
        border-right: 1px solid var(--dojo-border);
        overflow-y: auto;
        padding: 0.75rem 0;
        background: var(--dojo-bg);
      }
      .sidebar-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.5rem 1.25rem;
        border: none;
        background: transparent;
        color: var(--dojo-text-secondary);
        font-size: 0.875rem;
        font-family: inherit;
        text-align: left;
        cursor: pointer;
        border-radius: 0;
        transition: background 0.12s, color 0.12s;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sidebar-item:hover {
        background: var(--dojo-surface-hover);
        color: var(--dojo-text-primary);
      }
      .sidebar-item.active {
        background: var(--dojo-surface);
        color: var(--dojo-primary, #1D4ED8);
        font-weight: 600;
        border-right: 3px solid var(--dojo-primary, #1D4ED8);
      }
      .sidebar-item:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: -2px;
      }
      .sidebar-icon {
        font-size: 1rem;
        flex-shrink: 0;
      }

      /* ── Área de contenido ───────────────────────────────────── */
      .content {
        flex: 1;
        overflow-y: auto;
        padding: 1.75rem 2rem;
      }

      /* ── Tipografía del contenido ────────────────────────────── */
      .content h2 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        margin: 0 0 1.25rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--dojo-border);
      }
      .content h3 {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--dojo-text-primary);
        margin: 1.25rem 0 0.5rem;
      }
      .content p,
      .content li {
        font-size: 0.875rem;
        color: var(--dojo-text-secondary);
        line-height: 1.6;
        margin: 0 0 0.5rem;
      }
      .content ul,
      .content ol {
        padding-left: 1.25rem;
        margin: 0 0 0.75rem;
      }
      .content li { margin-bottom: 0.25rem; }
      .content strong { color: var(--dojo-text-primary); font-weight: 600; }
      .content em { font-style: italic; }

      /* ── Tablas ──────────────────────────────────────────────── */
      .content table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
        margin: 0.75rem 0 1rem;
      }
      .content th {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
        font-weight: 600;
        padding: 0.5rem 0.75rem;
        text-align: left;
        border: 1px solid var(--dojo-border);
      }
      .content td {
        padding: 0.4375rem 0.75rem;
        border: 1px solid var(--dojo-border);
        color: var(--dojo-text-secondary);
        vertical-align: top;
      }
      .content tr:nth-child(even) td {
        background: var(--dojo-bg);
      }

      /* ── Teclas ──────────────────────────────────────────────── */
      .content kbd {
        display: inline-block;
        padding: 0.15em 0.45em;
        font-size: 0.8125rem;
        font-family: ui-monospace, SFMono-Regular, monospace;
        background: var(--dojo-bg);
        border: 1px solid var(--dojo-border);
        border-radius: 4px;
        box-shadow: 0 1px 0 var(--dojo-border);
        color: var(--dojo-text-primary);
        white-space: nowrap;
      }

      /* ── Mensajes especiales ─────────────────────────────────── */
      .content .warning {
        background: #FEF3C7;
        border-left: 3px solid #D97706;
        border-radius: 0 var(--dojo-radius-sm, 4px) var(--dojo-radius-sm, 4px) 0;
        padding: 0.625rem 0.875rem;
        color: #92400E;
        font-size: 0.8125rem;
      }
      .content .note {
        background: var(--dojo-bg);
        border-left: 3px solid var(--dojo-primary, #1D4ED8);
        border-radius: 0 var(--dojo-radius-sm, 4px) var(--dojo-radius-sm, 4px) 0;
        padding: 0.625rem 0.875rem;
        color: var(--dojo-text-secondary);
        font-size: 0.8125rem;
      }
      [data-theme="dark"] .content .warning {
        background: rgba(217,119,6,0.15);
        color: #FCD34D;
      }

      /* ── Responsive: sidebar colapsado en pantallas pequeñas ── */
      @media (max-width: 600px) {
        .sidebar { width: 52px; }
        .sidebar-item span:not(.sidebar-icon) { display: none; }
        .sidebar-item { padding: 0.5rem; justify-content: center; }
        .content { padding: 1.25rem; }
      }
    `;
    this._shadow.appendChild(style);

    // ── Backdrop ─────────────────────────────────────────────────────────
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', () => this.hide());
    this._shadow.appendChild(backdrop);

    // ── Panel ─────────────────────────────────────────────────────────────
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'wiki-title');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('inert', '');

    // Cabecera
    const panelHeader = document.createElement('header');
    panelHeader.className = 'panel-header';

    const panelIcon = document.createElement('span');
    panelIcon.setAttribute('aria-hidden', 'true');
    panelIcon.textContent = '📖';

    const panelTitle = document.createElement('h1');
    panelTitle.className = 'panel-title';
    panelTitle.id = 'wiki-title';
    panelTitle.textContent = 'Guía de usuario';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'panel-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Cerrar guía de usuario');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.hide());

    panelHeader.append(panelIcon, panelTitle, closeBtn);
    panel.appendChild(panelHeader);

    // Cuerpo: sidebar + contenido
    const panelBody = document.createElement('div');
    panelBody.className = 'panel-body';

    // Sidebar
    const sidebar = document.createElement('nav');
    sidebar.className = 'sidebar';
    sidebar.setAttribute('aria-label', 'Secciones de la guía');

    for (const section of WIKI_SECTIONS) {
      const btn = document.createElement('button');
      btn.className = 'sidebar-item';
      btn.type = 'button';
      btn.dataset['section'] = section.id;
      btn.setAttribute('aria-current', section.id === this._activeSectionId ? 'page' : 'false');

      const icon = document.createElement('span');
      icon.className = 'sidebar-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = section.icon;

      const label = document.createElement('span');
      label.textContent = section.title;

      btn.append(icon, label);
      btn.addEventListener('click', () => this._selectSection(section.id));
      sidebar.appendChild(btn);
    }

    // Área de contenido
    const contentEl = document.createElement('div');
    contentEl.className = 'content';
    contentEl.setAttribute('role', 'region');
    contentEl.setAttribute('aria-label', 'Contenido de la sección');
    contentEl.setAttribute('aria-live', 'polite');

    panelBody.append(sidebar, contentEl);
    panel.appendChild(panelBody);
    this._shadow.appendChild(panel);

    this._updateContent();
  }

  // ── Sección activa ───────────────────────────────────────────────────────

  private _selectSection(id: string): void {
    this._activeSectionId = id;
    this._updateContent();
  }

  private _updateContent(): void {
    const section = WIKI_SECTIONS.find(s => s.id === this._activeSectionId)
                 ?? WIKI_SECTIONS[0];

    // Actualizar sidebar (estado activo)
    this._shadow.querySelectorAll<HTMLButtonElement>('.sidebar-item').forEach(btn => {
      const isActive = btn.dataset['section'] === section.id;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Actualizar contenido
    // El HTML proviene de strings literales definidos en esta misma clase,
    // no contiene input del usuario — sin riesgo de XSS.
    const contentEl = this._shadow.querySelector<HTMLElement>('.content');
    if (contentEl) {
      contentEl.innerHTML = section.html;
    }
  }
}

// ── Registro ──────────────────────────────────────────────────────────────

customElements.define(DojoWiki.TAG, DojoWiki);
