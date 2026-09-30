/* ============================================================
   SISLIDERE DAVASI — TAM MODÜLER, MİMİK, DEFTER VE SORGU MOTORU
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

// Defter Durum Değişkenleri
let currentNotebookPage = 0;
let notebookNotes = {};
let currentStatementAudio = null;

// --- DİNAMİK BAYRAK (FLAG) YÖNETİMİ ---
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
let gazeteciDosyaPagesDefault = [
  'assets/arayuz/gazeteci_dosya_1.webp',
  'assets/arayuz/gazeteci_dosya_2.webp'
];

/* ---------- BAŞLATMA VE YÜKLEME ---------- */
async function initGame() {
  try {
    const configRes = await fetch('data/game_config.json?v=' + Date.now());
    GAME_CONFIG = await configRes.json();
    window.CASE = GAME_CONFIG; // oyun.html geriye dönük uyumluluk

    gameState.loadFlags();
    loadNotebookNotes();

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
      geri.className = 'hotspot-pulse-wrap';
      geri.style.left = '9%'; geri.style.top = '57.5%'; geri.style.width = '7.5%'; geri.style.position = 'absolute';
      geri.innerHTML = `<img src="assets/arayuz/geri.webp" alt="Geri"><div class="hotspot-pulse-label">Geri</div>`;
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

        if (h.overlayImage) {
          const ovImg = document.createElement('img');
          ovImg.className = 'room-clickable-glow';
          ovImg.src = h.overlayImage;
          ovImg.style.position = 'absolute';

          if (h.type === 'otopsi_merkez_kaydi_modal' || h.overlayImage.includes('ali_ihsan_merkez_kaydi')) {
            ovImg.style.left = h.x; ovImg.style.top = h.y;
            ovImg.style.width = h.w || '20%'; ovImg.style.height = h.h || '45%';
          } else {
            ovImg.style.left = '0'; ovImg.style.top = '0';
            ovImg.style.width = '100%'; ovImg.style.height = '100%';
          }
          ovImg.style.pointerEvents = 'none';
          ovImg.style.zIndex = '2';
          stage.appendChild(ovImg);
        }

        if (h.icon) {
          const wrap = document.createElement('div');
          wrap.className = 'hotspot-pulse-wrap';
          wrap.style.position = 'absolute';
          wrap.style.left = h.x; wrap.style.top = h.y;
          wrap.style.width = h.iconWidth || '7.5%';
          wrap.style.zIndex = '10';
          wrap.style.cursor = 'pointer';

          const img = document.createElement('img');
          img.src = h.icon;
          wrap.appendChild(img);

          const labelText = h.label || h.hint || '';
          if (labelText) {
            const lbl = document.createElement('div');
            lbl.className = 'hotspot-pulse-label';
            lbl.textContent = labelText;
            wrap.appendChild(lbl);
          }

          wrap.onclick = (e) => {
            if (e) e.stopPropagation();
            if (!calibMode && !dialogueActive) handleHotspot(h);
          };
          stage.appendChild(wrap);
        } else {
          const el = document.createElement('div');
          el.className = 'hotspot';
          el.style.position = 'absolute';
          el.style.left = h.x; el.style.top = h.y; 
          el.style.width = h.w || '10%'; el.style.height = h.h || '10%';
          el.style.zIndex = '10'; el.style.cursor = 'pointer';

          el.onclick = (e) => { 
            if (e) e.stopPropagation();
            if (!calibMode && !dialogueActive) handleHotspot(h); 
          };
          stage.appendChild(el);
        }
      });
    }

    if (currentRoom === 'gazeteci_oda_sifre_giris') renderSifreMinigame(stage);
    stage.classList.remove('fading');
  }, 180);
}

/* ---------- KARAKTER VE TIKLANABİLİR SAHNE YÖNETİMİ ---------- */
function renderCharacter() {
  dialogueActive = false;
  setUIElementsVisible(true);

  if (currentDay === 2 && currentRoom === 'ofis' && gameState.getFlag('canta_unlocked') && !gameState.getFlag('polis_goruldu')) {
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

  let ch = GAME_CONFIG.characters && GAME_CONFIG.characters[currentRoom];
  if (!ch) return;

  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;

  if (ch.clickableImage) {
    renderClickableCharacter(ch, stage);
  } else {
    renderSceneCharacter(ch, stage);
  }
}

function renderClickableCharacter(ch, stage) {
  document.getElementById('roomClickableGlow')?.remove();
  document.getElementById('roomClickableHit')?.remove();

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
      if (currentRoom === 'ofis' && gameState.getFlag('canta_unlocked')) gameState.setFlag('polis_goruldu', true);
      renderRoom();
    });
    return;
  }

  startOzelDialog(ch.dialog || [{ speaker: ch.name, text: ch.text || '', emotion: "normal" }], ch.image, () => renderRoom());
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

