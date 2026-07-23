export interface ValidatedGoogleUrl {
	url: string;
	documentId?: string;
	warning?: string;
}

export type GoogleUrlValidation =
	| { ok: true; value: ValidatedGoogleUrl }
	| { ok: false; error: string };

const GOOGLE_HOSTS = new Set([
	'docs.google.com',
	'drive.google.com',
	'jamboard.google.com',
	'script.google.com',
]);

const EXPECTED_PATH_PART: Record<string, string> = {
	gdoc: '/document/',
	gsheet: '/spreadsheets/',
	gslides: '/presentation/',
	gdraw: '/drawings/',
	gform: '/forms/',
	gtable: '/spreadsheets/',
	gscript: '/projects/',
	gjam: '/',
};

export function validateGoogleUrl(
	input: string,
	extension?: string,
): GoogleUrlValidation {
	const trimmed = input.trim();
	if (!trimmed) {
		return { ok: false, error: 'Paste a Google document URL.' };
	}

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		return { ok: false, error: 'Enter a complete URL beginning with https://.' };
	}

	if (parsed.protocol !== 'https:') {
		return { ok: false, error: 'Google document URLs must use https://.' };
	}

	parsed.hostname = parsed.hostname.toLowerCase();
	if (!GOOGLE_HOSTS.has(parsed.hostname)) {
		return {
			ok: false,
			error: 'Use a URL from Google Docs, Drive, Apps Script, or Jamboard.',
		};
	}

	canonicalizeEditablePath(parsed);
	const documentId = extractDocumentId(parsed);
	const expectedPart = extension
		? EXPECTED_PATH_PART[extension.toLowerCase()]
		: undefined;
	let warning: string | undefined;
	if (
		expectedPart &&
		parsed.hostname !== 'drive.google.com' &&
		!parsed.pathname.includes(expectedPart)
	) {
		warning = `This URL may not match a .${extension?.toLowerCase()} file.`;
	}

	return {
		ok: true,
		value: {
			url: parsed.toString(),
			...(documentId ? { documentId } : {}),
			...(warning ? { warning } : {}),
		},
	};
}

function canonicalizeEditablePath(url: URL): void {
	if (url.hostname === 'docs.google.com') {
		const editable = url.pathname.match(
			/^(.*\/(?:document|spreadsheets|presentation|drawings|forms)\/d\/[a-zA-Z0-9_-]+)\/?$/,
		);
		if (editable?.[1]) {
			url.pathname = `${editable[1]}/edit`;
		}
		return;
	}

	if (url.hostname === 'script.google.com') {
		const project = url.pathname.match(
			/^(\/home\/projects\/[a-zA-Z0-9_-]+)\/?$/,
		);
		if (project?.[1]) {
			url.pathname = `${project[1]}/edit`;
		}
	}
}

function extractDocumentId(url: URL): string | undefined {
	const pathMatch = url.pathname.match(
		/\/(?:d|projects)\/([a-zA-Z0-9_-]+)/,
	);
	if (pathMatch?.[1]) {
		return pathMatch[1];
	}

	return url.searchParams.get('id') ?? undefined;
}
