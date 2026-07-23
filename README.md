# GLink

GLink opens Google Drive placeholder files such as `.gdoc`, `.gsheet`, and
`.gslides` inside Obsidian without reading the placeholder or using OAuth.

Google Drive for Desktop can expose these entries as unreadable streamed
placeholders on Windows. GLink instead asks for the Google URL the first time
you open each file and saves that mapping in the plugin's local `data.json`.
The embedded Google page handles its own sign-in.

## Local installation

1. Run `npm install` and `npm run build`.
2. Create `<vault>/.obsidian/plugins/obsidian-glink/`.
3. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
4. Reload Obsidian.
5. Enable **GLink** under **Settings → Community plugins**.
6. Enable **Settings → Files and links → Detect all file extensions** so the
   Google placeholders appear in the file explorer.

For development, clone this repository directly into
`<vault>/.obsidian/plugins/obsidian-glink/` and run `npm run dev`.

## Usage

Select a supported Google placeholder in the file explorer. On first open:

1. Select **Open original in browser**.
2. Copy the Google document URL from the browser.
3. Select **Paste Google URL**, paste it, then select **Save and open**.

To automate this on Windows, enable **Settings → GLink → Automatic linking
on Windows**. When an unlinked file is opened, GLink invokes Google Drive's
**Copy link to clipboard** Explorer action, validates the copied URL, saves it,
and opens the document. This changes the Windows clipboard. If the shell
action is unavailable or does not produce a new Google URL, the manual paste
flow remains available.

Enable **Settings → GLink → Dark mode for embedded Google files** to apply an
experimental softened dark filter to embedded documents. This affects only
their display inside Obsidian; cell colours and images may look different.
Use the hue, saturation, brightness, contrast, and inversion controls beneath
the toggle to tune the result for your display and preferred Google font.
Google dialogs hosted in separate iframes are outside the filter correction
scope and may retain visual artefacts.

Later opens use the saved URL automatically. GLink also handles
`![[Folder/Sheet.gsheet]]` embeds. Right-click a placeholder to change, copy,
or remove its saved link. Manage and back up all mappings under
**Settings → GLink**.

Mappings use complete vault-relative paths, so duplicate filenames in
different folders remain distinct. Mappings migrate when files or folders are
renamed and are not deleted when Drive temporarily removes a placeholder.

## Supported extensions

`.gdoc`, `.gsheet`, `.gslides`, `.gdraw`, `.gform`, `.gtable`, `.gscript`,
and `.gjam`.

## Privacy

GLink does not use the Google Drive API, OAuth, telemetry, or any other
external service of its own. It stores pasted URLs in the plugin's local
`data.json`. Google receives normal browser traffic when its page is opened in
the embedded webview.

## Attribution

The file-view, embedded-webview, and extension-registration approach is
derived from [oilandrust/obsidian-gdocs](https://github.com/oilandrust/obsidian-gdocs),
used under the MIT License.
