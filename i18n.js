'use strict';

// Interface strings. To add a language, add a block with the same keys to this object
// and list it in LANGUAGES.
const MESSAGES = {
  tr: {
    tabTitle: 'Yeni Sekme',
    searchPlaceholder: 'Site ve yapılacaklarda ara…',
    newGroup: '+ Yeni Grup',
    more: 'Diğer',
    editLayout: '✥ Kartları düzenle',
    doneEditing: '✓ Bitti',
    settings: '⚙ Ayarlar',
    exportJson: 'Dışa aktar (JSON)',
    importJson: 'İçe aktar (JSON)',
    empty: 'Henüz grup yok. {button} ile başlayın.',

    groupDialogNew: 'Yeni Grup',
    groupDialogRename: 'Grubu Yeniden Adlandır',
    groupName: 'Grup adı',
    cancel: 'Vazgeç',
    save: 'Kaydet',

    siteDialogAdd: 'Site Ekle',
    siteDialogEdit: 'Siteyi Düzenle',
    siteUrl: 'Adres (URL)',
    siteUrlPlaceholder: 'https://ornek.com',
    siteTitle: 'Başlık',
    siteTitlePlaceholder: 'Boş bırakılırsa alan adı kullanılır',
    siteGroup: 'Grup',

    settingsTitle: 'Ayarlar',
    language: 'Dil',
    languageAuto: 'Otomatik (tarayıcı dili)',
    bgColor: 'Arka plan rengi',
    customColor: 'Özel renk…',
    customColorTitle: 'Özel renk seç',
    resetDefault: 'Varsayılan',
    close: 'Kapat',

    toggleGroup: 'Daralt / genişlet',
    lockedClickToUnlock: 'Kilitli — açmak için tıklayın',
    locked: 'Kilitli',
    addSite: 'Site ekle',
    groupOptions: 'Grup seçenekleri',
    lockedEmpty: 'Bu kart kilitli',
    groupEmpty: 'Site eklemek için + tuşuna basın veya buraya sürükleyin',
    resizeTitle: 'Genişlik: {span}/{cols} — sürükleyerek değiştirin',
    resizeTitleShort: 'Genişlik: {span}/{cols}',
    edit: 'Düzenle',
    delete: 'Sil',

    widthLabel: 'Genişlik ({cols} pay)',
    lock: '🔒 Kartı kilitle',
    unlock: '🔓 Kilidi aç',
    rename: 'Yeniden adlandır',
    deleteGroup: 'Grubu sil',

    allLocked: 'Tüm kartlar kilitli. Site eklemek için önce bir kartın kilidini açın.',
    invalidUrl: 'Geçersiz adres.',
    confirmDeleteGroup: '"{name}" grubu silinsin mi?',
    confirmDeleteGroupWithSites: '"{name}" grubu ve içindeki {count} site silinsin mi?',
    confirmDeleteSite: '"{title}" silinsin mi?',
    confirmImport: '{count} grup içe aktarılacak ve mevcut veriler değiştirilecek. Devam edilsin mi?',
    importMissingGroups: 'groups alanı yok',
    importError: 'Dosya okunamadı: {error}',

    defaultGroupName: 'Favoriler',
    importedGroupName: 'Grup',

    groupType: 'Tür',
    groupTypeSites: 'Site grubu',
    groupTypeTodo: 'Yapılacaklar listesi',
    todoPlaceholder: 'Yeni madde ekle…',
    todoEmpty: 'Henüz madde yok',
    todoRemaining: '{count} madde kaldı',
    clearDone: 'Tamamlananları temizle',
    confirmDeleteTodoWithItems: '"{name}" listesi ve içindeki {count} madde silinsin mi?',
  },

  en: {
    tabTitle: 'New Tab',
    searchPlaceholder: 'Search sites and to-dos…',
    newGroup: '+ New Group',
    more: 'More',
    editLayout: '✥ Edit cards',
    doneEditing: '✓ Done',
    settings: '⚙ Settings',
    exportJson: 'Export (JSON)',
    importJson: 'Import (JSON)',
    empty: 'No groups yet. Start with {button}.',

    groupDialogNew: 'New Group',
    groupDialogRename: 'Rename Group',
    groupName: 'Group name',
    cancel: 'Cancel',
    save: 'Save',

    siteDialogAdd: 'Add Site',
    siteDialogEdit: 'Edit Site',
    siteUrl: 'Address (URL)',
    siteUrlPlaceholder: 'https://example.com',
    siteTitle: 'Title',
    siteTitlePlaceholder: 'Defaults to the domain name if left empty',
    siteGroup: 'Group',

    settingsTitle: 'Settings',
    language: 'Language',
    languageAuto: 'Automatic (browser language)',
    bgColor: 'Background color',
    customColor: 'Custom color…',
    customColorTitle: 'Pick a custom color',
    resetDefault: 'Default',
    close: 'Close',

    toggleGroup: 'Collapse / expand',
    lockedClickToUnlock: 'Locked — click to unlock',
    locked: 'Locked',
    addSite: 'Add site',
    groupOptions: 'Group options',
    lockedEmpty: 'This card is locked',
    groupEmpty: 'Press + or drag a link here to add a site',
    resizeTitle: 'Width: {span}/{cols} — drag to resize',
    resizeTitleShort: 'Width: {span}/{cols}',
    edit: 'Edit',
    delete: 'Delete',

    widthLabel: 'Width ({cols} columns)',
    lock: '🔒 Lock card',
    unlock: '🔓 Unlock',
    rename: 'Rename',
    deleteGroup: 'Delete group',

    allLocked: 'All cards are locked. Unlock a card first to add a site.',
    invalidUrl: 'Invalid address.',
    confirmDeleteGroup: 'Delete the group "{name}"?',
    confirmDeleteGroupWithSites: 'Delete the group "{name}" and its {count} site(s)?',
    confirmDeleteSite: 'Delete "{title}"?',
    confirmImport: '{count} group(s) will be imported and your current data will be replaced. Continue?',
    importMissingGroups: 'missing "groups" field',
    importError: 'Could not read the file: {error}',

    defaultGroupName: 'Favorites',
    importedGroupName: 'Group',

    groupType: 'Type',
    groupTypeSites: 'Site group',
    groupTypeTodo: 'To-do list',
    todoPlaceholder: 'Add an item…',
    todoEmpty: 'No items yet',
    todoRemaining: '{count} item(s) left',
    clearDone: 'Clear completed',
    confirmDeleteTodoWithItems: 'Delete the list "{name}" and its {count} item(s)?',
  },
};

const LANGUAGES = [
  { code: 'tr', name: 'Türkçe', locale: 'tr-TR' },
  { code: 'en', name: 'English', locale: 'en-US' },
];

let currentLang = detectBrowserLang();

function detectBrowserLang() {
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return MESSAGES[browser] ? browser : 'en';
}

/** Applies the language setting. `null` or an unknown code falls back to the browser language. */
function setLanguage(code) {
  currentLang = MESSAGES[code] ? code : detectBrowserLang();
}

function currentLocale() {
  return LANGUAGES.find((l) => l.code === currentLang).locale;
}

/** Returns the string for `key`, filling `{name}` placeholders from `params`. */
function t(key, params = {}) {
  const text = MESSAGES[currentLang][key] ?? MESSAGES.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

/** Updates the text of elements with data-i18n* attributes. */
function applyI18n(root = document) {
  document.documentElement.lang = currentLang;
  document.title = t('tabTitle');
  root.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  root.querySelectorAll('[data-i18n-title]').forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });
}
