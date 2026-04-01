/**
 * dojo-app — Organismo raíz
 *
 * Componente raíz de la aplicación. Monta el `<dojo-kanban-board>`
 * y establece el layout general (header + área del tablero).
 *
 * Escucha el evento `dojo:board-error` para representar estados de fallo
 * en el nivel de aplicación.
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*, --dojo-primary,
 * --dojo-shadow, --dojo-radius
 */
import '../dojo-kanban-board/dojo-kanban-board.js';
import '../dojo-label-manager/dojo-label-manager.js';
import '../dojo-project-manager/dojo-project-manager.js';
import '../dojo-person-manager/dojo-person-manager.js';
import '../dojo-command-palette/dojo-command-palette.js';
import '../dojo-board-selector/dojo-board-selector.js';
import '../../atoms/dojo-theme-toggle/dojo-theme-toggle.js';
import '../../atoms/dojo-person-avatar/dojo-person-avatar.js';
export declare class DojoApp extends HTMLElement {
    static readonly TAG = "dojo-app";
    private _shadow;
    /** Datos pendientes de importación (tras validación, previo a confirmación). */
    private _pendingImport;
    private _toastTimer;
    /** ID del tablero activo. Si es vacío, se muestra el selector de tableros (US-22). */
    private _activeBoardId;
    /** Referencia estable para poder eliminar el listener de teclado del diálogo de importación. */
    private _onImportKeydown;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _render;
    /**
     * Si solo hay un tablero, navega directamente a él.
     * Si hay múltiples, se queda en el selector.
     */
    private _autoSelectSingleBoard;
    private _navigateToBoard;
    private _showBoardSelector;
    private _handleExport;
    private _handleImportFile;
    private _showImportConfirm;
    private _hideImportConfirm;
    private _confirmImport;
    private _showToast;
}
