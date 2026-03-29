/**
 * Function route handler generation.
 */
import type { FunctionDef, QualifiedEntry } from "@morphdsl/domain-schema";

import { toTitleCase } from "@morphdsl/utils";

import type { RouteHandler } from "./crud";

/**
 * Generate routes for a function.
 */
export const generateFunctionRoutes = (
	function_: QualifiedEntry<FunctionDef>,
): readonly RouteHandler[] => {
	return [
		{
			comment: `${toTitleCase(function_.name)} function form`,
			handler: `(request: Request) => {
				initLanguage(request);
				return html(${function_.name}Page());
			}`,
			method: "GET",
		},
		{
			comment: `Execute ${function_.name} function`,
			handler: `async (request: Request) => {
				// eslint-disable-next-line @typescript-eslint/no-deprecated -- Bun.serve supports formData
				const formData = await request.formData();
				const params = Object.fromEntries(formData) as unknown as Parameters<typeof client.${function_.name}>[0];
				try {
					const result = await Effect.runPromise(client.${function_.name}(params));
					return html(${function_.name}Page(result));
				} catch (error) {
					const message = error instanceof Error ? error.message : t("error.functionFailed");
					return html(${function_.name}Page(undefined, message));
				}
			}`,
			method: "POST",
		},
	];
};
