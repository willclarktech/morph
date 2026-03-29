/**
 * Auth Module Text Catalog
 *
 * Authentication-specific UI text for login, registration, and session management.
 * This text is merged with system text when generating UI apps that use auth.
 */

import type { TranslationEntry } from "@morphdsl/domain-schema";

/**
 * Auth module text with translations for common UI languages.
 */
export const TEXT: Readonly<Record<string, TranslationEntry>> = {
	// =========================================================================
	// Auth Actions
	// =========================================================================
	"auth.hasAccount": {
		de: "Bereits ein Konto?",
		en: "Already have an account?",
		es: "Ya tienes una cuenta?",
	},
	"auth.login": {
		de: "Anmelden",
		en: "Login",
		es: "Iniciar sesion",
	},
	"auth.logout": {
		de: "Abmelden",
		en: "Logout",
		es: "Cerrar sesion",
	},
	"auth.noAccount": {
		de: "Noch kein Konto?",
		en: "Don't have an account?",
		es: "No tienes una cuenta?",
	},
	"auth.register": {
		de: "Registrieren",
		en: "Register",
		es: "Registrarse",
	},
	"auth.user": {
		de: "Benutzer",
		en: "User",
		es: "Usuario",
	},

	// =========================================================================
	// Auth Form Fields
	// =========================================================================
	"field.auth.email": {
		de: "E-Mail",
		en: "Email",
		es: "Correo electronico",
	},
	"field.auth.password": {
		de: "Passwort",
		en: "Password",
		es: "Contrasena",
	},
	"field.auth.confirmPassword": {
		de: "Passwort bestätigen",
		en: "Confirm Password",
		es: "Confirmar contrasena",
	},

	// =========================================================================
	// Auth Errors
	// =========================================================================
	"error.invalidCredentials": {
		de: "Ungültige E-Mail oder Passwort",
		en: "Invalid email or password",
		es: "Correo electronico o contrasena invalidos",
	},
	"error.registrationFailed": {
		de: "Registrierung fehlgeschlagen",
		en: "Registration failed",
		es: "Error en el registro",
	},
	"error.sessionExpired": {
		de: "Sitzung abgelaufen",
		en: "Session expired",
		es: "Sesion expirada",
	},
	"error.unauthorized": {
		de: "Nicht autorisiert",
		en: "Unauthorized",
		es: "No autorizado",
	},
};

/**
 * Get all text keys.
 */
export const getTextKeys = (): readonly string[] => Object.keys(TEXT).sort();
