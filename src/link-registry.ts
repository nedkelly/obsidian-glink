import type { ValidatedGoogleUrl } from "./url";
import { validateGoogleUrl } from "./url";

export interface LinkRecord {
  url: string;
  documentId?: string;
  updatedAt: string;
}

export interface RegistryData {
  version: 1;
  links: Record<string, LinkRecord>;
}

type SaveRegistry = (data: RegistryData) => Promise<void>;

export class LinkRegistry {
  private links: Record<string, LinkRecord>;
  private saveChain: Promise<void> = Promise.resolve();

  private constructor(
    links: Record<string, LinkRecord>,
    private saveRegistry: SaveRegistry,
  ) {
    this.links = links;
  }

  static fromData(data: unknown, saveRegistry: SaveRegistry): LinkRegistry {
    return new LinkRegistry(parseLinks(data), saveRegistry);
  }

  get(path: string): LinkRecord | undefined {
    return this.links[path];
  }

  entries(): Array<[string, LinkRecord]> {
    return Object.entries(this.links).sort(([a], [b]) => a.localeCompare(b));
  }

  async set(path: string, value: ValidatedGoogleUrl): Promise<void> {
    this.links[path] = {
      url: value.url,
      ...(value.documentId ? { documentId: value.documentId } : {}),
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
  }

  async remove(path: string): Promise<boolean> {
    if (!this.links[path]) {
      return false;
    }
    delete this.links[path];
    await this.persist();
    return true;
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const oldPrefix = `${oldPath}/`;
    let changed = false;

    for (const [path, record] of Object.entries(this.links)) {
      const target =
        path === oldPath
          ? newPath
          : path.startsWith(oldPrefix)
            ? `${newPath}/${path.slice(oldPrefix.length)}`
            : null;
      if (!target || this.links[target]) {
        continue;
      }
      this.links[target] = record;
      delete this.links[path];
      changed = true;
    }

    if (changed) {
      await this.persist();
    }
  }

  exportJson(): string {
    return JSON.stringify(this.toData(), null, 2);
  }

  toData(): RegistryData {
    return {
      version: 1,
      links: { ...this.links },
    };
  }

  async importJson(raw: string): Promise<number> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new Error("The registry is not valid JSON.");
    }

    const imported = parseLinks(parsed, true);
    this.links = { ...this.links, ...imported };
    await this.persist();
    return Object.keys(imported).length;
  }

  private snapshot(): RegistryData {
    return this.toData();
  }

  private persist(): Promise<void> {
    const snapshot = this.snapshot();
    this.saveChain = this.saveChain
      .catch(() => undefined)
      .then(() => this.saveRegistry(snapshot));
    return this.saveChain;
  }
}

function parseLinks(data: unknown, strict = false): Record<string, LinkRecord> {
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.links)) {
    if (strict) {
      throw new Error("Expected a version 1 GLink registry.");
    }
    return {};
  }

  const links: Record<string, LinkRecord> = {};
  for (const [path, value] of Object.entries(data.links)) {
    if (!isRecord(value) || typeof value.url !== "string") {
      if (strict) {
        throw new Error(`Invalid registry entry: ${path}`);
      }
      continue;
    }

    const validation = validateGoogleUrl(value.url, extensionOf(path));
    if (!validation.ok) {
      if (strict) {
        throw new Error(`${path}: ${validation.error}`);
      }
      continue;
    }

    links[path] = {
      url: validation.value.url,
      ...(typeof value.documentId === "string"
        ? { documentId: value.documentId }
        : validation.value.documentId
          ? { documentId: validation.value.documentId }
          : {}),
      updatedAt:
        typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    };
  }
  return links;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function extensionOf(path: string): string | undefined {
  const filename = path.split("/").pop();
  const dot = filename?.lastIndexOf(".") ?? -1;
  return dot >= 0 ? filename?.slice(dot + 1) : undefined;
}
