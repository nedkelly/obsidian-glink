import { Notice } from 'obsidian';
import {
	DEFAULT_DARK_FILTER,
	type DarkFilterSettings,
} from '../plugin-settings';

interface WebviewNewWindowEvent extends Event {
	url?: string;
}

interface ElectronWebviewElement extends HTMLElement {
	executeJavaScript(code: string, userGesture?: boolean): Promise<unknown>;
	insertCSS(css: string): Promise<string>;
}

const SHARE_DROPDOWN_SHIM = `
	(() => {
		if (window.__glinkShareDropdownShim) {
			return;
		}
		window.__glinkShareDropdownShim = true;

		const controls = 'button, [role="button"]';
		const isVisible = (element) => {
			const rect = element.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		};
		const findShareButton = () =>
			Array.from(document.querySelectorAll(controls)).find((element) =>
				isVisible(element) &&
				element.textContent?.replace(/\\s+/g, ' ').trim() === 'Share'
			);
		const isAdjacentDropdown = (candidate, share) => {
			if (!candidate || candidate === share) {
				return false;
			}
			const candidateRect = candidate.getBoundingClientRect();
			const shareRect = share.getBoundingClientRect();
			const verticalOverlap =
				Math.min(candidateRect.bottom, shareRect.bottom) -
				Math.max(candidateRect.top, shareRect.top);
			return (
				verticalOverlap > Math.min(candidateRect.height, shareRect.height) / 2 &&
				candidateRect.left >= shareRect.right - 4 &&
				candidateRect.left <= shareRect.right + 72 &&
				candidateRect.width <= 72
			);
		};
		const apply = () => {
			const share = findShareButton();
			if (!share) {
				return;
			}
			const dropdown = Array.from(document.querySelectorAll(controls)).find(
				(candidate) => isAdjacentDropdown(candidate, share)
			);
			if (!dropdown) {
				return;
			}
			const dropdownWidth = dropdown.getBoundingClientRect().width;
			share.setAttribute('data-glink-share-main', '');
			share.style.setProperty(
				'--glink-share-dropdown-width',
				\`\${dropdownWidth}px\`
			);
			dropdown.setAttribute('data-glink-share-dropdown', '');
		};

		apply();
		new MutationObserver(apply).observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	})();
`;

const SHARE_DROPDOWN_CSS = `
	[data-glink-share-main] {
		position: relative !important;
		overflow: visible !important;
	}

	[data-glink-share-main]::after {
		content: "";
		position: absolute;
		inset-block: 0;
		left: 100%;
		width: var(--glink-share-dropdown-width, 0);
		z-index: 2147483647;
	}

	[data-glink-share-dropdown] {
		pointer-events: none !important;
	}
`;

const DARK_STATE_SHIM = `
	(() => {
		if (window.__glinkDarkStateShim) {
			return;
		}
		window.__glinkDarkStateShim = true;

		const isVisible = (element) => {
			const style = getComputedStyle(element);
			const rect = element.getBoundingClientRect();
			return (
				rect.width > 0 &&
				rect.height > 0 &&
				style.display !== 'none' &&
				style.visibility !== 'hidden'
			);
		};
		const markDialogLayers = () => {
			document
				.querySelectorAll(
					'[data-glink-dialog], [data-glink-dialog-backdrop]'
				)
				.forEach((element) => {
					element.removeAttribute('data-glink-dialog');
					element.removeAttribute('data-glink-dialog-backdrop');
				});

			const visibleDialogs = Array.from(
				document.querySelectorAll('[role="dialog"], [aria-modal="true"]')
			).filter(isVisible);
			const dialogs = visibleDialogs.filter(
				(dialog) =>
					!visibleDialogs.some(
						(other) => other !== dialog && other.contains(dialog)
					)
			);

			for (const dialog of dialogs) {
				dialog.setAttribute('data-glink-dialog', '');
				let branch = dialog;
				let parent = dialog.parentElement;
				for (let depth = 0; parent && depth < 4; depth++) {
					const backdrop = Array.from(parent.children).find((candidate) => {
						if (candidate === branch || candidate.contains(dialog)) {
							return false;
						}
						const rect = candidate.getBoundingClientRect();
						const style = getComputedStyle(candidate);
						return (
							isVisible(candidate) &&
							rect.width >= window.innerWidth * 0.8 &&
							rect.height >= window.innerHeight * 0.8 &&
							(style.position === 'fixed' ||
								style.position === 'absolute')
						);
					});
					if (backdrop) {
						backdrop.setAttribute('data-glink-dialog-backdrop', '');
						break;
					}
					branch = parent;
					parent = parent.parentElement;
				}
			}
		};
		const isPrintPage = () =>
			Array.from(
				document.querySelectorAll('h1, h2, [role="heading"], div, span')
			).some(
				(element) =>
					element.childElementCount === 0 &&
					element.textContent?.trim() === 'Print settings' &&
					isVisible(element)
			);

		let scheduled = false;
		const update = () => {
			scheduled = false;
			markDialogLayers();
			document.documentElement.toggleAttribute(
				'data-glink-native-colours',
				isPrintPage()
			);
		};
		const schedule = () => {
			if (!scheduled) {
				scheduled = true;
				requestAnimationFrame(update);
			}
		};

		schedule();
		new MutationObserver(schedule).observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class', 'style', 'aria-hidden'],
			childList: true,
			subtree: true
		});
	})();
`;