/* ---------- HOTSPOT YÖNETİMİ ---------- */
function handleHotspot(h) {
  if (dialogueActive) return;

  if (h.type === 'dosya') { openStatementsModal(); return; }
  if (h.type === 'kamera_bos_subtitle') { showCustomSubtitle("Dedektif: İçi boş, belki kamerayla bir şeyler çekmiştir...", true); return; }
  if (h.type === 'otopsi_merkez_kaydi_modal') { openOtopsiMerkezKaydiModal(); return; }
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
    const hasKey = inventory.includes('anahtar') || gameState.getFlag('han_unlocked');
    if (hasKey) {
      if (typeof calSes === 'function') calSes('kilit_ac');
      inventory = inventory.filter(item => item !== 'anahtar');
      localStorage.setItem('sd_inv_' + GAME_CONFIG.caseLabel, JSON.stringify(inventory));
      gameState.setFlag('han_unlocked', true);
      renderInventory();
      currentRoom = 'gazeteci_oda';
      renderRoom();
    } else {
      if (typeof calSes === 'function') calSes('kilit');
      if (h.dialog) startOzelDialog(h.dialog, h.characterImage || 'assets/karakterler/riza.webp');
      else showCustomSubtitle("Dedektif: Kapı kilitli. Odaya girmek için Rıza'dan anahtarı almam lazım.", true);
    }
    return;
  }

  if (h.type === 'navigate') {
    if (journalistRooms.includes(currentRoom) && !journalistRooms.includes(h.target)) {
      if (!gameState.getFlag('canta_unlocked')) {
        showCustomSubtitle("Dedektif: Çantayı incelemeden ve odadaki araştırmamı bitirmeden buradan çıkamam.", true);
        return;
      }
    }

    if (currentDay === 2) {
      if (!gameState.getFlag('muhtar_konusuldu') && !['muhtar', 'merkez', 'ofis', 'degirmenci', 'nadire_ev', 'halit_ev'].includes(h.target)) {
        showCustomSubtitle("Dedektif: Muhtarla konuşmadım en iyisi ilk ona gideyim de raporları alayım.", true);
        return;
      }
    }

    currentRoom = h.target;
    renderRoom();
    return;
  }

  if (h.type === 'dialogue_bakirci1' && CURRENT_DAY_DATA?.dialogs?.bakirci1) {
    startOzelDialog(CURRENT_DAY_DATA.dialogs.bakirci1, 'assets/karakterler/bakirci1.webp');
    return;
  }
  if (h.type === 'dialogue_bakirci2' && CURRENT_DAY_DATA?.dialogs?.bakirci2) {
    startOzelDialog(CURRENT_DAY_DATA.dialogs.bakirci2, 'assets/karakterler/bakirci2.webp');
    return;
  }

  if (h.type === 'notebook') { openNotebook(); return; }
  if (h.type === 'sleep') { confirmSleep(); return; }
}

/* ---------- SORGU / İFADE DOSYALARI MODALI ---------- */
function openStatementsModal() {
  if (typeof calSes === 'function') calSes('sayfa');
  const st = GAME_CONFIG?.statements || [];
  let gridHtml = st.map((s, idx) => `
    <div style="cursor:pointer; text-align:center; background:#241a0f; padding:8px; border-radius:6px; border:1px solid #8a5a2b;" onclick="openStatement(${idx})">
      <img src="${s.cardImage}" style="width:100%; height:120px; object-fit:contain; border-radius:4px;">
      <div style="color:#e9dcc0; font-size:13px; margin-top:5px; font-weight:bold;">${s.name}</div>
    </div>
  `).join('');

  showModal(`
    <div style="text-align:center; max-width:650px; margin:0 auto;">
      <h3 style="color:#8a5a2b; margin-bottom:15px;">Sorgu İfade Zaptları</h3>
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; max-height:60vh; overflow-y:auto; padding:5px;">
        ${gridHtml}
      </div>
      <br>
      <button class="ghost" onclick="closeModal()">Kapat</button>
    </div>
  `);
}

