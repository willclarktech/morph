import { assert, given, scenario, then, when } from "@morphdsl/scenario";
import { createPaste, listPastes } from "@pastebin-app/pastes-dsl";

/**
 * Test scenarios for the pastebin app.
 * These scenarios work with any runner (core lib, CLI, API, UI).
 */
export const scenarios = [
	scenario("Create a paste")
		.withActor("User")
		.steps(
			when(createPaste.call({ content: "Hello, World!" })).as("paste"),
			then(
				assert("paste", "content")
					.toBe("Hello, World!")
					.withProse("the paste content matches"),
			),
		),

	scenario("Create and list pastes")
		.withActor("User")
		.steps(
			given(createPaste.call({ content: "First paste" })).as("paste1"),
			when(listPastes.call({})).as("pastes"),
			then(assert("pastes").toHaveLength(1).withProse("one paste is returned")),
		),

	scenario("List pastes returns empty when none exist")
		.withActor("User")
		.steps(
			when(listPastes.call({})).as("pastes"),
			then(
				assert("pastes").toHaveLength(0).withProse("no pastes are returned"),
			),
		),
];
