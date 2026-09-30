/* ============================================================
   ODA MOTORU — Modüler & Dinamik Mimik (Emotion) Destekli Motor
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

let GAME_CONFIG = null;
let CURRENT_DAY_DATA = null;
let currentRoom = null;
let inventory = [];
let currentDay = 1;
let calibMode = false;
let dialogueActive = false;

// --- DİNAMİK BAYRAK (FLAG) SİSTEMİ ---
const gameState = {
  flags: {},
  getFlag(flag) { return this.flags[flag] || false; },
  setFlag(flag, value = true) {
    this.flags[flag] = value;
    localStorage.setItem('sd_flags_' + (GAME_CONFIG ? GAME_CONFIG.caseLabel : 'default'), JSON.stringify(this.flags));
  },
  loadFlags() {
    const saved = localStorage.getItem('sd_flags_' + (GAME_CONFIG ? GAME_CONFIG.caseLabel : 'default'));
    this.flags = saved ? JSON.parse(saved) : {};
  }
};

const journalistRooms = [
  'gazeteci_oda', 'gazeteci_oda_cop', 'gazeteci_oda_canta', 
  'gazeteci_oda_sifre_giris', 'gazeteci_oda_canta_ici', 'gazeteci_oda_masa', 'gazeteci_oda_tablo'
];

let lockDigits = [0, 0, 0, 0, 0];

/* ---------- BAŞLATMA VE YÜKLEME ---------- */
async function initGame() {
  try {
    const configRes = await fetch('data/game_config.json?v=' + Date.now());
    GAME_CONFIG = await configRes.json();
    
    gameState.loadFlags();

    const titleEl = document.getElementById('caseTitle');
    if (titleEl) titleEl.textContent = GAME_CONFIG.title || '';

    currentRoom = GAME_CONFIG.startRoom;

    const savedDay = localStorage.getItem('sd_day_' + GAME_CONFIG.caseLabel);
    const savedInv = localStorage.getItem('sd_inv_' + GAME_CONFIG.caseLabel);
    currentDay = savedDay ? parseInt(savedDay, 10) : (GAME_CONFIG.startDay || 1);
    inventory = savedInv ? JSON.parse(savedInv) : [];

    await loadDayData(currentDay);

    updateDayBadge();
    renderInventory();
    renderRoom();
  } catch (err) {
    console.error("OYUN YÜKLEME HATASI:", err);
  }
}

async function loadDayData(dayNumber) {
  try {
    const dayRes = await fetch(`data/days/day${dayNumber}.json?v=` + Date.now());
    if (dayRes.ok) {
      CURRENT_DAY_DATA = await dayRes.json();
      if (CURRENT_DAY_DATA.initialFlags) {
        Object.keys(CURRENT_DAY_DATA.initialFlags).forEach(f => {
          if (gameState.getFlag(f) === false) {
            gameState.setFlag(f, CURRENT_DAY_DATA.initialFlags[f]);
          }
        });
      }
    } else {
      CURRENT_DAY_DATA = { dialogs: {}, roomOverrides: {} };
    }
  } catch (e) {
    console.warn(`${dayNumber}. Gün verisi yüklenemedi.`);
    CURRENT_DAY_DATA = { dialogs: {}, roomOverrides: {} };
  }
}

function setUIElementsVisible(visible) {
  const invEl = document.getElementById('inventory') || document.querySelector('.inventory-bar');
  const cornerEl = document.querySelector('.corner-icons');
  if (invEl) invEl.style.display = visible ? '' : 'none';
  if (cornerEl) cornerEl.style.display = visible ? '' : 'none';
}

/* ---------- DINAMIK MIMIK (EMOTION) RESIM BULUCU ---------- */
function getEmotionImagePath(basePath, emotion) {
  if (!emotion || emotion === 'normal') return basePath;
  const lastDot = basePath.lastIndexOf('.');
  if (lastDot === -1) return basePath;
  const base = basePath.substring(0, lastDot);
  const ext = basePath.substring(lastDot);
  return `${base}_${emotion}${ext}`;
}