function openStatement(index) {
  const st = GAME_CONFIG?.statements;
  if (!st || !st[index]) return;
  const item = st[index];

  if (currentStatementAudio) {
    currentStatementAudio.pause();
    currentStatementAudio = null;
  }

  const prevIdx = index > 0 ? index - 1 : st.length - 1;
  const nextIdx = index < st.length - 1 ? index + 1 : 0;

  showModal(`
    <div style="text-align:center; position:relative;">
      <div class="reader-side-arrow left" style="position:absolute; left:0; top:50%; transform:translateY(-50%); font-size:28px; cursor:pointer; color:#8a5a2b;" onclick="openStatement(${prevIdx})">‹</div>
      <div class="reader-side-arrow right" style="position:absolute; right:0; top:50%; transform:translateY(-50%); font-size:28px; cursor:pointer; color:#8a5a2b;" onclick="openStatement(${nextIdx})">›</div>
      
      <h3 style="margin-bottom:10px; color:#8a5a2b;">${item.name} — İfade Kartı</h3>
      <img id="statementZoomImg" src="${item.cardImage}" style="max-width:80%; max-height:55vh; border-radius:8px; border:2px solid #8a5a2b;">
      <div style="margin-top:12px;">
        <button onclick="playStatementAudio('${item.audio}')">🔊 Sesli İfadeyi Dinle</button>
        <button class="ghost" onclick="stopStatementAudio(); closeModal(); openStatementsModal();">‹ Listeye Dön</button>
      </div>
    </div>
  `);
}

function playStatementAudio(src) {
  stopStatementAudio();
  if (src) {
    currentStatementAudio = new Audio(src);
    currentStatementAudio.play().catch(() => {});
  }
}

function stopStatementAudio() {
  if (currentStatementAudio) {
    currentStatementAudio.pause();
    currentStatementAudio = null;
  }
}

/* ---------- NOT DEFTERİ SİSTEMİ ---------- */
function loadNotebookNotes() {
  const saved = localStorage.getItem('sd_notes_' + (GAME_CONFIG ? GAME_CONFIG.caseLabel : 'default'));
  notebookNotes = saved ? JSON.parse(saved) : {};
}

function saveNotebookNotes() {
  localStorage.setItem('sd_notes_' + (GAME_CONFIG ? GAME_CONFIG.caseLabel : 'default'), JSON.stringify(notebookNotes));
}

function openNotebook() {
  if (typeof calSes === 'function') calSes('kitap');
  const nbOverlay = document.getElementById('notebookOverlay');
  const nbImg = document.getElementById('notebookImage');
  if (nbImg && GAME_CONFIG?.notebook?.image) nbImg.src = GAME_CONFIG.notebook.image;

  if (nbOverlay) {
    nbOverlay.classList.add('active');
    currentNotebookPage = 0;
    renderNotebookPage();
  }
}

function closeNotebook() {
  const nbOverlay = document.getElementById('notebookOverlay');
  if (nbOverlay) nbOverlay.classList.remove('active');
}

function renderNotebookPage() {
  const nbCfg = GAME_CONFIG?.notebook;
  if (!nbCfg) return;

  const totalPages = nbCfg.totalPages || 5;
  const indicator = document.getElementById('nbSayfaGöstergesi');
  if (indicator) indicator.textContent = `Sayfa ${currentNotebookPage + 1} / ${totalPages}`;

  const idx0 = currentNotebookPage * 2;
  const idx1 = idx0 + 1;
  const suspects = nbCfg.suspects || [];

  updateSuspectRow(0, suspects[idx0], 'solUst');
  updateSuspectRow(1, suspects[idx1], 'solAlt');

  const sagTextarea = document.getElementById('nbYaziSag');
  if (sagTextarea) {
    const key = 'sag_p' + currentNotebookPage;
    sagTextarea.value = notebookNotes[key] || '';
  }
}

