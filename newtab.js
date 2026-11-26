'use strict';

const STORAGE_KEY = 'data';
const SETTINGS_KEY = 'settings';
const BG_PRESETS = [
  '#f4f5f7', '#fdf6e3', '#e8f1fb', '#e9f5ec', '#f9ecef', '#efeaf8', '#fff4e0', '#e6e8eb',
  '#15171b', '#1e2a38', '#1d3027', '#3a1f2b', '#2b2340', '#3b2f1e', '#0f3d3e', '#2d2d2d',
];
const COLUMNS = 12;
const MIN_SPAN = 2;
const DEFAULT_SPAN = 4;
const SPAN_PRESETS = [2, 3, 4, 6, 8, 12];

const defaultData = () => ({
  groups: [
    {
      id: uid(),
      name: t('defaultGroupName'),
      span: DEFAULT_SPAN,
      collapsed: false,
      sites: [
        { id: uid(), title: 'Google', url: 'https://www.google.com' },
        { id: uid(), title: 'YouTube', url: 'https://www.youtube.com' },
        { id: uid(), title: 'GitHub', url: 'https://github.com' },
      ],
    },
  ],
});

let state = { groups: [] };
let loaded = false;
// Card layout and settings (moving, width, lock, rename, delete) are only available in
// edit mode (⋯ → Edit cards). Not saved, so every new tab starts with it off and cards
// can't be changed by accident.
let editMode = false;

// ---------- Helpers ----------

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function $(sel, root = document) {
  return root.querySelector(sel);
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child != null) node.append(child);
  }
  return node;
}