/* ---------- ODA ÇİZİMİ ---------- */
function renderRoom() {
  if (!GAME_CONFIG || !GAME_CONFIG.rooms || !GAME_CONFIG.rooms[currentRoom]) return;

  renderInventory();
  const room = GAME_CONFIG.rooms[currentRoom];
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;

  stage.classList.add('fading');
  
  setTimeout(() => {
    stage.innerHTML = `<div class="room-label">${room.label}</div>`;

    const isClosedOverride = CURRENT_DAY_DATA?.roomOverrides?.[currentRoom]?.closed;
    const kapali = isClosedOverride || (room.closedOnDays && room.closedOnDays.includes(currentDay));
    const bgImage = isClosedOverride ? CURRENT_DAY_DATA.roomOverrides[currentRoom].closedImage : (kapali ? room.closedImage : room.background);

    stage.style.backgroundImage = `url(${bgImage})`;

    if (kapali) {
      const geri = document.createElement('div');
      geri.className = 'hotspot-pulse-wrap ikon-bekliyor';
      geri.style.left = '9%'; geri.style.top = '57.5%'; geri.style.width = '6%';
      geri.innerHTML = `<img src="assets/arayuz/geri.webp" alt="Geri dön">`;
      geri.onclick = () => { currentRoom = 'merkez'; renderRoom(); };
      stage.appendChild(geri);
      stage.classList.remove('fading');
      return;
    }

    renderCharacter();

    if (room.hotspots) {
      room.hotspots.forEach(h => {
        if (h.requires && !inventory.includes(h.requires)) return;
        if (h.activeDays && !h.activeDays.includes(currentDay)) return;
        if (h.hideIfCollected && inventory.includes(h.hideIfCollected)) return;
        if (h.requiresFlag && !gameState.getFlag(h.requiresFlag)) return;

        const el = document.createElement('div');
        el.className = 'hotspot' + (h.icon ? ' hotspot-icon' : '');
        el.style.position = 'absolute';
        el.style.left = h.x; el.style.top = h.y; 
        el.style.width = h.w || '10%'; el.style.height = h.h || '10%';
        el.style.zIndex = '10'; el.style.cursor = 'pointer';

        const iconHtml = h.icon ? `<img src="${h.icon}" class="hotspot-icon-img" alt="">` : '';
        el.innerHTML = `${iconHtml}<div class="hint">${h.hint || ''}</div>`;
        el.onclick = (e) => { 
          if (e) e.stopPropagation();
          if (!calibMode && !dialogueActive) handleHotspot(h); 
        };
        stage.appendChild(el);
      });
    }

    if (currentRoom === 'gazeteci_oda_sifre_giris') renderSifreMinigame(stage);
    stage.classList.remove('fading');
  }, 180);
}

/* ---------- DİYALOG VE MİMİK YÖNETİMİ ---------- */
function startOzelDialog(dialogList, baseCharImgPath, onCompleteCallback) {
  dialogueActive = true;
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  stage.classList.add('dialog-active');
  setUIElementsVisible(false);

  let charImg = document.getElementById('tempDay2Char');
  if (!charImg) {
    charImg = document.createElement('img');
    charImg.id = 'tempDay2Char';
    charImg.className = 'scene-character talking';
    stage.appendChild(charImg);
  }

  let index = 0;
  function sonrakiSatir(e) {
    if (e) e.stopPropagation();
    if (index < dialogList.length) {
      const item = dialogList[index];
      
      // Mimik görselini ayarla, dosya yoksa ana görsele dön
      const emotionImgPath = getEmotionImagePath(baseCharImgPath, item.emotion);
      charImg.src = emotionImgPath;
      charImg.onerror = () => { charImg.src = baseCharImgPath; };

      let sub = document.getElementById('sceneSubtitle');
      if (!sub) {
        sub = document.createElement('div');
        sub.id = 'sceneSubtitle';
        sub.className = 'scene-subtitle';
        stage.appendChild(sub);
      }
      sub.innerHTML = `<div class="scene-subtitle-name">${item.speaker}</div><div class="scene-subtitle-text">${item.text}</div>`;
      index++;
    } else {
      charImg.remove();
      document.getElementById('sceneSubtitle')?.remove();
      stage.classList.remove('dialog-active');
      setUIElementsVisible(true);
      stage.removeEventListener('click', sonrakiSatir);
      dialogueActive = false;
      if (onCompleteCallback) onCompleteCallback();
    }
  }

  sonrakiSatir();
  setTimeout(() => stage.addEventListener('click', sonrakiSatir), 100);
}

