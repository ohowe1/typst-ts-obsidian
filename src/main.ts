import { MarkdownView, Plugin } from "obsidian";
import { patchDecoration } from "patch-widget-type";
import { initTypst } from "typst-render";

export default class TypstTSObsidian extends Plugin {
	patchSucceeded: boolean;

	async onload() {
		this.patchSucceeded = false;

		initTypst()

		patchDecoration(this, (builtInMathWidget) => {
			// Wait for the view update to finish
			setTimeout(() => {
				this.rerender();
			}, 100);
		});
	}

	onunload() {}

	rerender() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				const eState = leaf.view.getEphemeralState();
				const editor = leaf.view.editor;
				editor.setValue(editor.getValue());
				leaf.view.setEphemeralState(eState);
			}
		});
	}

}