function normalizeUrl(raw) {
  let value = raw.trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = 'https://' + value;
  try {
    return new URL(value).href;
  } catch {
    return null;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function faviconUrl(pageUrl) {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', '32');
  return url.href;
}

function clampSpan(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(COLUMNS, Math.max(MIN_SPAN, n)) : DEFAULT_SPAN;
}

function findGroup(groupId) {
  return state.groups.find((g) => g.id === groupId);
}

function isTodo(group) {
  return group.type === 'todo';
}

function findSite(siteId) {
  for (const group of state.groups) {
    if (isTodo(group)) continue;
    const index = group.sites.findIndex((s) => s.id === siteId);
    if (index !== -1) return { group, index, site: group.sites[index] };
  }
  return null;
}

function findItem(itemId) {
  for (const group of state.groups) {
    if (!isTodo(group)) continue;
    const index = group.items.findIndex((i) => i.id === itemId);
    if (index !== -1) return { group, index, item: group.items[index] };
  }
  return null;
}

// ---------- Storage ----------

async function load() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  state = stored[STORAGE_KEY] ?? defaultData();
  loaded = true;
  if (!stored[STORAGE_KEY]) await save();
}

async function save() {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

async function commit() {
  render();
  await save();
}

// Reflect changes made in other open tabs
chrome.storage.onChanged.addListener((changes, area) => {
  const next = changes[STORAGE_KEY]?.newValue;
  if (area === 'local' && next && JSON.stringify(next) !== JSON.stringify(state)) {
    state = next;
    render();
  }
});

// ---------- Render ----------

const groupsEl = $('#groups');
const searchEl = $('#search');

function render() {
  if (!loaded) return;
  const locale = currentLocale();
  const query = searchEl.value.trim().toLocaleLowerCase(locale);
  // Keep typing in a to-do card's add field when the cards are rebuilt
  // (after adding an item, or when another tab changes the data)
  const active = document.activeElement;
  const typing = active?.matches('.todo-add input')
    ? { groupId: active.closest('.group').dataset.groupId, value: active.value }
    : null;
  groupsEl.replaceChildren();

  for (const group of state.groups) {
    if (isTodo(group)) {
      const items = query
        ? group.items.filter((i) => i.text.toLocaleLowerCase(locale).includes(query))
        : group.items;
      if (query && items.length === 0) continue;
      groupsEl.append(renderGroup(group, items, Boolean(query)));
      continue;
    }

    const sites = query
      ? group.sites.filter(
          (s) =>
            s.title.toLocaleLowerCase(locale).includes(query) ||
            s.url.toLowerCase().includes(query)
        )
      : group.sites;

    if (query && sites.length === 0) continue;
    groupsEl.append(renderGroup(group, sites, Boolean(query)));
  }

  $('#empty').hidden = state.groups.length > 0;

  if (typing) {
    const input = $(`.group[data-group-id="${typing.groupId}"] .todo-add input`, groupsEl);
    if (input) {
      input.value = typing.value;
      input.focus();
    }
  }
}

function renderEmptyText() {
  const [before, after = ''] = t('empty').split('{button}');
  $('#empty').replaceChildren(before, el('strong', {}, t('newGroup')), after);
}

// `entries` are the sites of a site group, or the items of a to-do list
function renderGroup(group, entries, searching) {
  const collapsed = group.collapsed && !searching;
  const todo = isTodo(group);
  const count = todo ? group.items.filter((i) => !i.done).length : group.sites.length;

  const header = el(
    'div',
    { class: 'group-header' },
    el(
      'h2',
      { class: 'group-name', title: t('toggleGroup'), dataset: { action: 'toggle-group' } },
      group.name,
      el('span', { class: 'group-count', title: todo ? t('todoRemaining', { count }) : '' }, String(count))
    ),
    group.locked
      ? editMode
        ? el('button', { class: 'icon-btn lock-btn', title: t('lockedClickToUnlock'), dataset: { action: 'toggle-lock' } }, '🔒')
        : el('span', { class: 'icon-btn lock-btn', title: t('locked') }, '🔒')
      : todo
        ? null
        : el('button', { class: 'icon-btn', title: t('addSite'), dataset: { action: 'add-site' } }, '+'),
    // Card settings live in edit mode; outside it, the menu only appears for clearing
    // completed to-dos
    editMode || canClearDone(group)
      ? el('button', { class: 'icon-btn', title: t('groupOptions'), dataset: { action: 'group-menu' } }, '⋯')
      : null
  );

  // In edit mode, cards are moved by dragging their header; locked cards stay in place. Not
  // while searching: hidden cards would make the rows on screen differ from the real ones.
  header.draggable = editMode && !group.locked && !searching;

  const list = todo ? renderTodoList(group, entries, searching) : renderSiteList(group, entries);

  const span = clampSpan(group.span ?? DEFAULT_SPAN);
  const section = el(
    'section',
    {
      class:
        'group' +
        (todo ? ' todo-group' : '') +
        (group.rowStart ? ' row-start' : '') +
        (collapsed ? ' collapsed' : '') +
        (group.locked ? ' locked' : ''),
      dataset: { groupId: group.id },
    },
    header,
    list,
    editMode ? el('div', { class: 'resize-handle', title: t('resizeTitle', { span, cols: COLUMNS }) }) : null
  );
  section.style.setProperty('--span', span);
  return section;
}

function renderSiteList(group, sites) {
  const list = el('div', { class: 'sites' });
  if (sites.length === 0) {
    list.append(
      el('div', { class: 'sites-empty' },
        group.locked ? t('lockedEmpty') : t('groupEmpty'))
    );
  }
  for (const site of sites) list.append(renderSite(site, group.locked));
  return list;
}

function renderTodoList(group, items, searching) {
  const body = el('div', { class: 'todo' });
  // Adding is hidden while searching, since a new item may not match the filter
  if (!group.locked && !searching) {
    body.append(
      el('form', { class: 'todo-add' },
        el('input', { name: 'text', placeholder: t('todoPlaceholder'), maxLength: 200, autocomplete: 'off' }))
    );
  }
  if (items.length === 0) {
    body.append(el('div', { class: 'sites-empty' }, group.locked ? t('lockedEmpty') : t('todoEmpty')));
    return body;
  }
  body.append(el('ul', { class: 'todo-list' }, ...items.map((item) => renderTodoItem(item, group.locked))));
  return body;
}

// When an item was added, e.g. "25 Nov 14:46"; the year only if it isn't this year
function formatAdded(ms) {
  const date = new Date(ms);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString(currentLocale(), {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderTodoItem(item, locked) {
  return el(
    'li',
    // Clicking anywhere on the row ticks the item
    { class: 'todo-item' + (item.done ? ' done' : ''), dataset: { itemId: item.id, action: 'toggle-todo' } },
    el('input', { type: 'checkbox', checked: item.done, tabIndex: -1 }),
    el(
      'div',
      { class: 'todo-main' },
      el('span', { class: 'todo-text' }, item.text),
      // Items added before dates were recorded have no createdAt
      Number.isFinite(item.createdAt)
        ? el('time', { class: 'todo-date', dateTime: new Date(item.createdAt).toISOString() }, formatAdded(item.createdAt))
        : null
    ),
    // Deleting a to-do is always available; editing it needs edit mode
    locked
      ? null
      : el(
          'div',
          { class: 'todo-tools' },
          editMode ? el('button', { title: t('edit'), dataset: { action: 'edit-todo' } }, '✎') : null,
          el('button', { class: 'danger', title: t('delete'), dataset: { action: 'delete-todo' } }, '✕')
        )
  );
}

function renderSite(site, locked) {
  const img = el('img', { src: faviconUrl(site.url), alt: '', loading: 'lazy' });
  const link = el(
    'a',
    { class: 'site', href: site.url, title: site.url, dataset: { siteId: site.id } },
    el('div', { class: 'site-icon' }, img),
    el('div', { class: 'site-title' }, site.title),
    // Editing and deleting items needs edit mode
    locked || !editMode
      ? null
      : el(
          'div',
          { class: 'site-tools' },
          el('button', { title: t('edit'), dataset: { action: 'edit-site' } }, '✎'),
          el('button', { title: t('delete'), dataset: { action: 'delete-site' } }, '✕')
        )
  );
  link.draggable = !locked;
  return link;
}

// ---------- Dialogs ----------

// Cancel is not a submit button, so Enter always triggers Save
document.querySelectorAll('dialog [data-close]').forEach((btn) =>
  btn.addEventListener('click', () => btn.closest('dialog').close('cancel'))
);

function openDialog(dialog, onSubmit) {
  const form = $('form', dialog);
  const handler = () => {
    dialog.removeEventListener('close', handler);
    if (dialog.returnValue === 'ok') onSubmit(new FormData(form));
  };
  dialog.returnValue = '';
  dialog.addEventListener('close', handler);
  dialog.showModal();
  $('input', dialog).select();
}

function groupDialog(group) {
  const dialog = $('#dlg-group');
  $('#dlg-group-title').textContent = group ? t('groupDialogRename') : t('groupDialogNew');
  dialog.querySelector('[name=name]').value = group?.name ?? '';
  // The type is chosen only when creating a card
  $('#group-type-field').hidden = Boolean(group);
  dialog.querySelector('[name=type]').value = 'sites';

  openDialog(dialog, (data) => {
    const name = data.get('name').trim();
    if (!name) return;
    if (group) group.name = name;
    else if (data.get('type') === 'todo') {
      state.groups.push({ id: uid(), type: 'todo', name, span: DEFAULT_SPAN, collapsed: false, items: [] });
    } else {
      state.groups.push({ id: uid(), name, span: DEFAULT_SPAN, collapsed: false, sites: [] });
    }
    commit();
  });
}

function siteDialog({ groupId, siteId } = {}) {
  const dialog = $('#dlg-site');
  const found = siteId ? findSite(siteId) : null;
  const form = $('form', dialog);
  if (found?.group.locked) return;

  const editable = state.groups.filter((g) => !g.locked && !isTodo(g));
  if (editable.length === 0) {
    alert(t('allLocked'));
    return;
  }

  $('#dlg-site-title').textContent = found ? t('siteDialogEdit') : t('siteDialogAdd');
  form.url.value = found?.site.url ?? '';
  form.title.value = found?.site.title ?? '';
  form.group.replaceChildren(
    ...editable.map((g) => el('option', { value: g.id }, g.name))
  );
  form.group.value = found?.group.id ?? groupId ?? editable[0].id;

  openDialog(dialog, (data) => {
    const url = normalizeUrl(data.get('url'));
    if (!url) {
      alert(t('invalidUrl'));
      return;
    }
    const title = data.get('title').trim() || hostOf(url);
    const target = findGroup(data.get('group'));
    if (!target || target.locked) return;

    if (found) {
      Object.assign(found.site, { url, title });
      if (found.group !== target) {
        found.group.sites.splice(found.index, 1);
        target.sites.push(found.site);
      }
    } else {
      target.sites.push({ id: uid(), title, url });
    }
    commit();
  });
}

// ---------- Group menu ----------

let openMenu = null;

function closeMenus() {
  openMenu?.remove();
  openMenu = null;
  $('#menu').hidden = true;
}

function canClearDone(group) {
  return isTodo(group) && !group.locked && group.items.some((i) => i.done);
}

// Width, lock, rename and delete are only offered in edit mode
function showGroupMenu(button, group) {
  closeMenus();
  const item = (label, action, cls = '') =>
    el('button', { class: cls, dataset: { menuAction: action } }, label);

  const current = clampSpan(group.span ?? DEFAULT_SPAN);
  const widths = el(
    'div',
    { class: 'menu-widths' },
    el('span', { class: 'menu-label' }, t('widthLabel', { cols: COLUMNS })),
    el(
      'div',
      { class: 'width-options' },
      ...SPAN_PRESETS.map((n) =>
        el('button', { class: n === current ? 'active' : '', dataset: { menuAction: 'span', span: n } }, String(n))
      )
    )
  );

  const menu = el(
    'div',
    { class: 'menu' },
    editMode ? widths : null,
    editMode ? item(group.locked ? t('unlock') : t('lock'), 'toggle-lock') : null,
    editMode && !group.locked ? item(t('rename'), 'rename') : null,
    canClearDone(group) ? item(t('clearDone'), 'clear-done') : null,
    editMode && !group.locked ? item(t('deleteGroup'), 'delete', 'danger') : null
  );

  menu.addEventListener('click', (e) => {
    const action = e.target.dataset.menuAction;
    if (!action) return;
    closeMenus();
    if (action === 'clear-done') {
      if (canClearDone(group)) {
        group.items = group.items.filter((i) => !i.done);
        commit();
      }
    } else if (!editMode) {
      return; // card settings need edit mode
    } else if (action === 'span') {
      group.span = clampSpan(e.target.dataset.span);
      commit();
    } else if (action === 'toggle-lock') {
      group.locked = !group.locked;
      commit();
    } else if (group.locked) {
      return; // no editing on a locked card
    } else if (action === 'rename') groupDialog(group);
    else if (action === 'delete') {
      const count = isTodo(group) ? group.items.length : group.sites.length;
      const msg = !count
        ? t('confirmDeleteGroup', { name: group.name })
        : isTodo(group)
          ? t('confirmDeleteTodoWithItems', { name: group.name, count })
          : t('confirmDeleteGroupWithSites', { name: group.name, count });
      if (confirm(msg)) {
        detachGroup(group);
        commit();
      }
    }
  });

  button.parentElement.append(menu);
  openMenu = menu;
}

// ---------- Events ----------

groupsEl.addEventListener('click', (e) => {
  if (e.target.closest('.todo-edit')) return; // typing in the inline editor
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const groupEl = target.closest('.group');
  const group = groupEl && findGroup(groupEl.dataset.groupId);
  const siteEl = target.closest('.site');
  const action = target.dataset.action;

  if (siteEl) e.preventDefault(); // buttons inside a site tile shouldn't open the link
  e.stopPropagation();

  switch (action) {
    case 'toggle-lock':
      if (!editMode) break;
      group.locked = !group.locked;
      commit();
      break;
    case 'toggle-group':
      group.collapsed = !group.collapsed;
      commit();
      break;
    case 'add-site':
      if (group.locked) break;
      siteDialog({ groupId: group.id });
      break;
    case 'group-menu':
      if (openMenu && openMenu.parentElement === target.parentElement) closeMenus();
      else showGroupMenu(target, group);
      break;
    case 'edit-site':
      if (!editMode) break;
      siteDialog({ siteId: siteEl.dataset.siteId });
      break;
    case 'toggle-todo': {
      // Ticking stays allowed on a locked card
      const found = findItem(target.closest('.todo-item').dataset.itemId);
      if (found) {
        found.item.done = !found.item.done;
        commit();
      }
      break;
    }
    case 'edit-todo':
      if (!editMode) break;
      editTodo(target.closest('.todo-item'));
      break;
    case 'delete-todo': {
      const found = findItem(target.closest('.todo-item').dataset.itemId);
      if (found && !found.group.locked) {
        found.group.items.splice(found.index, 1);
        commit();
      }
      break;
    }
    case 'delete-site': {
      const found = findSite(siteEl.dataset.siteId);
      if (found && editMode && !found.group.locked && confirm(t('confirmDeleteSite', { title: found.site.title }))) {
        found.group.sites.splice(found.index, 1);
        commit();
      }
      break;
    }
  }
});

// ---------- To-do lists ----------

groupsEl.addEventListener('submit', (e) => {
  const form = e.target.closest('.todo-add');
  if (!form) return;
  e.preventDefault();
  const group = findGroup(form.closest('.group').dataset.groupId);
  const input = form.elements.text;
  const text = input.value.trim();
  if (!group || group.locked || !text) return;
  group.items.push({ id: uid(), text, done: false, createdAt: Date.now() });
  input.value = ''; // render keeps the focus in the (now empty) field for the next item
  commit();
});

// Edit an item's text inline
function editTodo(itemEl) {
  const textEl = $('.todo-text', itemEl);
  const found = findItem(itemEl.dataset.itemId);
  if (!textEl || !found || found.group.locked || !editMode) return;

  const input = el('input', { class: 'todo-edit', value: found.item.text, maxLength: 200 });
  let finished = false;
  const finish = (saveIt) => {
    if (finished) return;
    finished = true;
    const text = input.value.trim();
    if (saveIt && text && text !== found.item.text) {
      found.item.text = text;
      commit();
    } else {
      render();
    }
  };
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') finish(true);
    else if (ev.key === 'Escape') {
      ev.stopPropagation();
      finish(false);
    }
  });
  input.addEventListener('blur', () => finish(true));
  textEl.replaceWith(input);
  input.focus();
  input.select();
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu') && !e.target.closest('#btn-menu')) closeMenus();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const menuOpen = openMenu || !$('#menu').hidden;
  closeMenus();
  // Esc leaves edit mode, unless it was closing a menu or a dialog
  if (!menuOpen && editMode && !document.querySelector('dialog[open]')) setEditMode(false);
});

function setEditMode(on) {
  closeMenus();
  editMode = on;
  document.body.classList.toggle('editing', on);
  $('#btn-done-editing').hidden = !on;
  render();
}

$('#btn-done-editing').addEventListener('click', () => setEditMode(false));

$('#btn-new-group').addEventListener('click', () => groupDialog());

// ---------- Search ----------

searchEl.addEventListener('input', render);
searchEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const first = $('.site', groupsEl);
  const query = searchEl.value.trim();
  if (!query) return;
  if (first) {
    location.href = first.href;
  } else {
    chrome.search.query({ text: query, disposition: 'CURRENT_TAB' });
  }
});

