import type { DomainSchema } from "@morphdsl/domain-schema";

export const detectPasswordAuth = (schema: DomainSchema): boolean => {
	for (const [, context] of Object.entries(schema.contexts)) {
		for (const [entName, ent] of Object.entries(context.entities)) {
			if (ent.attributes["passwordHash"]) {
				for (const [cmdName, cmd] of Object.entries(context.commands ?? {})) {
					const passwordParam = cmd.input["password"] as
						| { sensitive?: boolean }
						| undefined;
					if (
						cmdName.toLowerCase().includes("create") &&
						cmdName.toLowerCase().includes(entName.toLowerCase()) &&
						passwordParam?.sensitive
					) {
						return true;
					}
				}
			}
		}
	}
	return false;
};
