/* ============================================================
   SISLIDERE DAVASI — MODÜL 6: ÇEKİRDEK MOTOR VE ODA RENDER
   ============================================================ */

/* Tüm görselleri arka planda, tek tek (Yukleme.arkaPlanda) indirir */
function preloadDayAssets() {
  if (!CASE) return;
  const urls = [];
  const add = u => { if (u) urls.push(u); };
  const emotions = ['normal', 'sasirmis', 'idle', 'idle2', 'sinirli'];

  Object.values(CASE.characters || {}).forEach(ch => {
    add(ch.image);
    add(ch.clickableImage);
    if (ch.image && CASE.emotionImages) {
      const lastDot = ch.image.lastIndexOf('.');
      if (lastDot !== -1) {
        const basePath = ch.image.substring(0, lastDot);
        const ext = ch.image.substring(lastDot);
        emotions.forEach(em => add(`${basePath}_${em}${ext}`));
      }
    }
  });

  Object.values(CASE.rooms || {}).forEach(room => {
    add(room.background);
    add(room.closedImage);
    (room.hotspots || []).forEach(h => { add(h.overlayImage); add(h.icon); });
  });

  (CASE.statements || []).forEach(s => add(s.cardImage));
  if (CASE.map) add(CASE.map.image);
  if (CASE.notebook) add(CASE.notebook.image);

  const uniq = Array.from(new Set(urls));
  if (typeof Yukleme !== 'undefined') Yukleme.arkaPlanda(uniq, { bekle: 0 });
  else uniq.forEach(preloadImage);
}

async function initGame() {
  try {
    // Veri dosyaları oyun.html'deki SD_VERSION ile istenir (her seferinde cache'siz değil)
    const V = window.SD_VERSION || Date.now();
    const configRes = await fetch('data/game_config.json?v=' + V);
    CASE = await configRes.json();
    window.CASE = CASE;

    gameState.loadFlags();

    const savedDay = localStorage.getItem('sd_day_' + CASE.caseLabel);
    const savedInv = localStorage.getItem('sd_inv_' + CASE.caseLabel);
    currentDay = savedDay ? parseInt(savedDay, 10) : (CASE.startDay || 1);
    inventory = savedInv ? JSON.parse(savedInv) : [];
    migrateLegacyState();

    const introDayEl = document.getElementById('introDay');
    if (introDayEl) introDayEl.textContent = 'GÜN ' + currentDay + '...';

    currentRoom = CASE.startRoom || 'ofis';

    if (typeof Yukleme !== 'undefined') {
      Yukleme.kur({ sahne: document.getElementById('stageFrame'), ses: 'assets/ses/yurume_sesi.mp3' });
    }

    await loadDayData(currentDay);
    applyDayStart(false);

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
    const V = window.SD_VERSION || Date.now();
    const dayRes = await fetch(`data/days/day${dayNumber}.json?v=` + V);
    if (dayRes.ok) {
      CURRENT_DAY_DATA = await dayRes.json();
    } else {
      console.warn('Gün verisi bulunamadı: day' + dayNumber + '.json');
      CURRENT_DAY_DATA = { dialogs: {}, roomOverrides: {} };
    }
  } catch (e) {
    console.warn('Gün verisi okunamadı (JSON hatalı olabilir):', e);
    CURRENT_DAY_DATA = { dialogs: {}, roomOverrides: {} };
  }
}

/* Gün JSON'undaki initialFlags / initialState'i uygular.
   isNewDay=true (uyanma): başlangıç durumu her zaman yazılır; false (oyun açılışı): sadece durum boşsa. */
function applyDayStart(isNewDay) {
  const d = CURRENT_DAY_DATA || {};
  Object.entries(d.initialFlags || {}).forEach(([k, v]) => {
    if (!gameState.getFlag(k)) gameState.setFlag(k, v);
  });
  if (d.initialState && (isNewDay || !gameState.getFlag('day_state'))) setDayState(d.initialState);
}

