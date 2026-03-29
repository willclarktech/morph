/**
 * Schema analysis for detecting API features from domain schema.
 */
import type {
	DomainSchema,
	EncodingFormat,
	InjectableParam,
} from "@morphdsl/domain-schema";

import {
	getAllEntities,
	getAllOperations,
	getAllSubscribers,
	getCommandsWithEvents,
	getInjectableParams,
	schemaHasAuthRequirement,
} from "@morphdsl/domain-schema";

import type { AuthEntityInfo, CreateUserCommandInfo } from "./auth-detection";

import { getAuthEntity, getCreateUserCommand } from "./auth-detection";

/**
 * Detected features from a domain schema.
 */
export interface DetectedFeatures {
	/** Auth entity info for password-based auth */
	readonly authEntity: AuthEntityInfo | undefined;
	/** Create user command info (for password auth) */
	readonly createUserCmd: CreateUserCommandInfo | undefined;
	/** Event names for SSE wiring */
	readonly eventNames: readonly string[];
	/** Encoding formats from extension (e.g., ["json", "yaml"]) */
	readonly encodingDefault: EncodingFormat | undefined;
	/** Encoding formats list */
	readonly encodingFormats: readonly EncodingFormat[];
	/** Whether schema has auth requirements */
	readonly hasAuth: boolean;
	/** Whether encoding extension is configured */
	readonly hasEncoding: boolean;
	/** Whether schema has entities (needs storage) */
	readonly hasEntities: boolean;
	/** Whether schema has events (needs event store) */
	readonly hasEvents: boolean;
	/** Whether injectable params exist */
	readonly hasInjectableParameters: boolean;
	/** Whether password-based auth is available */
	readonly hasPasswordAuth: boolean;
	/** Whether SSE wiring is needed */
	readonly hasSseWiring: boolean;
	/** Whether schema has subscribers */
	readonly hasSubscribers: boolean;
	/** Injectable params per operation */
	readonly injectableParametersMap: Record<string, readonly InjectableParam[]>;
}

/**
 * Detect features from a domain schema.
 */
export const detectFeatures = (
	schema: DomainSchema | undefined,
): DetectedFeatures => {
	const hasEntities = schema ? getAllEntities(schema).length > 0 : false;
	const hasEvents = schema ? getCommandsWithEvents(schema).length > 0 : false;
	const hasSubscribers = schema ? getAllSubscribers(schema).length > 0 : false;
	const hasAuth = schema ? schemaHasAuthRequirement(schema) : false;

	// Extract unique event names for SSE wiring
	const eventNames = schema
		? [
				...new Set(
					getCommandsWithEvents(schema).flatMap((command) =>
						command.events.map((event) => event.name),
					),
				),
			]
		: [];

	// SSE wiring requires both events and the EventSubscriber service
	const hasSseWiring = hasEvents && hasSubscribers && eventNames.length > 0;

	// Detect password-based auth capability (entity with passwordHash + createUser)
	const authEntity = schema ? getAuthEntity(schema) : undefined;
	const createUserCmd =
		authEntity && schema
			? getCreateUserCommand(schema, authEntity.entityName)
			: undefined;
	const hasPasswordAuth =
		authEntity !== undefined && createUserCmd !== undefined;

	// Compute injectable params from invariants
	const injectableParametersMap: Record<string, readonly InjectableParam[]> =
		{};
	if (schema) {
		for (const op of getAllOperations(schema)) {
			const params = getInjectableParams(schema, op.name);
			if (params.length > 0) {
				injectableParametersMap[op.name] = params;
			}
		}
	}
	const hasInjectableParameters =
		Object.keys(injectableParametersMap).length > 0;

	// Detect encoding extension
	const encodingConfig = schema?.extensions?.encoding;
	const hasEncoding = encodingConfig !== undefined;
	const encodingFormats = encodingConfig?.formats ?? [];
	const encodingDefault = encodingConfig?.default;

	return {
		authEntity,
		createUserCmd,
		encodingDefault,
		encodingFormats,
		eventNames,
		hasAuth,
		hasEncoding,
		hasEntities,
		hasEvents,
		hasInjectableParameters,
		hasPasswordAuth,
		hasSseWiring,
		hasSubscribers,
		injectableParametersMap,
	};
};
