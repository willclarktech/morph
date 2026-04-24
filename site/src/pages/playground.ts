import { url } from "../base-path";
import { layout } from "../layout";

export const playgroundPage = (): string =>
	layout({
		title: "Playground",
		currentPath: "/playground",
		headExtra: `<link rel="stylesheet" href="${url("/playground.css")}">`,
		bodyExtra: `<script type="module" src="${url("/playground.js")}"></script>`,
		content: `
		<div class="playground-layout">
			<nav class="playground-toolbar">
				<div class="toolbar-left">
					<button id="btn-template" class="outline">Template</button>
					<button id="btn-format" class="outline">Format</button>
					<button id="btn-generate" class="outline">Generate</button>
					<button id="btn-share" class="outline">Share</button>
				</div>
				<div class="toolbar-right">
					<small id="status">Ready</small>
				</div>
			</nav>
			<div class="playground-panels">
				<div class="panel-editor">
					<div id="editor"></div>
				</div>
				<section class="panel-output">
					<div class="output-tabs" role="tablist">
						<button role="tab" data-tab="diagnostics">Diagnostics</button>
						<button role="tab" aria-selected="true" data-tab="generated">Generated Files</button>
					</div>
					<div class="output-content">
						<div id="tab-diagnostics" class="tab-panel">
							<pre id="diagnostics-output"></pre>
						</div>
						<div id="tab-generated" class="tab-panel active">
							<small id="generated-summary"></small>
							<div id="generated-tree"></div>
							<code id="generated-filename"></code>
							<pre id="generated-content"></pre>
						</div>
					</div>
				</section>
			</div>
		</div>`,
	});
