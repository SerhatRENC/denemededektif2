/* ============================================================
   ODA MOTORU — Sislidere Köyü Davası (2. Gün Düzeltmeleri)
   ============================================================ */

let CASE = null;
let currentRoom = null;
let inventory = [];
let currentDay = 1;
let calibMode = false;
let calibClicks = [];
let currentSleepAudio = null;

// --- 2. GÜN DURUM YÖNETİMİ ---
let day2State = localStorage.getItem('sd_day2_state') || 'GO_MUHTAR'; // GO_MUHTAR -> GO_HAN -> HAN_UNLOCKED

function setDay2State(newState) {
  day2State = newState;
  localStorage.setItem('sd_day2_state', newState);
}

fetch('case.json?v=' + Date.now())
  .then(r => {
    if (!r.ok) throw new Error("HTTP Hata Kodu: " + r.status);
    return r.json();
  })
  .then(data => {
    CASE = data;
    
    const titleEl = document.getElementById('caseTitle');
    if (titleEl) titleEl.textContent = CASE.title || '';

    currentRoom = CASE.startRoom;

    const savedDay = localStorage.getItem('sd_day_' + CASE.caseLabel);
    const savedInv = localStorage.getItem('sd_inv_' + CASE.caseLabel);
    currentDay = savedDay ? parseInt(savedDay, 10) : (CASE.startDay || 1);
    inventory = savedInv ? JSON.parse(savedInv) : [];

    const dayBadgeEl = document.getElementById('dayBadge');
    if (dayBadgeEl) updateDayBadge();
    
    const invEl = document.getElementById('inventory');
    if (invEl) renderInventory();

    renderRoom();
  })
  .catch(err => {
    console.error("CASE.JSON YÜKLEME HATASI DETAYI:", err);
    const stage = document.getElementById('stage') || document.getElementById('gameStage');
    if (stage) {
      stage.innerHTML =
        `<div style="padding:20px;color:#e07a5f;font-family:monospace;font-size:12px;">
          case.json okunamadı veya ayrıştırılamadı.<br>
          <strong>Hata detayı:</strong> ${err.message}<br><br>
          Lütfen tarayıcı konsolunu (F12 -> Console) kontrol et.
        </div>`;
    }
  });

