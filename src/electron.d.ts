declare module "electron" {
  export const clipboard: {
    readText(type?: "clipboard" | "selection"): string;
  };

  export const shell: {
    openPath(path: string): Promise<string>;
  };
}