/* Oda o gün kapalı mı? Kaynaklar: gün JSON'u roomOverrides (+ openIf koşulu) ve config closedOnDays */
function getRoomClosedInfo(roomId) {
  const room = CASE && CASE.rooms && CASE.rooms[roomId];
  if (!room) return { closed: false };
  const ov = CURRENT_DAY_DATA && CURRENT_DAY_DATA.roomOverrides && CURRENT_DAY_DATA.roomOverrides[roomId];
  if (ov && ov.openIf && checkCond(ov.openIf)) return { closed: false };
  const byOverride = !!(ov && ov.closed);
  const byDay = !!(room.closedOnDays && room.closedOnDays.includes(currentDay));
  if (!byOverride && !byDay) return { closed: false };
  return { closed: true, image: byOverride ? (ov.closedImage || room.closedImage) : room.closedImage };
}

function odaKapaliMi(roomId) { return getRoomClosedInfo(roomId).closed; }

/* Görsel hazırsa anında; değilse 300 ms sonra "(Mekana yürünüyor...)" ekranıyla bekler */
function waitForImage(url) {
  return new Promise(res => {
    if (!url) { res(); return; }
    if (typeof Yukleme !== 'undefined') Yukleme.gecis([url], res);
    else loadImageAsync(url).then(res);
  });
}

