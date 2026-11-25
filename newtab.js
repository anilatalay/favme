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

// ---------- Yardımcılar ----------

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

function findSite(siteId) {
  for (const group of state.groups) {
    const index = group.sites.findIndex((s) => s.id === siteId);
    if (index !== -1) return { group, index, site: group.sites[index] };
  }
  return null;
}

// ---------- Depolama ----------

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

// Başka bir açık sekmede yapılan değişiklikleri yansıt
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
  groupsEl.replaceChildren();

  for (const group of state.groups) {
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
}

function renderEmptyText() {
  const [before, after = ''] = t('empty').split('{button}');
  $('#empty').replaceChildren(before, el('strong', {}, t('newGroup')), after);
}

function renderGroup(group, sites, searching) {
  const collapsed = group.collapsed && !searching;

  const header = el(
    'div',
    { class: 'group-header' },
    el(
      'h2',
      { class: 'group-name', title: t('toggleGroup'), dataset: { action: 'toggle-group' } },
      group.name,
      el('span', { class: 'group-count' }, String(group.sites.length))
    ),
    group.locked
      ? el('button', { class: 'icon-btn lock-btn', title: t('lockedClickToUnlock'), dataset: { action: 'toggle-lock' } }, '🔒')
      : el('button', { class: 'icon-btn', title: t('addSite'), dataset: { action: 'add-site' } }, '+'),
    el('button', { class: 'icon-btn', title: t('groupOptions'), dataset: { action: 'group-menu' } }, '⋯')
  );

  const list = el('div', { class: 'sites' });
  if (sites.length === 0) {
    list.append(
      el('div', { class: 'sites-empty' },
        group.locked ? t('lockedEmpty') : t('groupEmpty'))
    );
  }
  for (const site of sites) list.append(renderSite(site, group.locked));

  const span = clampSpan(group.span ?? DEFAULT_SPAN);
  const section = el(
    'section',
    { class: 'group' + (collapsed ? ' collapsed' : '') + (group.locked ? ' locked' : ''), dataset: { groupId: group.id } },
    header,
    list,
    el('div', { class: 'resize-handle', title: t('resizeTitle', { span, cols: COLUMNS }) })
  );
  section.style.setProperty('--span', span);
  return section;
}

function renderSite(site, locked) {
  const img = el('img', { src: faviconUrl(site.url), alt: '', loading: 'lazy' });
  const link = el(
    'a',
    { class: 'site', href: site.url, title: site.url, dataset: { siteId: site.id } },
    el('div', { class: 'site-icon' }, img),
    el('div', { class: 'site-title' }, site.title),
    locked
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

// ---------- Diyaloglar ----------

// "Vazgeç" (Cancel) butonu gönder butonu değil; böylece Enter her zaman "Kaydet"e basar
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

  openDialog(dialog, (data) => {
    const name = data.get('name').trim();
    if (!name) return;
    if (group) group.name = name;
    else state.groups.push({ id: uid(), name, span: DEFAULT_SPAN, collapsed: false, sites: [] });
    commit();
  });
}

function siteDialog({ groupId, siteId } = {}) {
  const dialog = $('#dlg-site');
  const found = siteId ? findSite(siteId) : null;
  const form = $('form', dialog);
  if (found?.group.locked) return;

  const editable = state.groups.filter((g) => !g.locked);
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

// ---------- Grup menüsü ----------

let openMenu = null;

function closeMenus() {
  openMenu?.remove();
  openMenu = null;
  $('#menu').hidden = true;
}

function showGroupMenu(button, group) {
  closeMenus();
  const index = state.groups.indexOf(group);
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
    widths,
    item(group.locked ? t('unlock') : t('lock'), 'toggle-lock'),
    group.locked ? null : item(t('rename'), 'rename'),
    index > 0 ? item(t('moveLeft'), 'left') : null,
    index < state.groups.length - 1 ? item(t('moveRight'), 'right') : null,
    group.locked ? null : item(t('deleteGroup'), 'delete', 'danger')
  );

  menu.addEventListener('click', (e) => {
    const action = e.target.dataset.menuAction;
    if (!action) return;
    closeMenus();
    if (action === 'span') {
      group.span = clampSpan(e.target.dataset.span);
      commit();
    } else if (action === 'toggle-lock') {
      group.locked = !group.locked;
      commit();
    } else if (group.locked) {
      return; // kilitli kartta düzenleme yok
    } else if (action === 'rename') groupDialog(group);
    else if (action === 'left' || action === 'right') {
      const to = index + (action === 'left' ? -1 : 1);
      state.groups.splice(index, 1);
      state.groups.splice(to, 0, group);
      commit();
    } else if (action === 'delete') {
      const msg = group.sites.length
        ? t('confirmDeleteGroupWithSites', { name: group.name, count: group.sites.length })
        : t('confirmDeleteGroup', { name: group.name });
      if (confirm(msg)) {
        state.groups.splice(index, 1);
        commit();
      }
    }
  });

  button.parentElement.append(menu);
  openMenu = menu;
}

// ---------- Olaylar ----------

groupsEl.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const groupEl = target.closest('.group');
  const group = groupEl && findGroup(groupEl.dataset.groupId);
  const siteEl = target.closest('.site');
  const action = target.dataset.action;

  if (siteEl) e.preventDefault(); // sitenin içindeki butonlar linki açmasın
  e.stopPropagation();

  switch (action) {
    case 'toggle-lock':
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
      siteDialog({ siteId: siteEl.dataset.siteId });
      break;
    case 'delete-site': {
      const found = findSite(siteEl.dataset.siteId);
      if (found && !found.group.locked && confirm(t('confirmDeleteSite', { title: found.site.title }))) {
        found.group.sites.splice(found.index, 1);
        commit();
      }
      break;
    }
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu') && !e.target.closest('#btn-menu')) closeMenus();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenus();
});

