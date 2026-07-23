import { App, Modal, Notice, Setting } from "obsidian";
import type GLinkPlugin from "../main";

export class RegistryImportModal extends Modal {
  constructor(
    app: App,
    private plugin: GLinkPlugin,
    private imported: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Import link registry");
    this.contentEl.createEl("p", {
      text: "Paste version 1 registry JSON. Imported paths replace matching saved paths.",
    });
    const textarea = this.contentEl.createEl("textarea", {
      cls: "glink-import-input",
    });
    textarea.setAttr("aria-label", "GLink registry JSON");

    new Setting(this.contentEl).addButton((button) =>
      button
        .setButtonText("Import")
        .setCta()
        .onClick(async () => {
          try {
            const count = await this.plugin.registry.importJson(textarea.value);
            this.plugin.refreshViews();
            new Notice(`Imported ${count} ${count === 1 ? "link" : "links"}`);
            this.imported();
            this.close();
          } catch (error) {
            new Notice(error instanceof Error ? error.message : String(error));
          }
        }),
    );
    textarea.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
