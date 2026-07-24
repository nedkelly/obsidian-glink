import {
  App,
  Platform,
  PluginSettingTab,
  Setting,
  type SettingDefinitionItem,
  type SettingGroupItem,
} from "obsidian";
import type GLinkPlugin from "./main";
import { DEFAULT_DARK_FILTER, type DarkFilterSettings } from "./plugin-settings";
import { RegistryImportModal } from "./ui/registry-import-modal";
import { copyGoogleLink } from "./ui/webview";

const LINK_STORAGE_DESCRIPTION =
  "Links are stored locally in this plugin’s data.json, keyed by complete vault-relative path.";
const AUTOMATIC_LINKING_DESCRIPTION =
  "Use Google Drive’s “copy link to clipboard” action when an unlinked file is opened. This changes the Windows clipboard. Manual paste remains available if it fails.";
const DARK_MODE_DESCRIPTION =
  "Experimentally darken Google files with a softened colour filter. Cell colours, images, and iframe-hosted dialogs may look different.";
const DARK_FILTER_DESCRIPTION =
  "Fine-tune the embedded document colours. Reloaded Google views use the new values immediately.";

interface DarkFilterControl {
  key: keyof DarkFilterSettings;
  name: string;
  description: string;
  min: number;
  max: number;
  step: number;
}

const DARK_FILTER_CONTROLS: DarkFilterControl[] = [
  {
    key: "hue",
    name: "Hue rotation",
    description:
      "Shift the filtered colour balance. Adjust this first if white text looks pink, green, or blue.",
    min: 0,
    max: 360,
    step: 1,
  },
  {
    key: "saturation",
    name: "Saturation",
    description: "Reduce colour intensity to neutralise colour casts.",
    min: 25,
    max: 200,
    step: 1,
  },
  {
    key: "brightness",
    name: "Brightness",
    description: "Adjust the overall brightness of the filtered document.",
    min: 50,
    max: 150,
    step: 1,
  },
  {
    key: "contrast",
    name: "Contrast",
    description: "Adjust separation between light text and dark surfaces.",
    min: 50,
    max: 150,
    step: 1,
  },
  {
    key: "invert",
    name: "Inversion strength",
    description: "Control how strongly light and dark colours are reversed.",
    min: 70,
    max: 100,
    step: 1,
  },
];

