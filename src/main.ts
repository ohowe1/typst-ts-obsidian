import { around } from "monkey-around";
import { loadMathJax, Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, TypstTSObsidianSettings, TypstTSObsidianSettingTab } from "settings";
import { initTypst, renderTypst } from "typst-render";


export default class TypstTSObsidian extends Plugin {
	uninstaller: () => void;
	settings: TypstTSObsidianSettings;

	async onload() {
		await this.loadSettings();

		initTypst()

		await loadMathJax();

		const tex2chtmlReplacement = (math: string, options: { display: boolean }) => {
			return renderTypst(math, options.display, this.settings.typstPreamble, this.settings.uncommonColor);
		}

		this.uninstaller = around(globalThis.MathJax, {
			// @ts-expect-error -- not typed
			tex2chtml(old) {
				return tex2chtmlReplacement;
			}
		});

		this.addSettingTab(new TypstTSObsidianSettingTab(this.app, this));
	}

	onUserEnable(): void {
		new Notice("Typst.ts Math Blocks: Reload/restart the app to enable Typst rendering.");
	}

	onunload() {
		this.uninstaller();

		new Notice("Typst.ts Math Blocks: Reload/restart the app to disable Typst rendering.");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<TypstTSObsidianSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
