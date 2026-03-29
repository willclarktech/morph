import type { InvariantDef } from "@morphdsl/domain-schema";

import { indent, lines, separator } from "@morphdsl/utils";
import { stripIndent } from "common-tags";

import {
	conditionReferencesCurrentUser,
	conditionReferencesInput,
} from "./invariants";
import { inferContextFields } from "./invariants/context";

const generateInvariantCall = (inv: InvariantDef): string => {
	if (inv.scope.kind === "context") {
		const args = conditionReferencesInput(inv.condition)
			? "params, invariantContext"
			: "invariantContext";
		return `yield* validate${inv.name}(${args});`;
	}
	return `// TODO: validate${inv.name} requires entity loading`;
};

const generateEventBlock = (eventName: string): string => stripIndent`
	const aggregateId${eventName} = typeof result === "object" && result !== null && "id" in (result as Record<string, unknown>) ? String((result as Record<string, unknown>)["id"]) : "";
	const version${eventName} = aggregateId${eventName} ? (yield* eventStore.getByAggregateId(aggregateId${eventName})).length + 1 : 1;
	const event${eventName} = {
		_tag: "${eventName}",
		aggregateId: aggregateId${eventName},
		occurredAt: new Date().toISOString(),
		params,
		result,
		version: version${eventName},
	};
	yield* eventEmitter.emit(event${eventName});
	yield* eventSubscriber.publish(event${eventName});
	yield* eventStore.append(event${eventName});
`;

/**
 * Infer the currentUser type shape from invariant conditions.
 * Collects all property accesses on `currentUser` across all invariants.
 */
const inferCurrentUserType = (invariants: readonly InvariantDef[]): string => {
	const allProperties = new Set<string>();
	for (const inv of invariants) {
		if (inv.scope.kind !== "context") continue;
		const contextFields = inferContextFields(inv.condition);
		const currentUserField = contextFields.find(
			(f) => f.name === "currentUser",
		);
		if (currentUserField && currentUserField.elementType !== "unknown") {
			// Parse the inferred props from the element type like "{ readonly id: unknown; readonly role: unknown }"
			const propMatches = currentUserField.elementType.matchAll(
				/readonly (\w+): unknown/g,
			);
			for (const match of propMatches) {
				if (match[1] !== undefined) {
					allProperties.add(match[1]);
				}
			}
		}
	}
	if (allProperties.size === 0) return "{ readonly id: unknown }";
	return `{ ${[...allProperties].map((p) => `readonly ${p}: unknown`).join("; ")} }`;
};

/**
 * Generate execute body with invariant wrapping.
 */
export const generateExecuteWithInvariants = (
	operationName: string,
	handlerName: string,
	preInvariants: readonly InvariantDef[],
	postInvariants: readonly InvariantDef[],
	eventNames: readonly string[],
): string => {
	const requiresAuth =
		preInvariants.some((inv) =>
			conditionReferencesCurrentUser(inv.condition),
		) ||
		postInvariants.some((inv) => conditionReferencesCurrentUser(inv.condition));

	const hasEvents = eventNames.length > 0;
	const hasContextScopedInvariants =
		preInvariants.some((inv) => inv.scope.kind === "context") ||
		postInvariants.some((inv) => inv.scope.kind === "context");

	const preInvariantCalls = preInvariants.map(generateInvariantCall);
	const postInvariantCalls = postInvariants.map(generateInvariantCall);

	const eventServicesBlock = hasEvents
		? `const eventEmitter = yield* EventEmitter;
			const eventSubscriber = yield* EventSubscriber;
			const eventStore = yield* EventStore;`
		: undefined;

	const authBlock = requiresAuth
		? `// Authenticate user (triggers auth strategy: prompt, session, etc.)
			yield* authService.requireAuth();`
		: undefined;

	// Infer currentUser shape from all invariant conditions
	const currentUserType = hasContextScopedInvariants
		? inferCurrentUserType([...preInvariants, ...postInvariants])
		: "{ readonly id: unknown }";

	const invariantContextBlock = hasContextScopedInvariants
		? `// Build invariant context (after requireAuth, currentUser is guaranteed to exist)
			const currentUser = (yield* authService.getCurrentUser()) as ${currentUserType};
			const invariantContext = {
				currentUser,
				operationName: "${operationName}",
				timestamp: new Date().toISOString(),
				entities: {},
			};`
		: undefined;

	const preInvariantsBlock =
		preInvariantCalls.length > 0
			? lines(["// Pre-invariants", indent(preInvariantCalls.join("\n"), 3)])
			: undefined;

	const postInvariantsBlock =
		postInvariantCalls.length > 0
			? lines(["// Post-invariants", indent(postInvariantCalls.join("\n"), 3)])
			: undefined;

	const eventBlocks =
		eventNames.length > 0
			? eventNames
					.map((name) => generateEventBlock(name))
					.join(separator(3, "\n"))
			: undefined;

	const needsAuthService = requiresAuth || hasContextScopedInvariants;
	const bodyLines = lines([
		`const handler = yield* ${handlerName};`,
		needsAuthService ? `const authService = yield* AuthService;` : undefined,
		eventServicesBlock,
		"",
		authBlock,
		invariantContextBlock,
		preInvariantsBlock,
		"",
		"// Execute handler",
		`const result = yield* handler.handle(params, options);`,
		"",
		postInvariantsBlock,
		eventBlocks,
		"",
		"return result;",
	]);

	return `Effect.gen(function* () {
			${indent(bodyLines, 3)}
		})`;
};

/**
 * Generate execute body with auto-emit, publish, and persist after handler success.
 */
export const generateExecuteWithEvents = (
	handlerName: string,
	eventNames: readonly string[],
): string => {
	const eventBlocks = eventNames
		.map(
			(eventName) => stripIndent`
	const aggregateId${eventName} = typeof result === "object" && result !== null && "id" in (result as Record<string, unknown>) ? String((result as Record<string, unknown>)["id"]) : "";
			const version${eventName} = aggregateId${eventName} ? (yield* eventStore.getByAggregateId(aggregateId${eventName})).length + 1 : 1;
			const event${eventName} = {
				_tag: "${eventName}",
				aggregateId: aggregateId${eventName},
				occurredAt: new Date().toISOString(),
				params,
				result,
				version: version${eventName},
			};

			// Auto-emit event for in-memory collection
			yield* eventEmitter.emit(event${eventName});

			// Publish to subscribers (fire-and-forget)
			yield* eventSubscriber.publish(event${eventName});

			// Persist to durable event store
			yield* eventStore.append(event${eventName});
		`,
		)
		.join(separator(3, "\n"));

	return `Effect.gen(function* () {
			const handler = yield* ${handlerName};
			const eventEmitter = yield* EventEmitter;
			const eventSubscriber = yield* EventSubscriber;
			const eventStore = yield* EventStore;

			const result = yield* handler.handle(params, options);

			${eventBlocks}

			return result;
		})`;
};
