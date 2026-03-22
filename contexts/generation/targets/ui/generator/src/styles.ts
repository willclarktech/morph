/**
 * Generator for Pico CSS extension stylesheet.
 * Emits a morph.css file that extends Pico with structural rules
 * Pico can't express via variables alone.
 */

export const generateStylesModule =
	(): string => `/* Morph — Pico CSS extension */

/* ── Transitions & Micro-interactions ── */

button, [role="button"] {
	transition: all 0.15s ease-out;
}

a {
	transition: color 0.15s ease;
}

input, select, textarea {
	transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

/* Button hover lift */
button:hover, [role="button"]:hover {
	transform: translateY(-1px);
}

/* Button press */
button:active, [role="button"]:active {
	transform: translateY(0) scale(0.98);
}

/* ── Focus states ── */

:focus-visible {
	outline: 2px solid var(--pico-primary-focus, var(--pico-primary));
	outline-offset: 2px;
}

/* ── Typography ── */

h1, h2, h3 {
	letter-spacing: -0.02em;
}

article > header h2 {
	font-size: 1.5rem;
}

/* ── Borderless tables ── */

table {
	border-collapse: separate;
	border-spacing: 0;
}

table th, table td {
	border: none;
}

table thead {
	border-bottom: 2px solid var(--pico-muted-border-color);
}

table tbody tr {
	border-bottom: 1px solid color-mix(in srgb, var(--pico-muted-border-color), transparent 50%);
}

table tbody tr:last-child {
	border-bottom: none;
}

table tbody tr:hover {
	background-color: color-mix(in srgb, var(--pico-primary), transparent 95%);
}

/* ── Colored shadows ── */

main > article {
	box-shadow: 0 1px 3px color-mix(in srgb, var(--pico-primary), transparent 92%),
	            0 1px 2px rgba(0, 0, 0, 0.04);
}

/* ── Primary button gradient ── */

button[type="submit"],
a[role="button"]:not(.outline):not(.secondary):not(.contrast) {
	background: linear-gradient(135deg, var(--pico-primary), var(--pico-primary-hover));
	border-color: transparent;
}

/* ── Vertical rhythm ── */

main > article {
	margin-bottom: var(--pico-block-spacing-vertical, 2rem);
}

/* ── Inline action buttons ── */

td nav,
article > header nav {
	display: flex;
	gap: 0.375rem;
	align-items: center;
	flex-wrap: nowrap;
}

td nav button,
td nav [role="button"] {
	--pico-form-element-spacing-vertical: 0.25rem;
	--pico-form-element-spacing-horizontal: 0.5rem;
	font-size: 0.8125rem;
	margin-bottom: 0;
	white-space: nowrap;
}

/* Article header layout — title + actions side by side */
article > header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-wrap: wrap;
	gap: 0.75rem;
}

article > header h2,
article > header hgroup {
	margin-bottom: 0;
}

article > header hgroup p {
	margin-bottom: 0;
}

/* Table column headers — subtle uppercase labels */
th {
	font-size: 0.8125rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--pico-muted-color);
	font-weight: 600;
}

/* Title column emphasis */
td strong a {
	text-decoration: none;
	color: var(--pico-color);
	font-weight: 600;
}

td strong a:hover {
	color: var(--pico-primary);
	text-decoration: underline;
	text-underline-offset: 2px;
}

/* Detail definition list — two-column grid */
dl {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 0.5rem 1.5rem;
	align-items: baseline;
}

dl dt {
	font-size: 0.8125rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--pico-muted-color);
	margin-bottom: 0;
}

dl dd {
	margin-bottom: 0;
	margin-inline-start: 0;
	word-break: break-word;
}

/* Nav active state */
header nav a[aria-current="page"] {
	font-weight: 700;
	border-bottom: 2px solid var(--pico-primary);
}

/* Metadata details toggle */
details summary {
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--pico-muted-color);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

/* Boolean toggle switches in tables */
td input[role="switch"] {
	margin-bottom: 0;
}

/* Tag badges (for array values) */
kbd {
	font-size: 0.75rem;
	padding: 0.125rem 0.375rem;
}
`;
