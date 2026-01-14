import { MarkdownView, Plugin } from "obsidian";
import {
	DEFAULT_SETTINGS,
	TypstTSObsidianSettings,
	TypstTSObsidianSettingTab,
} from "./settings";
import { patchDecoration } from "patch-widget-type";
import { initTypst } from "typst-render";

export default class TypstTSObsidian extends Plugin {
	patchSucceeded: boolean;
	settings: TypstTSObsidianSettings;

	async onload() {
		await this.loadSettings();

		this.patchSucceeded = false;

		initTypst()

		patchDecoration(this, (builtInMathWidget) => {
			// Wait for the view update to finish
			setTimeout(() => {
				this.rerender();
			}, 100);
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TypstTSObsidianSettingTab(this.app, this));
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

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<TypstTSObsidianSettings>
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
