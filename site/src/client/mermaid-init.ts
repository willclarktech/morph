import mermaid from "mermaid";

mermaid.initialize({
	startOnLoad: false,
	theme: "default",
	securityLevel: "loose",
});

const renderMermaidBlocks = async () => {
	const codeBlocks = document.querySelectorAll("pre code.language-mermaid");
	for (const block of codeBlocks) {
		const pre = block.parentElement;
		if (!pre) continue;
		const source = block.textContent ?? "";
		const container = document.createElement("div");
		container.className = "mermaid";
		const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
		const { svg } = await mermaid.render(id, source);
		container.innerHTML = svg;
		pre.replaceWith(container);
	}
};

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => void renderMermaidBlocks());
} else {
	void renderMermaidBlocks();
}