$('#btn-new-group').addEventListener('click', () => groupDialog());

// ---------- Arama ----------

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

// ---------- Sürükle & bırak ----------

let dragSiteId = null;

groupsEl.addEventListener('dragstart', (e) => {
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

groupsEl.addEventListener('dragend', () => {
  dragSiteId = null;
  document.querySelectorAll('.dragging, .drop-target').forEach((n) =>
    n.classList.remove('dragging', 'drop-target')
  );
});

groupsEl.addEventListener('dragover', (e) => {
  const groupEl = e.target.closest('.group');
  if (!groupEl || groupEl.classList.contains('locked')) return;
  // İç sürükleme veya dışarıdan link bırakma
  if (!dragSiteId && !e.dataTransfer.types.includes('text/uri-list')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = dragSiteId ? 'move' : 'copy';
  document.querySelectorAll('.drop-target').forEach((n) => n !== groupEl && n.classList.remove('drop-target'));
  groupEl.classList.add('drop-target');
});

groupsEl.addEventListener('drop', (e) => {
  const groupEl = e.target.closest('.group');
  if (!groupEl) return;
  e.preventDefault();
  groupEl.classList.remove('drop-target');

  const target = findGroup(groupEl.dataset.groupId);
  if (!target || target.locked) return;
  const beforeEl = e.target.closest('.site');
  const beforeId = beforeEl?.dataset.siteId;

  let site;
  if (dragSiteId) {
    if (dragSiteId === beforeId) return;
    const found = findSite(dragSiteId);
    if (!found || found.group.locked) return;
    found.group.sites.splice(found.index, 1);
    site = found.site;
  } else {
    // Adres çubuğundan / başka sayfadan sürüklenen link
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

// ---------- Kart genişliğini sürükleyerek değiştirme ----------

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

// ---------- Dışa / içe aktarma ----------

$('#btn-menu').addEventListener('click', () => {
  const menu = $('#menu');
  const wasHidden = menu.hidden;
  closeMenus();
  menu.hidden = !wasHidden;
});

$('#menu').addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  closeMenus();
  if (action === 'settings') {
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
    const groups = data.groups.map((g) => ({
      id: uid(),
      name: String(g.name ?? t('importedGroupName')),
      span: clampSpan(g.span ?? DEFAULT_SPAN),
      collapsed: Boolean(g.collapsed),
      locked: Boolean(g.locked),
      sites: (g.sites ?? [])
        .map((s) => ({ id: uid(), url: normalizeUrl(String(s.url ?? '')), title: String(s.title ?? '') }))
        .filter((s) => s.url)
        .map((s) => ({ ...s, title: s.title || hostOf(s.url) })),
    }));
    if (confirm(t('confirmImport', { count: groups.length }))) {
      state = { groups };
      commit();
    }
  } catch (err) {
    alert(t('importError', { error: err.message }));
  }
});

// ---------- Saat ----------

function tick() {
  const now = new Date();
  const locale = currentLocale();
  $('#time').textContent = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  $('#date').textContent = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}
tick();
setInterval(tick, 10_000);

// ---------- Ayarlar ----------

// lang: null = tarayıcı dili, 'tr' veya 'en'
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

let appliedLang; // henüz uygulanmadı

function applySettings() {
  if (settings.lang !== appliedLang) {
    appliedLang = settings.lang;
    applyLanguage();
  }
  const body = document.body;
  const bg = /^#[0-9a-f]{6}$/i.test(settings.bg ?? '') ? settings.bg : null;
  body.classList.toggle('custom-bg', Boolean(bg));
  if (bg) {
    // Arka plandaki yazılar (saat, tarih) her renkte okunur kalsın
    const dark = luminance(bg) < 0.25;
    body.style.setProperty('--page-bg', bg);
    body.style.setProperty('--page-text', dark ? '#f1f3f4' : '#1d1f23');
    body.style.setProperty('--page-muted', dark ? 'rgba(241,243,244,.7)' : 'rgba(29,31,35,.6)');
  } else {
    ['--page-bg', '--page-text', '--page-muted'].forEach((v) => body.style.removeProperty(v));
  }
  // Açılışta renk "yanıp sönmesin" diye senkron bir kopya
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
  applySettings(); // canlı önizleme
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

// ---------- Başlat ----------

chrome.storage.local.get(SETTINGS_KEY).then((stored) => {
  if (stored[SETTINGS_KEY]) {
    settings = { ...settings, ...stored[SETTINGS_KEY] };
    applySettings();
  }
});
load().then(render);
