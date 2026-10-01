/* ============================================================
   SISLIDERE DAVASI — TAM ENTEGRE OYUN MOTORU
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
let dialogIndex = 0;
let characterAudio = null;

const preloadedImages = new Map();

const journalistRooms = [
  'gazeteci_oda', 'gazeteci_oda_cop', 'gazeteci_oda_canta', 
  'gazeteci_oda_sifre_giris', 'gazeteci_oda_canta_ici', 'gazeteci_oda_masa', 'gazeteci_oda_tablo'
];

// Bayrak Yönetimi
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

let day2State = localStorage.getItem('sd_day2_state') || 'GO_MUHTAR';
let day2PolisGoruldu = localStorage.getItem('sd_day2_polis_goruldu') === 'true';
let day3PolisGoruldu = localStorage.getItem('sd_day3_polis_goruldu') === 'true';

function setDay2State(newState) {
  day2State = newState;
  localStorage.setItem('sd_day2_state', newState);
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
  const img = new Image();
  img.src = url;
  preloadedImages.set(url, img);
}

/* ---------- ARKA PLAN PRELOAD (GECİKTİRMELİ) ---------- */
function preloadDayAssets() {
  if (!CASE) return;

  const emotions = ['normal', 'ciddi', 'telasli', 'supheli', 'dusuneli', 'sinirli', 'uzgun', 'korkmus', 'cekingan', 'gergin'];
  Object.values(CASE.characters || {}).forEach(ch => {
    if (ch.image) {
      preloadImage(ch.image);
      const lastDot = ch.image.lastIndexOf('.');
      if (lastDot !== -1) {
        const basePath = ch.image.substring(0, lastDot);
        const ext = ch.image.substring(lastDot);
        emotions.forEach(em => preloadImage(`${basePath}_${em}${ext}`));
      }
    }
    if (ch.clickableImage) preloadImage(ch.clickableImage);
  });

  Object.values(CASE.rooms || {}).forEach(room => {
    if (room.background) preloadImage(room.background);
    if (room.closedImage) preloadImage(room.closedImage);
    if (room.hotspots) {
      room.hotspots.forEach(h => {
        if (h.overlayImage) preloadImage(h.overlayImage);
        if (h.icon) preloadImage(h.icon);
      });
    }
  });

  if (CASE.statements) {
    CASE.statements.forEach(s => { if (s.cardImage) preloadImage(s.cardImage); });
  }
  if (CASE.map && CASE.map.image) preloadImage(CASE.map.image);
  if (CASE.notebook && CASE.notebook.image) preloadImage(CASE.notebook.image);
}

/* ---------- BAŞLATMA VE YÜKLEME ---------- */
async function initGame() {
  try {
    const configRes = await fetch('data/game_config.json?v=' + Date.now());
    CASE = await configRes.json();
    window.CASE = CASE;

    gameState.loadFlags();

    const savedDay = localStorage.getItem('sd_day_' + CASE.caseLabel);
    const savedInv = localStorage.getItem('sd_inv_' + CASE.caseLabel);
    currentDay = savedDay ? parseInt(savedDay, 10) : (CASE.startDay || 1);
    inventory = savedInv ? JSON.parse(savedInv) : [];

    currentRoom = CASE.startRoom || 'ofis';

    await loadDayData(currentDay);

    updateDayBadge();
    renderInventory();

    const initialRoomObj = CASE.rooms[currentRoom];
    if (initialRoomObj && initialRoomObj.background) {
      await loadImageAsync(initialRoomObj.background);
    }

    renderRoom();

    setTimeout(() => {
      preloadDayAssets();
    }, 1500);

  } catch (err) {
    console.error("OYUN YÜKLEME HATASI:", err);
  }
}

async function loadDayData(dayNumber) {
  try {
    const dayRes = await fetch(`data/days/day${dayNumber}.json?v=` + Date.now());
    if (dayRes.ok) {
      CURRENT_DAY_DATA = await dayRes.json();
    } else {
      CURRENT_DAY_DATA = { dialogs: {}, roomOverrides: {} };
    }
  } catch (e) {
    CURRENT_DAY_DATA = { dialogs: {}, roomOverrides: {} };
  }
}

function setUIElementsVisible(visible) {
  const invEl = document.getElementById('inventory') || document.querySelector('.inventory-bar');
  const cornerEl = document.querySelector('.corner-icons');
  if (invEl) invEl.style.display = visible ? '' : 'none';
  if (cornerEl) cornerEl.style.display = visible ? '' : 'none';
}