// ---------- Drag & drop ----------

let dragSiteId = null;
let dragGroupId = null;
const GROUP_MIME = 'application/x-favme-group';
const DROP_CLASSES = ['drop-left', 'drop-right', 'drop-top', 'drop-bottom'];

// Matches the CSS breakpoint where every card takes a full row
const stackedLayout = matchMedia('(max-width: 900px)');

function spanOf(group) {
  return clampSpan(group.span ?? DEFAULT_SPAN);
}

// Rows on a wide screen. The grid places cards in order and wraps when a card no longer
// fits; a card with `rowStart` always begins a new row (CSS: grid-column-start 1).
function layoutRows(groups) {
  const rows = [];
  let row = null;
  let used = 0;
  for (const g of groups) {
    const span = spanOf(g);
    if (!row || g.rowStart || used + span > COLUMNS) {
      row = [];
      rows.push(row);
      used = 0;
    }
    row.push(g);
    used += span;
  }
  return rows;
}

function rowOf(groups, member) {
  return layoutRows(groups).find((row) => row.includes(member)) ?? [];
}

// Pin the rows as they are on screen, so moving one card doesn't make the cards after it
// slide into other rows: the first card of every row becomes a row start.
function freezeRows() {
  for (const row of layoutRows(state.groups)) {
    row.forEach((g, i) => {
      if (i === 0) g.rowStart = true;
      else delete g.rowStart;
    });
  }
}