async function renderRoom() {
  if (!CASE || !CASE.rooms || !CASE.rooms[currentRoom]) return;
  const token = ++renderToken;

  cancelActiveDialog();
  dialogueActive = false;

  renderInventory();
  const room = CASE.rooms[currentRoom];
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;

  const closedInfo = getRoomClosedInfo(currentRoom);
  const kapali = closedInfo.closed;
  const bgImage = kapali ? closedInfo.image : room.background;
  await waitForImage(bgImage);
  if (token !== renderToken) return;

  stage.innerHTML = `<div class="room-label">${room.label}</div>`;
  stage.classList.remove('dialog-active');
  setUIElementsVisible(true);   // altyazı açıkken oda değişirse envanter/ikonlar gizli kalmasın
  stage.style.backgroundImage = `url("${bgImage}")`;
  stage.style.backgroundSize = 'cover';
  stage.style.backgroundPosition = 'center';
  stage.style.backgroundRepeat = 'no-repeat';

  if (kapali) {
    const geri = document.createElement('div');
    geri.className = 'hotspot-pulse-wrap';
    geri.style.left = '9%'; geri.style.top = '57.5%'; geri.style.width = '7.5%'; geri.style.position = 'absolute';
    geri.innerHTML = `<img src="assets/arayuz/geri.webp" alt="Geri"><div class="hotspot-pulse-label">Geri</div>`;
    geri.onclick = () => { if (typeof calSes === 'function') calSes('geri'); currentRoom = 'merkez'; renderRoom(); };
    stage.appendChild(geri);

    const tokmak = document.createElement('div');
    tokmak.className = 'hotspot-pulse-wrap';
    tokmak.style.left = '50%'; tokmak.style.top = '45%'; tokmak.style.width = '7%'; tokmak.style.position = 'absolute';
    tokmak.innerHTML = `<img src="assets/arayuz/tokmak.webp" alt="Kapıyı çal"><div class="hotspot-pulse-label">Çal</div>`;
    tokmak.onclick = () => {
      if (typeof calSes === 'function') calSes('kimse_yok');
      showCustomSubtitle("Dedektif: Sanırım evde kimse yok...");
    };
    stage.appendChild(tokmak);
    if (typeof VFX !== 'undefined') VFX.clear();
    if (typeof SFX !== 'undefined') SFX.stop();
    if (typeof Ogretici !== 'undefined') Ogretici.iptal();
    return;
  }

  renderCharacter();

  if (room.hotspots) {
    room.hotspots.forEach(h => {
      if (h.showIf && !checkCond(h.showIf)) return;
      if (isHotspotHidden(h)) return;
      if (h.requires && !inventory.includes(h.requires)) return;
      if (h.activeDays && !h.activeDays.includes(currentDay)) return;
      if (h.hideIfCollected && (inventory.includes(h.hideIfCollected) || gameState.getFlag('col_' + h.hideIfCollected))) return;

      let ovImg = null;
      if (h.overlayImage) {
        ovImg = document.createElement('img');
        ovImg.className = 'room-clickable-glow';
        ovImg.src = h.overlayImage;
        ovImg.style.position = 'absolute';

        if (h.overlayBox) {
          // overlay tam ekran değil, hotspot kutusunun kendisi kadar
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
      if (h.clipPath) el.style.clipPath = h.clipPath;   // çokgen tıklama alanı

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

  setTimeout(() => {
    document.querySelectorAll('#stage .ikon-bekliyor').forEach(el => el.classList.remove('ikon-bekliyor'));
  }, 250);

  if (typeof VFX !== 'undefined') VFX.load(currentRoom, document.getElementById('stageFrame') || stage);
  if (typeof SFX !== 'undefined' && !introAcik) SFX.play(currentRoom);
  if (typeof Ogretici !== 'undefined') {
    Ogretici.kur({
      sahne: document.getElementById('stageFrame') || stage,
      icerik: (CASE && CASE.ogretici) || {},
      onek: (CASE && CASE.caseLabel) || 'oyun',
      mevcut: () => currentRoom
    });
    Ogretici.iptal();
    if (!introAcik && !Ogretici.goster(currentRoom) && inventory.some(id => ITEM_DEFS[id])) Ogretici.goster('envanter_ilk');
  }
}

function handleHotspot(h) {
  if (dialogueActive) return;

  if (h.icon && typeof calSes === 'function') {
    if (h.icon.includes('tokmak')) {
      if (h.type === 'gazeteci_kapi_ac' || h.type === 'kapida_konus') {
      } else if (h.type === 'gazeteci_odasi_gecis' || (h.type === 'navigate' && odaKapaliMi(h.target))) {
        calSes('kapi_git');
      } else {
        calSes('kapi');
      }
    }
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
  if (h.type === 'gazeteci_ses_kaydi_modal') { openGazeteciSesKaydiModal(); return; }
  if (h.type === 'yanik_kagit_incele_modal') { openYanikKagitModal(); return; }
  if (h.type === 'gazeteci_dosya_modal') { openGazeteciDosyaModal(h.images || gazeteciDosyaPagesDefault, 0); return; }

  if (h.type === 'gazeteci_odasi_gecis' || (currentRoom === 'han' && (h.target === 'han_kapi' || h.target === 'gazeteci_oda'))) {
    currentRoom = 'han_kapi';
    renderRoom();
    return;
  }

  if (h.type === 'kapida_konus' || h.type === 'gazeteci_kapi_ac') {
    const hasKey = inventory.includes('anahtar') || gameState.getFlag('gazeteci_oda_acik');

    if (hasKey) {
      if (typeof calSes === 'function') calSes('kilit_ac');
      inventory = inventory.filter(item => item !== 'anahtar');
      saveInventory();
      gameState.setFlag('gazeteci_oda_acik', true);
      renderInventory();
      currentRoom = 'gazeteci_oda';
      renderRoom();
      return;
    } else {
      if (typeof calSes === 'function') calSes('kilit');

      if (currentDay === 1) {
        const dialog1 = h.dialog || [
          { "speaker": "Hancı Rıza", "text": "Dedektif bey bu kapıyı size bugün açamam. Muhtar Halit beni tembihledi kağıtları merkezden getirene kadar açılmasın dedi. Yarın beraber gelin o zaman bakarsınız." }
        ];
        startOzelDialog(dialog1, h.characterImage || 'assets/karakterler/riza.webp');
      } else {
        showCustomSubtitle("Dedektif: Önce Hancı Rıza'dan anahtarı alsam iyi olur...", true);
      }
      return;
    }
  }

  if (h.type === 'navigate') {
    const nav = canNavigate(h.target);
    if (!nav.ok) {
      if (nav.msg) showCustomSubtitle(nav.msg, true);
      return;
    }
    currentRoom = h.target;
    renderRoom();
    return;
  }

  // Genel diyalog hotspot'u: { type:"dialogue", dialogKey:"bakirci1", characterImage:"..." }
  if (h.type === 'dialogue') {
    startOzelDialog(getDialogForRoom(h.dialogKey, null), h.characterImage);
    return;
  }

  if (h.type === 'photo') { openGorselModal(h.image, h.label); return; }
  if (h.type === 'dosya') { openStatement(0); return; }
  if (h.type === 'notebook') { openNotebook(); return; }
  if (h.type === 'sleep') { confirmSleep(); return; }
}

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
      setDayState('CANTA_UNLOCKED');
      currentRoom = 'gazeteci_oda_canta_ici';
      renderRoom();
    } else {
      if (typeof calSes === 'function') calSes('hata');
      showCustomSubtitle("Dedektif: Yanlış şifre... Kilit açılmadı.", true);
    }
  };
  stage.appendChild(ilerleBtn);
}

function confirmSleep() {
  // Gün JSON'undaki sleepRequires: eksik ipucu varsa uyutmaz
  const eksik = checkSleepRequirements();
  if (eksik) {
    showCustomSubtitle(eksik, true);
    return;
  }
  if (currentDay >= 7) {
    showModal(`
      <h3>Son Gün</h3>
      <p>Soruşturma bitti. Suçlamanı yapmaya hazır mısın?</p>
      <button onclick="closeModal(); baslatSuclama();">Suçlamayı Yap</button>
      <button class="ghost" onclick="closeModal()">Vazgeç</button>
    `);
    return;
  }
  showModal(`
    <h3>Uyumadan Önce</h3>
    <p>Uyumak istediğine emin misin? Bir sonraki güne geçeceksin.</p>
    <button onclick="closeModal(); sleep();">Evet, Uyu</button>
    <button class="ghost" onclick="closeModal()">Vazgeç</button>
  `);
}

function sleep() {
  if (currentDay >= 7) return;
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
    sleepTxtEl.style.fontSize = 'clamp(18px, 2.6vw, 32px)';
    sleepTxtEl.style.marginTop = '15px';
  }
  document.getElementById('sleepOverlay')?.classList.add('active');
}

function wakeUp() {
  if (currentSleepAudio) {
    currentSleepAudio.pause();
    currentSleepAudio = null;
  }

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
    applyDayStart(true);
    renderRoom();
  });
}

