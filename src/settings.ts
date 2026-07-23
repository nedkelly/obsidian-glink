import { App, Modal, Notice, PluginSettingTab, Setting } from 'obsidian';
import type GLinkPlugin from './main';
import {
	DEFAULT_DARK_FILTER,
	type DarkFilterSettings,
} from './plugin-settings';
import { copyGoogleLink } from './ui/webview';

export class GLinkSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private glink: GLinkPlugin,
	) {
		super(app, glink);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Link registry').setHeading();
		containerEl.createEl('p', {
			text: 'Links are stored locally in this plugin’s data.json, keyed by complete vault-relative path.',
		});

		new Setting(containerEl)
			.setName('Automatic linking on Windows')
			.setDesc(
				'Use Google Drive’s “copy link to clipboard” action when an unlinked file is opened. This changes the Windows clipboard. Manual paste remains available if it fails.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.glink.settings.automaticLinking)
					.onChange(async (value) => {
						this.glink.settings.automaticLinking = value;
						await this.glink.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Dark mode for embedded Google files')
			.setDesc(
				'Experimentally darken Google files with a softened colour filter. Cell colours, images, and iframe-hosted dialogs may look different.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.glink.settings.darkMode)
					.onChange(async (value) => {
						this.glink.settings.darkMode = value;
						await this.glink.saveSettings();
						this.glink.refreshViews();
					}),
			);

		new Setting(containerEl)
			.setName('Dark filter tuning')
			.setDesc(
				'Fine-tune the embedded document colours. Reloaded Google views use the new values immediately.',
			)
			.setHeading()
			.addButton((button) =>
				button.setButtonText('Reset defaults').onClick(async () => {
					this.glink.settings.darkFilter = {
						...DEFAULT_DARK_FILTER,
					};
					await this.glink.saveSettings();
					this.glink.refreshViews();
					this.display();
				}),
			);

		const filterControls: {
			key: keyof DarkFilterSettings;
			name: string;
			description: string;
			min: number;
			max: number;
			step: number;
		}[] = [
			{
				key: 'hue',
				name: 'Hue rotation',
				description:
					'Shift the filtered colour balance. Adjust this first if white text looks pink, green, or blue.',
				min: 0,
				max: 360,
				step: 1,
			},
			{
				key: 'saturation',
				name: 'Saturation',
				description:
					'Reduce colour intensity to neutralise colour casts.',
				min: 25,
				max: 200,
				step: 1,
			},
			{
				key: 'brightness',
				name: 'Brightness',
				description:
					'Adjust the overall brightness of the filtered document.',
				min: 50,
				max: 150,
				step: 1,
			},
			{
				key: 'contrast',
				name: 'Contrast',
				description:
					'Adjust separation between light text and dark surfaces.',
				min: 50,
				max: 150,
				step: 1,
			},
			{
				key: 'invert',
				name: 'Inversion strength',
				description:
					'Control how strongly light and dark colours are reversed.',
				min: 70,
				max: 100,
				step: 1,
			},
		];

		for (const control of filterControls) {
			new Setting(containerEl)
				.setName(control.name)
				.setDesc(control.description)
				.addSlider((slider) =>
					slider
						.setLimits(control.min, control.max, control.step)
						.setValue(
							this.glink.settings.darkFilter[control.key],
						)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.glink.settings.darkFilter[control.key] = value;
							await this.glink.saveSettings();
							this.glink.refreshViews();
						}),
				);
		}

		new Setting(containerEl)
			.setName('Registry tools')
			.setDesc('Copy a backup or merge links from another link registry.')
			.addButton((button) =>
				button.setButtonText('Copy JSON').onClick(() => {
					copyGoogleLink(this.glink.registry.exportJson());
				}),
			)
			.addButton((button) =>
				button.setButtonText('Import JSON').onClick(() => {
					new RegistryImportModal(this.app, this.glink, () =>
						this.display(),
					).open();
				}),
			);

		new Setting(containerEl).setName('Saved links').setHeading();
		const entries = this.glink.registry.entries();
		if (entries.length === 0) {
			containerEl.createEl('p', {
				text: 'No Google files have been linked yet.',
				cls: 'setting-item-description',
			});
			return;
		}

		for (const [path, record] of entries) {
			new Setting(containerEl)
				.setName(path)
				.setDesc(record.url)
				.addButton((button) =>
					button
						.setIcon('copy')
						.setTooltip('Copy link')
						.onClick(() => copyGoogleLink(record.url)),
				)
				.addButton((button) =>
					button
						.setIcon('trash')
						.setTooltip('Remove link')
						.setWarning()
						.onClick(async () => {
							await this.glink.registry.remove(path);
							this.glink.refreshViews(path);
							this.display();
						}),
				);
		}
	}
}

class RegistryImportModal extends Modal {
	constructor(
		app: App,
		private plugin: GLinkPlugin,
		private imported: () => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle('Import link registry');
		this.contentEl.createEl('p', {
			text: 'Paste version 1 registry JSON. Imported paths replace matching saved paths.',
		});
		const textarea = this.contentEl.createEl('textarea', {
			cls: 'glink-import-input',
		});
		textarea.setAttr('aria-label', 'GLink registry JSON');

		new Setting(this.contentEl).addButton((button) =>
			button
				.setButtonText('Import')
				.setCta()
				.onClick(async () => {
					try {
						const count = await this.plugin.registry.importJson(
							textarea.value,
						);
						this.plugin.refreshViews();
						new Notice(
							`Imported ${count} ${count === 1 ? 'link' : 'links'}`,
						);
						this.imported();
						this.close();
					} catch (error) {
						new Notice(
							error instanceof Error ? error.message : String(error),
						);
					}
				}),
		);
		textarea.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
