import { readdir } from "node:fs/promises";
import path from "node:path";

import type { ExampleSnapshot } from "../pages/examples";

const FIXTURES_DIR = path.join(import.meta.dir, "../../../examples/fixtures");

const DESCRIPTIONS: Record<string, string> = {
	pastebin: "Minimal — single entity, no auth",
	"cache-port": "Abstract ports, property-based contracts",
	"type-gallery": "Generics, unions, aliases, pure functions",
	"address-book": "Value objects, @sensitive fields",
	"code-generator": "Transformation domain — no CRUD, pure functions",
	marketplace: "Multiple contexts, cross-context references, profiles",
	"delivery-tracker": "Entity relationships, post conditions",
	blog: "Role-based auth, domain events, subscribers",
	ledger: "Event-sourced storage, event store queries",
	todo: "Full-featured — auth, invariants, events, i18n, all app targets",
};

export const loadExamples = async (): Promise<readonly ExampleSnapshot[]> => {
	const entries = await readdir(FIXTURES_DIR, { withFileTypes: true });
	const examples: ExampleSnapshot[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const schemaPath = path.join(FIXTURES_DIR, entry.name, "schema.morph");
		const file = Bun.file(schemaPath);
		if (!(await file.exists())) continue;

		const schema = await file.text();
		examples.push({
			name: entry.name,
			description: DESCRIPTIONS[entry.name] ?? "",
			schema,
		});
	}

	return examples.sort((a, b) => a.name.localeCompare(b.name));
};