/* ---------- ODA ÇİZİMİ ---------- */
function renderRoom() {
  if (!CASE || !CASE.rooms || !CASE.rooms[currentRoom]) {
    console.error("Oda bulunamadı:", currentRoom);
    return;
  }

  const room = CASE.rooms[currentRoom];
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;

  stage.classList.add('fading');
  
  setTimeout(() => {
    stage.innerHTML = `<div class="room-label">${room.label}</div>`;

    const kapali = room.closedOnDays && room.closedOnDays.includes(currentDay);
    stage.style.backgroundImage = `url(${kapali ? room.closedImage : room.background})`;

    if (kapali) {
      const geri = document.createElement('div');
      geri.className = 'hotspot-pulse-wrap ikon-bekliyor';
      geri.style.left = '9%'; geri.style.top = '57.5%'; geri.style.width = '6%';
      geri.innerHTML = `<img src="assets/arayuz/geri.webp" alt="Geri dön">`;
      geri.onclick = () => { currentRoom = 'merkez'; renderRoom(); };
      stage.appendChild(geri);
      setTimeout(() => geri.classList.remove('ikon-bekliyor'), 2000);

      const tokmak = document.createElement('div');
      tokmak.className = 'hotspot-pulse-wrap ikon-bekliyor';
      tokmak.style.left = '50%'; tokmak.style.top = '45%'; tokmak.style.width = '7%';
      tokmak.innerHTML = `<img src="assets/arayuz/tokmak.webp" alt="Kapıyı çal"><div class="hotspot-pulse-label">Çal</div>`;
      tokmak.onclick = () => {
        showModal(`<p style="text-align:center;font-style:italic;color:#c9cabd;">(Kimse yok)</p><button class="ghost" onclick="closeModal()">Kapat</button>`);
      };
      stage.appendChild(tokmak);
      setTimeout(() => tokmak.classList.remove('ikon-bekliyor'), 2000);

      stage.classList.remove('fading');
      return;
    }

    if (room.hotspots) {
      room.hotspots.forEach(h => {
        if (h.requires && !inventory.includes(h.requires)) return;
        if (h.activeDays && !h.activeDays.includes(currentDay)) return;

        if (h.icon && !h.w && !h.h) {
          const wrap = document.createElement('div');
          wrap.className = 'hotspot-pulse-wrap ikon-bekliyor';
          wrap.style.left = h.x;
          wrap.style.top = h.y;
          wrap.style.width = h.iconWidth || '8%';

          const img = document.createElement('img');
          img.src = h.icon;
          img.alt = h.hint || '';
          img.onerror = () => {
            const fallback = document.createElement('div');
            fallback.className = 'hotspot-pulse-icon-missing';
            fallback.textContent = `görsel yok:\n${h.icon}`;
            img.replaceWith(fallback);
          };
          wrap.appendChild(img);

          if (h.label) {
            const lbl = document.createElement('div');
            lbl.className = 'hotspot-pulse-label';
            lbl.textContent = h.label;
            wrap.appendChild(lbl);
          }

          wrap.onclick = () => { if (!calibMode && !dialogueActive) handleHotspot(h); };
          stage.appendChild(wrap);
          setTimeout(() => wrap.classList.remove('ikon-bekliyor'), 2000);
          return;
        }

        const el = document.createElement('div');
        el.className = 'hotspot' + (h.icon ? ' hotspot-icon' : '');
        el.style.left = h.x; el.style.top = h.y; el.style.width = h.w; el.style.height = h.h;
        const iconHtml = h.icon
          ? `<img src="${h.icon}" class="hotspot-icon-img" alt="" onerror="this.outerHTML='<div class=\\'hotspot-icon-missing\\'>görsel yok:<br>${h.icon}</div>'">`
          : '';
        el.innerHTML = `${iconHtml}<div class="hint">${h.hint || ''}</div>`;
        el.onclick = (e) => { if (!calibMode && !dialogueActive) handleHotspot(h); };
        stage.appendChild(el);
      });
    }

    renderCharacter();

    stage.classList.remove('fading');
  }, 180);
}

function handleHotspot(h) {
  // --- 2. GÜN NAVİGASYON KISITLAMALARI ---
  if (currentDay === 2) {
    if (day2State === 'GO_MUHTAR') {
      // Merkeze gitmek serbest; fakat Merkezden Muhtarlık/Ofis dışına gitmek yasak
      if (h.target && !['muhtar', 'merkez', 'ofis', 'masa'].includes(h.target)) {
        showCustomSubtitle("Dedektif: Muhtarla dün konuşamadım en iyisi ilk ona gideyim de raporları alayım.");
        return;
      }
    } else if (day2State === 'GO_HAN') {
      if (h.target && !['han', 'han_mutfak', 'han_depo', 'han_kapi', 'merkez', 'ofis', 'masa'].includes(h.target)) {
        showCustomSubtitle("Dedektif: Önce hana gidip gazetecinin kaldığı odayı incelesem iyi olacak.");
        return;
      }
    }
  }

  // Özel Aksiyonlar
  if (h.type === 'dialogue_bakirci1') {
    startOzelDialog(CASE.day2_dialogs.bakirci1, 'assets/karakterler/bakirci1.webp');
    return;
  }
  if (h.type === 'dialogue_bakirci2') {
    startOzelDialog(CASE.day2_dialogs.bakirci2, 'assets/karakterler/bakirci2.webp');
    return;
  }
  if (h.type === 'gazeteci_odasi_gecis') {
    if (currentDay === 2 && day2State === 'HAN_UNLOCKED') {
      if (typeof calSes === 'function') calSes('kilit_ac');
      gecGazeteciOdasi();
      return;
    }
    // 1. Gün veya 2. gün kilit açılmadan önce kapı mekanına git
    currentRoom = 'han_kapi';
    renderRoom();
    return;
  }
  if (h.type === 'kapida_konus') {
    if (currentDay === 2 && day2State === 'HAN_UNLOCKED') {
      if (typeof calSes === 'function') calSes('kilit_ac');
      gecGazeteciOdasi();
      return;
    }
    startOzelDialog(h.dialog, h.characterImage);
    return;
  }

  if (h.type === 'navigate') { currentRoom = h.target; renderRoom(); return; }
  if (h.type === 'examine')  { openExamine(h.target); return; }
  if (h.type === 'photo')    { openPhoto(h.image); return; }
  if (h.type === 'recorder') { openRecorder(h.target); return; }
  if (h.type === 'tv')       { openTV(h.target); return; }
  if (h.type === 'dosya')    { openStatement(0); return; }
  if (h.type === 'notebook') { openNotebook(); return; }
  if (h.type === 'sleep')    { confirmSleep(); return; }
}

