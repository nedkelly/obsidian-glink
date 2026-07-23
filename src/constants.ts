export const VIEW_TYPE_GLINK = 'glink-view';

export const DEFAULT_GDRIVE_EXTENSIONS = [
	'gdoc',
	'gsheet',
	'gslides',
	'gdraw',
	'gform',
	'gtable',
	'gscript',
	'gjam',
] as const;

const SUPPORTED_EXTENSIONS = new Set<string>(DEFAULT_GDRIVE_EXTENSIONS);

export function isGoogleShortcut(extension: string): boolean {
	return SUPPORTED_EXTENSIONS.has(extension.toLowerCase());
}
