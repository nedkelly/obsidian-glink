# Contributing to GLink

Contributions, bug reports, and focused compatibility testing are welcome.

## macOS support

GLink's automatic linking currently uses the Windows Shell action supplied by
Google Drive for desktop. A macOS implementation needs a contributor who can:

1. identify a reliable local action for obtaining the Google URL from a Drive
   placeholder without changing its sharing permissions;
2. implement that action behind an explicit macOS platform check;
3. preserve the manual-link fallback;
4. document any clipboard, AppleScript, Finder, or accessibility access used;
   and
5. test loading, unloading, linking, renaming, embedding, and sign-in behavior
   on a current Obsidian desktop release.

Please open an issue describing the proposed native mechanism before beginning
a large implementation.

## Development setup

Requirements:

- Node.js 20.19 or a newer active LTS release;
- npm; and
- Obsidian desktop with a test vault.

Install dependencies and validate a production build:

```text
npm install
npm run build
npm run lint
```

Copy `main.js`, `manifest.json`, and `styles.css` into
`<vault>/.obsidian/plugins/glink/`, then reload Obsidian.

## Pull requests

- Keep `src/main.ts` focused on plugin lifecycle and coordination.
- Put new behavior in a focused module.
- Use Obsidian's registration helpers for listeners and cleanup.
- Do not add telemetry, remote code execution, or undeclared network services.
- Update README disclosures when behavior touches external files, accounts,
  network traffic, the clipboard, or operating-system automation.
- Do not commit `main.js`, source maps, `node_modules`, or local plugin data.
- Run the production build and lint checks before submitting.

By contributing, you agree that your contribution is licensed under the
project's MIT License.
