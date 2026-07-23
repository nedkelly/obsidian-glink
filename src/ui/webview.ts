import { Notice } from "obsidian";
import { DEFAULT_DARK_FILTER, type DarkFilterSettings } from "../plugin-settings";
import {
  buildDarkContentCss,
  DARK_STATE_SHIM,
  SHARE_DROPDOWN_CSS,
  SHARE_DROPDOWN_SHIM,
} from "./google-page-injections";

interface WebviewNewWindowEvent extends Event {
  url?: string;
}

interface ElectronWebviewElement extends HTMLElement {
  executeJavaScript(code: string, userGesture?: boolean): Promise<unknown>;
  insertCSS(css: string): Promise<string>;
}

interface ObsidianWindow extends Window {
  createEl(tag: string): HTMLElement;
}

export function mountGoogleWebview(
  parent: HTMLElement,
  url: string,
  darkMode = false,
  darkFilter: DarkFilterSettings = DEFAULT_DARK_FILTER,
): HTMLElement {
  const container = parent.createDiv({ cls: "glink-webview-container" });
  // Create the custom element without appending it through the parent helper.
  const ownerWindow = parent.ownerDocument.win as ObsidianWindow;
  const webview = ownerWindow.createEl("webview") as ElectronWebviewElement;
  webview.setAttribute("src", url);
  webview.setAttribute("webpreferences", "nativeWindowOpen=no");
  webview.className = "glink-webview";
  webview.addEventListener("dom-ready", () => {
    void webview.insertCSS(SHARE_DROPDOWN_CSS).catch(() => undefined);
    void webview.executeJavaScript(SHARE_DROPDOWN_SHIM).catch(() => undefined);
    if (darkMode) {
      void webview.insertCSS(buildDarkContentCss(darkFilter)).catch(() => undefined);
      void webview.executeJavaScript(DARK_STATE_SHIM).catch(() => undefined);
    }
  });
  webview.addEventListener("new-window", (event: WebviewNewWindowEvent) => {
    event.preventDefault();
    if (event.url) {
      webview.setAttribute("src", event.url);
    }
  });
  container.appendChild(webview);
  return container;
}

export function copyGoogleLink(url: string): void {
  void navigator.clipboard
    .writeText(url)
    .then(() => new Notice("Google link copied"))
    .catch(() => new Notice("Could not copy the Google link"));
}