// Take a card out of the list. If it started a row, the next card in that row takes over.
function detachGroup(group) {
  const index = state.groups.indexOf(group);
  const next = state.groups[index + 1];
  if (next && rowOf(state.groups, group).includes(next) && rowOf(state.groups, group)[0] === group) {
    next.rowStart = true;
  }
  state.groups.splice(index, 1);
}

// Before `moving` is placed beside `target`, narrow the two so they share target's row.
// The target gives way first but keeps at least half of the room the two share; the
// dragged card shrinks only if it still doesn't fit. If the row can't hold both even at
// minimum width, widths are left unchanged. Call it while `moving` is still in place.
function fitBeside(moving, target) {
  const others = rowOf(state.groups, target).filter((g) => g !== target && g !== moving);
  const free = COLUMNS - others.reduce((sum, g) => sum + spanOf(g), 0);
  const movingSpan = spanOf(moving);
  const targetSpan = spanOf(target);
  if (movingSpan + targetSpan <= free) return;

  const targetNext = Math.max(free - movingSpan, Math.min(targetSpan, Math.floor(free / 2)));
  const movingNext = Math.min(movingSpan, free - targetNext);
  if (targetNext < MIN_SPAN || movingNext < MIN_SPAN) return;
  target.span = targetNext;
  moving.span = movingNext;
}