export class GLinkSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private glink: GLinkPlugin,
  ) {
    super(app, glink);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const darkItems: SettingGroupItem[] = [
      {
        name: "Dark mode for embedded Google files",
        desc: DARK_MODE_DESCRIPTION,
        render: (setting) => this.addDarkModeToggle(setting),
      },
      ...DARK_FILTER_CONTROLS.map((control) => ({
        name: control.name,
        desc: control.description,
        render: (setting: Setting) => this.addFilterSlider(setting, control),
      })),
      {
        name: "Reset dark filter",
        desc: "Restore the original hue, saturation, brightness, contrast, and inversion values.",
        render: (setting) => this.addResetButton(setting),
      },
    ];

    const entries = this.glink.registry.entries();
    const savedLinkItems: SettingGroupItem[] =
      entries.length === 0
        ? [
            {
              name: "No saved links",
              desc: "Google file mappings will appear here after they are linked.",
            },
          ]
        : entries.map(([path, record]) => ({
            name: path,
            desc: record.url,
            render: (setting: Setting) =>
              this.addSavedLinkButtons(setting, path, record.url),
          }));

    return [
      {
        type: "group",
        heading: "Link registry",
        items: [
          {
            name: "Local link storage",
            desc: LINK_STORAGE_DESCRIPTION,
          },
          {
            name: "Automatic linking on Windows",
            desc: AUTOMATIC_LINKING_DESCRIPTION,
            render: (setting) => this.addAutomaticLinkingToggle(setting),
          },
        ],
      },
      {
        type: "group",
        heading: "Dark appearance",
        items: darkItems,
      },
      {
        type: "group",
        heading: "Registry tools",
        items: [
          {
            name: "Import or export registry",
            desc: "Copy a backup or merge links from another link registry.",
            render: (setting) => this.addRegistryToolButtons(setting),
          },
        ],
      },
      {
        type: "group",
        heading: "Saved links",
        items: savedLinkItems,
      },
    ];
  }

  /**
   * Fallback used by Obsidian versions before 1.13.
   */
  display(): void {
    this.displaySettings();
  }

  private displaySettings(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("Link registry").setHeading();
    containerEl.createEl("p", { text: LINK_STORAGE_DESCRIPTION });

    this.addAutomaticLinkingToggle(
      new Setting(containerEl)
        .setName("Automatic linking on Windows")
        .setDesc(AUTOMATIC_LINKING_DESCRIPTION),
    );

    this.addDarkModeToggle(
      new Setting(containerEl)
        .setName("Dark mode for embedded Google files")
        .setDesc(DARK_MODE_DESCRIPTION),
    );

    this.addResetButton(
      new Setting(containerEl)
        .setName("Dark filter tuning")
        .setDesc(DARK_FILTER_DESCRIPTION)
        .setHeading(),
    );

    for (const control of DARK_FILTER_CONTROLS) {
      this.addFilterSlider(
        new Setting(containerEl).setName(control.name).setDesc(control.description),
        control,
      );
    }

    this.addRegistryToolButtons(
      new Setting(containerEl)
        .setName("Registry tools")
        .setDesc("Copy a backup or merge links from another link registry."),
    );

    new Setting(containerEl).setName("Saved links").setHeading();
    const entries = this.glink.registry.entries();
    if (entries.length === 0) {
      containerEl.createEl("p", {
        text: "No Google files have been linked yet.",
        cls: "setting-item-description",
      });
      return;
    }

    for (const [path, record] of entries) {
      this.addSavedLinkButtons(
        new Setting(containerEl).setName(path).setDesc(record.url),
        path,
        record.url,
      );
    }
  }

  private addAutomaticLinkingToggle(setting: Setting): void {
    setting.addToggle((toggle) =>
      toggle
        .setValue(this.glink.settings.automaticLinking)
        .setDisabled(!Platform.isWin)
        .onChange(async (value) => {
          this.glink.settings.automaticLinking = value;
          await this.glink.saveSettings();
        }),
    );
  }

  private addDarkModeToggle(setting: Setting): void {
    setting.addToggle((toggle) =>
      toggle.setValue(this.glink.settings.darkMode).onChange(async (value) => {
        this.glink.settings.darkMode = value;
        await this.glink.saveSettings();
        this.glink.refreshViews();
      }),
    );
  }

  private addFilterSlider(setting: Setting, control: DarkFilterControl): void {
    setting.addSlider((slider) =>
      slider
        .setLimits(control.min, control.max, control.step)
        .setValue(this.glink.settings.darkFilter[control.key])
        .onChange(async (value) => {
          this.glink.settings.darkFilter[control.key] = value;
          await this.glink.saveSettings();
          this.glink.refreshViews();
        }),
    );
  }

  private addResetButton(setting: Setting): void {
    setting.addButton((button) =>
      button.setButtonText("Reset defaults").onClick(async () => {
        this.glink.settings.darkFilter = { ...DEFAULT_DARK_FILTER };
        await this.glink.saveSettings();
        this.glink.refreshViews();
        this.refreshSettingsTab();
      }),
    );
  }

  private addRegistryToolButtons(setting: Setting): void {
    setting
      .addButton((button) =>
        button.setButtonText("Copy JSON").onClick(() => {
          copyGoogleLink(this.glink.registry.exportJson());
        }),
      )
      .addButton((button) =>
        button.setButtonText("Import JSON").onClick(() => {
          new RegistryImportModal(this.app, this.glink, () =>
            this.refreshSettingsTab(),
          ).open();
        }),
      );
  }

  private addSavedLinkButtons(setting: Setting, path: string, url: string): void {
    setting
      .addButton((button) =>
        button
          .setIcon("copy")
          .setTooltip("Copy link")
          .onClick(() => copyGoogleLink(url)),
      )
      .addButton((button) =>
        button
          .setIcon("trash")
          .setTooltip("Remove link")
          .onClick(async () => {
            await this.glink.registry.remove(path);
            this.glink.refreshViews(path);
            this.refreshSettingsTab();
          }),
      );

    const removeButton = setting.components[setting.components.length - 1];
    const setDestructive = removeButton
      ? (Reflect.get(removeButton, "setDestructive") as unknown)
      : undefined;
    if (typeof setDestructive === "function") {
      setDestructive.call(removeButton);
      return;
    }

    const setWarning = removeButton
      ? (Reflect.get(removeButton, "setWarning") as unknown)
      : undefined;
    if (typeof setWarning === "function") {
      setWarning.call(removeButton);
    }
  }

  private refreshSettingsTab(): void {
    const update = Reflect.get(this, "update") as unknown;
    if (typeof update === "function") {
      update.call(this);
      return;
    }
    this.displaySettings();
  }
}
