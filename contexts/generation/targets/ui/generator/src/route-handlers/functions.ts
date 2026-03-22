/**
 * Function route handler generation.
 */
import type { FunctionDef, QualifiedEntry } from "@morph/domain-schema";

import { toTitleCase } from "@morph/utils";

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
			handler: `(req: Request) => {
				initLanguage(req);
				return html(${function_.name}Page());
			}`,
			method: "GET",
		},
		{
			comment: `Execute ${function_.name} function`,
			handler: `async (req: Request) => {
				// eslint-disable-next-line @typescript-eslint/no-deprecated -- Bun.serve supports formData
				const formData = await req.formData();
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
