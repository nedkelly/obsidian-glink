import { FileView, WorkspaceLeaf, type TFile } from "obsidian";
import { VIEW_TYPE_GLINK, isGoogleShortcut } from "../constants";
import type GLinkPlugin from "../main";
import { mountGoogleWebview } from "./webview";

export class GLinkView extends FileView {
  private embeddedWebview: HTMLElement | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: GLinkPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_GLINK;
  }

  getDisplayText(): string {
    return this.file?.basename ?? "Google file";
  }

  canAcceptExtension(extension: string): boolean {
    return isGoogleShortcut(extension);
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("glink-view-host");
  }

  async onLoadFile(file: TFile): Promise<void> {
    if (this.plugin.registry.get(file.path)) {
      this.renderFile(file);
      return;
    }

    if (!this.plugin.settings.automaticLinking) {
      this.renderFile(file);
      return;
    }

    this.renderLoading(file);
    const result = await this.plugin.linkAutomatically(file);
    if (this.file?.path !== file.path) {
      return;
    }
    this.renderFile(file, result.ok ? undefined : result.error);
  }

  async onUnloadFile(_file: TFile): Promise<void> {
    this.clear();
  }

  refresh(): void {
    if (this.file) {
      this.renderFile(this.file);
    }
  }

  private renderFile(file: TFile, automaticError?: string): void {
    this.clear();
    const record = this.plugin.registry.get(file.path);
    if (record) {
      this.embeddedWebview = mountGoogleWebview(
        this.contentEl,
        record.url,
        this.plugin.settings.darkMode,
        this.plugin.settings.darkFilter,
      );
      return;
    }

    const setup = this.contentEl.createDiv({ cls: "glink-setup" });
    setup.createEl("h2", { text: "Link this Google file" });
    setup.createEl("p", {
      text: `${file.path} is not linked yet. Open the original, copy its Google URL, then save it here.`,
    });
    if (automaticError) {
      setup.createDiv({
        cls: "glink-automatic-error",
        text: automaticError,
      });
    }
    const actions = setup.createDiv({ cls: "glink-actions" });
    if (this.plugin.settings.automaticLinking) {
      actions
        .createEl("button", { text: "Try automatic linking" })
        .addEventListener("click", () => {
          this.renderLoading(file);
          void this.plugin.linkAutomatically(file).then((result) => {
            this.renderFile(file, result.ok ? undefined : result.error);
          });
        });
    }
    actions
      .createEl("button", { text: "Open original in browser" })
      .addEventListener("click", () => void this.plugin.openOriginal(file));
    actions
      .createEl("button", {
        text: "Paste Google URL",
        cls: "mod-cta",
      })
      .addEventListener("click", () =>
        this.plugin.openLinkModal(file, () => this.refresh()),
      );
  }

  private renderLoading(file: TFile): void {
    this.clear();
    this.contentEl.createDiv({
      cls: "glink-loading",
      text: `Getting the link for ${file.name} from Google Drive…`,
    });
  }

  private clear(): void {
    this.embeddedWebview?.remove();
    this.embeddedWebview = null;
    this.contentEl.empty();
  }
}