function buildDarkContentCss(filter: DarkFilterSettings): string {
	const rootFilter = [
		`invert(${filter.invert}%)`,
		`hue-rotate(${filter.hue}deg)`,
		`saturate(${filter.saturation}%)`,
		`brightness(${filter.brightness}%)`,
		`contrast(${filter.contrast}%)`,
	].join(' ');
	const counterFilter = [
		`contrast(${(10000 / filter.contrast).toFixed(3)}%)`,
		`brightness(${(10000 / filter.brightness).toFixed(3)}%)`,
		`saturate(${(10000 / filter.saturation).toFixed(3)}%)`,
		`hue-rotate(${-filter.hue}deg)`,
		'invert(100%)',
	].join(' ');

	return `
	html {
		background: white !important;
		filter: ${rootFilter};
		-webkit-font-smoothing: antialiased !important;
		text-rendering: geometricPrecision !important;
	}

	html[data-glink-native-colours] {
		filter: none !important;
	}

	html:not([data-glink-native-colours]) iframe {
		filter: ${counterFilter} !important;
	}

	html:not([data-glink-native-colours]) [data-glink-dialog-backdrop] {
		filter: ${counterFilter} !important;
	}

	html:not([data-glink-native-colours]) img,
	html:not([data-glink-native-colours]) c-wiz img,
	html:not([data-glink-native-colours]) video,
	html:not([data-glink-native-colours]) svg image,
	html:not([data-glink-native-colours]) [role="img"]:not(:has(img)),
	html:not([data-glink-native-colours])
		[style*="background-image"]:not(:has(img)) {
		filter: ${counterFilter} !important;
	}

	html:not([data-glink-native-colours]) c-wiz [role="img"]:has(img),
	html:not([data-glink-native-colours])
		c-wiz
		[style*="background-image"]:has(img) {
		filter: none !important;
	}
`;
}

export function mountGoogleWebview(
	parent: HTMLElement,
	url: string,
	darkMode = false,
	darkFilter: DarkFilterSettings = DEFAULT_DARK_FILTER,
): HTMLElement {
	const container = parent.createDiv({ cls: 'glink-webview-container' });
	const webview = activeDocument.createElement(
		'webview',
	) as ElectronWebviewElement;
	webview.setAttribute('src', url);
	webview.setAttribute('webpreferences', 'nativeWindowOpen=no');
	webview.className = 'glink-webview';
	webview.addEventListener('dom-ready', () => {
		void webview.insertCSS(SHARE_DROPDOWN_CSS).catch(() => undefined);
		void webview
			.executeJavaScript(SHARE_DROPDOWN_SHIM)
			.catch(() => undefined);
		if (darkMode) {
			void webview
				.insertCSS(buildDarkContentCss(darkFilter))
				.catch(() => undefined);
			void webview
				.executeJavaScript(DARK_STATE_SHIM)
				.catch(() => undefined);
		}
	});
	webview.addEventListener(
		'new-window',
		(event: WebviewNewWindowEvent) => {
			event.preventDefault();
			if (event.url) {
				webview.setAttribute('src', event.url);
			}
		},
	);
	container.appendChild(webview);
	return container;
}

export function copyGoogleLink(url: string): void {
	void navigator.clipboard
		.writeText(url)
		.then(() => new Notice('Google link copied'))
		.catch(() => new Notice('Could not copy the Google link'));
}