/**
 * Moves a card. `side` is relative to `target`:
 * - 'left' / 'right': beside it, in its row (narrowing cards if the row is full)
 * - 'top' / 'bottom': on a new row of its own, just above / below target's row
 * When every card has its own row (narrow screen), top/bottom simply mean before/after.
 * Returns false when nothing would change.
 */
function placeCard(moving, target, side) {
  if (stackedLayout.matches) side = side === 'top' || side === 'left' ? 'left' : 'right';
  if (moving === target && (side === 'left' || side === 'right')) return false;

  freezeRows();
  const row = rowOf(state.groups, target).filter((g) => g !== moving);
  if (row.length === 0) return false; // the card is alone in that row already
  if ((side === 'left' || side === 'right') && !stackedLayout.matches) fitBeside(moving, target);
  detachGroup(moving);

  let at;
  let rowStart = false;
  if (side === 'left') {
    at = state.groups.indexOf(target);
    if (target.rowStart) {
      rowStart = true;
      delete target.rowStart;
    }
  } else if (side === 'right') {
    at = state.groups.indexOf(target) + 1;
  } else if (side === 'top') {
    at = state.groups.indexOf(row[0]); // row[0] is a row start, so `moving` gets a row of its own
    rowStart = true;
  } else {
    at = state.groups.indexOf(row[row.length - 1]) + 1; // the card after it starts the next row
    rowStart = true;
  }
  if (rowStart) moving.rowStart = true;
  else delete moving.rowStart;
  state.groups.splice(at, 0, moving);
  return true;
}

