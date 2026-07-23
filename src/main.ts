import { FileSystemAdapter, Notice, Plugin, TFile } from 'obsidian';
import { shell } from 'electron';
import {
	getLinkAutomatically,
	type AutomaticLinkResult,
} from './automatic-linker';
import { registerCommands } from './commands';
import {
	DEFAULT_GDRIVE_EXTENSIONS,
	VIEW_TYPE_GLINK,
	isGoogleShortcut,
} from './constants';
import { registerGLinkEmbeds } from './embeds';
import { LinkRegistry, type RegistryData } from './link-registry';
import {
	DEFAULT_SETTINGS,
	parseSettings,
	type GLinkSettings,
} from './plugin-settings';
import { GLinkSettingTab } from './settings';
import { LinkGoogleFileModal } from './ui/link-modal';
import { GLinkView } from './ui/glink-view';

export default class GLinkPlugin extends Plugin {
	registry!: LinkRegistry;
	settings: GLinkSettings = {
		...DEFAULT_SETTINGS,
		darkFilter: { ...DEFAULT_SETTINGS.darkFilter },
	};
	private saveChain: Promise<void> = Promise.resolve();
	private automaticLinks = new Map<string, Promise<AutomaticLinkResult>>();

	async onload(): Promise<void> {
		const loaded: unknown = await this.loadData();
		this.settings = parseSettings(loaded);
		this.registry = LinkRegistry.fromData(
			loaded,
			(data) => this.persistData(data),
		);

		this.registerView(
			VIEW_TYPE_GLINK,
			(leaf) => new GLinkView(leaf, this),
		);
		this.registerExtensions([...DEFAULT_GDRIVE_EXTENSIONS], VIEW_TYPE_GLINK);
		registerGLinkEmbeds(this);
		registerCommands(this);
		this.addSettingTab(new GLinkSettingTab(this.app, this));

		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				void this.registry.rename(oldPath, file.path);
			}),
		);
	}

	openLinkModal(file: TFile, onSaved?: () => void): void {
		new LinkGoogleFileModal(
			this.app,
			file,
			this.registry.get(file.path)?.url ?? '',
			async (validated) => {
				await this.registry.set(file.path, validated);
				new Notice(`Linked ${file.name}`);
				window.setTimeout(() => {
					try {
						this.refreshViews(file.path);
						onSaved?.();
					} catch (error) {
						new Notice(
							`Link saved, but the view could not open: ${
								error instanceof Error ? error.message : String(error)
							}`,
						);
					}
				}, 0);
			},
			() => this.openOriginal(file),
		).open();
	}

	linkFile(file: TFile, onSaved?: () => void): void {
		if (!this.settings.automaticLinking) {
			this.openLinkModal(file, onSaved);
			return;
		}

		void this.linkAutomatically(file).then((result) => {
			if (result.ok) {
				new Notice(`Linked ${file.name} automatically`);
				this.refreshViews(file.path);
				onSaved?.();
				return;
			}

			new Notice(result.error);
			this.openLinkModal(file, onSaved);
		});
	}

	linkAutomatically(file: TFile): Promise<AutomaticLinkResult> {
		const active = this.automaticLinks.get(file.path);
		if (active) {
			return active;
		}

		const operation = getLinkAutomatically(this.app, file)
			.then(async (result) => {
				if (result.ok) {
					await this.registry.set(file.path, result.value);
				}
				return result;
			})
			.finally(() => this.automaticLinks.delete(file.path));
		this.automaticLinks.set(file.path, operation);
		return operation;
	}

	async saveSettings(): Promise<void> {
		await this.persistData(this.registry.toData());
	}

	async openOriginal(file: TFile): Promise<void> {
		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			new Notice('Opening the original is only available for local vaults');
			return;
		}

		const error = await shell.openPath(adapter.getFullPath(file.path));
		if (error) {
			new Notice(`Could not open original: ${error}`);
		}
	}

	isSupportedFile(file: TFile | null): file is TFile {
		return file !== null && isGoogleShortcut(file.extension);
	}

	refreshViews(path?: string): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (
				leaf.view instanceof GLinkView &&
				(!path || leaf.view.file?.path === path)
			) {
				leaf.view.refresh();
			}
		});
	}

	private persistData(registryData: RegistryData): Promise<void> {
		const snapshot = {
			...registryData,
			settings: { ...this.settings },
		};
		this.saveChain = this.saveChain
			.catch(() => undefined)
			.then(() => this.saveData(snapshot));
		return this.saveChain;
	}
}
