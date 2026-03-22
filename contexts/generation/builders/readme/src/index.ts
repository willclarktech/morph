// Markdown utilities
export * as markdown from "./markdown";
export {
	bold,
	code,
	codeBlock,
	heading,
	joinSections,
	link,
	list,
	table,
} from "./markdown";

// Section builders
export * as sections from "./sections";
export {
	description,
	entities,
	type EntitiesOptions,
	errors,
	errorsFromData,
	type ErrorsOptions,
	events,
	eventsFromData,
	type EventsOptions,
	installation,
	operations,
	type OperationsOptions,
	valueObjects,
	type ValueObjectsOptions,
} from "./sections";

// Root readme builder
export * from "./root-readme";
