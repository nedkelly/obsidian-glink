import { Component, type App, type TFile } from "obsidian";
import { DEFAULT_GDRIVE_EXTENSIONS } from "./constants";
import type GLinkPlugin from "./main";
import { mountGoogleWebview } from "./ui/webview";

interface EmbedInfo {
  containerEl: HTMLElement;
}

type EmbedCreator = (info: EmbedInfo, file: TFile, subpath: string) => Component;

interface EmbedRegistry {
  registerExtension?: (extension: string, creator: EmbedCreator) => void;
  registerExtensions?: (extensions: string[], creator: EmbedCreator) => void;
  unregisterExtension?: (extension: string) => void;
  unregisterExtensions?: (extensions: string[]) => void;
}

function getEmbedRegistry(app: App): EmbedRegistry | undefined {
  return (app as App & { embedRegistry?: EmbedRegistry }).embedRegistry;
}

class GLinkEmbed extends Component {
  private webview: HTMLElement | null = null;

  constructor(
    private info: EmbedInfo,
    private file: TFile,
    private plugin: GLinkPlugin,
  ) {
    super();
    this.info.containerEl.addClass("glink-embed");
    this.registerDomEvent(this.info.containerEl, "click", (event) => {
      event.stopImmediatePropagation();
    });
  }

  onload(): void {
    super.onload();
    this.render();
  }

  onunload(): void {
    this.webview?.remove();
    this.webview = null;
    super.onunload();
  }

  private render(): void {
    const { containerEl } = this.info;
    containerEl.empty();
    const record = this.plugin.registry.get(this.file.path);
    if (record) {
      this.webview = mountGoogleWebview(
        containerEl,
        record.url,
        this.plugin.settings.darkMode,
        this.plugin.settings.darkFilter,
      );
      return;
    }

    const placeholder = containerEl.createDiv({
      cls: "glink-embed-placeholder",
    });
    placeholder.createDiv({
      cls: "glink-embed-title",
      text: this.file.name,
    });
    placeholder
      .createEl("button", {
        text: this.plugin.settings.automaticLinking
          ? "Link automatically"
          : "Link this Google file",
      })
      .addEventListener("click", () => {
        this.plugin.linkFile(this.file, () => this.render());
      });
  }
}

export function registerGLinkEmbeds(plugin: GLinkPlugin): void {
  const registry = getEmbedRegistry(plugin.app);
  if (!registry) {
    return;
  }

  const extensions = [...DEFAULT_GDRIVE_EXTENSIONS];
  const createEmbed: EmbedCreator = (info, file) => new GLinkEmbed(info, file, plugin);

  if (registry.registerExtensions) {
    registry.registerExtensions(extensions, createEmbed);
    plugin.register(() => registry.unregisterExtensions?.(extensions));
    return;
  }

  for (const extension of extensions) {
    registry.registerExtension?.(extension, createEmbed);
    plugin.register(() => registry.unregisterExtension?.(extension));
  }
}