function updateSuspectRow(rowNum, suspectData, noteKey) {
  const photoEl = document.getElementById('nbPhoto' + rowNum);
  const nameEl = document.getElementById('nbName' + rowNum);
  const textareaEl = document.getElementById(rowNum === 0 ? 'nbYaziSolUst' : 'nbYaziSolAlt');

  if (suspectData) {
    if (photoEl) { photoEl.src = suspectData.image; photoEl.style.display = 'block'; }
    if (nameEl) { nameEl.textContent = suspectData.name; nameEl.style.display = 'block'; }
  } else {
    if (photoEl) photoEl.style.display = 'none';
    if (nameEl) nameEl.style.display = 'none';
  }

  if (textareaEl) {
    textareaEl.value = notebookNotes[noteKey + '_p' + currentNotebookPage] || '';
  }
}

function notebookSayfaIleri() {
  const totalPages = GAME_CONFIG?.notebook?.totalPages || 5;
  if (currentNotebookPage < totalPages - 1) {
    if (typeof calSes === 'function') calSes('sayfa');
    currentNotebookPage++;
    renderNotebookPage();
  }
}

function notebookSayfaGeri() {
  if (currentNotebookPage > 0) {
    if (typeof calSes === 'function') calSes('sayfa');
    currentNotebookPage--;
    renderNotebookPage();
  }
}

function notebookYaziKaydet(posKey, textarea) {
  const key = posKey + '_p' + currentNotebookPage;
  notebookNotes[key] = textarea.value;
  saveNotebookNotes();
}

function notebookModAyarla(mod) {
  document.querySelectorAll('.nb-btn').forEach(b => b.classList.remove('active'));
  if (mod === 'yaz') document.getElementById('nbModYaz')?.classList.add('active');
  if (mod === 'ciz') document.getElementById('nbModCiz')?.classList.add('active');
  if (mod === 'sil') document.getElementById('nbModSil')?.classList.add('active');
}

function notebookRenkSec(renk) {
  document.querySelectorAll('.nb-renk-btn').forEach(b => b.classList.remove('aktif'));
  if (renk === '#1a1a1a') document.getElementById('nbRenkSiyah')?.classList.add('aktif');
  if (renk === '#8f2a1e') document.getElementById('nbRenkKirmizi')?.classList.add('aktif');
}

/* ---------- DİĞER ARAYÜZ MODALLARI ---------- */
function openOtopsiMerkezKaydiModal() {
  showModal(`
    <div style="text-align:center;">
      <h3>Otopsi & Merkez Kaydı</h3>
      <img src="assets/arayuz/ali_ihsan_merkez_kaydi.webp" style="max-width:100%; max-height:60vh; border-radius:8px;">
      <br><br>
      <button class="ghost" onclick="closeModal()">Kapat</button>
    </div>
  `);
}

function openCantaEvlilikCuzdanModal() {
  if (!inventory.includes('evlilik_cuzdan')) {
    inventory.push('evlilik_cuzdan');
    localStorage.setItem('sd_inv_' + GAME_CONFIG.caseLabel, JSON.stringify(inventory));
    renderInventory();
  }
  showModal(`
    <div style="text-align:center;">
      <h3>Evlilik Cüzdanı İncelemesi</h3>
      <img src="assets/arayuz/evlilik_cuzdan.webp" style="max-width:100%; max-height:60vh; border-radius:8px;">
      <p style="margin-top:10px;">Cevdet ile Şefika'nın evlilik cüzdanı...</p>
      <button class="ghost" onclick="closeModal(); renderRoom();">Kapat ve Envantere Al</button>
    </div>
  `);
}

function openCantaKagitlarModal() {
  gameState.setFlag('canta_kagitlar_incelendi', true);
  showModal(`
    <div style="text-align:center;">
      <h3>Gazeteci Notları</h3>
      <p>Çantadan çıkan eski gazete kupürleri ve el yazısı notlar...</p>
      <button class="ghost" onclick="closeModal(); renderRoom();">Kapat</button>
    </div>
  `);
}

function openCantaPolaroidModal() {
  if (!inventory.includes('polaroid')) {
    inventory.push('polaroid');
    localStorage.setItem('sd_inv_' + GAME_CONFIG.caseLabel, JSON.stringify(inventory));
    renderInventory();
  }
  showModal(`
    <div style="text-align:center;">
      <h3>Polaroid Fotoğraf</h3>
      <img src="assets/arayuz/poloroid.webp" style="max-width:100%; max-height:60vh; border-radius:8px;">
      <p style="margin-top:10px;">Henüz işlenmemiş banyo edilmemiş bir fotoğraf filmi.</p>
      <button class="ghost" onclick="closeModal(); renderRoom();">Kapat ve Envantere Al</button>
    </div>
  `);
}

