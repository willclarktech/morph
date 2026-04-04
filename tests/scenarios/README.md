# @morph/scenarios

Code generation from domain schemas

Parse, compile, and decompile .morph DSL files

## Quick Start

```typescript
import { assert, given, scenario, then, when } from "@morphdsl/scenario";
import {} from "@morphdsl/generation-dsl";

export const scenarios = [
	scenario(
		"Example scenario",
		given([]),
		when(
			createUser({
				/* params */
			}),
		),
		then(assert.succeeds()),
	),
];
```

## Assertions

- `assert.succeeds()` - Operation should complete successfully
- `assert.fails(ErrorType)` - Operation should fail with specific error
- `assert.returns(value)` - Operation should return specific value
- `assert.matches(predicate)` - Result should match predicate
