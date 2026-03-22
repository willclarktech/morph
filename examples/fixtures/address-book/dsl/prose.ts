import type { Prose } from "@morph/operation";

import type * as ops from "./contacts";

export const prose: Prose<typeof ops> = {
	createContact: '{actor} creates a contact "{name}" with email "{email}"',
	listContacts: "{actor} lists all contacts",
	findByCity: '{actor} finds contacts in city "{city}"',
};