/* ---------- ODA ÇİZİMİ ---------- */
async function renderRoom() {
  if (!CASE || !CASE.rooms || !CASE.rooms[currentRoom]) return;

  renderInventory();
  const room = CASE.rooms[currentRoom];
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;

  let isClosedOverride = CURRENT_DAY_DATA?.roomOverrides?.[currentRoom]?.closed;
  let kapali = isClosedOverride || (room.closedOnDays && room.closedOnDays.includes(currentDay));

  // 2. Gün otopsi raporu incelendikten veya serbest gezme başladıktan sonra Muhtar/Halit evi kilitli olmamalı
  if (currentDay === 2 && (currentRoom === 'muhtar' || currentRoom === 'halit_ev') && (gameState.getFlag('otopsi_incelendi') || day2State === 'DAY2_FREE')) {
    isClosedOverride = false;
    kapali = false;
  }

  const bgImage = isClosedOverride ? CURRENT_DAY_DATA.roomOverrides[currentRoom].closedImage : (kapali ? room.closedImage : room.background);
  if (bgImage) {
    await loadImageAsync(bgImage);
  }

  stage.innerHTML = `<div class="room-label">${room.label}</div>`;
  stage.style.backgroundImage = `url("${bgImage}")`;
  stage.style.backgroundSize = 'cover';
  stage.style.backgroundPosition = 'center';
  stage.style.backgroundRepeat = 'no-repeat';

  if (kapali) {
    const geri = document.createElement('div');
    geri.className = 'hotspot-pulse-wrap';
    geri.style.left = '9%'; geri.style.top = '57.5%'; geri.style.width = '7.5%'; geri.style.position = 'absolute';
    geri.innerHTML = `<img src="assets/arayuz/geri.webp" alt="Geri"><div class="hotspot-pulse-label">Geri</div>`;
    geri.onclick = () => { currentRoom = 'merkez'; renderRoom(); };
    stage.appendChild(geri);

    const tokmak = document.createElement('div');
    tokmak.className = 'hotspot-pulse-wrap';
    tokmak.style.left = '50%'; tokmak.style.top = '45%'; tokmak.style.width = '7%'; tokmak.style.position = 'absolute';
    tokmak.innerHTML = `<img src="assets/arayuz/tokmak.webp" alt="Kapıyı çal"><div class="hotspot-pulse-label">Çal</div>`;
    tokmak.onclick = () => {
      showModal(`<p style="text-align:center;font-style:italic;color:#c9cabd;">(Kimse yok...)</p><button class="ghost" onclick="closeModal()">Kapat</button>`);
    };
    stage.appendChild(tokmak);
    return;
  }

  renderCharacter();

  if (room.hotspots) {
    room.hotspots.forEach(h => {
      if (h.type === 'otopsi_merkez_kaydi_modal' || (h.overlayImage && h.overlayImage.includes('ali_ihsan_merkez_kaydi'))) {
        if (currentDay < 2 || !day2PolisGoruldu) return;
      }

      if (currentRoom === 'ofis') {
        if (currentDay === 2 && (day2State === 'GO_OFIS' || day2State === 'CANTA_UNLOCKED') && !gameState.getFlag('otopsi_incelendi')) {
          if (h.target === 'merkez') return;
        }
        if (currentDay === 3 && !day3PolisGoruldu) {
          if (h.target === 'merkez') return;
        }
      }
      if (h.requires && !inventory.includes(h.requires)) return;
      if (h.activeDays && !h.activeDays.includes(currentDay)) return;
      if (h.hideIfCollected && inventory.includes(h.hideIfCollected)) return;

      let ovImg = null;
      if (h.overlayImage) {
        ovImg = document.createElement('img');
        ovImg.className = 'room-clickable-glow';
        ovImg.src = h.overlayImage;
        ovImg.style.position = 'absolute';

        if (h.type === 'otopsi_merkez_kaydi_modal' || (h.overlayImage && h.overlayImage.includes('ali_ihsan_merkez_kaydi'))) {
          ovImg.style.left = h.x; ovImg.style.top = h.y;
          ovImg.style.width = h.w || '20%'; ovImg.style.height = h.h || '45%';
        } else {
          ovImg.style.left = '0'; ovImg.style.top = '0';
          ovImg.style.width = '100%'; ovImg.style.height = '100%';
        }

        ovImg.style.pointerEvents = 'none';
        ovImg.style.zIndex = '2';
        ovImg.style.transition = 'transform 0.22s ease-in-out, filter 0.22s ease-in-out';
        stage.appendChild(ovImg);
      }

      if (h.icon && !h.w && !h.h) {
        const wrap = document.createElement('div');
        wrap.className = 'hotspot-pulse-wrap ikon-bekliyor';
        wrap.style.position = 'absolute';
        wrap.style.left = h.x; wrap.style.top = h.y;
        wrap.style.width = h.iconWidth || '8%';
        wrap.style.zIndex = '10';
        wrap.style.pointerEvents = 'auto';

        const img = document.createElement('img');
        img.src = h.icon;
        wrap.appendChild(img);

        if (h.label) {
          const lbl = document.createElement('div');
          lbl.className = 'hotspot-pulse-label';
          lbl.textContent = h.label;
          wrap.appendChild(lbl);
        }

        wrap.onclick = (e) => { 
          if (e) e.stopPropagation();
          if (!calibMode && !dialogueActive) handleHotspot(h); 
        };
        stage.appendChild(wrap);
        return;
      }

      const el = document.createElement('div');
      el.className = 'hotspot' + (h.icon ? ' hotspot-icon' : '');
      el.style.position = 'absolute';
      el.style.left = h.x; el.style.top = h.y; 
      el.style.width = h.w || '10%'; el.style.height = h.h || '10%';
      el.style.zIndex = '10'; el.style.pointerEvents = 'auto'; el.style.cursor = 'pointer';

      if (ovImg) {
        el.onmouseenter = () => {
          ovImg.style.transform = 'scale(1.08)';
          ovImg.style.filter = 'brightness(1.2) drop-shadow(0 0 10px rgba(233,220,192,0.8))';
        };
        el.onmouseleave = () => {
          ovImg.style.transform = 'scale(1)';
          ovImg.style.filter = 'none';
        };
      }

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

  if (currentRoom === 'gazeteci_oda_canta_ici') {
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.className = 'canta-close-btn';
    closeBtn.style.cssText = "position:absolute; top:8%; right:12%; z-index:30; font-size:clamp(22px, 3.2cqw, 36px); background:rgba(30,20,10,0.85); border:2px solid #e9dcc0; border-radius:50%; width:clamp(42px, 5cqw, 56px); height:clamp(42px, 5cqw, 56px); color:#e9dcc0; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.8); transition:transform 0.2s;";
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      currentRoom = 'gazeteci_oda';
      renderRoom();
    };
    stage.appendChild(closeBtn);
  }

  // 1. İKON GÖRÜNÜRLÜK TEMİZLİĞİ (Görünmeyen 'ikon-bekliyor' sınıflarını kaldırır)
  setTimeout(() => {
    document.querySelectorAll('#stage .ikon-bekliyor').forEach(el => el.classList.remove('ikon-bekliyor'));
  }, 250);

  // 2. VFX, SFX VE ÖĞRETİCİ TETİKLEMELERİ
  if (typeof VFX !== 'undefined') VFX.load(currentRoom, document.getElementById('stageFrame') || stage);
  if (typeof SFX !== 'undefined') SFX.play(currentRoom);
  if (typeof Ogretici !== 'undefined') {
    Ogretici.kur({
      sahne: document.getElementById('stageFrame') || stage,
      icerik: (CASE && CASE.ogretici) || {},
      onek: (CASE && CASE.caseLabel) || 'oyun',
      mevcut: () => currentRoom
    });
    Ogretici.iptal();
    Ogretici.goster(currentRoom);
  }
}

/* ---------- KARAKTER YÖNETİMİ ---------- */
function renderCharacter() {
  dialogueActive = false;
  characterAudio = null;
  dialogIndex = 0;
  setUIElementsVisible(true);

  if (currentDay === 2 && currentRoom === 'ofis' && (day2State === 'CANTA_UNLOCKED' || day2State === 'GO_OFIS') && !day2PolisGoruldu) {
    const stage = document.getElementById('stage') || document.getElementById('gameStage');
    const polisCh = {
      name: "Polis Memuru",
      image: "assets/karakterler/polis.webp",
      clickableImage: "assets/tiklanabilir/polis_tiklanabilir.webp",
      clickableArea: { "x": "48.7%", "y": "27.8%", "w": "16.5%", "h": "39.6%" }
    };
    renderClickableCharacter(polisCh, stage);
    return;
  }

  if (currentDay === 3 && currentRoom === 'ofis' && !day3PolisGoruldu) {
    const stage = document.getElementById('stage') || document.getElementById('gameStage');
    const polisCh = {
      name: "Polis Memuru",
      image: "assets/karakterler/polis.webp",
      clickableImage: "assets/tiklanabilir/polis_tiklanabilir.webp",
      clickableArea: { "x": "48.7%", "y": "27.8%", "w": "16.5%", "h": "39.6%" }
    };
    renderClickableCharacter(polisCh, stage);
    return;
  }
  let ch = CASE.characters && CASE.characters[currentRoom];

  // 3. Gün Cevdet mezarlıkta olmasın, Cadı Evi ('cadi' / 'cevdet_ev') odasında görünsün
  if (currentDay === 3) {
    if (currentRoom === 'mezarlik') return;
    if (currentRoom === 'cadi' || currentRoom === 'cevdet_ev') {
      ch = {
        name: "Cevdet",
        image: "assets/karakterler/cevdet.webp"
      };
    }
  }

  // Değirmen / Değirmenci Mustafa kontrolü
  if ((currentRoom === 'degirmen' || currentRoom === 'degirmenci') && !ch) {
    ch = {
      name: "Mustafa",
      image: "assets/karakterler/mustafa.webp"
    };
  }

  if (!ch) return;
    const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;

  ch = JSON.parse(JSON.stringify(ch));
  if (currentDay === 2 && currentRoom === 'han') {
    ch.clickableImage = 'assets/tiklanabilir/riza2_tiklanabilir.webp';
    ch.clickableArea = { "x": "51.1%", "y": "27.6%", "w": "11.0%", "h": "20.5%" };
  }

  if (ch.clickableImage) {
    renderClickableCharacter(ch, stage);
  } else {
    renderSceneCharacter(ch, stage);
  }
}

function renderClickableCharacter(ch, stage) {
  const glow = document.createElement('img');
  glow.id = 'roomClickableGlow';
  glow.className = 'room-clickable-glow';
  glow.src = ch.clickableImage;
  stage.appendChild(glow);

  const area = ch.clickableArea || { x: '40%', y: '28%', w: '22%', h: '58%' };
  const hit = document.createElement('div');
  hit.id = 'roomClickableHit';
  hit.className = 'room-clickable-hit';
  hit.style.left = area.x; hit.style.top = area.y;
  hit.style.width = area.w; hit.style.height = area.h;
  hit.onclick = (e) => { 
    if (e) e.stopPropagation();
    if (!dialogueActive) startDialogueFromClickable(ch); 
  };
  stage.appendChild(hit);
}

function startDialogueFromClickable(ch) {
  document.getElementById('roomClickableGlow')?.remove();
  document.getElementById('roomClickableHit')?.remove();
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (stage) stage.classList.add('dialog-active');
  renderSceneCharacter(ch, stage);
  toggleCharacterLine(ch);
}

function renderSceneCharacter(ch, stage) {
  const el = document.createElement('img');
  el.id = 'sceneCharacter';
  el.className = 'scene-character';
  el.src = ch.image;
  el.style.bottom = ch.yOffset || '0%';
  el.onclick = (e) => { 
    if (e) e.stopPropagation();
    if (!calibMode) toggleCharacterLine(ch); 
  };
  stage.appendChild(el);
}

function getDialogForRoom(roomKey, defaultDialog) {
  if (CURRENT_DAY_DATA?.dialogs?.[roomKey]) return CURRENT_DAY_DATA.dialogs[roomKey];
  if ((roomKey === 'cadi' || roomKey === 'cevdet_ev') && CURRENT_DAY_DATA?.dialogs?.['cadi']) return CURRENT_DAY_DATA.dialogs['cadi'];
  if ((roomKey === 'cadi' || roomKey === 'cevdet_ev') && CURRENT_DAY_DATA?.dialogs?.['cevdet_ev']) return CURRENT_DAY_DATA.dialogs['cevdet_ev'];
  if ((roomKey === 'degirmenci' || roomKey === 'degirmen') && CURRENT_DAY_DATA?.dialogs?.['degirmen']) return CURRENT_DAY_DATA.dialogs['degirmen'];
  if ((roomKey === 'degirmenci' || roomKey === 'degirmen') && CURRENT_DAY_DATA?.dialogs?.['degirmenci']) return CURRENT_DAY_DATA.dialogs['degirmenci'];
  if (CASE?.day2_dialogs?.[roomKey]) return CASE.day2_dialogs[roomKey];
  return defaultDialog;
}
function toggleCharacterLine(ch) {
  const stage = document.getElementById('stage') || document.getElementById('gameStage');

if (currentDay === 3) {
    if (currentRoom === 'ofis' && !day3PolisGoruldu) {
      document.getElementById('sceneCharacter')?.remove();
      const polisDialog = [
        { "speaker": "Polis Memuru", "text": "Efendim istediğiniz evrağı getirdim, bir ihtiyacınız varsa söylemeniz yeterli." }
      ];
      startOzelDialog(polisDialog, ch ? ch.image : 'assets/karakterler/polis.webp', () => {
        day3PolisGoruldu = true;
        localStorage.setItem('sd_day3_polis_goruldu', 'true');
        renderRoom();
        openPolaroidIslenmisModal();
      });
      return;
    }

    if (currentRoom === 'cadi' || currentRoom === 'cevdet_ev') {
      document.getElementById('sceneCharacter')?.remove();
      const cevdetDialog = getDialogForRoom(currentRoom, null);
      startOzelDialog(cevdetDialog, ch ? ch.image : 'assets/karakterler/cevdet.webp', () => {
        renderRoom();
        if (!inventory.includes('cevdet_not')) {
          openCevdetNotModal();
        }
      });
      return;
    }
  }

  if (currentDay === 2) {
      if (currentRoom === 'ofis' && !day2PolisGoruldu) {
      document.getElementById('sceneCharacter')?.remove();
      const polisDialog = getDialogForRoom('ofis', [
        { "speaker": "Polis Memuru", "text": "Kolay gelsin komserim. Muhtar bey otopsi raporunu gönderdi. Masanıza bırakıyorum." },
        { "speaker": "Dedektif", "text": "Böyle bir fotoğraf buldum ama işlenmesi gerekiyor bunu merkeze götürüp görünmesi için ne gerekiyorsa yaptırıp bana getir." },
        { "speaker": "Polis Memuru", "text": "Emredersiniz. Ben bunu götüreyim yarın size teslim ederim." }
      ]);
      startOzelDialog(polisDialog, ch.image, () => {
        day2PolisGoruldu = true;
        localStorage.setItem('sd_day2_polis_goruldu', 'true');
        inventory = inventory.filter(item => item !== 'polaroid');
        localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
        renderInventory();
        renderRoom();
        showCustomSubtitle("Dedektif: Otopsi raporunu masaya bıraktı, inceleyeyim.", true);
      });
      return;
    }

    if (currentRoom === 'muhtar') {
      document.getElementById('sceneCharacter')?.remove();
      const muhtarDialog = getDialogForRoom('muhtar', ch.dialog);
      startOzelDialog(muhtarDialog, ch.image, () => {
        if (day2State === 'GO_MUHTAR') setDay2State('GO_HAN');
        renderRoom();
        showCustomSubtitle("Dedektif: Muhtar selamını iletti, şimdi Hana gidip gazetecinin odasının anahtarını alabilirim.", true);
      });
      return;
    }

    if (currentRoom === 'han') {
      document.getElementById('sceneCharacter')?.remove();
      const rizaDialog = getDialogForRoom('han', ch.dialog);
      startOzelDialog(rizaDialog, ch.image, () => {
        if (!inventory.includes('anahtar') && day2State !== 'HAN_UNLOCKED' && day2State !== 'CANTA_UNLOCKED' && day2State !== 'GO_OFIS' && !gameState.getFlag('otopsi_incelendi')) {
          showAnahtarAcquisitionModal();
        } else {
          renderRoom();
        }
      });
      return;
    }

    const genericDay2Dialog = getDialogForRoom(currentRoom, null);
    if (genericDay2Dialog) {
      document.getElementById('sceneCharacter')?.remove();
      startOzelDialog(genericDay2Dialog, ch.image, () => renderRoom());
      return;
    }
  }

  const dayDialog = getDialogForRoom(currentRoom, null);
  if (dayDialog) {
    document.getElementById('sceneCharacter')?.remove();
    startOzelDialog(dayDialog, ch.image, () => renderRoom());
    return;
  }

  const charEl = document.getElementById('sceneCharacter');
  const dialog = (ch.dialog && ch.dialog.length) ? ch.dialog : [{ speaker: ch.name, text: ch.text || '' }];

  if (!dialogueActive) {
    dialogueActive = true;
    dialogIndex = 0;
    if (charEl) charEl.classList.add('talking');
    if (stage) stage.classList.add('dialog-active');
    if (ch.audio) {
      characterAudio = new Audio(ch.audio);
      characterAudio.play().catch(() => {});
    }
    setUIElementsVisible(false);
    gosterDialogSatiri(dialog);
  } else {
    dialogIndex++;
    if (dialogIndex >= dialog.length) {
      if (characterAudio) { characterAudio.pause(); characterAudio = null; }
      document.getElementById('sceneSubtitle')?.remove();
      document.getElementById('sceneCharacter')?.remove();
      dialogueActive = false;
      if (stage) stage.classList.remove('dialog-active');
      setUIElementsVisible(true);
      if (ch.clickableImage) renderClickableCharacter(ch, stage);
      return;
    }
    gosterDialogSatiri(dialog);
  }
}

function gosterDialogSatiri(dialog) {
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;
  let sub = document.getElementById('sceneSubtitle');
  if (!sub) {
    sub = document.createElement('div');
    sub.id = 'sceneSubtitle';
    sub.className = 'scene-subtitle';
    stage.appendChild(sub);
  }
  const satir = dialog[dialogIndex];
  const charEl = document.getElementById('sceneCharacter');
  const ch = CASE.characters && CASE.characters[currentRoom];
  
  if (charEl && ch && satir && satir.emotion) {
    const lastDot = ch.image.lastIndexOf('.');
    const basePath = ch.image.substring(0, lastDot);
    const ext = ch.image.substring(lastDot);
    charEl.src = `${basePath}_${satir.emotion}${ext}`;
  }

  if (satir) {
    sub.innerHTML = `<div class="scene-subtitle-name">${satir.speaker}</div><div class="scene-subtitle-text">${satir.text}</div>`;
  }
}

function startOzelDialog(dialogList, charImgPath, onCompleteCallback) {
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  
  if (!dialogList || !Array.isArray(dialogList) || dialogList.length === 0) {
    if (stage) stage.classList.remove('dialog-active');
    setUIElementsVisible(true);
    dialogueActive = false;
    if (onCompleteCallback) onCompleteCallback();
    return;
  }

  dialogueActive = true;
  stage.classList.add('dialog-active');
  setUIElementsVisible(false);

  let charImg = document.getElementById('tempDay2Char');
  if (!charImg) {
    charImg = document.createElement('img');
    charImg.id = 'tempDay2Char';
    charImg.className = 'scene-character talking';
    stage.appendChild(charImg);
  }
  if (charImgPath) charImg.src = charImgPath;

  let index = 0;
  function sonrakiSatir(e) {
    if (e) e.stopPropagation();
    if (index < dialogList.length) {
      const item = dialogList[index];
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
      if (charImg) charImg.remove();
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

/* ---------- HOTSPOT ISLEMLERI ---------- */
function handleHotspot(h) {
  if (dialogueActive) return;

  // İkon Ses Efektlerini Çal
  if (h.icon && typeof calSes === 'function') {
    if (h.icon.includes('tokmak')) calSes('kapi');
    else if (h.icon.includes('geri')) calSes('geri');
    else if (h.icon.includes('ayak')) calSes('kapi_git');
    else if (h.icon.includes('buyutec')) calSes('incele');
  }

  if (h.type === 'kamera_bos_subtitle') {
    showCustomSubtitle("Dedektif: İçi boş, belki kamerayla bir şeyler çekmiştir bir yerlerde fotoğraf kağıdı bulabilirim.", true);
    return;
  }
  if (h.type === 'otopsi_merkez_kaydi_modal') { openOtopsiMerkezKaydiModal(0); return; }
  if (h.type === 'canta_evlilik_cuzdan_modal') { openCantaEvlilikCuzdanModal(); return; }
  if (h.type === 'canta_kagitlar_modal') { openCantaKagitlarModal(); return; }
  if (h.type === 'canta_polaroid_modal') { openCantaPolaroidModal(); return; }
  if (h.type === 'yanik_kagit_incele_modal') { openYanikKagitModal(); return; }
  if (h.type === 'gazeteci_dosya_modal') { openGazeteciDosyaModal(h.images || gazeteciDosyaPagesDefault, 0); return; }

  if (h.type === 'gazeteci_odasi_gecis' || (currentRoom === 'han' && (h.target === 'han_kapi' || h.target === 'gazeteci_oda'))) {
    currentRoom = 'han_kapi';
    renderRoom();
    return;
  }

  if (h.type === 'kapida_konus' || h.type === 'gazeteci_kapi_ac') {
    const hasKey = inventory.includes('anahtar') || day2State === 'HAN_UNLOCKED' || day2State === 'CANTA_UNLOCKED' || day2State === 'GO_OFIS' || gameState.getFlag('otopsi_incelendi');

    if (hasKey) {
      if (typeof calSes === 'function') calSes('kilit_ac');
      inventory = inventory.filter(item => item !== 'anahtar');
      localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
      renderInventory();
      currentRoom = 'gazeteci_oda';
      renderRoom();
      return;
    } else {
      if (typeof calSes === 'function') calSes('kilit');
      
      if (currentDay === 1) {
        const dialog1 = h.dialog || [
          { "speaker": "Rıza", "text": "Dedektif bey bu kapıyı size bugün açamam. Muhtar Halit beni tembihledi kağıtları merkezden getirene kadar açılmasın dedi. Yarın beraber gelin o zaman bakarsınız." }
        ];
        startOzelDialog(dialog1, h.characterImage || 'assets/karakterler/riza.webp');
      } else {
        showCustomSubtitle("Dedektif: Önce Hancı Rıza'dan anahtarı alsam iyi olur...", true);
      }
      return;
    }
  }

  if (h.type === 'navigate') {
    if (journalistRooms.includes(currentRoom) && !journalistRooms.includes(h.target)) {
      if (day2State === 'CANTA_UNLOCKED') {
        setDay2State('GO_OFIS');
      }
    }

    if (currentDay === 2 && !gameState.getFlag('otopsi_incelendi')) {
      if (day2State === 'GO_MUHTAR') {
        const allowed = ['muhtar', 'merkez', 'ofis', 'masa'];
        if (h.target && !allowed.includes(h.target)) {
          showCustomSubtitle("Dedektif: Muhtarla dün konuşamadım en iyisi ilk ona gideyim de raporları alayım.", true);
          return;
        }
      } else if (day2State === 'GO_HAN') {
        const allowed = ['han', 'han_kapi', 'han_mutfak', 'han_depo', 'merkez', 'muhtar', 'ofis', 'masa'];
        if (h.target && !allowed.includes(h.target)) {
          showCustomSubtitle("Dedektif: Önce hana uğrasam daha iyi olacak.", true);
          return;
        }
      } else if (day2State === 'GO_OFIS' || day2State === 'CANTA_UNLOCKED') {
        const allowedInOfis = ['ofis', 'masa', 'merkez', 'gazeteci_oda', 'gazeteci_oda_canta', 'gazeteci_oda_cop', 'gazeteci_oda_tablo', 'gazeteci_oda_masa', 'gazeteci_oda_canta_ici'];
        if (h.target && !allowedInOfis.includes(h.target)) {
          showCustomSubtitle("Muhtar otopsiyi masama yollamıştır gidip ofisi bir kontrol edeyim sonra köy halkıyla konuşurum.", true);
          return;
        }
      }
          }

    currentRoom = h.target;
    renderRoom();
    return;
  }

  if (h.type === 'dialogue_bakirci1') { 
    const b1Dialog = getDialogForRoom('bakirci1', CASE?.day2_dialogs?.bakirci1);
    startOzelDialog(b1Dialog, 'assets/karakterler/bakirci1.webp'); 
    return; 
  }
  if (h.type === 'dialogue_bakirci2') { 
    const b2Dialog = getDialogForRoom('bakirci2', CASE?.day2_dialogs?.bakirci2);
    startOzelDialog(b2Dialog, 'assets/karakterler/bakirci2.webp'); 
    return; 
  }

  if (h.type === 'dosya') { openStatement(0); return; }
  if (h.type === 'notebook') { openNotebook(); return; }
  if (h.type === 'sleep') { confirmSleep(); return; }
}

/* ---------- GENEL ÇERÇEVESİZ MODAL YARDIMCISI ---------- */
function showFramelessModal(innerHtml) {
  stopStatementAudio();
  const body = document.getElementById('modalBody');
  const bg = document.getElementById('modalBg');
  if (!body || !bg) return;

  bg.className = 'modal-bg active reader-mode';
  bg.style.background = 'rgba(0, 0, 0, 0.88)';
  bg.style.backdropFilter = 'blur(8px)';

  body.className = 'modal modal-fullscreen';
  body.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; max-width:100vw !important; width:100vw !important; height:100vh !important; max-height:100vh !important; overflow:hidden !important; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative;";

  body.innerHTML = innerHtml;
}

/* ---------- SORGU KARTLARI MODALI ---------- */
let statementAudio = null, statementPlaying = false;
let currentStatementIndex = 0;

function openStatement(index, isPageSwitch = false) {
  currentStatementIndex = index;
  const s = CASE.statements[index];
  const total = CASE.statements.length;

  if (typeof calSes === 'function') {
    if (isPageSwitch) calSes('sayfa');
    else calSes('harita');
  }
  const audioHtml = s.audio
    ? `<button class="reader-play-simple" id="readerPlayBtn" style="position:fixed; bottom:30px; left:50%; transform:translateX(-50%); z-index:10002; padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer;" onclick="toggleStatementAudio('${s.audio}')">▶ Sorguyu Oynat</button>`
    : '';

  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <button class="reader-side-arrow left" style="position:fixed; left:25px; top:50%; transform:translateY(-50%); z-index:10002; font-size:48px; background:none; border:none; color:#e9dcc0; cursor:pointer;" onclick="openStatement(${index > 0 ? index - 1 : total - 1}, true)">‹</button>
    <div class="zoom-wrap" style="width:100vw; height:100vh; display:flex; justify-content:center; align-items:center;">
      <img id="statementZoomImg" src="${s.cardImage}" style="max-width:90vw; max-height:88vh; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
    </div>
    <button class="reader-side-arrow right" style="position:fixed; right:25px; top:50%; transform:translateY(-50%); z-index:10002; font-size:48px; background:none; border:none; color:#e9dcc0; cursor:pointer;" onclick="openStatement(${index < total - 1 ? index + 1 : 0}, true)">›</button>
    ${audioHtml}
  `);
}

function toggleStatementAudio(src) {
  if (!statementAudio) statementAudio = new Audio(src);
  statementPlaying = !statementPlaying;
  const btn = document.getElementById('readerPlayBtn');
  if (statementPlaying) {
    statementAudio.play().catch(() => {});
    if (btn) btn.textContent = '⏸ Duraklat';
  } else {
    statementAudio.pause();
    if (btn) btn.textContent = '▶ Sorguyu Oynat';
  }
}

function stopStatementAudio() {
  statementPlaying = false;
  if (statementAudio) { statementAudio.pause(); statementAudio = null; }
}

/* ---------- NOT DEFTERİ SİSTEMİ ---------- */
let notebookState = null;
let notebookMod = 'yaz';
let notebookRenk = '#1a1a1a';

function notebookKey() {
  return 'sd_notebook_v3_' + CASE.caseLabel;
}

function loadNotebook() {
  const saved = localStorage.getItem(notebookKey());
  const total = (CASE.notebook && CASE.notebook.totalPages) || 5;
  notebookState = saved ? JSON.parse(saved) : {
    page: 0,
    pages: Array.from({ length: total }, () => ({
      solUst: '', solAlt: '', sag: '', pageDrawing: null
    }))
  };
}

function saveNotebook() {
  localStorage.setItem(notebookKey(), JSON.stringify(notebookState));
}

function openNotebook() {
  const nbOv = document.getElementById('notebookOverlay');
  if (nbOv && nbOv.classList.contains('active')) return;

  if (typeof calSes === 'function') calSes('kitap');
  if (!notebookState) loadNotebook();

  const nbImg = document.getElementById('notebookImage');
  const src = (CASE.notebook && CASE.notebook.image) || 'assets/arayuz/yazi.webp';

  const pageSol = (CASE.notebook && CASE.notebook.pageSol) || {};
  const pageSag = (CASE.notebook && CASE.notebook.pageSag) || {};
  const solEl = document.getElementById('nbPageSol');
  const sagEl = document.getElementById('nbPageSag');

  if (solEl && sagEl) {
    ['top', 'bottom', 'left', 'width'].forEach(k => {
      if (pageSol[k]) solEl.style[k] = pageSol[k];
      if (pageSag[k]) sagEl.style[k] = pageSag[k];
    });
  }

  if (nbImg) {
    nbImg.style.display = '';
    nbImg.src = src;
  }

  if (nbOv) nbOv.classList.add('active');
  renderNotebookPage();
}
function closeNotebook() {
  const nbOv = document.getElementById('notebookOverlay');
  if (nbOv) nbOv.classList.remove('active');
}

const NB_SOL_SATIRLAR = [
  { taraf: 'solUst', yaziId: 'nbYaziSolUst', photoId: 'nbPhoto0', nameId: 'nbName0', notesId: 'nbNotesSolUst' },
  { taraf: 'solAlt', yaziId: 'nbYaziSolAlt', photoId: 'nbPhoto1', nameId: 'nbName1', notesId: 'nbNotesSolAlt' }
];

function renderNotebookPage() {
  if (!notebookState) return;
  const total = notebookState.pages.length;
  const p = notebookState.pages[notebookState.page];
  const suspects = (CASE.notebook && CASE.notebook.suspects) || [];

  const yerlesim = (CASE.notebook && CASE.notebook.suspectLayout) || {};
  const photoTop    = yerlesim.photoTop    || '8%';
  const photoLeft   = yerlesim.photoLeft   || '14%';
  const photoHeight = yerlesim.photoHeight || '55%';
  const nameTop     = yerlesim.nameTop     || '16%';
  const nameLeft    = yerlesim.nameLeft    || '52%';
  const noteTop     = yerlesim.noteTop     || '32%';
  const noteLeft    = yerlesim.noteLeft    || '52%';
  const noteWidth   = yerlesim.noteWidth   || '46%';
  const noteHeight  = yerlesim.noteHeight  || '60%';

  NB_SOL_SATIRLAR.forEach((satir, i) => {
    const suspect = suspects[notebookState.page * 2 + i];
    const photoEl = document.getElementById(satir.photoId);
    const nameEl = document.getElementById(satir.nameId);
    const notesEl = document.getElementById(satir.notesId);

    if (nameEl && notesEl && photoEl) {
      nameEl.style.top = nameTop;
      nameEl.style.left = nameLeft;
      notesEl.style.top = noteTop;
      notesEl.style.left = noteLeft;
      notesEl.style.width = noteWidth;
      notesEl.style.height = noteHeight;
      if (photoEl.tagName === 'IMG') {
        photoEl.style.top = photoTop;
        photoEl.style.left = photoLeft;
        photoEl.style.height = photoHeight;
        photoEl.style.width = 'auto';
      }

      if (suspect) {
        nameEl.textContent = suspect.name;
        photoEl.style.display = '';
        photoEl.src = suspect.image;
      } else {
        nameEl.textContent = '';
        photoEl.style.display = 'none';
      }
    }
    const yaziEl = document.getElementById(satir.yaziId);
    if (yaziEl) yaziEl.value = p[satir.taraf] || '';
  });

  const yaziSag = document.getElementById('nbYaziSag');
  if (yaziSag) yaziSag.value = p.sag || '';

  const cFull = document.getElementById('nbCanvasFull');
  if (cFull) canvasResizeVeCiz(cFull, p.pageDrawing);

  const nbS = document.getElementById('nbSayfaGöstergesi');
  if (nbS) nbS.textContent = `Sayfa ${notebookState.page + 1} / ${total}`;
}

function canvasResizeVeCiz(canvas, dataURL) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (dataURL) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = dataURL;
  }
}

function notebookYaziKaydet(taraf, el) {
  notebookState.pages[notebookState.page][taraf] = el.value;
  saveNotebook();
}

function notebookSayfaGeri() {
  if (notebookState.page > 0) { 
    if (typeof calSes === 'function') calSes('sayfa');
    notebookState.page--; 
    saveNotebook(); 
    renderNotebookPage(); 
  }
}

function notebookSayfaIleri() {
  if (notebookState.page < notebookState.pages.length - 1) { 
    if (typeof calSes === 'function') calSes('sayfa');
    notebookState.page++; 
    saveNotebook(); 
    renderNotebookPage(); 
  }
}

function notebookTemizle() {
  if (!confirm('Bu sayfadaki yazı ve çizimler silinsin mi?')) return;
  const p = notebookState.pages[notebookState.page];
  p.solUst = ''; p.solAlt = ''; p.sag = ''; p.pageDrawing = null;
  saveNotebook();
  renderNotebookPage();
}

function notebookModAyarla(mod) {
  notebookMod = mod;
  document.getElementById('nbModYaz')?.classList.toggle('active', mod === 'yaz');
  document.getElementById('nbModCiz')?.classList.toggle('active', mod === 'ciz');
  document.getElementById('nbModSil')?.classList.toggle('active', mod === 'sil');
  
  const cFull = document.getElementById('nbCanvasFull');
  if (cFull) cFull.classList.toggle('pasif', mod === 'yaz');
  document.querySelectorAll('.nb-yazi').forEach(t => t.style.pointerEvents = mod === 'yaz' ? 'auto' : 'none');
}

function notebookRenkSec(renk) {
  notebookRenk = renk;
  document.getElementById('nbRenkSiyah')?.classList.toggle('aktif', renk === '#1a1a1a');
  document.getElementById('nbRenkKirmizi')?.classList.toggle('aktif', renk === '#8f2a1e');
}

function nbKalemKur(canvas, taraf) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let çiziyor = false;

  function konum(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  function başla(e) {
    if (notebookMod === 'yaz') return;
    çiziyor = true;
    ctx.globalCompositeOperation = notebookMod === 'sil' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = notebookMod === 'sil' ? '#000' : notebookRenk;
    ctx.lineWidth = notebookMod === 'sil' ? 24 : 2;
    ctx.lineCap = 'round';
    const { x, y } = konum(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function çiz(e) {
    if (notebookMod === 'yaz' || !çiziyor) return;
    const { x, y } = konum(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function bitir() {
    if (!çiziyor) return;
    çiziyor = false;
    notebookState.pages[notebookState.page][taraf] = canvas.toDataURL();
    saveNotebook();
  }
  canvas.addEventListener('mousedown', başla);
  canvas.addEventListener('mousemove', çiz);
  window.addEventListener('mouseup', bitir);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); başla(e); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); çiz(e); }, { passive: false });
  canvas.addEventListener('touchend', bitir);
}

const cFullEl = document.getElementById('nbCanvasFull');
if (cFullEl) nbKalemKur(cFullEl, 'pageDrawing');

/* ---------- HARİTA SİSTEMİ ---------- */
function openMap() {
  if (!CASE.map) return;

  const mapImg = document.getElementById('mapImage');  if (mapImg) mapImg.src = CASE.map.image;

  const wrap = document.getElementById('mapHotspots');
  if (wrap) {
    wrap.innerHTML = '';
    CASE.map.hotspots.forEach(h => {
      const dot = document.createElement('div');
      dot.className = 'map-hotspot';
      dot.style.left = h.x; dot.style.top = h.y;
      dot.innerHTML = `<span class="map-hotspot-label">${h.label}</span>`;
      dot.onclick = () => {
        if (currentDay === 2 && !gameState.getFlag('otopsi_incelendi')) {
          if (day2State === 'GO_MUHTAR' && !['muhtar', 'merkez', 'ofis'].includes(h.target)) {
            closeMap();
            showCustomSubtitle("Muhtar otopsiyi masama yollamıştır gidip ofisi bir kontrol edeyim sonra köy halkıyla konuşurum.", true);
            return;
          }
          if (day2State === 'GO_HAN' && !['han', 'han_kapi', 'merkez', 'muhtar', 'ofis'].includes(h.target)) {
            closeMap();
            showCustomSubtitle("Muhtar otopsiyi masama yollamıştır gidip ofisi bir kontrol edeyim sonra köy halkıyla konuşurum.", true);
            return;
          }
          if ((day2State === 'GO_OFIS' || day2State === 'CANTA_UNLOCKED') && !['ofis', 'merkez', 'masa'].includes(h.target)) {
            closeMap();
            showCustomSubtitle("Muhtar otopsiyi masama yollamıştır gidip ofisi bir kontrol edeyim sonra köy halkıyla konuşurum.", true);
            return;
          }
        }
        if (h.target && CASE.rooms[h.target]) {
          currentRoom = h.target;
          closeMap();
          renderRoom();
        }
      };
      wrap.appendChild(dot);
    });
  }

  const mapOv = document.getElementById('mapOverlay');
  if (mapOv) mapOv.classList.add('active');
}

function closeMap() {
  const mapOv = document.getElementById('mapOverlay');
  if (mapOv) mapOv.classList.remove('active');
}

/* ---------- UYUMA VE UYANMA SİSTEMİ ---------- */
function confirmSleep() {
  showModal(`
    <h3>Uyumadan Önce</h3>
    <p>Uyumak istediğine emin misin? Bir sonraki güne geçeceksin.</p>
    <button onclick="closeModal(); sleep();">Evet, Uyu</button>
    <button class="ghost" onclick="closeModal()">Vazgeç</button>
  `);
}

function sleep() {
  currentDay++;
  localStorage.setItem('sd_day_' + CASE.caseLabel, currentDay);
  updateDayBadge();

  try {
    currentSleepAudio = new Audio('assets/ses/uyuma.mp3');
    currentSleepAudio.play().catch(() => {});
  } catch (e) {}

  const evt = CASE.sleepEvents && CASE.sleepEvents[currentDay];
  const sleepNumEl = document.getElementById('sleepDayNum');
  const sleepTxtEl = document.getElementById('sleepText');
  if (sleepNumEl) {
    sleepNumEl.textContent = `GÜN ${currentDay}`;
    sleepNumEl.style.fontSize = 'clamp(32px, 5cqw, 64px)';
  }
  if (sleepTxtEl) {
    sleepTxtEl.textContent = evt || 'Yeni bir gün başlıyor.';
    sleepTxtEl.style.fontSize = 'clamp(22px, 3.2cqw, 38px)';
    sleepTxtEl.style.marginTop = '15px';
  }
  document.getElementById('sleepOverlay')?.classList.add('active');
  }

function wakeUp() {
  if (currentSleepAudio) {
    currentSleepAudio.pause();
    currentSleepAudio = null;
  }

  // Sabah Parlama Efekti
  const stageFrame = document.getElementById('stageFrame') || document.getElementById('stage');
  if (stageFrame) {
    const parlak = document.createElement('div');
    parlak.className = 'sabah-parlama';
    stageFrame.appendChild(parlak);
    requestAnimationFrame(() => parlak.classList.add('aktif'));
    setTimeout(() => parlak.remove(), 1300);
  }

  if (typeof calSes === 'function') {
    calSes('sabah');
  } else {
    try {
      const wakeAudio = new Audio('assets/ses/uyanma.mp3');
      wakeAudio.play().catch(() => {});
    } catch (e) {}
  }

  document.getElementById('sleepOverlay')?.classList.remove('active');
  loadDayData(currentDay).then(() => {
    renderRoom();
  });
}
/* ---------- DİĞER İNCELEME MODALLARI & DİĞER İŞLEMLER ---------- */
function renderSifreMinigame(stage) {
  const numCoords = [
    { x: "32.8%", y: "57.5%" }, { x: "39.0%", y: "57.2%" },
    { x: "46.1%", y: "57.3%" }, { x: "52.7%", y: "57.2%" }, { x: "59.2%", y: "57.2%" }
  ];
  const incCoords = [
    { x: "32.7%", y: "36.1%" }, { x: "39.5%", y: "36.0%" },
    { x: "45.9%", y: "36.4%" }, { x: "52.7%", y: "36.0%" }, { x: "59.8%", y: "36.1%" }
  ];
  const decCoords = [
    { x: "32.6%", y: "79.0%" }, { x: "39.2%", y: "78.5%" },
    { x: "45.3%", y: "78.5%" }, { x: "52.4%", y: "78.7%" }, { x: "59.0%", y: "78.5%" }
  ];

  numCoords.forEach((c, idx) => {
    const digitEl = document.createElement('div');
    digitEl.id = `sifreDigit_${idx}`;
    digitEl.style.position = 'absolute';
    digitEl.style.left = c.x; digitEl.style.top = c.y;
    digitEl.style.transform = 'translate(-50%, -50%)';
    digitEl.style.fontSize = 'clamp(24px, 3.5cqw, 48px)';
    digitEl.style.fontWeight = 'bold';
    digitEl.style.color = '#e9dcc0';
    digitEl.style.userSelect = 'none';
    digitEl.style.zIndex = '10';
    digitEl.textContent = lockDigits[idx];
    stage.appendChild(digitEl);
  });

  incCoords.forEach((c, idx) => {
    const btn = document.createElement('div');
    btn.className = 'hotspot';
    btn.style.position = 'absolute';
    btn.style.left = c.x; btn.style.top = c.y;
    btn.style.width = '5.5%'; btn.style.height = '8.5%';
    btn.style.transform = 'translate(-50%, -50%)';
    btn.style.cursor = 'pointer'; btn.style.zIndex = '11';
    btn.onclick = (e) => {
      e.stopPropagation();
      lockDigits[idx] = (lockDigits[idx] + 1) % 10;
      document.getElementById(`sifreDigit_${idx}`).textContent = lockDigits[idx];
      if (typeof calSes === 'function') calSes('kapan');
    };
    stage.appendChild(btn);
  });

  decCoords.forEach((c, idx) => {
    const btn = document.createElement('div');
    btn.className = 'hotspot';
    btn.style.position = 'absolute';
    btn.style.left = c.x; btn.style.top = c.y;
    btn.style.width = '5.5%'; btn.style.height = '8.5%';
    btn.style.transform = 'translate(-50%, -50%)';
    btn.style.cursor = 'pointer'; btn.style.zIndex = '11';
    btn.onclick = (e) => {
      e.stopPropagation();
      lockDigits[idx] = (lockDigits[idx] + 9) % 10;
      document.getElementById(`sifreDigit_${idx}`).textContent = lockDigits[idx];
      if (typeof calSes === 'function') calSes('kapan');
    };
    stage.appendChild(btn);
  });

  const ilerleBtn = document.createElement('button');
  ilerleBtn.className = 'btn show';
  ilerleBtn.textContent = 'İlerle';
  ilerleBtn.style.cssText = "position:absolute; left:67.5%; top:57.2%; transform:translateY(-50%); z-index:12; padding:12px 28px; background:linear-gradient(180deg, #8a5a2b, #4a2f18); color:#f3e5ab; border:2px solid #2c1c0e; border-radius:8px; font-family:'Georgia', serif; font-size:clamp(16px, 2cqw, 22px); font-weight:bold; letter-spacing:0.08em; cursor:pointer; box-shadow:0 4px 0 #1c110a, 0 6px 15px rgba(0,0,0,0.8); text-shadow:0 2px 4px rgba(0,0,0,0.8); transition:all 0.15s ease;";
  ilerleBtn.onmouseover = () => ilerleBtn.style.transform = 'translateY(-50%) scale(1.05)';
  ilerleBtn.onmouseout = () => ilerleBtn.style.transform = 'translateY(-50%) scale(1)';

  ilerleBtn.onclick = (e) => {
    e.stopPropagation();
    if (lockDigits.join('') === '13697') {
      if (typeof calSes === 'function') calSes('kilit_ac');
      setDay2State('CANTA_UNLOCKED');
      currentRoom = 'gazeteci_oda_canta_ici';
      renderRoom();
    } else {
      if (typeof calSes === 'function') calSes('hata');
      showCustomSubtitle("Dedektif: Yanlış şifre... Kilit açılmadı.", true);
    }
  };
  stage.appendChild(ilerleBtn);
}

function openOtopsiMerkezKaydiModal(index = 0, isPageSwitch = false) {
  const pages = ['assets/arayuz/otopsi.webp', 'assets/arayuz/cebindekiler.webp'];
  const src = pages[index];
  const prevDisabled = index === 0 ? 'disabled' : '';
  const nextDisabled = index === pages.length - 1 ? 'disabled' : '';

  if (typeof calSes === 'function') {
    if (isPageSwitch) calSes('sayfa');
    else calSes('harita');
  }

  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <button class="reader-side-arrow left" style="position:fixed; left:25px; top:50%; transform:translateY(-50%); z-index:10002; font-size:48px; background:none; border:none; color:#e9dcc0; cursor:pointer;" onclick="openOtopsiMerkezKaydiModal(${index - 1}, true)" ${prevDisabled}>‹</button>
    <div class="zoom-wrap" style="width:100vw; height:100vh; display:flex; justify-content:center; align-items:center;">
      <img id="photoZoomImg" src="${src}" style="max-width:90vw; max-height:88vh; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
    </div>
    <button class="reader-side-arrow right" style="position:fixed; right:25px; top:50%; transform:translateY(-50%); z-index:10002; font-size:48px; background:none; border:none; color:#e9dcc0; cursor:pointer;" onclick="openOtopsiMerkezKaydiModal(${index + 1}, true)" ${nextDisabled}>›</button>
  `);
}
function openCantaEvlilikCuzdanModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100vw; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <img src="assets/arayuz/evlilik_cuzdan.webp" style="max-width:88vw; max-height:78vh; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('evlilik_cuzdan');">ENVANTERE AL</button>
    </div>
  `);
}

function openCantaKagitlarModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeCantaKagitlarModal()">✕</button>
    <div style="width:100vw; height:100vh; display:flex; justify-content:center; align-items:center;">
      <img src="assets/arayuz/bos_kagit.webp" style="max-width:88vw; max-height:85vh; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
    </div>
  `);
}

function closeCantaKagitlarModal() {
  if (!inventory.includes('canta_kagitlar_incelendi')) {
    inventory.push('canta_kagitlar_incelendi');
    localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
  }
  closeModal();
  renderRoom();
  setTimeout(() => showCustomSubtitle("Dedektif: Henüz bunlara bir şey yazamamış.", true), 300);
}

function openCantaPolaroidModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100vw; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(18px, 2.5cqw, 30px); margin-bottom:10px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">(İşlenmemiş) Polaroid Fotoğraf</h3>
      <img src="assets/arayuz/poloroid.webp" style="max-width:88vw; max-height:70vh; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('polaroid'); closeModal(); setTimeout(() => showCustomSubtitle('Dedektif: Bu fotoğrafı fotoğraf odasına götürüp netleştirmem lazım.', true), 300);">ENVANTERE AL</button>
    </div>
  `);
}
function openYanikKagitModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100vw; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <img src="assets/arayuz/yanik_kagit_incele.webp" style="max-width:88vw; max-height:78vh; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('yanik_kagit'); closeModal(); setTimeout(() => showCustomSubtitle('Dedektif: Kağıdın her yeri yanmış neredeyse hiç okunmuyor.', true), 200);">ENVANTERE EKLE</button>
    </div>
  `);
}
let currentGazeteciPagesList = gazeteciDosyaPagesDefault;

