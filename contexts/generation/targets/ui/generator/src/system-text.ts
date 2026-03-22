/**
 * System Text Catalog
 *
 * UI "furniture" text that exists in every morph app regardless of domain.
 * These are the shared UI chrome strings - actions, navigation, confirmations, etc.
 *
 * This is the single source of truth for system text. Module text (e.g., auth)
 * and domain text (from user's text.config.ts) are layered on top.
 */

import type { TranslationEntry } from "@morph/domain-schema";

/**
 * System text catalog type - maps keys to translation entries.
 */
export type SystemTextCatalog = Readonly<Record<string, TranslationEntry>>;

/**
 * Default system text with translations for common UI languages.
 * Applications can override these via their text.config.ts overrides section.
 */
export const SYSTEM_TEXT: SystemTextCatalog = {
	// =========================================================================
	// Actions
	// =========================================================================
	"action.actions": {
		de: "Aktionen",
		en: "Actions",
		es: "Acciones",
	},
	"action.cancel": {
		de: "Abbrechen",
		en: "Cancel",
		es: "Cancelar",
	},
	"action.create": {
		de: "Neu erstellen",
		en: "Create New",
		es: "Crear nuevo",
	},
	"action.delete": {
		de: "Löschen",
		en: "Delete",
		es: "Eliminar",
	},
	"action.edit": {
		de: "Bearbeiten",
		en: "Edit",
		es: "Editar",
	},
	"action.save": {
		de: "Änderungen speichern",
		en: "Save Changes",
		es: "Guardar cambios",
	},
	"action.view": {
		de: "Anzeigen",
		en: "View",
		es: "Ver",
	},

	// =========================================================================
	// Confirmations
	// =========================================================================
	"confirm.delete": {
		de: "Möchten Sie dieses Element wirklich löschen?",
		en: "Are you sure you want to delete this item?",
		es: "Esta seguro de que desea eliminar este elemento?",
	},
	"confirm.deleteEntity": {
		de: "Dieses {entity} löschen?",
		en: "Delete this {entity}?",
		es: "Eliminar este {entity}?",
	},
	"confirm.title": {
		de: "Bestätigen",
		en: "Confirm Delete",
		es: "Confirmar eliminacion",
	},

	// =========================================================================
	// Errors (System-level)
	// =========================================================================
	"error.actionFailed": {
		de: "Fehler beim {action}",
		en: "Failed to {action} {entity}",
		es: "Error al {action} {entity}",
	},
	"error.createFailed": {
		de: "Fehler beim Erstellen von {entity}",
		en: "Failed to create {entity}",
		es: "Error al crear {entity}",
	},
	"error.deleteFailed": {
		de: "Fehler beim Löschen von {entity}",
		en: "Failed to delete {entity}",
		es: "Error al eliminar {entity}",
	},
	"error.functionFailed": {
		de: "Funktion fehlgeschlagen",
		en: "Function failed",
		es: "La funcion fallo",
	},
	"error.loadFailed": {
		de: "Fehler beim Laden von {entity}",
		en: "Failed to load {entity}",
		es: "Error al cargar {entity}",
	},
	"error.notFound": {
		de: "{entity} nicht gefunden",
		en: "{entity} not found",
		es: "{entity} no encontrado",
	},
	"error.updateFailed": {
		de: "Fehler beim Aktualisieren von {entity}",
		en: "Failed to update {entity}",
		es: "Error al actualizar {entity}",
	},

	// =========================================================================
	// Forms
	// =========================================================================
	"form.optional": {
		de: "optional",
		en: "optional",
		es: "opcional",
	},
	"form.selectPlaceholder": {
		de: "Auswählen...",
		en: "Select...",
		es: "Seleccionar...",
	},

	// =========================================================================
	// Functions
	// =========================================================================
	"function.completedSuccessfully": {
		de: "Erfolgreich abgeschlossen.",
		en: "Completed successfully.",
		es: "Completado con exito.",
	},
	"function.execute": {
		de: "Ausführen",
		en: "Execute",
		es: "Ejecutar",
	},
	"function.result": {
		de: "Ergebnis",
		en: "Result",
		es: "Resultado",
	},

	// =========================================================================
	// Navigation
	// =========================================================================
	"nav.backToList": {
		de: "← Zurück zur Liste",
		en: "← Back to list",
		es: "← Volver a la lista",
	},
	"nav.home": {
		de: "Startseite",
		en: "Home",
		es: "Inicio",
	},

	// =========================================================================
	// Status
	// =========================================================================
	"status.loading": {
		de: "Lädt...",
		en: "Loading...",
		es: "Cargando...",
	},
	"status.welcome": {
		de: "Willkommen",
		en: "Welcome",
		es: "Bienvenido",
	},

	// =========================================================================
	// UI Chrome
	// =========================================================================
	"ui.emptyState": {
		de: "Noch keine {entity} vorhanden.",
		en: "No {entity} yet.",
		es: "Aun no hay {entity}.",
	},
	"ui.emptyStateAction": {
		de: "Erstellen Sie Ihr erstes Element",
		en: "Create your first one",
		es: "Cree el primero",
	},
	"ui.homeDescription": {
		de: "Was möchten Sie tun?",
		en: "What would you like to do?",
		es: "Que le gustaria hacer?",
	},
	"ui.languageLabel": {
		de: "Sprache",
		en: "Language",
		es: "Idioma",
	},
	"ui.metadata": {
		de: "Metadaten",
		en: "Metadata",
		es: "Metadatos",
	},
	"ui.recentActivity": {
		de: "Letzte Aktivität",
		en: "Recent Activity",
		es: "Actividad reciente",
	},
};