function showCustomSubtitle(text) {
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  let sub = document.getElementById('sceneSubtitle');
  if (!sub) {
    sub = document.createElement('div');
    sub.id = 'sceneSubtitle';
    sub.className = 'scene-subtitle';
    stage.appendChild(sub);
  }
  sub.innerHTML = `<div class="scene-subtitle-text">${text}</div>`;
  setTimeout(() => { if (sub) sub.remove(); }, 3500);
}

function startOzelDialog(dialogList, charImgPath, onCompleteCallback) {
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  stage.classList.add('dialog-active');
  document.querySelector('.corner-icons')?.classList.add('dialog-gizli');
  
  let charImg = document.getElementById('tempDay2Char');
  if (!charImg) {
    charImg = document.createElement('img');
    charImg.id = 'tempDay2Char';
    charImg.className = 'scene-character talking';
    stage.appendChild(charImg);
  }
  charImg.src = charImgPath;

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
      const sub = document.getElementById('sceneSubtitle');
      if (sub) sub.remove();
      stage.classList.remove('dialog-active');
      document.querySelector('.corner-icons')?.classList.remove('dialog-gizli');
      stage.removeEventListener('click', sonrakiSatir);
      if (onCompleteCallback) onCompleteCallback();
    }
  }
  
  sonrakiSatir();
  setTimeout(() => stage.addEventListener('click', sonrakiSatir), 100);
}

function showAnahtarAcquisitionModal() {
  const overlay = document.createElement('div');
  overlay.id = 'itemAcquireOverlay';
  overlay.className = 'item-acquire-overlay';
  overlay.innerHTML = `
    <div class="item-acquire-card">
      <img src="assets/tiklanabilir/anahtar.webp" alt="Oda Anahtarı" class="item-acquire-img">
      <div class="item-acquire-title">Oda Anahtarı Alındı</div>
      <button id="btnAcquireTake" class="btn-acquire">AL</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btnAcquireTake').onclick = () => {
    if (typeof calSes === 'function') calSes('take');
    overlay.remove();
    setDay2State('HAN_UNLOCKED');
    renderRoom();
  };
}

function gecGazeteciOdasi() {
  const stageFrame = document.getElementById('stageFrame') || document.getElementById('stage-frame');
  stageFrame.classList.add('fade-out-scene');

  setTimeout(() => {
    currentRoom = 'gazeteci_oda';
    renderRoom();
    stageFrame.classList.remove('fade-out-scene');
  }, 1200);
}

function openPhoto(src) {
  showModal(`
    <div class="zoom-wrap"><img class="reader-card-img" id="photoZoomImg" src="${src}" style="margin-bottom:14px;"
         onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${src}</div>'"></div>
    <button class="ghost" onclick="closeModal()">Kapat</button>
  `);
  const el = document.getElementById('photoZoomImg');
  if (el) zoomKur(el.parentElement, el);
}

function updateDayBadge() {
  const el = document.getElementById('dayBadge');
  if (el) el.textContent = `GÜN ${currentDay}`;
}

function confirmSleep() {
  const sonGun = currentDay >= 7;
  showModal(`
    <h3>Uyumadan Önce</h3>
    <p>${sonGun
      ? 'Bu son gece. Uyumadan önce köyde henüz bulmadığın kanıtlar olabilir mi bir kontrol et — uyuyunca artık bir suçlama yapman gerekecek.'
      : 'Uyumak istediğine emin misin? Köyde henüz bulmadığın kanıtlar olabilir — şimdi uyursan onları kaçırmış olarak bir sonraki güne geçeceksin.'}</p>
    <button onclick="closeModal(); ${sonGun ? 'finalSuclamayaBaslat();' : 'sleep();'}">Evet, Uyu</button>
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
  const dNum = document.getElementById('sleepDayNum');
  if (dNum) dNum.textContent = `GÜN ${currentDay}`;
  const sText = document.getElementById('sleepText');
  if (sText) sText.textContent = evt || 'Yeni bir gün başlıyor.';
  const sOv = document.getElementById('sleepOverlay');
  if (sOv) sOv.classList.add('active');
}