// Where a dragged card would land relative to the card element under the pointer. The top
// and bottom quarter of a card mean above/below its row; the rest, beside the card.
function cardDropSide(groupEl, e) {
  const rect = groupEl.getBoundingClientRect();
  const y = (e.clientY - rect.top) / rect.height;
  if (stackedLayout.matches) return y < 0.5 ? 'top' : 'bottom';
  if (y < 0.25) return 'top';
  if (y > 0.75) return 'bottom';
  return e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
}

// Resolves the drop spot for a dragged card, also over the empty space around the cards:
// below every card → a new last row; level with a row → beside the card to the left of
// the pointer, or below the row when the pointer is under one of its (shorter) cards.
function cardDropAt(e) {
  const hit = e.target.closest('.group');
  if (hit) return { groupEl: hit, side: cardDropSide(hit, e) };

  const cards = [...groupsEl.querySelectorAll('.group')].map((node) => ({ node, rect: node.getBoundingClientRect() }));
  if (cards.length === 0) return null;
  if (e.clientY > Math.max(...cards.map((c) => c.rect.bottom))) {
    return { groupEl: cards[cards.length - 1].node, side: 'bottom' };
  }
  const tops = cards.map((c) => Math.round(c.rect.top)).filter((top) => top <= e.clientY);
  if (tops.length === 0) return { groupEl: cards[0].node, side: 'top' };
  const rowTop = Math.max(...tops);
  const row = cards.filter((c) => Math.round(c.rect.top) === rowTop);
  const under = row.find((c) => e.clientX >= c.rect.left && e.clientX <= c.rect.right);
  if (under) return { groupEl: under.node, side: 'bottom' };
  const leftOf = row.filter((c) => c.rect.right < e.clientX);
  if (leftOf.length) return { groupEl: leftOf[leftOf.length - 1].node, side: 'right' };
  return { groupEl: row[0].node, side: 'left' };
}

// Shows where the card will land. Above/below markers span the whole row.
function showCardDropMarker(groupEl, side) {
  clearCardDropMarkers();
  if (groupEl.dataset.groupId === dragGroupId) {
    // Over the dragged card itself, only "own row" moves change anything
    const self = findGroup(dragGroupId);
    if (stackedLayout.matches || side === 'left' || side === 'right' || rowOf(state.groups, self).length < 2) return;
  }
  const rect = groupEl.getBoundingClientRect();
  const styles = getComputedStyle(groupsEl);
  const innerLeft = groupsEl.getBoundingClientRect().left + parseFloat(styles.paddingLeft);
  const innerWidth = groupsEl.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const rowBottom = Math.max(
    ...[...groupsEl.querySelectorAll('.group')]
      .map((n) => n.getBoundingClientRect())
      .filter((r) => Math.round(r.top) === Math.round(rect.top))
      .map((r) => r.bottom)
  );
  groupEl.style.setProperty('--row-left', `${innerLeft - rect.left}px`);
  groupEl.style.setProperty('--row-width', `${innerWidth}px`);
  groupEl.style.setProperty('--row-extra', `${rowBottom - rect.bottom}px`);
  groupEl.classList.add('drop-' + side);
}

function clearCardDropMarkers() {
  groupsEl.querySelectorAll('.group').forEach((n) => {
    n.classList.remove(...DROP_CLASSES);
    ['--row-left', '--row-width', '--row-extra'].forEach((v) => n.style.removeProperty(v));
  });
}

// The drop re-renders the cards, so `dragend` then fires on a detached node and never
// reaches groupsEl. Drag state is therefore also reset on drop and on every new drag.
function resetDrag() {
  dragSiteId = null;
  dragGroupId = null;
  clearCardDropMarkers();
  document.querySelectorAll('.dragging, .drop-target').forEach((n) =>
    n.classList.remove('dragging', 'drop-target')
  );
}

groupsEl.addEventListener('dragstart', (e) => {
  resetDrag();
  const header = e.target.closest?.('.group-header');
  if (header) {
    const groupEl = header.closest('.group');
    if (groupEl.classList.contains('locked')) {
      e.preventDefault();
      return;
    }
    dragGroupId = groupEl.dataset.groupId;
    closeMenus();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(GROUP_MIME, dragGroupId);
    const rect = groupEl.getBoundingClientRect();
    e.dataTransfer.setDragImage(groupEl, e.clientX - rect.left, e.clientY - rect.top);
    // Dim after the drag image has been captured
    requestAnimationFrame(() => groupEl.classList.add('dragging'));
    return;
  }

  const siteEl = e.target.closest('.site');
  if (!siteEl) return;
  if (siteEl.closest('.group.locked')) {
    e.preventDefault();
    return;
  }
  dragSiteId = siteEl.dataset.siteId;
  siteEl.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/uri-list', siteEl.href);
});

