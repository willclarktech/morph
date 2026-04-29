// Ambient declarations for `with { type: "text" }` template imports.
// Bun and modern bundlers inline these as strings; tsc needs to know they
// resolve to a string default export. Files without an extension (the
// underscore-prefixed dotfile workaround) need their own pattern.
declare module "*.tmpl" {
	const content: string;
	export default content;
}
declare module "*_editorconfig" {
	const content: string;
	export default content;
}
declare module "*_gitignore" {
	const content: string;
	export default content;
}