function introKapandi() {
  introAcik = false;
  if (typeof SFX !== 'undefined') { SFX.reset(); SFX.play(currentRoom); }
  if (typeof Ogretici !== 'undefined') Ogretici.goster(currentRoom);
}

function yeniOyun() {
  if (!confirm('Tüm ilerleme silinecek. Emin misin?')) return;
  try {
    Object.keys(localStorage).filter(k => k.indexOf('sd_') === 0).forEach(k => localStorage.removeItem(k));
  } catch (err) {}
  if (typeof Ogretici !== 'undefined') Ogretici.sifirla();
  location.reload();
}

/* ---------- SUÇLAMA ----------
   game_config.json: "culpritHash" (katilin hash'i), "maxGuesses" (varsayılan 3), "endings": {win, lose}
   Hash üretmek için tarayıcı konsolunda:  suclamaHashUret("Halit")
   NOT: İstemci tarafında tutulan her cevap, kaynağı okuyana açıktır. Hash sadece F12'de
   düz yazı görmeyi engeller; gerçek koruma için doğrulama bir sunucuda yapılmalı. */
function suclamaHash(name) {
  const str = ((CASE && CASE.caseLabel) || '') + '|' + name;   // cyrb53
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0, c; i < str.length; i++) {
    c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function suclamaHashUret(name) {
  const h = suclamaHash(name);
  console.log('"culpritHash": "' + h + '"');
  return h;
}

function suclamaHakki() {
  const max = (CASE && CASE.maxGuesses) || 3;
  const used = parseInt(localStorage.getItem('sd_guess_' + CASE.caseLabel) || '0', 10);
  return { max, used, left: Math.max(0, max - used) };
}

function baslatSuclama() {
  const ov = document.getElementById('suclamaOverlay');
  if (!ov) return;
  const hak = suclamaHakki();
  if (hak.left <= 0 && (CASE.culpritHash || CASE.culprit)) {
    ov.innerHTML = `<div class="suclama-sonuc">Suçlama hakkın kalmadı.</div>
      <button class="suclama-devam-btn" onclick="yeniOyun()">Yeni oyun</button>`;
    ov.classList.add('active');
    return;
  }
  const suspects = (CASE.notebook && CASE.notebook.suspects) || [];
  const hakMetni = (CASE.culpritHash || CASE.culprit) ? `<div class="suclama-sonuc" style="margin-bottom:12px">Kalan suçlama hakkı: ${hak.left}</div>` : '';
  ov.innerHTML = '<div class="suclama-baslik">Katili seç</div>' + hakMetni + '<div class="suclama-grid">' +
    suspects.map((s, i) => `<div class="suclama-kart" onclick="suclamaSec(${i})"><img src="${s.image}" alt=""><div class="suclama-isim">${s.name}</div></div>`).join('') +
    '</div>';
  ov.classList.add('active');
}

function suclamaSec(i) {
  const s = ((CASE.notebook && CASE.notebook.suspects) || [])[i];
  const ov = document.getElementById('suclamaOverlay');
  if (!s || !ov) return;

  if (!CASE.culpritHash && !CASE.culprit) {
    ov.innerHTML = `<div class="suclama-sonuc">${s.name} suçlandı. (game_config.json içine "culpritHash" eklenince doğru/yanlış sonucu burada çıkar.)</div>
      <button class="suclama-devam-btn" onclick="baslatSuclama()">Tekrar seç</button>
      <button class="suclama-devam-btn" onclick="yeniOyun()">Yeni oyun</button>`;
    return;
  }

  const dogru = CASE.culpritHash ? suclamaHash(s.name) === CASE.culpritHash : s.name === CASE.culprit;
  if (dogru) {
    const metin = (CASE.endings && CASE.endings.win) || 'Doğru kişiyi buldun, dava çözüldü.';
    ov.innerHTML = `<div class="suclama-sonuc">${metin}</div>
      <button class="suclama-devam-btn" onclick="yeniOyun()">Yeni oyun</button>`;
    return;
  }

  localStorage.setItem('sd_guess_' + CASE.caseLabel, String(suclamaHakki().used + 1));
  const kalan = suclamaHakki().left;
  const metin = (CASE.endings && CASE.endings.lose) || 'Yanlış kişiyi suçladın...';
  ov.innerHTML = `<div class="suclama-sonuc">${metin}</div>
    ${kalan > 0
      ? `<div class="suclama-sonuc" style="margin-bottom:12px">Kalan hak: ${kalan}</div><button class="suclama-devam-btn" onclick="baslatSuclama()">Tekrar seç</button>`
      : ''}
    <button class="suclama-devam-btn" onclick="yeniOyun()">Yeni oyun</button>`;
}

// Not: top-level function bildirimleri zaten window'a bağlanır; eski "window.x = x" listesi
// (ve modals.js yüklenmezse ReferenceError ile oyunu kilitleme riski) kaldırıldı.
window.onload = () => { initGame(); };