function wakeUp() {
  if (currentSleepAudio) {
    currentSleepAudio.pause();
    currentSleepAudio.currentTime = 0;
    currentSleepAudio = null;
  }

  if (typeof calSes === 'function') calSes('sabah');

  const sOv = document.getElementById('sleepOverlay');
  if (sOv) sOv.classList.remove('active');
  renderRoom();
}

function renderCharacter() {
  dialogueActive = false;
  characterAudio = null;
  dialogIndex = 0;
  document.querySelector('.corner-icons')?.classList.remove('dialog-gizli');

  let ch = CASE.characters && CASE.characters[currentRoom];
  if (!ch) return;

  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;

  // 2. Gün Rıza görselini ve ortalanmış tıklama alanını özelleştir
  ch = JSON.parse(JSON.stringify(ch));
  if (currentDay === 2 && currentRoom === 'han') {
    ch.clickableImage = 'assets/tiklanabilir/riza2_tiklanabilir.webp';
    ch.clickableArea = { "x": "38.0%", "y": "28.0%", "w": "24.0%", "h": "60.0%" };
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
  glow.alt = '';
  glow.onerror = () => { glow.style.display = 'none'; };
  stage.appendChild(glow);

  const area = ch.clickableArea || { x: '40%', y: '28%', w: '22%', h: '58%' };
  const hit = document.createElement('div');
  hit.id = 'roomClickableHit';
  hit.className = 'room-clickable-hit';
  hit.style.left = area.x;
  hit.style.top = area.y;
  hit.style.width = area.w;
  hit.style.height = area.h;
  hit.title = ch.name;
  hit.onclick = () => { if (!calibMode) startDialogueFromClickable(ch); };
  stage.appendChild(hit);
}

function startDialogueFromClickable(ch) {
  const glow = document.getElementById('roomClickableGlow');
  const hit = document.getElementById('roomClickableHit');
  if (glow) glow.remove();
  if (hit) hit.remove();
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
  el.alt = ch.name;
  el.title = ch.name;
  el.style.bottom = ch.yOffset || '0%';
  el.onclick = () => { if (!calibMode) toggleCharacterLine(ch); };
  el.onerror = () => {
    const fallback = document.createElement('div');
    fallback.id = 'sceneCharacter';
    fallback.className = 'scene-character-missing';
    fallback.textContent = `${ch.name}\ngörsel yok:\n${ch.image}`;
    fallback.onclick = el.onclick;
    el.replaceWith(fallback);
  };
  stage.appendChild(el);
}

function toggleCharacterLine(ch) {
  // --- 2. GÜN MUHTARLIK VE HAN ÖZEL KANCALARI ---
  if (currentDay === 2 && currentRoom === 'muhtar') {
    if (day2State === 'GO_MUHTAR') {
      document.getElementById('sceneCharacter')?.remove();
      document.getElementById('roomClickableGlow')?.remove();
      document.getElementById('roomClickableHit')?.remove();

      startOzelDialog(CASE.day2_dialogs.muhtar_halit, ch.image, () => {
        setDay2State('GO_HAN');
        renderRoom();
        showCustomSubtitle("Dedektif: Muhtar selamını iletti, şimdi Hana gidip gazetecinin odasının anahtarını alabilirim.");
      });
      return;
    } else {
      showCustomSubtitle("Halit: Hancı Rıza'ya selamımı söyle, açsın kapıyı.");
      return;
    }
  }

  if (currentDay === 2 && currentRoom === 'han') {
    if (day2State === 'GO_HAN') {
      document.getElementById('sceneCharacter')?.remove();
      document.getElementById('roomClickableGlow')?.remove();
      document.getElementById('roomClickableHit')?.remove();

      startOzelDialog(CASE.day2_dialogs.hanci_riza, ch.image, () => {
        showAnahtarAcquisitionModal();
      });
      return;
    } else if (day2State === 'HAN_UNLOCKED') {
      showCustomSubtitle("Rıza: Odanın anahtarını verdim beyim, yukarı çıkabilirsiniz.");
      return;
    }
  }

  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  const charEl = document.getElementById('sceneCharacter');
  const dialog = (ch.dialog && ch.dialog.length) ? ch.dialog : [{ speaker: ch.name, text: ch.text || '' }];

  if (!dialogueActive) {
    dialogueActive = true;
    dialogIndex = 0;
    if (charEl) charEl.classList.add('talking');
    if (ch.audio) {
      characterAudio = new Audio(ch.audio);
      characterAudio.play().catch(() => {});
    }
    document.querySelector('.corner-icons')?.classList.add('dialog-gizli');
    gosterDialogSatiri(dialog);
  } else {
    dialogIndex++;
    if (dialogIndex >= dialog.length) {
      if (characterAudio) { characterAudio.pause(); characterAudio = null; }
      const sub = document.getElementById('sceneSubtitle');
      if (sub) sub.remove();
      const c = document.getElementById('sceneCharacter');
      if (c) c.remove();
      dialogueActive = false;
      if (stage) stage.classList.remove('dialog-active');
      document.querySelector('.corner-icons')?.classList.remove('dialog-gizli');
      if (ch.clickableImage) renderClickableCharacter(ch, stage);
      return;
    }
    gosterDialogSatiri(dialog);
  }
}

function openMap() {
  if (!CASE.map) { alert('Bu vaka dosyasında harita tanımlı değil.'); return; }
  const mapImg = document.getElementById('mapImage');
  if (mapImg) mapImg.src = CASE.map.image;

  const wrap = document.getElementById('mapHotspots');
  if (wrap) {
    wrap.innerHTML = '';
    CASE.map.hotspots.forEach(h => {
      const dot = document.createElement('div');
      dot.className = 'map-hotspot';
      dot.style.left = h.x;
      dot.style.top = h.y;
      dot.innerHTML = `<span class="map-hotspot-label">${h.label}</span>`;
      dot.onclick = () => {
        if (currentDay === 2) {
          if (day2State === 'GO_MUHTAR' && !['muhtar', 'merkez', 'ofis'].includes(h.target)) {
            closeMap();
            showCustomSubtitle("Dedektif: Muhtarla dün konuşamadım en iyisi ilk ona gideyim de raporları alayım.");
            return;
          }
          if (day2State === 'GO_HAN' && !['han', 'merkez', 'ofis'].includes(h.target)) {
            closeMap();
            showCustomSubtitle("Dedektif: Önce hana gidip gazetecinin kaldığı odayı incelesem iyi olacak.");
            return;
          }
        }

        if (h.target && CASE.rooms[h.target]) {
          currentRoom = h.target;
          closeMap();
          renderRoom();
        } else {
          alert(`"${h.label}" henüz eklenmedi.`);
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

// Diğer yardımcı fonksiyonlar (Notebook, Examine, Statement, Zoom vb.) aynen korunmuştur.