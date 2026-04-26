# @morphdsl/scenarios

Behavioural scenarios that verify Morph's own generation pipeline, written in the same Given/When/Then DSL that generated projects use for their own scenario tests.

This package is Morph's own scenario suite — the canonical set of "given a `.morph` schema, when we generate, then the output should..." tests. It runs against multiple targets (the in-process core, the API, the CLI) to verify that natural transformations between targets preserve behaviour. If a scenario passes against the core but fails against the API, the natural transformation has a bug — the diagram doesn't commute.

## Writing a scenario

```ts
import { assert, given, scenario, then, when } from "@morphdsl/scenario";
import { newProject } from "@morphdsl/generation-dsl";

export const scenarios = [
	scenario("New project from a minimal schema")
		.withActor("User")
		.steps(
			when(
				newProject.call({
					name: "test",
					schema: "domain Test\n\ncontext things {}\n",
				}),
			).as("result"),
			then(
				assert("result", "files")
					.toHaveLength(28)
					.withProse("twenty-eight files are emitted"),
			),
		),
];
```

Each scenario describes one behaviour and is executed against every target the operation is tagged for. See [Testing Philosophy](https://github.com/willclarktech/morph/blob/main/docs/concepts/testing-philosophy.md) for the model.

## Running

```sh
bun test
```

To run scenarios against a specific target only, use the per-app scenario runners (`@morphdsl/scenario-runner-cli`, `@morphdsl/scenario-runner-api`, etc.).

## Assertions

- `assert(name).toEqual(value)` — strict equality
- `assert(name).toHaveLength(n)` — collection length
- `assert(name).toBe(value)` — reference equality
- `assert(name, "field").matches(predicate)` — arbitrary predicate
- `assert.succeeds()` / `assert.fails(ErrorType)` — operation outcome only

The full surface lives in `@morphdsl/scenario`.

Part of [Morph](https://github.com/willclarktech/morph) — algebraic code generation from domain schemas.
