# GLink

GLink opens Google Drive placeholder files such as `.gdoc`, `.gsheet`, and
`.gslides` in embedded Obsidian views. It keeps a local mapping between each
placeholder's vault path and its Google URL, so it does not need to read the
placeholder contents or use the Google Drive API.

## Platform support

GLink currently supports **Obsidian desktop on Windows only**. It is developed
and tested with Google Drive for desktop on Windows 11.

- Automatic linking depends on the Windows Shell and PowerShell.
- Manual linking and embedded views may work elsewhere, but macOS and Linux are
  not currently tested or supported.
- Mobile is not supported.

**macOS contributor wanted:** help implementing and testing the native
copy-link workflow for Google Drive on macOS would be very welcome. If you use
Google Drive for desktop on a Mac and would like to help, please open an issue
or pull request.

## Features

- Opens Google Docs, Sheets, Slides, Drawings, Forms, Apps Script projects, and
  other supported Google placeholders directly in Obsidian.
- Automatically obtains a link from Google Drive's Windows Explorer action, or
  accepts a manually pasted Google URL.
- Supports normal file views and `![[Folder/File.gsheet]]` embeds.
- Keeps mappings distinct by complete vault-relative path and migrates them
  when files or folders are renamed.
- Includes an optional, adjustable dark filter for embedded Google pages.
- Provides registry import, export, update, copy, and removal controls.

## Requirements

- Obsidian `1.8.0` or later on Windows desktop.
- Google Drive for desktop with Google placeholder files visible in the vault.
- **Settings → Files and links → Detect all file extensions** enabled.
- A Google account for documents that are not publicly accessible.

The embedded Google page manages its own sign-in session. It may not share the
login state of your usual browser.

## Usage

Select a supported Google placeholder in the file explorer. On first open,
either link it automatically or paste its URL manually.

### Automatic linking

Enable **Settings → GLink → Automatic linking on Windows**. When an unlinked
file opens, GLink invokes Google Drive's **Copy link to clipboard** Windows
Explorer action, validates the copied URL, saves it, and opens the embedded
document.

This action temporarily changes the Windows clipboard. If Google Drive does
not provide a new supported URL, GLink falls back to the manual flow.

### Manual linking

1. Select **Open original in browser**.
2. Copy the Google document URL from the browser.
3. Select **Paste Google URL**.
4. Paste the URL, then select **Save and open**.

Later opens use the saved URL automatically. Right-click a placeholder to
change, copy, or remove its saved link. Manage or back up all mappings under
**Settings → GLink**.

## Dark mode

Enable **Settings → GLink → Dark mode for embedded Google files** to apply an
experimental softened dark filter. Use the hue, saturation, brightness,
contrast, and inversion controls to tune it for your display and preferred
Google font.

This only changes the embedded page's appearance. Cell colours and images may
look different. Google dialogs hosted in separate iframes are outside the
filter-correction scope and may retain visual artefacts. Printing is returned
to native colours.

## Supported extensions

`.gdoc`, `.gsheet`, `.gslides`, `.gdraw`, `.gform`, `.gtable`, `.gscript`, and
`.gjam`.

## Privacy and security

GLink:

- has no telemetry, analytics, advertising, or paid features;
- does not use the Google Drive API or OAuth;
- does not read Google placeholder contents;
- stores vault-relative paths and Google document URLs locally in the plugin's
  `data.json`;
- does not transmit vault contents, filenames, or saved mappings to a service
  operated by the plugin author;
- passes the selected placeholder's local path to the Windows Shell only when
  automatic linking is requested;
- changes the Windows clipboard while automatic linking is in progress; and
- opens Google pages in an embedded Chromium webview, which sends normal
  browser traffic to Google and is subject to Google's terms and privacy
  policy.

Opening the original file asks the operating system to handle the local Google
placeholder. GLink does not change the document's Google sharing permissions.

## Development

```text
npm install
npm run build
npm run lint
```

Production builds generate a minified `main.js`. The generated file is ignored
by Git and must be attached to a GitHub release alongside `manifest.json` and
`styles.css`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance.

## Attribution

The file-view, embedded-webview, and extension-registration approach is
derived from
[oilandrust/obsidian-gdocs](https://github.com/oilandrust/obsidian-gdocs),
used under the MIT License.

GLink is a standalone plugin because it solves a different Google Drive
storage case. GDocs obtains the document URL by reading the JSON stored in a
Google shortcut file. With Google Drive's streamed-file mode on Windows, these
entries can be exposed as cloud placeholders that standard file reads cannot
open. In the affected setup, Google Drive does not expose an **Available
offline** option for these placeholders, so downloading them for local parsing
is not a viable workaround. GLink therefore uses a local URL registry, with an
optional Windows Shell copy-link workflow, instead of reading shortcut
contents.

## License

[MIT](LICENSE)
