import { App, PluginSettingTab } from "obsidian";
import TypstTSObsidian from "./main";

export interface TypstTSObsidianSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: TypstTSObsidianSettings = {
	mySetting: "default",
};

export class TypstTSObsidianSettingTab extends PluginSettingTab {
	plugin: TypstTSObsidian;

	constructor(app: App, plugin: TypstTSObsidian) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// new Setting(containerEl)
		// 	.setName('Settings #1')
		// 	.setDesc('It\'s a secret')
		// 	.addText(text => text
		// 		.setPlaceholder('Enter your secret')
		// 		.setValue(this.plugin.settings.mySetting)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.mySetting = value;
		// 			await this.plugin.saveSettings();
		// 		}));
	}
}
