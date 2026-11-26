# favme

A small Chrome extension that replaces the new tab page with your favorite sites, organized into groups.

## Features

- **Edit mode:** Card settings are hidden until you turn on **⋯ → Edit cards** (press **Done** or Esc when finished; edit mode is off in every new tab). In edit mode you can move cards, change their width, and lock, rename or delete them from the card's ⋯ menu. Editing (✎) sites and to-do items, and deleting (✕) sites, also needs edit mode; to-do items can be deleted at any time.
- **Groups:** Create, rename, reorder and delete groups. Click a group's title to collapse it.
- **To-do lists:** When creating a card, choose "To-do list" as its type. Type and press Enter to add items one after another. Each item shows the date and time it was added. Click an item to tick it off (it stays in place); in edit mode, use ✎ to edit it. Completed items can be cleared from the card's ⋯ menu (available outside edit mode too). You can have as many lists as you like.
- **Card widths:** Cards sit on a 12-column grid (e.g. `4 4 4`, `3 3 3 3`, `6 3 3`). In edit mode, pick a width from the card menu or drag the card's right edge.
- **Lock:** A locked card stays in place, and its sites can't be added, edited, deleted or moved. On a locked to-do list, items can still be ticked off.
- **Drag and drop:** In edit mode, drag a card by its header to move it. Drop it on the left or right half of another card to put it beside that card; if the row is full, that card narrows to make room. Drop it near a card's top or bottom edge, or in the empty space below the cards, to put it on a new row of its own. Move sites between groups, or drop a link from the address bar onto a group to add it.
- **Search:** Filters your sites and to-do items. Enter opens the first match; with no match, it searches your default search engine.
- **Settings:** Interface language (Turkish / English) and background color.
- **Backup:** Export and import your groups and to-do lists as JSON.

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