groupsEl.addEventListener('dragend', resetDrag);

groupsEl.addEventListener('dragover', (e) => {
  if (dragGroupId) {
    const spot = cardDropAt(e);
    if (!spot) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    showCardDropMarker(spot.groupEl, spot.side);
    return;
  }

  const groupEl = e.target.closest('.group');
  if (!groupEl || groupEl.classList.contains('locked') || groupEl.classList.contains('todo-group')) return;
  // Internal drag, or a link dropped from outside
  if (!dragSiteId && !e.dataTransfer.types.includes('text/uri-list')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = dragSiteId ? 'move' : 'copy';
  document.querySelectorAll('.drop-target').forEach((n) => n !== groupEl && n.classList.remove('drop-target'));
  groupEl.classList.add('drop-target');
});

groupsEl.addEventListener('drop', (e) => {
  if (dragGroupId) {
    e.preventDefault();
    const spot = cardDropAt(e);
    const moving = findGroup(dragGroupId);
    resetDrag();
    const target = spot && findGroup(spot.groupEl.dataset.groupId);
    if (moving && target && placeCard(moving, target, spot.side)) commit();
    return;
  }

  const groupEl = e.target.closest('.group');
  if (!groupEl) return;
  e.preventDefault();

  const draggedSiteId = dragSiteId;
  resetDrag();

  const target = findGroup(groupEl.dataset.groupId);
  if (!target || target.locked || isTodo(target)) return;
  const beforeEl = e.target.closest('.site');
  const beforeId = beforeEl?.dataset.siteId;

  let site;
  if (draggedSiteId) {
    if (draggedSiteId === beforeId) return;
    const found = findSite(draggedSiteId);
    if (!found || found.group.locked) return;
    found.group.sites.splice(found.index, 1);
    site = found.site;
  } else {
    // Link dragged from the address bar or another page
    const raw = e.dataTransfer.getData('text/uri-list').split('\n').find((l) => l && !l.startsWith('#'));
    const url = raw && normalizeUrl(raw);
    if (!url) return;
    site = { id: uid(), title: hostOf(url), url };
  }

  const insertAt = beforeId ? target.sites.findIndex((s) => s.id === beforeId) : -1;
  if (insertAt === -1) target.sites.push(site);
  else target.sites.splice(insertAt, 0, site);
  target.collapsed = false;
  commit();
});

// ---------- Resize cards by dragging ----------

groupsEl.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest('.resize-handle');
  if (!handle) return;
  e.preventDefault();

  const groupEl = handle.closest('.group');
  const group = findGroup(groupEl.dataset.groupId);
  const gap = parseFloat(getComputedStyle(groupsEl).columnGap) || 0;
  const styles = getComputedStyle(groupsEl);
  const innerWidth =
    groupsEl.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const colWidth = (innerWidth - gap * (COLUMNS - 1)) / COLUMNS;
  const left = groupEl.getBoundingClientRect().left;
  const startSpan = clampSpan(group.span ?? DEFAULT_SPAN);
  let span = startSpan;

  handle.setPointerCapture(e.pointerId);
  groupEl.classList.add('resizing');

  const onMove = (ev) => {
    const next = clampSpan((ev.clientX - left + gap) / (colWidth + gap));
    if (next !== span) {
      span = next;
      groupEl.style.setProperty('--span', span);
      handle.title = t('resizeTitleShort', { span, cols: COLUMNS });
    }
  };
  const onUp = () => {
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onUp);
    groupEl.classList.remove('resizing');
    if (span !== startSpan) {
      group.span = span;
      commit();
    }
  };
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onUp);
});

// ---------- Export / import ----------

$('#btn-menu').addEventListener('click', () => {
  const menu = $('#menu');
  const wasHidden = menu.hidden;
  closeMenus();
  menu.hidden = !wasHidden;
});

$('#menu').addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  closeMenus();
  if (action === 'edit-layout') {
    setEditMode(!editMode);
  } else if (action === 'settings') {
    renderSettings();
    $('#dlg-settings').showModal();
  } else if (action === 'export') {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const link = el('a', {
      href: URL.createObjectURL(blob),
      download: `favme-${new Date().toISOString().slice(0, 10)}.json`,
    });
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } else if (action === 'import') {
    $('#import-file').click();
  }
});

