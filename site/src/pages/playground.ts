import { layout } from "../layout";

export const playgroundPage = (): string =>
	layout({
		title: "Playground",
		currentPath: "/playground",
		headExtra: '<link rel="stylesheet" href="/playground.css">',
		bodyExtra: '<script type="module" src="/playground.js"></script>',
		content: `
		<div class="playground-layout">
			<div class="playground-toolbar">
				<div class="toolbar-left">
					<button id="btn-format" class="outline">Format</button>
					<button id="btn-template" class="outline">Template</button>
					<button id="btn-share" class="outline">Share</button>
				</div>
				<div class="toolbar-right">
					<span id="status" class="status-indicator">Ready</span>
				</div>
			</div>
			<div class="playground-panels">
				<div class="panel-editor">
					<div id="editor"></div>
				</div>
				<div class="panel-output">
					<div class="output-tabs" role="tablist">
						<button role="tab" aria-selected="true" data-tab="diagnostics">Diagnostics</button>
						<button role="tab" data-tab="generated">Generated Files</button>
						<button role="tab" data-tab="formatted">Formatted</button>
					</div>
					<div class="output-content">
						<div id="tab-diagnostics" class="tab-panel active">
							<pre id="diagnostics-output"></pre>
						</div>
						<div id="tab-generated" class="tab-panel">
							<div id="generated-tree" class="file-tree"></div>
							<pre id="generated-content" class="file-content"></pre>
						</div>
						<div id="tab-formatted" class="tab-panel">
							<pre id="formatted-output"></pre>
						</div>
					</div>
				</div>
			</div>
		</div>`,
	});
