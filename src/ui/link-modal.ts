import { App, Modal, Notice, Setting, TFile } from "obsidian";
import type { ValidatedGoogleUrl } from "../url";
import { validateGoogleUrl } from "../url";

export class LinkGoogleFileModal extends Modal {
  private value: string;

  constructor(
    app: App,
    private file: TFile,
    initialValue: string,
    private save: (value: ValidatedGoogleUrl) => Promise<void>,
    private openOriginal: () => Promise<void>,
  ) {
    super(app);
    this.value = initialValue;
  }

  onOpen(): void {
    this.setTitle(`Link ${this.file.name}`);
    this.contentEl.createEl("p", {
      text: "Paste the Google URL once. The plugin will save it for this vault path.",
    });

    const form = this.contentEl.createEl("form", {
      cls: "glink-link-form",
    });
    const input = form.createEl("input", {
      type: "url",
      placeholder: "https://docs.google.com/…",
      value: this.value,
      cls: "glink-url-input",
    });
    input.setAttr("aria-label", "Google document URL");

    const feedback = form.createDiv({ cls: "glink-validation" });
    const actions = new Setting(form)
      .addButton((button) =>
        button
          .setButtonText("Open original in browser")
          .onClick(() => void this.openOriginal()),
      )
      .addButton((button) =>
        button
          .setButtonText("Save and open")
          .setCta()
          .onClick(() => void submit()),
      );

    const submit = async (): Promise<void> => {
      const validation = validateGoogleUrl(input.value, this.file.extension);
      if (!validation.ok) {
        feedback.setText(validation.error);
        feedback.addClass("is-error");
        return;
      }
      feedback.setText(validation.value.warning ?? "");
      feedback.toggleClass("is-warning", Boolean(validation.value.warning));

      actions.setDisabled(true);
      try {
        await this.save(validation.value);
        this.close();
      } catch (error) {
        actions.setDisabled(false);
        new Notice(
          `Could not save link: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    };

    form.addEventListener("submit", (event: SubmitEvent) => {
      event.preventDefault();
      void submit();
    });
    input.addEventListener("input", () => {
      this.value = input.value;
      feedback.empty();
      feedback.removeClass("is-error", "is-warning");
    });
    window.setTimeout(() => input.focus(), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