function openGazeteciDosyaModal(pages = null, index = 0) {
  if (pages && Array.isArray(pages)) {
    currentGazeteciPagesList = pages;
  }
  const activePages = currentGazeteciPagesList || gazeteciDosyaPagesDefault;
  const src = activePages[index];
  const prevDisabled = index === 0 ? 'disabled' : '';
  const nextDisabled = index === activePages.length - 1 ? 'disabled' : '';

  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <button class="reader-side-arrow left" style="position:fixed; left:25px; top:50%; transform:translateY(-50%); z-index:10002; font-size:48px; background:none; border:none; color:#e9dcc0; cursor:pointer;" onclick="openGazeteciDosyaModal(null, ${index - 1})" ${prevDisabled}>‹</button>
    <div style="width:100vw; height:100vh; display:flex; justify-content:center; align-items:center;">
      <img src="${src}" style="max-width:88vw; max-height:85vh; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
    </div>
    <button class="reader-side-arrow right" style="position:fixed; right:25px; top:50%; transform:translateY(-50%); z-index:10002; font-size:48px; background:none; border:none; color:#e9dcc0; cursor:pointer;" onclick="openGazeteciDosyaModal(null, ${index + 1})" ${nextDisabled}>›</button>
  `);
}
function showAnahtarAcquisitionModal() {
  showFramelessModal(`
    <div style="width:100vw; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#e9dcc0;">
      <h2 style="font-family:'Georgia', serif; font-size:28px; margin-bottom:15px; text-shadow:0 2px 8px rgba(0,0,0,0.8);">Oda Anahtarı Alındı</h2>
      <img src="assets/tiklanabilir/anahtar.webp" style="max-width:280px; max-height:40vh; object-fit:contain; margin:20px 0; filter:drop-shadow(0 0 15px rgba(0,0,0,0.9));">
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collectKey(); closeModal(); renderRoom();">ENVANTERE AL</button>
    </div>
  `);
}

function collectKey() {
  if (!inventory.includes('anahtar')) inventory.push('anahtar');
  localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
  setDay2State('HAN_UNLOCKED');
  renderInventory();
}

function collect(collectId) {
  if (!inventory.includes(collectId)) {
    inventory.push(collectId);
    localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
    renderInventory();
  }
  closeModal();
  renderRoom();
}

/* ---------- ARAYÜZ YARDIMCILARI ---------- */
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
    if (id === 'canta_kagitlar_incelendi') return;
    const el = document.createElement('div');
    el.className = 'inv-item';
    el.style.cssText = "width:clamp(38px, 4.5cqw, 54px); height:clamp(38px, 4.5cqw, 54px); display:flex; flex-direction:column; align-items:center; justify-content:center; margin:0 3px;";

    let imgSrc = '';
    let label = '';
    if (id === 'anahtar') { imgSrc = 'assets/tiklanabilir/anahtar.webp'; label = 'Anahtar'; }
    else if (id === 'evlilik_cuzdan') { imgSrc = 'assets/arayuz/evlilik_cuzdan.webp'; label = 'Cüzdan'; }
    else if (id === 'polaroid') { imgSrc = 'assets/arayuz/poloroid.webp'; label = 'Polaroid'; }
    else if (id === 'polaroid_islenmis') { imgSrc = 'assets/arayuz/poloroid_islenmis.webp'; label = 'İşlenmiş Polaroid'; }
    else if (id === 'cevdet_not') { imgSrc = 'assets/arayuz/cevdet_not.webp'; label = 'Cevdet\'in Notu'; }
    else if (id === 'yanik_kagit') { imgSrc = 'assets/tiklanabilir/yanik_kagit_tiklanabilir.webp'; label = 'Yanık Kağıt'; }
    else if (id === 'gazeteci_dosyasi') { imgSrc = 'assets/arayuz/gazeteci_dosya.webp'; label = 'Dosya'; }
    if (imgSrc) {
      el.innerHTML = `<img src="${imgSrc}" style="height:58%; object-fit:contain;"><span style="font-size:8px; color:#e9dcc0;">${label}</span>`;
    } else {
      el.textContent = '📄';
    }
    inv.appendChild(el);
  });
}

function showCustomSubtitle(text, clickToDismiss = false) {
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;
  
  setUIElementsVisible(false);
  document.getElementById('sceneSubtitle')?.remove();

  const sub = document.createElement('div');
  sub.id = 'sceneSubtitle';
  sub.className = 'scene-subtitle';
  sub.style.zIndex = '99999';
  sub.innerHTML = `<div class="scene-subtitle-text">${text}</div>`;
  stage.appendChild(sub);

  const kaldir = () => {
    sub.remove();
    setUIElementsVisible(true);
  };

  let timer = null;
  if (!clickToDismiss) timer = setTimeout(kaldir, 5000);

  sub.onclick = (e) => {
    e.stopPropagation();
    if (timer) clearTimeout(timer);
    kaldir();
  };
}

function showModal(html, wide) {
  const body = document.getElementById('modalBody');
  if (!body) return;
  body.innerHTML = html;
  body.className = 'modal' + (wide ? ' wide' : '');
  document.getElementById('modalBg')?.classList.add('active');
}

function closeModal() {
  stopStatementAudio();
  const bg = document.getElementById('modalBg');
  const body = document.getElementById('modalBody');

  if (currentDay === 2 && day2PolisGoruldu && !gameState.getFlag('otopsi_incelendi')) {
    gameState.setFlag('otopsi_incelendi', true);
    setDay2State('DAY2_FREE');
    setTimeout(() => {
      showCustomSubtitle("Dedektif: Otopsi raporunu inceledim. Artık köy halkıyla detaylıca konuşabilirim.", true);
      renderRoom();
    }, 250);
  }

  if (body) body.className = 'modal';
  if (bg) {
    bg.classList.remove('active');
    bg.classList.remove('reader-mode');
    bg.style.background = "";
    bg.style.backdropFilter = "";
  }
}

function openPolaroidIslenmisModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100vw; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(18px, 2.5cqw, 30px); margin-bottom:10px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">(İşlenmiş) Polaroid Fotoğraf</h3>
      <img src="assets/arayuz/poloroid_islenmis.webp" style="max-width:88vw; max-height:70vh; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('polaroid_islenmis');">ENVANTERE AL</button>
    </div>
  `);
}

function openCevdetNotModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100vw; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(18px, 2.5cqw, 30px); margin-bottom:10px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">Cevdet'in Notu</h3>
      <img src="assets/arayuz/cevdet_not.webp" style="max-width:88vw; max-height:70vh; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('cevdet_not');">ENVANTERE AL</button>
    </div>
  `);
}

// Global Pencere Fonksiyonları
window.openNotebook = openNotebook;
window.closeNotebook = closeNotebook;
window.notebookSayfaGeri = notebookSayfaGeri;
window.notebookSayfaIleri = notebookSayfaIleri;
window.notebookModAyarla = notebookModAyarla;
window.notebookRenkSec = notebookRenkSec;
window.notebookTemizle = notebookTemizle;
window.notebookYaziKaydet = notebookYaziKaydet;
window.openMap = openMap;
window.closeMap = closeMap;
window.wakeUp = wakeUp;
window.closeModal = closeModal;
window.openOtopsiMerkezKaydiModal = openOtopsiMerkezKaydiModal;

window.onload = () => { initGame(); };