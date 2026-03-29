import type { TypeDef, TypeRef } from "@morphdsl/domain-schema";

const collectTypeRefDeps = (ref: TypeRef): readonly string[] => {
	switch (ref.kind) {
		case "array": {
			return collectTypeRefDeps(ref.element);
		}
		case "entity":
		case "entityId":
		case "primitive":
		case "typeParam":
		case "union":
		case "valueObject": {
			return [];
		}
		case "function": {
			return [
				...ref.params.flatMap((p) => collectTypeRefDeps(p.type)),
				...collectTypeRefDeps(ref.returns),
			];
		}
		case "generic": {
			return [ref.name, ...ref.args.flatMap(collectTypeRefDeps)];
		}
		case "optional": {
			return collectTypeRefDeps(ref.inner);
		}
		case "type": {
			return [ref.name];
		}
	}
};

const getTypeDeps = (name: string, def: TypeDef): readonly string[] => {
	const deps = new Set<string>();
	const collect = (ref: TypeRef) => {
		for (const dep of collectTypeRefDeps(ref)) {
			if (dep !== name) deps.add(dep);
		}
	};
	switch (def.kind) {
		case "alias": {
			collect(def.type);
			break;
		}
		case "product": {
			for (const field of Object.values(def.fields)) collect(field.type);
			break;
		}
		case "sum": {
			for (const variant of Object.values(def.variants))
				for (const field of Object.values(variant.fields ?? {}))
					collect(field.type);
			break;
		}
	}
	return [...deps];
};

export const topologicalSort = (
	types: readonly (readonly [string, TypeDef])[],
): readonly (readonly [string, TypeDef])[] => {
	const typeNames = new Set(types.map(([name]) => name));
	const typeMap = new Map(types.map(([name, def]) => [name, def]));

	const inDegree = new Map<string, number>();
	const dependents = new Map<string, string[]>();
	for (const name of typeNames) {
		inDegree.set(name, 0);
		dependents.set(name, []);
	}
	for (const [name, def] of types) {
		const deps = getTypeDeps(name, def).filter((d) => typeNames.has(d));
		inDegree.set(name, deps.length);
		for (const dep of deps) {
			const list = dependents.get(dep);
			if (list) list.push(name);
		}
	}

	const queue = [...typeNames].filter((n) => inDegree.get(n) === 0);
	const sorted: (readonly [string, TypeDef])[] = [];
	while (queue.length > 0) {
		const node = queue.shift();
		if (node === undefined) break;
		const nodeDef = typeMap.get(node);
		if (nodeDef === undefined) continue;
		sorted.push([node, nodeDef] as const);
		const nodeDependents = dependents.get(node);
		if (nodeDependents) {
			for (const dep of nodeDependents) {
				const newDeg = (inDegree.get(dep) ?? 1) - 1;
				inDegree.set(dep, newDeg);
				if (newDeg === 0) queue.push(dep);
			}
		}
	}

	// Remaining nodes form a cycle — append as-is (S.suspend handles mutual recursion)
	if (sorted.length < types.length) {
		const sortedNames = new Set(sorted.map(([n]) => n));
		for (const [name, def] of types) {
			if (!sortedNames.has(name)) sorted.push([name, def] as const);
		}
	}

	return sorted;
};