function openYanikKagitModal() {
  if (!inventory.includes('yanik_kagit')) {
    inventory.push('yanik_kagit');
    localStorage.setItem('sd_inv_' + GAME_CONFIG.caseLabel, JSON.stringify(inventory));
    renderInventory();
  }
  showModal(`
    <div style="text-align:center;">
      <h3>Yanık Kağıt Parçası</h3>
      <img src="assets/tiklanabilir/yanik_kagit_tiklanabilir.webp" style="max-width:100%; max-height:60vh; border-radius:8px;">
      <p style="margin-top:10px;">Kısmen yanmış bir mektup parçası.</p>
      <button class="ghost" onclick="closeModal(); renderRoom();">Kapat ve Envantere Al</button>
    </div>
  `);
}

function openGazeteciDosyaModal(images = gazeteciDosyaPagesDefault, pageIndex = 0) {
  if (!images || images.length === 0) images = gazeteciDosyaPagesDefault;
  const currentImg = images[pageIndex] || images[0];
  const prevBtn = pageIndex > 0 ? `<button onclick="openGazeteciDosyaModal(null, ${pageIndex - 1})">‹ Önceki</button>` : '';
  const nextBtn = pageIndex < images.length - 1 ? `<button onclick="openGazeteciDosyaModal(null, ${pageIndex + 1})">Sonraki ›</button>` : '';
  
  showModal(`
    <div style="text-align:center;">
      <h3>Gazeteci Dosyası (${pageIndex + 1}/${images.length})</h3>
      <img src="${currentImg}" style="max-width:100%; max-height:60vh; border-radius:8px;">
      <div style="margin-top:15px; display:flex; justify-content:center; gap:10px;">
        ${prevBtn}
        ${nextBtn}
        <button class="ghost" onclick="closeModal()">Kapat</button>
      </div>
    </div>
  `);
}

function renderSifreMinigame(stage) {
  const ilerleBtn = document.createElement('button');
  ilerleBtn.className = 'btn show';
  ilerleBtn.textContent = 'İlerle';
  ilerleBtn.style.position = 'absolute';
  ilerleBtn.style.left = '67.5%'; ilerleBtn.style.top = '57.2%';
  ilerleBtn.onclick = (e) => {
    e.stopPropagation();
    if (lockDigits.join('') === '13697') {
      if (typeof calSes === 'function') calSes('kilit_ac');
      gameState.setFlag('canta_unlocked', true);
      currentRoom = 'gazeteci_oda_canta_ici';
      renderRoom();
    } else {
      if (typeof calSes === 'function') calSes('hata');
      showCustomSubtitle("Dedektif: Yanlış şifre... Kilit açılmadı.", true);
    }
  };
  stage.appendChild(ilerleBtn);
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
  stopStatementAudio();
  const bg = document.getElementById('modalBg');
  if (bg) bg.classList.remove('active');
}

function openMap() {
  if (typeof calSes === 'function') calSes('harita');
  const mapOverlay = document.getElementById('mapOverlay');
  if (mapOverlay) {
    mapOverlay.classList.add('active');
    renderMapHotspots();
  }
}

function closeMap() {
  const mapOverlay = document.getElementById('mapOverlay');
  if (mapOverlay) mapOverlay.classList.remove('active');
}

function renderMapHotspots() {
  const container = document.getElementById('mapHotspots');
  const mapImg = document.getElementById('mapImage');
  if (!container || !GAME_CONFIG?.map) return;
  if (mapImg && GAME_CONFIG.map.image) mapImg.src = GAME_CONFIG.map.image;
  container.innerHTML = '';
  GAME_CONFIG.map.hotspots.forEach(h => {
    const btn = document.createElement('div');
    btn.className = 'map-hotspot';
    btn.style.left = h.x; btn.style.top = h.y;
    btn.innerHTML = `<span class="map-label">${h.label}</span>`;
    btn.onclick = () => {
      closeMap();
      currentRoom = h.target;
      renderRoom();
    };
    container.appendChild(btn);
  });
}

window.onload = () => { initGame(); };