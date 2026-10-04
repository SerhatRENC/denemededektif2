/* ============================================================
   SISLIDERE DAVASI — MODÜL 1: DURUM & DEĞİŞKEN YÖNETİMİ
   ============================================================ */

if (!document.getElementById('dialogHideStyle')) {
  const style = document.createElement('style');
  style.id = 'dialogHideStyle';
  style.textContent = `
    #stage.dialog-active .hotspot,
    #stage.dialog-active .hotspot-pulse-wrap,
    #stage.dialog-active .room-clickable-glow,
    #stage.dialog-active .room-clickable-hit {
      display: none !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

let CASE = null;
let CURRENT_DAY_DATA = null;
let currentRoom = null;
let inventory = [];
let currentDay = 1;
let calibMode = false;
let currentSleepAudio = null;
let dialogueActive = false;
let activeDialogCancel = null;   // açık diyalog varsa onu temizleyen fonksiyon
let currentModalId = null;       // kapanınca "modalClose" olayı tetikleyecek modal
// oyun.html'de intro katmanı her zaman var; introKapandi() bunu false yapar.
// (Eskiden DOM'a bakıyordu ama script <head>'de çalıştığı için hep false çıkıyordu.)
let introAcik = true;
let renderToken = 0;
let subtitleTimer = null;

const preloadedImages = new Map();

/* ---------- BAYRAK YÖNETİMİ (tüm ilerleme burada) ---------- */
const gameState = {
  flags: {},
  getFlag(flag) { return this.flags[flag] || false; },
  setFlag(flag, value = true) {
    this.flags[flag] = value;
    localStorage.setItem('sd_flags_' + (CASE ? CASE.caseLabel : 'default'), JSON.stringify(this.flags));
  },
  loadFlags() {
    const saved = localStorage.getItem('sd_flags_' + (CASE ? CASE.caseLabel : 'default'));
    this.flags = saved ? JSON.parse(saved) : {};
  }
};

/* Gün içi ilerleme durumu (eski day2State'in genel hali). Değerleri gün JSON'u belirler. */
function getDayState() { return gameState.getFlag('day_state') || ''; }
function setDayState(s) { gameState.setFlag('day_state', s); }

function lsKey(n) { return 'sd_' + n + '_' + (CASE ? CASE.caseLabel : 'default'); }
function lsGet(n) { try { return localStorage.getItem(lsKey(n)); } catch (e) { return null; } }
function lsSet(n, v) { try { localStorage.setItem(lsKey(n), v); } catch (e) { console.warn('Kayıt yazılamadı', e); } }

/* Eski kayıtlar (day2State / polis global'leri) → yeni bayrak sistemine, tek seferlik */
function migrateLegacyState() {
  if (gameState.getFlag('_migrated_v2')) return;
  const eski = lsGet('day2_state');
  if (eski) {
    setDayState(eski);
    const kapiAcildi = ['CANTA_UNLOCKED', 'GO_OFIS', 'DAY2_FREE'].includes(eski) ||
      (eski === 'HAN_UNLOCKED' && !inventory.includes('anahtar'));
    if (kapiAcildi) gameState.setFlag('gazeteci_oda_acik', true);
  }
  if (lsGet('day2_polis_goruldu') === 'true') gameState.setFlag('day2_polis_goruldu', true);
  if (lsGet('day3_polis_goruldu') === 'true') gameState.setFlag('day3_polis_goruldu', true);
  gameState.setFlag('_migrated_v2', true);
}

function saveInventory() {
  try { localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory)); }
  catch (e) { console.warn('Envanter kaydedilemedi', e); }
}

let lockDigits = [0, 0, 0, 0, 0];
let gazeteciDosyaPagesDefault = [
  'assets/arayuz/gazeteci_dosya_1.webp',
  'assets/arayuz/gazeteci_dosya_2.webp'
];

/* ---------- RESİM YÜKLEME SÖZÜ (PROMISE) ---------- */
function loadImageAsync(url) {
  if (!url) return Promise.resolve();
  if (preloadedImages.has(url)) return Promise.resolve(preloadedImages.get(url));

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.set(url, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function preloadImage(url) {
  if (!url || preloadedImages.has(url)) return;
  preloadedImages.set(url, true);
  const img = new Image();
  img.src = url;
}

function setUIElementsVisible(visible) {
  const invEl = document.getElementById('inventory') || document.querySelector('.inventory-bar');
  const cornerEl = document.querySelector('.corner-icons');
  if (invEl) invEl.style.display = visible ? '' : 'none';
  if (cornerEl) cornerEl.style.display = visible ? '' : 'none';
}

function updateDayBadge() {
  const el = document.getElementById('dayBadge');
  if (!el) return;
  if (el.tagName === 'IMG') {
    el.src = 'assets/arayuz/takvim_gun' + currentDay + '.webp';
    el.alt = 'Gün ' + currentDay;
  } else {
    el.textContent = `GÜN ${currentDay}`;
  }
}
