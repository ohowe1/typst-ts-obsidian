import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./main";

export interface TypstTSObsidianSettings {
  typstPreamble: string;
  uncommonColor: string;
}

export const DEFAULT_SETTINGS: TypstTSObsidianSettings = {
  typstPreamble: '',
  uncommonColor: "#a6a59f"
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
      .setDesc('Preamble for Typst rendering. You can use this to define macros. A reload may be required after changing this setting.')
      .addTextArea(text => text
        .setPlaceholder('Enter your preamble')
        .setValue(this.plugin.settings.typstPreamble)
        .onChange(async (value) => {
          this.plugin.settings.typstPreamble = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Uncommon color")
      // eslint-disable-next-line obsidianmd/ui/sentence-case -- Typst is a proper noun
      .setDesc("In order to make Typst render using the current text color, we first render using an uncommon color and then replace it in the SVG. If you use this specific color for some reason, you can change it here. A reload may be required after changing this setting.")
      .addColorPicker(color => color
        .setValue(this.plugin.settings.uncommonColor)
        .onChange(async (value) => {
          this.plugin.settings.uncommonColor = value;
          await this.plugin.saveSettings();
        }));

  }
}