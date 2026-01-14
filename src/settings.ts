import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./main";

export interface TypstTSObsidianSettings {
  typstPreamble: string;
}

export const DEFAULT_SETTINGS: TypstTSObsidianSettings = {
  typstPreamble: ''
}

export class TypstTSObsidianSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Typst preamble')
      // eslint-disable-next-line obsidianmd/ui/sentence-case -- Typst is a proper noun
      .setDesc('Preamble for Typst rendering. You can use this to define macros.')
      .addTextArea(text => text
        .setPlaceholder('Enter your preamble')
        .setValue(this.plugin.settings.typstPreamble)
        .onChange(async (value) => {
          this.plugin.settings.typstPreamble = value;
          await this.plugin.saveSettings();
        }));
  }
}