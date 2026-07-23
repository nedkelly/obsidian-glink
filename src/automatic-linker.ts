import { execFile } from 'child_process';
import { clipboard } from 'electron';
import { FileSystemAdapter, type App, type TFile } from 'obsidian';
import type { ValidatedGoogleUrl } from './url';
import { validateGoogleUrl } from './url';

export type AutomaticLinkResult =
	| { ok: true; value: ValidatedGoogleUrl }
	| { ok: false; error: string };

const COPY_LINK_SCRIPT = `
$ErrorActionPreference = 'Stop'
$target = $env:GLINK_TARGET_PATH
$directory = [System.IO.Path]::GetDirectoryName($target)
$name = [System.IO.Path]::GetFileName($target)
$shell = New-Object -ComObject Shell.Application
$folder = $shell.Namespace($directory)
if ($null -eq $folder) { throw 'Windows Shell could not open the containing folder.' }
$item = $folder.ParseName($name)
if ($null -eq $item) { throw 'Windows Shell could not find the Google placeholder.' }
$verb = @($item.Verbs()) |
	Where-Object { (($_.Name -replace '&', '').Trim()) -eq 'Copy link to clipboard' } |
	Select-Object -First 1
if ($null -eq $verb) { throw 'Google Drive did not provide a Copy link to clipboard action.' }
$verb.DoIt()
`;

export async function getLinkAutomatically(
	app: App,
	file: TFile,
): Promise<AutomaticLinkResult> {
	const adapter = app.vault.adapter;
	if (!(adapter instanceof FileSystemAdapter)) {
		return {
			ok: false,
			error: 'Automatic linking is only available for local Windows vaults.',
		};
	}

	const before = clipboard.readText();
	try {
		await runCopyLinkVerb(adapter.getFullPath(file.path));
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}

	const copied = await waitForChangedClipboard(before);
	if (!copied) {
		return {
			ok: false,
			error:
				'Google Drive did not copy a new link. Paste the URL manually instead.',
		};
	}

	const validation = validateGoogleUrl(copied, file.extension);
	if (!validation.ok) {
		return {
			ok: false,
			error: `Google Drive copied an unsupported value: ${validation.error}`,
		};
	}
	return validation;
}

function runCopyLinkVerb(targetPath: string): Promise<void> {
	const encodedCommand = Buffer.from(COPY_LINK_SCRIPT, 'utf16le').toString(
		'base64',
	);

	return new Promise((resolve, reject) => {
		execFile(
			'powershell.exe',
			[
				'-NoLogo',
				'-NoProfile',
				'-NonInteractive',
				'-EncodedCommand',
				encodedCommand,
			],
			{
				env: { ...process.env, GLINK_TARGET_PATH: targetPath },
				timeout: 10_000,
				windowsHide: true,
			},
			(error, _stdout, stderr) => {
				if (!error) {
					resolve();
					return;
				}
				const detail = stderr.trim();
				reject(
					new Error(
						detail ||
							'Windows could not invoke Google Drive’s copy-link action.',
					),
				);
			},
		);
	});
}

async function waitForChangedClipboard(
	before: string,
	timeoutMs = 5_000,
): Promise<string | null> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		await delay(150);
		const current = clipboard.readText().trim();
		if (current && current !== before.trim()) {
			return current;
		}
	}
	return null;
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
