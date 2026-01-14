import { MarkdownPreviewRenderer, MarkdownView, Notice, Plugin } from "obsidian";
import { patchDecoration } from "patch-widget-type";
import { initTypst, renderTypst } from "typst-render";

export default class TypstTSObsidian extends Plugin {
	patchSucceeded: boolean;

	onload() {
		this.patchSucceeded = false;

		initTypst()

		patchDecoration(this, (builtInMathWidget) => {
			// Wait for the view update to finish
			setTimeout(() => {
				// this.rerender();
				this.app.workspace.getActiveViewOfType(MarkdownView)?.previewMode.rerender(true);
				// new Notice("Reload/restart the app to enable Typst math rendering.");
			}, 100);
		});

		MarkdownPreviewRenderer.registerPostProcessor((i) => {
			console.log("hi")
			console.log(i)
			i.findAll(".math:not(.is-loaded-typst)").forEach((elm) => {
				const math = elm.innerHTML;
				elm.empty();
				try {
					renderTypst(math, elm.classList.contains("math-block"), elm);
				} catch (e) {
					// Handle error
					console.error(e);
				}

				elm.addClass("is-loaded-typst");
				elm.addClass("is-loaded");
			});
		}, 1000)
	}

	onunload() {
		new Notice("Reload/restart the app to restore the original math rendering.");
	}

	rerender() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				console.log(leaf.view)
				const eState = leaf.view.getEphemeralState();
				console.log(eState)
				const editor = leaf.view.editor;
				console.log(editor)
				editor.setValue(editor.getValue());
				leaf.view.setEphemeralState(eState);
			}
		});
	}

}
