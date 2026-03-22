import type { DomainSchema } from "@morph/domain-schema";

import {
	getAllCommands,
	getAllQueries,
	getOperationAggregates,
	getPrimaryWriteAggregate,
} from "@morph/domain-schema";

interface OperationInfo {
	readonly name: string;
	readonly isCommand: boolean;
	readonly primaryAggregate: string | undefined;
	readonly readAggregates: readonly string[];
	readonly writeAggregates: readonly string[];
}

const collectOperationInfo = (
	schema: DomainSchema,
): {
	domainServices: OperationInfo[];
	operations: OperationInfo[];
} => {
	const commands = getAllCommands(schema);
	const queries = getAllQueries(schema);
	const operations: OperationInfo[] = [];
	const domainServices: OperationInfo[] = [];

	for (const cmd of commands) {
		const aggregates = getOperationAggregates(schema, cmd.name);
		const primaryWrite = getPrimaryWriteAggregate(schema, cmd.name);
		const readAggs = aggregates
			.filter((a) => a.access === "read")
			.map((a) => a.aggregate);
		const writeAggs = aggregates
			.filter((a) => a.access === "write")
			.map((a) => a.aggregate);

		const info: OperationInfo = {
			name: cmd.name,
			isCommand: true,
			primaryAggregate: primaryWrite,
			readAggregates: readAggs,
			writeAggregates: writeAggs,
		};

		if (aggregates.length > 1) {
			domainServices.push(info);
		} else {
			operations.push(info);
		}
	}

	for (const qry of queries) {
		const aggregates = getOperationAggregates(schema, qry.name);
		const readAggs = aggregates
			.filter((a) => a.access === "read")
			.map((a) => a.aggregate);

		const info: OperationInfo = {
			name: qry.name,
			isCommand: false,
			primaryAggregate: readAggs[0],
			readAggregates: readAggs,
			writeAggregates: [],
		};

		if (aggregates.length > 1) {
			domainServices.push(info);
		} else {
			operations.push(info);
		}
	}

	return { operations, domainServices };
};

export const generateOperationsDiagram = (
	schema: DomainSchema,
): string | undefined => {
	const commands = getAllCommands(schema);
	const queries = getAllQueries(schema);

	if (commands.length === 0 && queries.length === 0) {
		return undefined;
	}

	const { operations, domainServices } = collectOperationInfo(schema);
	const lines: string[] = ["flowchart LR"];

	// Group operations by their primary aggregate
	const aggregateGroups = new Map<string, OperationInfo[]>();
	for (const op of operations) {
		const agg = op.primaryAggregate ?? "Other";
		const group = aggregateGroups.get(agg) ?? [];
		group.push(op);
		aggregateGroups.set(agg, group);
	}

	// Render aggregate subgraphs
	for (const [aggName, ops] of aggregateGroups) {
		lines.push("");
		lines.push(`    subgraph ${aggName}["${aggName}"]`);
		for (const op of ops) {
			const icon = op.isCommand ? "✏️" : "🔍";
			lines.push(`        ${op.name}["${op.name} ${icon}"]`);
		}
		lines.push("    end");
	}

	// Render domain services
	if (domainServices.length > 0) {
		lines.push("");
		lines.push(`    subgraph Services["🔄 Domain Services"]`);
		for (const op of domainServices) {
			const icon = op.isCommand ? "✏️" : "🔍";
			lines.push(`        ${op.name}["${op.name} ${icon}"]`);
		}
		lines.push("    end");
	}

	// Render cross-aggregate dependencies
	const crossDeps: string[] = [];
	for (const op of [...operations, ...domainServices]) {
		for (const readAgg of op.readAggregates) {
			if (readAgg !== op.primaryAggregate) {
				crossDeps.push(`    ${op.name} -.->|reads| ${readAgg}`);
			}
		}
		for (const writeAgg of op.writeAggregates) {
			if (writeAgg !== op.primaryAggregate) {
				crossDeps.push(`    ${op.name} -.->|writes| ${writeAgg}`);
			}
		}
	}

	if (crossDeps.length > 0) {
		lines.push("");
		lines.push(...crossDeps);
	}

	return lines.join("\n");
};
