import { Menu, Notice, TFile } from 'obsidian';
import type GLinkPlugin from './main';
import { copyGoogleLink } from './ui/webview';

export function registerCommands(plugin: GLinkPlugin): void {
	plugin.addCommand({
		id: 'link-active-google-file',
		name: 'Link active Google file',
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!plugin.isSupportedFile(file)) {
				return false;
			}
			if (!checking) {
				plugin.linkFile(file);
			}
			return true;
		},
	});

	plugin.registerEvent(
		plugin.app.workspace.on('file-menu', (menu, file) => {
			if (!(file instanceof TFile) || !plugin.isSupportedFile(file)) {
				return;
			}
			addFileMenuItems(plugin, menu, file);
		}),
	);
}

function addFileMenuItems(
	plugin: GLinkPlugin,
	menu: Menu,
	file: TFile,
): void {
	const record = plugin.registry.get(file.path);
	menu.addItem((item) =>
		item
			.setTitle(record ? 'Change Google link' : 'Link Google file')
			.setIcon('link')
			.onClick(() => {
				if (record) {
					plugin.openLinkModal(file);
				} else {
					plugin.linkFile(file);
				}
			}),
	);

	if (!record) {
		return;
	}

	menu.addItem((item) =>
		item
			.setTitle('Copy Google link')
			.setIcon('copy')
			.onClick(() => copyGoogleLink(record.url)),
	);
	menu.addItem((item) =>
		item
			.setTitle('Remove saved Google link')
			.setIcon('unlink')
			.onClick(async () => {
				await plugin.registry.remove(file.path);
				plugin.refreshViews(file.path);
				new Notice(`Removed link for ${file.name}`);
			}),
	);
}
