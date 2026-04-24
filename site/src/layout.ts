import { url } from "./base-path";

const NAV_ITEMS = [
	{ href: "/", label: "Home" },
	{ href: "/docs/guides/getting-started", label: "Docs" },
	{ href: "/playground", label: "Playground" },
	{ href: "/examples", label: "Examples" },
];

export const layout = (options: {
	readonly title: string;
	readonly content: string;
	readonly currentPath: string;
	readonly headExtra?: string;
	readonly bodyExtra?: string;
}): string => `<!doctype html>
<html lang="en" data-theme="light">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${options.title} — Morph</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
	<link rel="stylesheet" href="${url("/morph.css")}">
	<link rel="icon" href="${url("/favicon.png")}" type="image/png">
	<link rel="apple-touch-icon" href="${url("/apple-touch-icon.png")}">
	${options.headExtra ?? ""}
</head>
<body>
	<header class="container">
		<nav>
			<ul>
				<li><a href="${url("/")}" class="site-logo"><img src="${url("/logo.png")}" alt="Morph" height="32"> <strong>Morph</strong></a></li>
			</ul>
			<ul>
				${NAV_ITEMS.map(
					(item) =>
						`<li><a href="${url(item.href)}"${options.currentPath === item.href || (item.href !== "/" && options.currentPath.startsWith(item.href)) ? ' aria-current="page"' : ""}>${item.label}</a></li>`,
				).join("\n\t\t\t\t")}
				<li><a href="https://github.com/willclarktech/morph" target="_blank" rel="noopener">GitHub</a></li>
			</ul>
		</nav>
	</header>
	<main class="container">
		${options.content}
	</main>
	<footer class="container">
		<small>Morph — Algebraic code generation from domain schemas.</small>
	</footer>
	${options.bodyExtra ?? ""}
</body>
</html>`;
