/**
 * Auth entity detection helpers for API generation.
 */
import type {
	CommandDef,
	DomainSchema,
	EntityDef,
} from "@morphdsl/domain-schema";

export interface AuthEntityInfo {
	readonly contextName: string;
	readonly entity: EntityDef;
	readonly entityName: string;
}

export interface CreateUserCommandInfo {
	readonly command: CommandDef;
	readonly name: string;
}

/**
 * Find an entity with passwordHash attribute (indicates password-based auth).
 */
export const getAuthEntity = (
	schema: DomainSchema,
): AuthEntityInfo | undefined => {
	for (const [contextName, context] of Object.entries(schema.contexts)) {
		for (const [entName, ent] of Object.entries(context.entities)) {
			if (ent.attributes["passwordHash"]) {
				return { contextName: contextName, entity: ent, entityName: entName };
			}
		}
	}
	return undefined;
};

/**
 * Find a createUser command with sensitive password input.
 */
export const getCreateUserCommand = (
	schema: DomainSchema,
	entityName: string,
): CreateUserCommandInfo | undefined => {
	for (const [, context] of Object.entries(schema.contexts)) {
		for (const [cmdName, cmd] of Object.entries(context.commands ?? {})) {
			if (
				cmdName.toLowerCase().includes("create") &&
				cmdName.toLowerCase().includes(entityName.toLowerCase()) &&
				cmd.input["password"]?.sensitive
			) {
				return { command: cmd, name: cmdName };
			}
		}
	}
	return undefined;
};