function handleHotspot(h) {
  if (dialogueActive) return;

  if (h.type === 'navigate') {
    if (journalistRooms.includes(currentRoom) && !journalistRooms.includes(h.target)) {
      if (!gameState.getFlag('canta_unlocked')) {
        showCustomSubtitle("Dedektif: Çantayı incelemeden ve odadaki araştırmamı bitirmeden buradan çıkamam.", true);
        return;
      }
    }
    currentRoom = h.target;
    renderRoom();
    return;
  }

  if (h.type === 'dialogue_bakirci1' && CURRENT_DAY_DATA.dialogs.bakirci1) {
    startOzelDialog(CURRENT_DAY_DATA.dialogs.bakirci1, 'assets/karakterler/bakirci1.webp');
    return;
  }
  if (h.type === 'dialogue_bakirci2' && CURRENT_DAY_DATA.dialogs.bakirci2) {
    startOzelDialog(CURRENT_DAY_DATA.dialogs.bakirci2, 'assets/karakterler/bakirci2.webp');
    return;
  }

  if (h.type === 'notebook') { openNotebook(); return; }
  if (h.type === 'sleep') { confirmSleep(); return; }
}

function renderCharacter() {
  dialogueActive = false;
  setUIElementsVisible(true);

  let ch = GAME_CONFIG.characters && GAME_CONFIG.characters[currentRoom];
  if (!ch) return;

  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;

  renderSceneCharacter(ch, stage);
}

function renderSceneCharacter(ch, stage) {
  const el = document.createElement('img');
  el.id = 'sceneCharacter';
  el.className = 'scene-character';
  el.src = ch.image;
  el.style.bottom = ch.yOffset || '0%';
  el.onclick = (e) => { 
    if (e) e.stopPropagation();
    toggleCharacterLine(ch); 
  };
  stage.appendChild(el);
}

function toggleCharacterLine(ch) {
  const dayDialog = CURRENT_DAY_DATA?.dialogs?.[currentRoom] || CURRENT_DAY_DATA?.dialogs?.[ch.name.toLowerCase()];

  if (dayDialog) {
    document.getElementById('sceneCharacter')?.remove();
    startOzelDialog(dayDialog, ch.image, () => {
      if (currentRoom === 'muhtar') gameState.setFlag('muhtar_konusuldu', true);
      renderRoom();
    });
    return;
  }

  startOzelDialog(ch.dialog || [{ speaker: ch.name, text: ch.text || '', emotion: "normal" }], ch.image, () => renderRoom());
}

function updateDayBadge() {
  const el = document.getElementById('dayBadge');
  if (el) el.textContent = `GÜN ${currentDay}`;
}

function renderInventory() {
  const inv = document.getElementById('inventory');
  if (!inv) return;
  if (!inventory || inventory.length === 0) { 
    inv.innerHTML = '<span class="inv-empty">envanter boş</span>'; 
    return; 
  }
  inv.innerHTML = '';
  inventory.forEach(id => {
    const el = document.createElement('div');
    el.className = 'inv-item';
    el.textContent = '📄';
    inv.appendChild(el);
  });
}

function showCustomSubtitle(text, clickToDismiss = false) {
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  let sub = document.getElementById('sceneSubtitle');
  if (sub) sub.remove();
  sub = document.createElement('div');
  sub.id = 'sceneSubtitle'; sub.className = 'scene-subtitle';
  sub.innerHTML = `<div class="scene-subtitle-text">${text}</div>`;
  stage.appendChild(sub);
  sub.onclick = () => sub.remove();
}

function confirmSleep() {
  showModal(`<h3>Uyumadan Önce</h3><p>Uyumak istediğine emin misin?</p><button onclick="closeModal(); sleep();">Evet, Uyu</button><button class="ghost" onclick="closeModal()">Vazgeç</button>`);
}

async function sleep() {
  currentDay++;
  localStorage.setItem('sd_day_' + GAME_CONFIG.caseLabel, currentDay);
  await loadDayData(currentDay);
  updateDayBadge();
  renderRoom();
}

function showModal(html) {
  const body = document.getElementById('modalBody');
  if (body) body.innerHTML = html;
  const bg = document.getElementById('modalBg');
  if (bg) bg.classList.add('active');
}

function closeModal() {
  const bg = document.getElementById('modalBg');
  if (bg) bg.classList.remove('active');
}

window.onload = () => { initGame(); };