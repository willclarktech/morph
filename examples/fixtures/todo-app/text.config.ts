/**
 * Text Configuration for Todo App
 *
 * All domain-specific human-readable text for the application.
 * Keys follow conventions:
 * - Entity: "entity.{name}.singular", "entity.{name}.plural"
 * - Field: "field.{entity}.{name}"
 * - Help: "help.{entity}.{name}"
 * - Operation: "op.{name}"
 * - Error: "error.{Name}"
 */
import { defineText } from "@morphdsl/domain-schema";

export default defineText({
	domain: {
		// =====================================================================
		// Entities
		// =====================================================================
		"entity.todo.singular": { en: "Todo", de: "Aufgabe" },
		"entity.todo.plural": { en: "Todos", de: "Aufgaben" },
		"entity.user.singular": { en: "User", de: "Benutzer" },
		"entity.user.plural": { en: "Users", de: "Benutzer" },

		// =====================================================================
		// Todo Fields
		// =====================================================================
		"field.todo.completed": { en: "Completed", de: "Erledigt" },
		"field.todo.createdAt": { en: "Created At", de: "Erstellt am" },
		"field.todo.dueDate": { en: "Due Date", de: "Fälligkeitsdatum" },
		"field.todo.title": { en: "Title", de: "Titel" },
		"field.todo.userId": { en: "User", de: "Benutzer" },

		// Todo Help Text
		"help.todo.completed": {
			en: "Whether the task is finished",
			de: "Ob die Aufgabe abgeschlossen ist",
		},
		"help.todo.createdAt": {
			en: "When the todo was created",
			de: "Wann die Aufgabe erstellt wurde",
		},
		"help.todo.dueDate": {
			en: "When the task is due",
			de: "Wann die Aufgabe fällig ist",
		},
		"help.todo.title": {
			en: "What needs to be done",
			de: "Was erledigt werden muss",
		},
		"help.todo.userId": {
			en: "The user who owns this todo",
			de: "Der Benutzer, dem diese Aufgabe gehört",
		},

		// =====================================================================
		// User Fields
		// =====================================================================
		"field.user.email": { en: "Email", de: "E-Mail" },
		"field.user.name": { en: "Name", de: "Name" },
		"field.user.passwordHash": { en: "Password Hash", de: "Passwort-Hash" },

		// User Help Text
		"help.user.email": {
			en: "Email address for notifications",
			de: "E-Mail-Adresse für Benachrichtigungen",
		},
		"help.user.name": {
			en: "Display name",
			de: "Anzeigename",
		},
		"help.user.passwordHash": {
			en: "Bcrypt hash of the user's password",
			de: "Bcrypt-Hash des Benutzerpassworts",
		},

		// =====================================================================
		// Operations
		// =====================================================================
		"op.completeTodo": { en: "Complete", de: "Abschließen" },
		"op.createTodo": { en: "Create Todo", de: "Aufgabe erstellen" },
		"op.createUser": { en: "Register", de: "Registrieren" },
		"op.deleteTodo": { en: "Delete Todo", de: "Aufgabe löschen" },
		"op.getTodo": { en: "View Todo", de: "Aufgabe anzeigen" },
		"op.listTodos": { en: "List Todos", de: "Aufgaben auflisten" },

		// =====================================================================
		// Errors
		// =====================================================================
		"error.AlreadyCompleted": {
			en: "Todo is already completed",
			de: "Aufgabe ist bereits erledigt",
		},
		"error.EmailAlreadyExists": {
			en: "A user with this email already exists",
			de: "Ein Benutzer mit dieser E-Mail existiert bereits",
		},
		"error.InvalidDueDate": {
			en: "The due date must be in the future",
			de: "Das Fälligkeitsdatum muss in der Zukunft liegen",
		},
		"error.SameUser": {
			en: "Cannot transfer todos to the same user",
			de: "Aufgaben können nicht an denselben Benutzer übertragen werden",
		},
		"error.TodoNotFound": {
			en: "Todo not found",
			de: "Aufgabe nicht gefunden",
		},
		"error.UserNotFound": {
			en: "User not found",
			de: "Benutzer nicht gefunden",
		},
	},
});