$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data?.groups)) throw new Error(t('importMissingGroups'));
    const groups = data.groups.map((g) => {
      const base = {
        id: uid(),
        name: String(g.name ?? t('importedGroupName')),
        span: clampSpan(g.span ?? DEFAULT_SPAN),
        collapsed: Boolean(g.collapsed),
        locked: Boolean(g.locked),
        ...(g.rowStart ? { rowStart: true } : {}),
      };
      if (g.type === 'todo') {
        const items = (Array.isArray(g.items) ? g.items : [])
          .map((i) => ({
            id: uid(),
            text: String(i?.text ?? '').trim(),
            done: Boolean(i?.done),
            ...(Number.isFinite(i?.createdAt) ? { createdAt: i.createdAt } : {}),
          }))
          .filter((i) => i.text);
        return { ...base, type: 'todo', items };
      }
      const sites = (g.sites ?? [])
        .map((s) => ({ id: uid(), url: normalizeUrl(String(s.url ?? '')), title: String(s.title ?? '') }))
        .filter((s) => s.url)
        .map((s) => ({ ...s, title: s.title || hostOf(s.url) }));
      return { ...base, sites };
    });
    if (confirm(t('confirmImport', { count: groups.length }))) {
      state = { groups };
      commit();
    }
  } catch (err) {
    alert(t('importError', { error: err.message }));
  }
});

// ---------- Clock ----------

function tick() {
  const now = new Date();
  const locale = currentLocale();
  $('#time').textContent = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  $('#date').textContent = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}
tick();
setInterval(tick, 10_000);

// ---------- Settings ----------

// lang: null = browser language, 'tr' or 'en'
let settings = { bg: null, lang: null };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function applyLanguage() {
  setLanguage(settings.lang);
  applyI18n();
  renderEmptyText();
  tick();
  render();
}

let appliedLang; // not applied yet

function applySettings() {
  if (settings.lang !== appliedLang) {
    appliedLang = settings.lang;
    applyLanguage();
  }
  const body = document.body;
  const bg = /^#[0-9a-f]{6}$/i.test(settings.bg ?? '') ? settings.bg : null;
  body.classList.toggle('custom-bg', Boolean(bg));
  if (bg) {
    // Keep text on the background (clock, date) readable on any color
    const dark = luminance(bg) < 0.25;
    body.style.setProperty('--page-bg', bg);
    body.style.setProperty('--page-text', dark ? '#f1f3f4' : '#1d1f23');
    body.style.setProperty('--page-muted', dark ? 'rgba(241,243,244,.7)' : 'rgba(29,31,35,.6)');
  } else {
    ['--page-bg', '--page-text', '--page-muted'].forEach((v) => body.style.removeProperty(v));
  }
  // Synchronous copy so the color does not flash on load
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

async function saveSettings() {
  applySettings();
  renderSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

function renderSettings() {
  $('#lang-select').replaceChildren(
    el('option', { value: '' }, t('languageAuto')),
    ...LANGUAGES.map((l) => el('option', { value: l.code }, l.name))
  );
  $('#lang-select').value = settings.lang ?? '';

  const current = settings.bg?.toLowerCase();
  $('#bg-swatches').replaceChildren(
    ...BG_PRESETS.map((color) => {
      const btn = el('button', {
        type: 'button',
        class: 'swatch' + (color === current ? ' active' : ''),
        title: color,
        dataset: { color },
      });
      btn.style.background = color;
      return btn;
    })
  );
  $('#bg-custom').value = settings.bg ?? getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}

$('#lang-select').addEventListener('change', (e) => {
  settings.lang = e.target.value || null;
  saveSettings();
});

$('#bg-swatches').addEventListener('click', (e) => {
  const color = e.target.dataset.color;
  if (color) {
    settings.bg = color;
    saveSettings();
  }
});
$('#bg-custom').addEventListener('input', (e) => {
  settings.bg = e.target.value;
  applySettings(); // live preview
});
$('#bg-custom').addEventListener('change', saveSettings);
$('#bg-reset').addEventListener('click', () => {
  settings.bg = null;
  saveSettings();
});

try {
  settings = { ...settings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
} catch {}
applySettings();

chrome.storage.onChanged.addListener((changes, area) => {
  const next = changes[SETTINGS_KEY]?.newValue;
  if (area === 'local' && next && JSON.stringify(next) !== JSON.stringify(settings)) {
    settings = next;
    applySettings();
  }
});

// ---------- Start ----------

chrome.storage.local.get(SETTINGS_KEY).then((stored) => {
  if (stored[SETTINGS_KEY]) {
    settings = { ...settings, ...stored[SETTINGS_KEY] };
    applySettings();
  }
});
load().then(render);
