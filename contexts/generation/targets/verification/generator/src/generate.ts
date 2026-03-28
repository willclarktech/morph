import type { DomainSchema, GeneratedFile } from "@morph/domain-schema";

import { getAllInvariants } from "@morph/domain-schema";

import {
	generateConsistencyCheck,
	generatePreservationCheck,
	generateSatisfiabilityCheck,
} from "./goals";
import { generateRunner, generateVerificationIndex } from "./runner-gen";

export const generate = (
	schema: DomainSchema,
	_name: string,
): GeneratedFile[] => {
	const invariants = getAllInvariants(schema);
	if (invariants.length === 0) return [];

	const files: GeneratedFile[] = [];
	const smt2Files: string[] = [];

	const consistency = generateConsistencyCheck(schema);
	if (consistency) {
		files.push(consistency);
		smt2Files.push(consistency.filename);
	}

	const satisfiability = generateSatisfiabilityCheck(schema);
	if (satisfiability) {
		files.push(satisfiability);
		smt2Files.push(satisfiability.filename);
	}

	const preservation = generatePreservationCheck(schema);
	if (preservation) {
		files.push(preservation);
		smt2Files.push(preservation.filename);
	}

	if (smt2Files.length === 0) return [];

	files.push(generateRunner(smt2Files));
	files.push(generateVerificationIndex());

	return files;
};
