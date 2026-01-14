import { around } from "monkey-around";
import { loadMathJax, Notice, Plugin } from "obsidian";
import { initTypst, renderTypst } from "typst-render";


export default class TypstTSObsidian extends Plugin {
	uninstaller: () => void;

	async onload() {
		initTypst()

		await loadMathJax();

		this.uninstaller = around(globalThis.MathJax, {
			// @ts-expect-error -- not typed
			tex2chtml(old) {
				return function (math: string, options: { display: boolean }) {
					return renderTypst(math, options.display)
				}
			}
		});
	}

	onUserEnable(): void {
		new Notice("Typst.ts Math Blocks: Reload/restart the app to enable Typst rendering.");
	}

	onunload() {
		this.uninstaller();

		new Notice("Typst.ts Math Blocks: Reload/restart the app to disable Typst rendering.");
	}
}
