export interface DarkFilterSettings {
	invert: number;
	hue: number;
	saturation: number;
	brightness: number;
	contrast: number;
}

export interface GLinkSettings {
	automaticLinking: boolean;
	darkMode: boolean;
	darkFilter: DarkFilterSettings;
}

export const DEFAULT_DARK_FILTER: DarkFilterSettings = {
	invert: 88,
	hue: 180,
	saturation: 100,
	brightness: 92,
	contrast: 90,
};

export const DEFAULT_SETTINGS: GLinkSettings = {
	automaticLinking: false,
	darkMode: false,
	darkFilter: { ...DEFAULT_DARK_FILTER },
};

function parseFilterValue(
	value: unknown,
	fallback: number,
	min: number,
	max: number,
): number {
	return typeof value === 'number' && Number.isFinite(value)
		? Math.min(max, Math.max(min, value))
		: fallback;
}

export function parseSettings(data: unknown): GLinkSettings {
	if (data === null || typeof data !== 'object' || Array.isArray(data)) {
		return { ...DEFAULT_SETTINGS };
	}

	const settings = (data as Record<string, unknown>).settings;
	if (
		settings === null ||
		typeof settings !== 'object' ||
		Array.isArray(settings)
	) {
		return { ...DEFAULT_SETTINGS };
	}

	const storedSettings = settings as Record<string, unknown>;
	const storedFilter =
		storedSettings.darkFilter !== null &&
		typeof storedSettings.darkFilter === 'object' &&
		!Array.isArray(storedSettings.darkFilter)
			? (storedSettings.darkFilter as Record<string, unknown>)
			: {};

	return {
		automaticLinking:
			storedSettings.automaticLinking === true,
		darkMode: storedSettings.darkMode === true,
		darkFilter: {
			invert: parseFilterValue(
				storedFilter.invert,
				DEFAULT_DARK_FILTER.invert,
				70,
				100,
			),
			hue: parseFilterValue(
				storedFilter.hue,
				DEFAULT_DARK_FILTER.hue,
				0,
				360,
			),
			saturation: parseFilterValue(
				storedFilter.saturation,
				DEFAULT_DARK_FILTER.saturation,
				25,
				200,
			),
			brightness: parseFilterValue(
				storedFilter.brightness,
				DEFAULT_DARK_FILTER.brightness,
				50,
				150,
			),
			contrast: parseFilterValue(
				storedFilter.contrast,
				DEFAULT_DARK_FILTER.contrast,
				50,
				150,
			),
		},
	};
}
