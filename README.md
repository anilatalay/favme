# favme

A small Chrome extension that replaces the new tab page with your favorite sites, organized into groups.

## Features

- **Groups:** Create, rename, reorder and delete groups. Click a group's title to collapse it.
- **Card widths:** Cards sit on a 12-column grid (e.g. `4 4 4`, `3 3 3 3`, `6 3 3`). Pick a width from the card menu or drag the card's right edge.
- **Lock:** A locked card's sites can't be added, edited, deleted or moved.
- **Drag and drop:** Move sites between groups, or drop a link from the address bar onto a group to add it.
- **Search:** Filters your sites. Enter opens the first match; with no match, it searches your default search engine.
- **Settings:** Interface language (Turkish / English) and background color.
- **Backup:** Export and import your groups as JSON.

## Installation

1. Clone the repository:
   ```sh
   git clone git@github.com:anilatalay/favme.git
   ```
2. Open `chrome://extensions` in Chrome and turn on **Developer mode**.
3. Click **Load unpacked** and select the `favme` folder.
4. Open a new tab.

## Languages

The interface follows your browser language by default (Turkish or English, otherwise English). You can change it under **⋯ → Settings → Language**.

Interface strings live in `i18n.js`. To add a language, add a block with the same keys to `MESSAGES` and an entry to `LANGUAGES`. The extension name and description in `manifest.json` are in English.

## Notes

- Data is stored in `chrome.storage.local`, in that browser only.
- For unpacked extensions, Chrome derives the extension ID from the folder path. Export a backup (**⋯ → Export**) before moving or renaming the folder.
- No dependencies or build step: plain HTML, CSS and JavaScript (Manifest V3).
