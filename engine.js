/* ============================================================
   ODA MOTORU — Sislidere Köyü Davası (Tam Sürüm / Düzeltilmiş)
   ============================================================ */

// Diyalog esnasında arka plandaki tüm hotspot ve görselleri gizleyen CSS kuralı
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
let currentRoom = null;
let inventory = [];
let currentDay = 1;
let calibMode = false;
let calibClicks = [];
let currentSleepAudio = null;

// Gazeteci odası ve alt odalarının listesi
const journalistRooms = [
  'gazeteci_oda', 'gazeteci_oda_cop', 'gazeteci_oda_canta', 
  'gazeteci_oda_sifre_giris', 'gazeteci_oda_canta_ici', 'gazeteci_oda_masa', 'gazeteci_oda_tablo'
];

// --- 2. GÜN DURUM YÖNETİMİ ---
let day2State = localStorage.getItem('sd_day2_state') || 'GO_MUHTAR';
let day2PolisGoruldu = localStorage.getItem('sd_day2_polis_goruldu') === 'true';

function setDay2State(newState) {
  day2State = newState;
  localStorage.setItem('sd_day2_state', newState);
}

// --- ŞİFRE KİRMA MİNİ OYUNU DEĞİŞKENLERİ ---
let lockDigits = [0, 0, 0, 0, 0];

// --- GAZETECİ DOSYASI ÇOKLU SAYFA DEĞİŞKENLERİ ---
let gazeteciDosyaPagesDefault = [
  'assets/arayuz/gazeteci_dosya_1.webp',
  'assets/arayuz/gazeteci_dosya_2.webp'
];

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
    
    renderInventory();
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

/* ---------- ARAYÜZ GİZLEME / GÖSTERME (DİYALOG VE MODAL İÇİN) ---------- */
function setUIElementsVisible(visible) {
  const invEl = document.getElementById('inventory') || document.querySelector('.inventory-bar');
  const cornerEl = document.querySelector('.corner-icons');
  if (invEl) invEl.style.display = visible ? '' : 'none';
  if (cornerEl) cornerEl.style.display = visible ? '' : 'none';
}

/* ---------- ODA ÇİZİMİ ---------- */
function renderRoom() {
  if (!CASE || !CASE.rooms || !CASE.rooms[currentRoom]) {
    console.error("Oda bulunamadı:", currentRoom);
    return;
  }

  renderInventory();

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
        showModal(`<p style="text-align:center;font-style:italic;color:#c9cabd;">(Kimse yok...)</p><button class="ghost" onclick="closeModal()">Kapat</button>`);
      };
      stage.appendChild(tokmak);
      setTimeout(() => tokmak.classList.remove('ikon-bekliyor'), 2000);

      stage.classList.remove('fading');
      return;
    }

    renderCharacter();

    if (room.hotspots) {
      room.hotspots.forEach(h => {
        if (h.requires && !inventory.includes(h.requires)) return;
        if (h.activeDays && !h.activeDays.includes(currentDay)) return;
        if (h.hideIfCollected && inventory.includes(h.hideIfCollected)) return;
        if (h.requiresDay2State && day2State !== h.requiresDay2State) return;

        let ovImg = null;
        if (h.overlayImage) {
          ovImg = document.createElement('img');
          ovImg.className = 'room-clickable-glow';
          ovImg.src = h.overlayImage;
          ovImg.style.position = 'absolute';

          // Çanta içi ve Bakırcılar gibi tam ekran saydam katmanlar için varsayılan tam boy konumlandırma
          ovImg.style.left = '0';
          ovImg.style.top = '0';
          ovImg.style.width = '100%';
          ovImg.style.height = '100%';

          ovImg.style.pointerEvents = 'none';
          ovImg.style.zIndex = '2';
          ovImg.style.transition = 'transform 0.22s ease-in-out, filter 0.22s ease-in-out';
          
          if (h.x && h.y) {
            const centerX = `calc(${h.x} + (${h.w || '10%'} / 2))`;
            const centerY = `calc(${h.y} + (${h.h || '10%'} / 2))`;
            ovImg.style.transformOrigin = `${centerX} ${centerY}`;
          }

          stage.appendChild(ovImg);
        }

        if (h.icon && !h.w && !h.h) {
          const wrap = document.createElement('div');
          wrap.className = 'hotspot-pulse-wrap ikon-bekliyor';
          wrap.style.position = 'absolute';
          wrap.style.left = h.x;
          wrap.style.top = h.y;
          wrap.style.width = h.iconWidth || '8%';
          wrap.style.zIndex = '10';
          wrap.style.pointerEvents = 'auto';

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

          wrap.onclick = (e) => { 
            if (e) e.stopPropagation();
            if (!calibMode && !dialogueActive) handleHotspot(h); 
          };
          stage.appendChild(wrap);
          setTimeout(() => wrap.classList.remove('ikon-bekliyor'), 2000);
          return;
        }

        const el = document.createElement('div');
        el.className = 'hotspot' + (h.icon ? ' hotspot-icon' : '');
        el.style.position = 'absolute';
        el.style.left = h.x; 
        el.style.top = h.y; 
        el.style.width = h.w || '10%'; 
        el.style.height = h.h || '10%';
        el.style.zIndex = '10';
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';

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

        const iconHtml = h.icon
          ? `<img src="${h.icon}" class="hotspot-icon-img" alt="" onerror="this.outerHTML='<div class=\\'hotspot-icon-missing\\'>görsel yok:<br>${h.icon}</div>'">`
          : '';
        el.innerHTML = `${iconHtml}<div class="hint">${h.hint || ''}</div>`;
        el.onclick = (e) => { 
          if (e) e.stopPropagation();
          if (!calibMode && !dialogueActive) handleHotspot(h); 
        };
        stage.appendChild(el);
      });
    }

    // --- ŞİFRE MİNİ OYUNU EKRANI KONTROLÜ ---
    if (currentRoom === 'gazeteci_oda_sifre_giris') {
      renderSifreMinigame(stage);
    }

    // --- ÇANTA İÇİ ÖZEL SADE ÇARPI (✕) KAPATMA BUTONU ---
    if (currentRoom === 'gazeteci_oda_canta_ici') {
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.className = 'canta-close-btn';
      closeBtn.style.cssText = "position:absolute; top:4%; right:4%; z-index:30; font-size:clamp(22px, 3.2cqw, 36px); background:rgba(0,0,0,0.65); border:2px solid #e9dcc0; border-radius:50%; width:clamp(38px, 4.5cqw, 52px); height:clamp(38px, 4.5cqw, 52px); color:#e9dcc0; cursor:pointer; display:flex; align-items:center; justify-content:center; text-shadow:0 2px 6px rgba(0,0,0,0.8); transition:all 0.2s;";
      closeBtn.onmouseover = () => closeBtn.style.transform = 'scale(1.1)';
      closeBtn.onmouseout = () => closeBtn.style.transform = 'scale(1)';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        currentRoom = 'gazeteci_oda';
        renderRoom();
      };
      stage.appendChild(closeBtn);
    }

    stage.classList.remove('fading');
  }, 180);
}

/* ---------- ŞİFRE MİNİ OYUNU SİSTEMİ ---------- */
function renderSifreMinigame(stage) {
  const numCoords = [
    { x: "32.8%", y: "57.5%" },
    { x: "39.0%", y: "57.2%" },
    { x: "46.1%", y: "57.3%" },
    { x: "52.7%", y: "57.2%" },
    { x: "59.2%", y: "57.2%" }
  ];

  const incCoords = [
    { x: "32.7%", y: "36.1%" },
    { x: "39.5%", y: "36.0%" },
    { x: "45.9%", y: "36.4%" },
    { x: "52.7%", y: "36.0%" },
    { x: "59.8%", y: "36.1%" }
  ];

  const decCoords = [
    { x: "32.6%", y: "79.0%" },
    { x: "39.2%", y: "78.5%" },
    { x: "45.3%", y: "78.5%" },
    { x: "52.4%", y: "78.7%" },
    { x: "59.0%", y: "78.5%" }
  ];

  numCoords.forEach((c, idx) => {
    const digitEl = document.createElement('div');
    digitEl.id = `sifreDigit_${idx}`;
    digitEl.style.position = 'absolute';
    digitEl.style.left = c.x;
    digitEl.style.top = c.y;
    digitEl.style.transform = 'translate(-50%, -50%)';
    digitEl.style.fontSize = 'clamp(24px, 3.5cqw, 48px)';
    digitEl.style.fontWeight = 'bold';
    digitEl.style.fontFamily = 'monospace, serif';
    digitEl.style.color = '#e9dcc0';
    digitEl.style.textShadow = '0 2px 6px rgba(0,0,0,0.9)';
    digitEl.style.userSelect = 'none';
    digitEl.style.pointerEvents = 'none';
    digitEl.style.zIndex = '10';
    digitEl.textContent = lockDigits[idx];
    stage.appendChild(digitEl);
  });

  incCoords.forEach((c, idx) => {
    const btn = document.createElement('div');
    btn.className = 'hotspot';
    btn.style.position = 'absolute';
    btn.style.left = c.x;
    btn.style.top = c.y;
    btn.style.width = '5.5%';
    btn.style.height = '8.5%';
    btn.style.transform = 'translate(-50%, -50%)';
    btn.style.cursor = 'pointer';
    btn.style.zIndex = '11';
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
    btn.style.left = c.x;
    btn.style.top = c.y;
    btn.style.width = '5.5%';
    btn.style.height = '8.5%';
    btn.style.transform = 'translate(-50%, -50%)';
    btn.style.cursor = 'pointer';
    btn.style.zIndex = '11';
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
  ilerleBtn.style.position = 'absolute';
  ilerleBtn.style.left = '67.5%';
  ilerleBtn.style.top = '57.2%';
  ilerleBtn.style.transform = 'translateY(-50%)';
  ilerleBtn.style.zIndex = '12';
  ilerleBtn.style.padding = '0.6em 1.6em';
  ilerleBtn.style.background = 'linear-gradient(180deg, #6b4423, #4a2f18)';
  ilerleBtn.style.color = '#e9dcc0';
  ilerleBtn.style.border = '2px solid #2c1c0e';
  ilerleBtn.style.borderRadius = '6px';
  ilerleBtn.style.fontFamily = 'inherit';
  ilerleBtn.style.fontSize = 'clamp(15px, 1.8cqw, 20px)';
  ilerleBtn.style.fontWeight = 'bold';
  ilerleBtn.style.cursor = 'pointer';
  ilerleBtn.style.boxShadow = '0 4px 0 #1c110a, 0 6px 12px rgba(0,0,0,0.6)';

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

function handleHotspot(h) {
  if (dialogueActive) return;

  if (h.type === 'kamera_bos_subtitle') {
    showCustomSubtitle("Dedektif: İçi boş, belki kamerayla bir şeyler çekmiştir bir yerlerde fotoğraf kağıdı bulabilirim.", true);
    return;
  }

  if (h.type === 'otopsi_merkez_kaydi_modal') {
    openOtopsiMerkezKaydiModal(0);
    return;
  }

  if (h.type === 'canta_evlilik_cuzdan_modal') {
    openCantaEvlilikCuzdanModal();
    return;
  }

  if (h.type === 'canta_kagitlar_modal') {
    openCantaKagitlarModal();
    return;
  }

  if (h.type === 'canta_polaroid_modal') {
    openCantaPolaroidModal();
    return;
  }

  if (h.type === 'yanik_kagit_incele_modal') {
    openYanikKagitModal();
    return;
  }

  if (h.type === 'gazeteci_dosya_modal') {
    openGazeteciDosyaModal(h.images || gazeteciDosyaPagesDefault, 0);
    return;
  }

  if (h.type === 'big_photo') {
    openBigPaperModal(h.image);
    return;
  }

  if (h.type === 'gazeteci_odasi_gecis' || (currentRoom === 'han' && (h.target === 'han_kapi' || h.target === 'gazeteci_oda' || h.target === 'gazeteci_odasi'))) {
    currentRoom = 'han_kapi';
    renderRoom();
    return;
  }

  if (h.type === 'kapida_konus' || h.type === 'gazeteci_kapi_ac' || (currentRoom === 'han_kapi' && h.type !== 'navigate')) {
    const hasKey = inventory.includes('anahtar') || day2State === 'HAN_UNLOCKED' || day2State === 'CANTA_UNLOCKED';

    if (hasKey) {
      if (typeof calSes === 'function') calSes('kilit_ac');
      
      inventory = inventory.filter(item => item !== 'anahtar');
      localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
      if (day2State !== 'CANTA_UNLOCKED') {
        setDay2State('HAN_UNLOCKED');
      }
      renderInventory();
      
      currentRoom = 'gazeteci_oda';
      renderRoom();
      return;
    } else {
      if (typeof calSes === 'function') calSes('kilit');
      if (h.dialog) {
        startOzelDialog(h.dialog, h.characterImage || 'assets/karakterler/riza.webp');
      } else {
        showCustomSubtitle("Dedektif: Kapı kilitli. Odaya girmek için Hancı Rıza'dan anahtarı almam lazım.", true);
      }
      return;
    }
  }

  // --- GEZİNTİ VE ÇIKIŞ KISITLAMALARI ---
  if (h.type === 'navigate') {
    if (journalistRooms.includes(currentRoom) && !journalistRooms.includes(h.target)) {
      if (day2State !== 'CANTA_UNLOCKED') {
        showCustomSubtitle("Dedektif: Çantayı incelemeden ve odadaki araştırmamı bitirmeden buradan çıkamam.", true);
        return;
      }
    }

    if (currentDay === 2) {
      if (day2State === 'GO_MUHTAR') {
        if (h.target && !['muhtar', 'merkez', 'ofis', 'masa', 'degirmenci', 'nadire_ev', 'halit_ev'].includes(h.target)) {
          showCustomSubtitle("Dedektif: Muhtarla dün konuşamadım en iyisi ilk ona gideyim de raporları alayım.", true);
          return;
        }
      } else if (day2State === 'GO_HAN') {
        if (h.target && !['han', 'han_kapi', 'merkez', 'muhtar', 'degirmenci', 'nadire_ev', 'halit_ev'].includes(h.target)) {
          showCustomSubtitle("Dedektif: Önce hana uğrasam daha iyi olacak.", true);
          return;
        }
      }
    }

    currentRoom = h.target;
    renderRoom();
    return;
  }

  if (h.type === 'dialogue_bakirci1') {
    startOzelDialog(CASE.day2_dialogs.bakirci1, 'assets/karakterler/bakirci1.webp');
    return;
  }
  if (h.type === 'dialogue_bakirci2') {
    startOzelDialog(CASE.day2_dialogs.bakirci2, 'assets/karakterler/bakirci2.webp');
    return;
  }

  if (h.type === 'examine')  { openExamine(h.target); return; }
  if (h.type === 'photo')    { openPhoto(h.image); return; }
  if (h.type === 'recorder') { openRecorder(h.target); return; }
  if (h.type === 'tv')       { openTV(h.target); return; }
  if (h.type === 'dosya')    { openStatement(0); return; }
  if (h.type === 'notebook') { openNotebook(); return; }
  if (h.type === 'sleep')    { confirmSleep(); return; }
}

/* OTOPSİ & CEBİNDEKİLER 2 SAYFALI İNCELEME MODALI */
function openOtopsiMerkezKaydiModal(index = 0) {
  const pages = ['assets/arayuz/otopsi.webp', 'assets/arayuz/cebindekiler.webp'];
  const body = document.getElementById('modalBody');
  const bg = document.getElementById('modalBg');
  if (!body || !bg) return;

  body.className = 'modal modal-fullscreen';
  bg.className = 'modal-bg active reader-mode';
  bg.style.backdropFilter = 'blur(10px)';
  bg.style.webkitBackdropFilter = 'blur(10px)';
  bg.style.background = 'rgba(0, 0, 0, 0.65)';

  body.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; max-width:100vw !important; width:100vw !important; height:100vh !important; max-height:100vh !important; overflow:hidden !important; display:flex; align-items:center; justify-content:center;";

  const src = pages[index];
  const prevDisabled = index === 0 ? 'disabled' : '';
  const nextDisabled = index === pages.length - 1 ? 'disabled' : '';

  body.innerHTML = `
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10001; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <button class="reader-side-arrow left" style="position:fixed; left:25px; top:50%; transform:translateY(-50%); z-index:10001;" onclick="openOtopsiMerkezKaydiModal(${index - 1})" ${prevDisabled}>‹</button>
    <div class="zoom-wrap" style="width:100vw; height:100vh; display:flex; justify-content:center; align-items:center;">
      <img id="photoZoomImg" src="${src}" style="max-width:92vw; max-height:92vh; object-fit:contain; filter:drop-shadow(0 0 30px rgba(0,0,0,0.95));" onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${src}</div>'">
    </div>
    <button class="reader-side-arrow right" style="position:fixed; right:25px; top:50%; transform:translateY(-50%); z-index:10001;" onclick="openOtopsiMerkezKaydiModal(${index + 1})" ${nextDisabled}>›</button>
  `;

  const el = document.getElementById('photoZoomImg');
  if (el) zoomKur(el.parentElement, el);
}

/* ÇANTA İÇİ ÖZEL MODALLAR */
function openCantaEvlilikCuzdanModal() {
  const body = document.getElementById('modalBody');
  const bg = document.getElementById('modalBg');
  if (!body || !bg) return;

  body.className = 'modal modal-fullscreen';
  bg.className = 'modal-bg active reader-mode';
  bg.style.backdropFilter = 'blur(10px)';
  bg.style.webkitBackdropFilter = 'blur(10px)';
  bg.style.background = 'rgba(0, 0, 0, 0.65)';

  body.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; max-width:100vw !important; width:100vw !important; height:100vh !important; max-height:100vh !important; overflow:hidden !important; display:flex; flex-direction:column; align-items:center; justify-content:center;";

  body.innerHTML = `
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10001; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div class="zoom-wrap" style="width:100vw; height:75vh; display:flex; justify-content:center; align-items:center;">
      <img id="photoZoomImg" src="assets/arayuz/evlilik_cuzdan.webp" style="max-width:90vw; max-height:70vh; object-fit:contain; filter:drop-shadow(0 0 30px rgba(0,0,0,0.95));" onerror="this.src='assets/arayuz/evlilik_cuzdani.webp';">
    </div>
    <div style="text-align:center; margin-top:15px; z-index:10002;">
      <button class="btn show" style="padding:0.7em 2em; background:linear-gradient(180deg, #6b4423, #4a2f18); color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; font-size:clamp(16px, 2cqw, 22px); cursor:pointer; box-shadow:0 4px 0 #1c110a, 0 6px 12px rgba(0,0,0,0.6);" onclick="if(typeof calSes==='function') calSes('take'); collect('evlilik_cuzdan','assets/arayuz/evlilik_cuzdan.webp');">
        ENVANTERE AL
      </button>
    </div>
  `;

  const el = document.getElementById('photoZoomImg');
  if (el) zoomKur(el.parentElement, el);
}

function openCantaKagitlarModal() {
  const body = document.getElementById('modalBody');
  const bg = document.getElementById('modalBg');
  if (!body || !bg) return;

  body.className = 'modal modal-fullscreen';
  bg.className = 'modal-bg active reader-mode';
  bg.style.backdropFilter = 'blur(10px)';
  bg.style.webkitBackdropFilter = 'blur(10px)';
  bg.style.background = 'rgba(0, 0, 0, 0.65)';

  body.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; max-width:100vw !important; width:100vw !important; height:100vh !important; max-height:100vh !important; overflow:hidden !important; display:flex; flex-direction:column; align-items:center; justify-content:center;";

  body.innerHTML = `
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10001; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeCantaKagitlarModal()">✕</button>
    <div class="zoom-wrap" style="width:100vw; height:85vh; display:flex; justify-content:center; align-items:center;">
      <img id="photoZoomImg" src="assets/arayuz/bos_kagit.webp" style="max-width:90vw; max-height:80vh; object-fit:contain; filter:drop-shadow(0 0 30px rgba(0,0,0,0.95));" onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>assets/arayuz/bos_kagit.webp</div>'">
    </div>
  `;

  const el = document.getElementById('photoZoomImg');
  if (el) zoomKur(el.parentElement, el);
}

function closeCantaKagitlarModal() {
  if (!inventory.includes('canta_kagitlar_incelendi')) {
    inventory.push('canta_kagitlar_incelendi');
    localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
  }
  closeModal();
  renderRoom();
  setTimeout(() => {
    showCustomSubtitle("Dedektif: Henüz bunlara bir şey yazamamış.", true);
  }, 300);
}

function openCantaPolaroidModal() {
  const body = document.getElementById('modalBody');
  const bg = document.getElementById('modalBg');
  if (!body || !bg) return;

  body.className = 'modal modal-fullscreen';
  bg.className = 'modal-bg active reader-mode';
  bg.style.backdropFilter = 'blur(10px)';
  bg.style.webkitBackdropFilter = 'blur(10px)';
  bg.style.background = 'rgba(0, 0, 0, 0.65)';

  body.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; max-width:100vw !important; width:100vw !important; height:100vh !important; max-height:100vh !important; overflow:hidden !important; display:flex; flex-direction:column; align-items:center; justify-content:center;";

  body.innerHTML = `
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10001; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div class="zoom-wrap" style="width:100vw; height:75vh; display:flex; justify-content:center; align-items:center;">
      <img id="photoZoomImg" src="assets/arayuz/poloroid.webp" style="max-width:90vw; max-height:70vh; object-fit:contain; filter:drop-shadow(0 0 30px rgba(0,0,0,0.95));" onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>assets/arayuz/poloroid.webp</div>'">
    </div>
    <div style="text-align:center; margin-top:15px; z-index:10002;">
      <button class="btn show" style="padding:0.7em 2em; background:linear-gradient(180deg, #6b4423, #4a2f18); color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; font-size:clamp(16px, 2cqw, 22px); cursor:pointer; box-shadow:0 4px 0 #1c110a, 0 6px 12px rgba(0,0,0,0.6);" onclick="if(typeof calSes==='function') calSes('take'); collect('polaroid','assets/arayuz/poloroid.webp');">
        ENVANTERE AL
      </button>
    </div>
  `;

  const el = document.getElementById('photoZoomImg');
  if (el) zoomKur(el.parentElement, el);
}

function openYanikKagitModal() {
  const body = document.getElementById('modalBody');
  const bg = document.getElementById('modalBg');
  if (!body || !bg) return;

  body.className = 'modal modal-fullscreen';
  bg.className = 'modal-bg active reader-mode';
  bg.style.backdropFilter = 'blur(10px)';
  bg.style.webkitBackdropFilter = 'blur(10px)';
  bg.style.background = 'rgba(0, 0, 0, 0.65)';

  body.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; max-width:100vw !important; width:100vw !important; height:100vh !important; max-height:100vh !important; overflow:hidden !important; display:flex; flex-direction:column; align-items:center; justify-content:center;";

  body.innerHTML = `
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10001; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div class="zoom-wrap" style="width:100vw; height:75vh; display:flex; justify-content:center; align-items:center;">
      <img id="photoZoomImg" src="assets/arayuz/yanik_kagit_incele.webp" style="max-width:90vw; max-height:70vh; object-fit:contain; filter:drop-shadow(0 0 30px rgba(0,0,0,0.95));" onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>assets/arayuz/yanik_kagit_incele.webp</div>'">
    </div>
    <div style="text-align:center; margin-top:15px; z-index:10002;">
      <button class="btn show" style="padding:0.7em 2em; background:linear-gradient(180deg, #6b4423, #4a2f18); color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; font-size:clamp(16px, 2cqw, 22px); cursor:pointer; box-shadow:0 4px 0 #1c110a, 0 6px 12px rgba(0,0,0,0.6);" onclick="if(typeof calSes==='function') calSes('take'); collect('yanik_kagit','assets/tiklanabilir/yanik_kagit_tiklanabilir.webp'); closeModal(); setTimeout(() => showCustomSubtitle('Dedektif: Kağıdın her yeri yanmış neredeyse hiç okunmuyor.', true), 200);">
        ENVANTERE EKLE
      </button>
    </div>
  `;

  const el = document.getElementById('photoZoomImg');
  if (el) zoomKur(el.parentElement, el);
}

/* 2 SAYFALI GAZETECİ DOSYASI MODAL SİSTEMİ */
function openGazeteciDosyaModal(pages = gazeteciDosyaPagesDefault, index = 0) {
  const body = document.getElementById('modalBody');
  const bg = document.getElementById('modalBg');
  if (!body || !bg) return;

  body.className = 'modal modal-fullscreen';
  bg.className = 'modal-bg active reader-mode';
  bg.style.backdropFilter = 'blur(10px)';
  bg.style.webkitBackdropFilter = 'blur(10px)';
  bg.style.background = 'rgba(0, 0, 0, 0.65)';

  body.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; max-width:100vw !important; width:100vw !important; height:100vh !important; max-height:100vh !important; overflow:hidden !important; display:flex; align-items:center; justify-content:center;";

  const src = pages[index];
  const total = pages.length;

  const prevDisabled = index === 0 ? 'disabled' : '';
  const nextDisabled = index === total - 1 ? 'disabled' : '';

  body.innerHTML = `
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10001; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <button class="reader-side-arrow left" style="position:fixed; left:25px; top:50%; transform:translateY(-50%); z-index:10001;" onclick="openGazeteciDosyaModal(CASE.rooms.gazeteci_oda_masa.hotspots.find(h=>h.type==='gazeteci_dosya_modal')?.images || gazeteciDosyaPagesDefault, ${index - 1})" ${prevDisabled}>‹</button>
    <div class="zoom-wrap" style="width:100vw; height:100vh; display:flex; justify-content:center; align-items:center;">
      <img id="photoZoomImg" src="${src}" style="max-width:92vw; max-height:92vh; object-fit:contain; filter:drop-shadow(0 0 30px rgba(0,0,0,0.95));" onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${src}</div>'">
    </div>
    <button class="reader-side-arrow right" style="position:fixed; right:25px; top:50%; transform:translateY(-50%); z-index:10001;" onclick="openGazeteciDosyaModal(CASE.rooms.gazeteci_oda_masa.hotspots.find(h=>h.type==='gazeteci_dosya_modal')?.images || gazeteciDosyaPagesDefault, ${index + 1})" ${nextDisabled}>›</button>
  `;

  const el = document.getElementById('photoZoomImg');
  if (el) zoomKur(el.parentElement, el);
}

function showCustomSubtitle(text, clickToDismiss = false) {
  const stage = document.getElementById('stage') || document.getElementById('stageFrame') || document.getElementById('gameStage');
  if (!stage) return;
  
  setUIElementsVisible(false);

  let sub = document.getElementById('sceneSubtitle');
  if (sub) sub.remove();

  sub = document.createElement('div');
  sub.id = 'sceneSubtitle';
  sub.className = 'scene-subtitle';
  sub.style.zIndex = '99999';
  sub.style.cursor = clickToDismiss ? 'pointer' : 'default';
  sub.innerHTML = `<div class="scene-subtitle-text">${text} ${clickToDismiss ? '<span style="font-size:0.75em; opacity:0.8; margin-left:10px;">(Devam etmek için tıkla)</span>' : ''}</div>`;
  stage.appendChild(sub);
  
  const gizliKaldir = () => {
    if (sub) sub.remove();
    setUIElementsVisible(true);
  };

  let timer = null;
  if (!clickToDismiss) {
    timer = setTimeout(gizliKaldir, 5000);
  }
  
  sub.onclick = (e) => {
    e.stopPropagation();
    if (timer) clearTimeout(timer);
    gizliKaldir();
  };
}

function startOzelDialog(dialogList, charImgPath, onCompleteCallback) {
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
      setUIElementsVisible(true);
      stage.removeEventListener('click', sonrakiSatir);
      dialogueActive = false;
      if (onCompleteCallback) onCompleteCallback();
    }
  }
  
  sonrakiSatir();
  setTimeout(() => stage.addEventListener('click', sonrakiSatir), 100);
}

function showAnahtarAcquisitionModal() {
  showModal(`
    <div style="text-align:center; padding:25px 15px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
      <h2 style="margin:0 0 15px 0; color:var(--amber-bright); font-size: clamp(24px, 3.8cqw, 42px); letter-spacing: 0.08em; text-transform: uppercase; text-shadow: 0 2px 8px rgba(0,0,0,0.8);">Oda Anahtarı Alındı</h2>
      <img src="assets/tiklanabilir/anahtar.webp" alt="Oda Anahtarı" style="width:90%; max-width:580px; height:auto; display:block; margin:15px auto 30px; filter:drop-shadow(0 15px 35px rgba(0,0,0,0.95)) drop-shadow(0 0 20px rgba(227,169,74,0.3)); transform: scale(1.15);">
      <button onclick="if(typeof calSes==='function') calSes('take'); collectKey(); closeModal(); renderRoom();" style="width:90%; max-width:480px; padding:20px 40px !important; font-size: clamp(18px, 2.8cqw, 32px) !important; letter-spacing:0.12em !important; border-radius:12px !important; box-shadow: 0 6px 25px rgba(201,138,44,0.6); transform: scale(1.05);">
        ENVANTERE AL
      </button>
    </div>
  `, true);
}

function collectKey() {
  if (!inventory.includes('anahtar')) {
    inventory.push('anahtar');
  }
  localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
  setDay2State('HAN_UNLOCKED');
  renderInventory();
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

function openBigPaperModal(src) {
  const body = document.getElementById('modalBody');
  const bg = document.getElementById('modalBg');
  if (!body || !bg) return;

  body.className = 'modal modal-fullscreen';
  bg.className = 'modal-bg active reader-mode';
  bg.style.backdropFilter = 'blur(10px)';
  bg.style.webkitBackdropFilter = 'blur(10px)';
  bg.style.background = 'rgba(0, 0, 0, 0.65)';

  body.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; max-width:100vw !important; width:100vw !important; height:100vh !important; max-height:100vh !important; overflow:hidden !important; display:flex; align-items:center; justify-content:center;";

  body.innerHTML = `
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10001; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div class="zoom-wrap" style="width:100vw; height:100vh; display:flex; justify-content:center; align-items:center;">
      <img id="photoZoomImg" src="${src}" style="max-width:92vw; max-height:92vh; object-fit:contain; filter:drop-shadow(0 0 30px rgba(0,0,0,0.95));" onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${src}</div>'">
    </div>
  `;

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

function renderInventory(lastImage) {
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
    el.style.width = 'clamp(38px, 4.5cqw, 54px)';
    el.style.height = 'clamp(38px, 4.5cqw, 54px)';
    el.style.minWidth = 'clamp(38px, 4.5cqw, 54px)';
    el.style.padding = '3px';
    el.style.margin = '0 3px';
    el.style.boxSizing = 'border-box';

    if (id === 'anahtar') {
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.innerHTML = `
        <img src="assets/tiklanabilir/anahtar.webp" alt="Anahtar" style="width: auto; height: 58%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
        <span style="font-size: clamp(8px, 0.8cqw, 11px); color: var(--amber-bright); margin-top: 2px; font-weight: 600; font-family: var(--mono); letter-spacing: 0.02em;">Anahtar</span>
      `;
      el.title = 'Gazetecinin Oda Anahtarı';
    } else if (id === 'evlilik_cuzdan') {
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.innerHTML = `
        <img src="assets/arayuz/evlilik_cuzdan.webp" alt="Evlilik Cüzdanı" style="width: auto; height: 58%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));" onerror="this.src='assets/arayuz/evlilik_cuzdani.webp';">
        <span style="font-size: clamp(7px, 0.7cqw, 10px); color: var(--amber-bright); margin-top: 2px; font-weight: 600; font-family: var(--mono); letter-spacing: 0.02em;">Cüzdan</span>
      `;
      el.title = 'Evlilik Cüzdanı';
    } else if (id === 'polaroid') {
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.innerHTML = `
        <img src="assets/arayuz/poloroid.webp" alt="Polaroid Fotoğraf" style="width: auto; height: 58%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
        <span style="font-size: clamp(7px, 0.7cqw, 10px); color: var(--amber-bright); margin-top: 2px; font-weight: 600; font-family: var(--mono); letter-spacing: 0.02em;">Polaroid</span>
      `;
      el.title = '(İşlenmemiş) Polaroid Fotoğraf Kağıdı';
    } else if (id === 'yanik_kagit') {
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.innerHTML = `
        <img src="assets/tiklanabilir/yanik_kagit_tiklanabilir.webp" alt="Yanık Kağıt" style="width: auto; height: 58%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
        <span style="font-size: clamp(7px, 0.7cqw, 10px); color: var(--amber-bright); margin-top: 2px; font-weight: 600; font-family: var(--mono); letter-spacing: 0.02em;">Yanık Kağıt</span>
      `;
      el.title = 'Yanık Kağıt';
    } else if (id === 'gazeteci_dosyasi') {
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.innerHTML = `
        <img src="assets/arayuz/gazeteci_dosya.webp" alt="Gazeteci Dosyası" style="width: auto; height: 58%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
        <span style="font-size: clamp(7px, 0.7cqw, 10px); color: var(--amber-bright); margin-top: 2px; font-weight: 600; font-family: var(--mono); letter-spacing: 0.02em;">Dosya</span>
      `;
      el.title = 'Gazeteci Dosyası';
    } else {
      el.textContent = '📄';
    }
    inv.appendChild(el);
  });
}

function openStatement(index) {
  stopStatementAudio();
  currentStatementIndex = index;
  const s = CASE.statements[index];
  const total = CASE.statements.length;

  const audioHtml = s.audio
    ? `<button class="reader-play-simple" id="readerPlayBtn" onclick="toggleStatementAudio('${s.audio}')">▶ Sorguyu Oynat</button>`
    : '';

  showModal(`
    <button class="reader-close" onclick="closeModal()">✕</button>
    <button class="reader-side-arrow left" onclick="${index > 0 ? `openStatement(${index - 1})` : ''}" ${index === 0 ? 'disabled' : ''}>‹</button>
    <div class="zoom-wrap" style="width:70vw;height:80vh;">
      <img class="reader-card-img-wide" id="statementZoomImg" src="${s.cardImage}"
           onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${s.cardImage}</div>'">
    </div>
    <button class="reader-side-arrow right" onclick="${index < total - 1 ? `openStatement(${index + 1})` : ''}" ${index === total - 1 ? 'disabled' : ''}>›</button>
    ${audioHtml}
  `, true);
  
  const mBody = document.getElementById('modalBody');
  if (mBody) mBody.classList.add('reader');
  const mBg = document.getElementById('modalBg');
  if (mBg) mBg.classList.add('reader-mode');
  
  const sImg = document.getElementById('statementZoomImg');
  if (sImg) zoomKur(sImg.parentElement, sImg);
}

let statementAudio = null, statementPlaying = false;
let currentStatementIndex = 0;

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

function openExamine(itemId) {
  const item = CASE.items[itemId];
  if (!item) {
    console.error("Bulunamayan item ID:", itemId);
    return;
  }

  const isCollected = item.collectId && inventory.includes(item.collectId);

  const imgHtml = item.image
    ? `<div class="zoom-wrap" style="display:flex; justify-content:center; align-items:center; margin:15px 0;">
         <img class="doc-img" id="examineZoomImg" src="${item.image}" style="max-height:55vh; max-width:80vw; object-fit:contain; filter:drop-shadow(0 10px 25px rgba(0,0,0,0.8));" onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${item.image}</div>'">
       </div>`
    : `<div class="doc-fallback">görsel yok</div>`;

  let bodyHtml = `
    <button class="reader-close" onclick="closeModal()">✕</button>
    <h3 style="text-align:center; margin-bottom:10px;">${item.title}</h3>
    ${imgHtml}
  `;

  if (item.desc) {
    bodyHtml += `<p style="text-align:center; font-size:14px; color:#c9cabd; margin-bottom:15px;">${item.desc}</p>`;
  }

  if (item.collectId && !isCollected) {
    bodyHtml += `
      <div style="text-align:center;">
        <button onclick="if(typeof calSes==='function') calSes('take'); collect('${item.collectId}','${item.image || ''}')" style="padding:12px 30px; font-size:18px; letter-spacing:0.05em;">
          Envantere Al
        </button>
      </div>`;
  } else {
    bodyHtml += `<div style="text-align:center;"><button class="ghost" onclick="closeModal()">Kapat</button></div>`;
  }

  showModal(bodyHtml, true);
  if (item.image) { const el = document.getElementById('examineZoomImg'); if (el) zoomKur(el.parentElement, el); }
}

function collect(collectId, image) {
  if (!inventory.includes(collectId)) {
    inventory.push(collectId);
    localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
    renderInventory(image);
  }
  closeModal();
  renderRoom();

  if (collectId === 'polaroid') {
    setTimeout(() => {
      showCustomSubtitle("Dedektif: Bu fotoğrafı fotoğraf odasına sokmadan göremem...", true);
    }, 250);
  }
}

function openTV(deviceId) {
  const dev = CASE.devices[deviceId];
  showModal(`
    <h3>${dev.title}</h3>
    <video class="tv-screen" controls ${dev.autoplay ? 'autoplay' : ''}>
      <source src="${dev.video}">
    </video>
    <p>${dev.desc || ''}</p>
    <button class="ghost" onclick="closeModal()">Kapat</button>
  `);
}

let tapeAudio = null, tapeInterval = null, tapePlaying = false, tapeSeconds = 0;
function openRecorder(deviceId) {
  const dev = CASE.devices[deviceId];
  showModal(`
    <h3>${dev.title}</h3>
    <div class="recorder">
      <div class="tape"><div class="reel" id="reelL"></div><div class="reel" id="reelR"></div></div>
      <div class="counter" id="counter">00:00</div>
      <div class="rec-controls"><button id="playBtn" onclick="toggleTape('${dev.audio}')">▶</button></div>
    </div>
    <p style="margin-top:14px;">${dev.desc || ''}</p>
    <button class="ghost" onclick="closeModal()" style="margin-top:6px;">Kapat</button>
  `);
  tapeAudio = new Audio(dev.audio);
}

function toggleTape() {
  tapePlaying = !tapePlaying;
  const btn = document.getElementById('playBtn');
  const reelL = document.getElementById('reelL'), reelR = document.getElementById('reelR');
  if (tapePlaying) {
    tapeAudio.play().catch(()=>{});
    if (btn) { btn.textContent = '⏸'; btn.classList.add('active'); }
    if (reelL) reelL.classList.add('spin'); 
    if (reelR) reelR.classList.add('spin');
    tapeInterval = setInterval(() => {
      tapeSeconds++;
      const m = String(Math.floor(tapeSeconds/60)).padStart(2,'0');
      const s = String(tapeSeconds%60).padStart(2,'0');
      const cnt = document.getElementById('counter');
      if (cnt) cnt.textContent = `${m}:${s}`;
    }, 1000);
  } else {
    tapeAudio.pause();
    if (btn) { btn.textContent = '▶'; btn.classList.remove('active'); }
    if (reelL) reelL.classList.remove('spin'); 
    if (reelR) reelR.classList.remove('spin');
    clearInterval(tapeInterval);
  }
}

function showModal(html, wide) {
  const body = document.getElementById('modalBody');
  if (!body) return;
  body.innerHTML = html;
  body.className = 'modal' + (wide ? ' wide' : '');
  const bg = document.getElementById('modalBg');
  if (bg) {
    bg.classList.remove('reader-mode');
    bg.classList.add('active');
  }
}

function closeModal() {
  clearInterval(tapeInterval); tapePlaying = false; tapeSeconds = 0;
  if (tapeAudio) { tapeAudio.pause(); tapeAudio = null; }
  stopStatementAudio();
  const bg = document.getElementById('modalBg');
  const body = document.getElementById('modalBody');
  
  if (body) {
    body.className = 'modal';
    body.style.cssText = "";
  }
  if (bg) {
    bg.classList.remove('active');
    bg.classList.remove('reader-mode');
    bg.style.backdropFilter = "";
    bg.style.webkitBackdropFilter = "";
    bg.style.background = "";
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
        if (journalistRooms.includes(currentRoom) && !journalistRooms.includes(h.target)) {
          if (day2State !== 'CANTA_UNLOCKED') {
            closeMap();
            showCustomSubtitle("Dedektif: Çantayı incelemeden ve odadaki araştırmamı bitirmeden buradan çıkamam.", true);
            return;
          }
        }

        if (currentDay === 2) {
          if (day2State === 'GO_MUHTAR' && !['muhtar', 'merkez', 'ofis', 'degirmenci', 'nadire_ev', 'halit_ev'].includes(h.target)) {
            closeMap();
            showCustomSubtitle("Dedektif: Muhtarla dün konuşamadım en iyisi ilk ona gideyim de raporları alayım.", true);
            return;
          }
          if (day2State === 'GO_HAN' && !['han', 'han_kapi', 'merkez', 'muhtar', 'degirmenci', 'nadire_ev', 'halit_ev'].includes(h.target)) {
            closeMap();
            showCustomSubtitle("Dedektif: Önce hana uğrasam daha iyi olacak.", true);
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
  if (typeof calSes === 'function') calSes('kitap');
  if (!notebookState) loadNotebook();
  const nbImg = document.getElementById('notebookImage');
  const nbFallback = document.getElementById('notebookImgFallback');
  const nbWrap = document.getElementById('notebookImgWrap');
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
    if (nbFallback) nbFallback.style.display = 'none';
    nbImg.onerror = () => {
      nbImg.style.display = 'none';
      if (nbFallback) {
        nbFallback.style.display = 'flex';
        nbFallback.textContent = `görsel bulunamadı: ${src}`;
      }
    };
    nbImg.onload = () => {
      if (nbImg.naturalWidth && nbImg.naturalHeight && nbWrap) {
        nbWrap.style.aspectRatio = `${nbImg.naturalWidth} / ${nbImg.naturalHeight}`;
      }
      renderNotebookPage();
    };
    nbImg.src = src;
  }

  const nbOv = document.getElementById('notebookOverlay');
  if (nbOv) nbOv.classList.add('active');
  requestAnimationFrame(renderNotebookPage);
}

function closeNotebook() {
  const nbOv = document.getElementById('notebookOverlay');
  if (nbOv) nbOv.classList.remove('active');
}

const NB_SOL_SATIRLAR = [
  { taraf: 'solUst', yaziId: 'nbYaziSolUst', canvasId: 'nbCanvasSolUst', photoId: 'nbPhoto0', nameId: 'nbName0', notesId: 'nbNotesSolUst' },
  { taraf: 'solAlt', yaziId: 'nbYaziSolAlt', canvasId: 'nbCanvasSolAlt', photoId: 'nbPhoto1', nameId: 'nbName1', notesId: 'nbNotesSolAlt' }
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
        const eskiFallback = document.getElementById(photoEl.id + '-fallback');
        if (eskiFallback) eskiFallback.remove();
        photoEl.onerror = () => {
          photoEl.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.className = 'nb-suspect-photo-missing';
          fallback.id = photoEl.id + '-fallback';
          fallback.style.top = photoTop;
          fallback.style.left = photoLeft;
          fallback.style.height = photoHeight;
          fallback.textContent = `görsel yok:\n${suspect.image}`;
          photoEl.insertAdjacentElement('afterend', fallback);
        };
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
  const egG = document.getElementById('nbEdgeGeri');
  if (egG) egG.disabled = notebookState.page === 0;
  const egI = document.getElementById('nbEdgeIleri');
  if (egI) egI.disabled = notebookState.page === total - 1;
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
  while (el.scrollHeight > el.clientHeight + 1 && el.value.length > 0) {
    el.value = el.value.slice(0, -1);
  }
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
  if (!confirm('Bu sayfadaki yazı ve çizimler silinsin mi? (Fotoğraf ve isimler etkilenmez)')) return;
  const p = notebookState.pages[notebookState.page];
  p.solUst = ''; p.solAlt = ''; p.sag = ''; p.pageDrawing = null;
  saveNotebook();
  renderNotebookPage();
}

function notebookModAyarla(mod) {
  notebookMod = mod;
  const mYaz = document.getElementById('nbModYaz');
  if (mYaz) mYaz.classList.toggle('active', mod === 'yaz');
  const mCiz = document.getElementById('nbModCiz');
  if (mCiz) mCiz.classList.toggle('active', mod === 'ciz');
  const mSil = document.getElementById('nbModSil');
  if (mSil) mSil.classList.toggle('active', mod === 'sil');
  
  const cFull = document.getElementById('nbCanvasFull');
  if (cFull) cFull.classList.toggle('pasif', mod === 'yaz');
  document.querySelectorAll('.nb-yazi').forEach(t => t.style.pointerEvents = mod === 'yaz' ? 'auto' : 'none');
}

function notebookRenkSec(renk) {
  notebookRenk = renk;
  const rSiy = document.getElementById('nbRenkSiyah');
  if (rSiy) rSiy.classList.toggle('aktif', renk === '#1a1a1a');
  const rKir = document.getElementById('nbRenkKirmizi');
  if (rKir) rKir.classList.toggle('aktif', renk === '#8f2a1e');
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

let characterAudio = null;
let dialogueActive = false;
let dialogIndex = 0;

function renderCharacter() {
  dialogueActive = false;
  characterAudio = null;
  dialogIndex = 0;
  setUIElementsVisible(true);

  // --- 2. GÜN OFİSE İLK GELİŞTE POLİS DİYALOĞU ---
  if (currentDay === 2 && currentRoom === 'ofis' && day2State === 'CANTA_UNLOCKED' && !day2PolisGoruldu) {
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
  hit.onclick = (e) => { 
    if (e) e.stopPropagation();
    if (!calibMode && !dialogueActive) startDialogueFromClickable(ch); 
  };
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
  el.onclick = (e) => { 
    if (e) e.stopPropagation();
    if (!calibMode) toggleCharacterLine(ch); 
  };
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
  const stage = document.getElementById('stage') || document.getElementById('gameStage');

  // --- 2. GÜN ÖZEL DİYALOG TİTLEMELERİ ---
  if (currentDay === 2) {
    if (currentRoom === 'ofis' && day2State === 'CANTA_UNLOCKED' && !day2PolisGoruldu) {
      document.getElementById('sceneCharacter')?.remove();
      document.getElementById('roomClickableGlow')?.remove();
      document.getElementById('roomClickableHit')?.remove();

      startOzelDialog(CASE.day2_dialogs.polis_ofis, ch.image, () => {
        day2PolisGoruldu = true;
        localStorage.setItem('sd_day2_polis_goruldu', 'true');
        
        inventory = inventory.filter(item => item !== 'polaroid');
        localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
        renderInventory();

        renderRoom();
      });
      return;
    }

    if (currentRoom === 'muhtar') {
      document.getElementById('sceneCharacter')?.remove();
      document.getElementById('roomClickableGlow')?.remove();
      document.getElementById('roomClickableHit')?.remove();

      startOzelDialog(CASE.day2_dialogs.muhtar_halit, ch.image, () => {
        if (day2State === 'GO_MUHTAR') setDay2State('GO_HAN');
        renderRoom();
        showCustomSubtitle("Dedektif: Muhtar selamını iletti, şimdi Hana gidip gazetecinin odasının anahtarını alabilirim.", true);
      });
      return;
    }

    if (currentRoom === 'han') {
      document.getElementById('sceneCharacter')?.remove();
      document.getElementById('roomClickableGlow')?.remove();
      document.getElementById('roomClickableHit')?.remove();

      startOzelDialog(CASE.day2_dialogs.hanci_riza, ch.image, () => {
        if (!inventory.includes('anahtar') && day2State !== 'HAN_UNLOCKED' && day2State !== 'CANTA_UNLOCKED') {
          showAnahtarAcquisitionModal();
        } else {
          renderRoom();
        }
      });
      return;
    }

    if (currentRoom === 'kilise') {
      document.getElementById('sceneCharacter')?.remove();
      document.getElementById('roomClickableGlow')?.remove();
      document.getElementById('roomClickableHit')?.remove();
      startOzelDialog(CASE.day2_dialogs.peder_anselm, ch.image, () => renderRoom());
      return;
    }

    if (currentRoom === 'halit_ev') {
      document.getElementById('sceneCharacter')?.remove();
      document.getElementById('roomClickableGlow')?.remove();
      document.getElementById('roomClickableHit')?.remove();
      startOzelDialog(CASE.day2_dialogs.aylin, ch.image, () => renderRoom());
      return;
    }

    if (currentRoom === 'sifahane') {
      document.getElementById('sceneCharacter')?.remove();
      document.getElementById('roomClickableGlow')?.remove();
      document.getElementById('roomClickableHit')?.remove();
      startOzelDialog(CASE.day2_dialogs.kamuran, ch.image, () => renderRoom());
      return;
    }

    if (currentRoom === 'mezarlik') {
      document.getElementById('sceneCharacter')?.remove();
      document.getElementById('roomClickableGlow')?.remove();
      document.getElementById('roomClickableHit')?.remove();
      startOzelDialog(CASE.day2_dialogs.cevdet, ch.image, () => renderRoom());
      return;
    }

    if (currentRoom === 'demirci') {
      document.getElementById('sceneCharacter')?.remove();
      document.getElementById('roomClickableGlow')?.remove();
      document.getElementById('roomClickableHit')?.remove();
      startOzelDialog(CASE.day2_dialogs.cabbar, ch.image, () => renderRoom());
      return;
    }
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
      const sub = document.getElementById('sceneSubtitle');
      if (sub) sub.remove();
      const c = document.getElementById('sceneCharacter');
      if (c) c.remove();
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
  
  if (charEl && ch) {
    if (satir.emotion) {
      const lastDot = ch.image.lastIndexOf('.');
      const basePath = ch.image.substring(0, lastDot);
      const ext = ch.image.substring(lastDot);
      charEl.src = `${basePath}_${satir.emotion}${ext}`;
    } else {
      charEl.src = ch.image;
    }
  }

  sub.innerHTML = `<div class="scene-subtitle-name">${satir.speaker}</div><div class="scene-subtitle-text">${satir.text}</div>`;
}

function zoomKur(wrap, img) {
  let scale = 1, panX = 0, panY = 0;
  let startDist = 0, startScale = 1;
  let startX = 0, startY = 0, startPanX = 0, startPanY = 0;
  let sürükleniyor = false, fareBasili = false, fareX = 0, fareY = 0;

  function uygula() { img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`; }
  function sinirla() { if (scale < 1) { scale = 1; panX = 0; panY = 0; } }
  function uzaklik(t1, t2) { return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY); }
  function orta(t1, t2) { return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 }; }

  function origadaAyarla(clientX, clientY) {
    const rect = img.getBoundingClientRect();
    const oranX = ((clientX - rect.left) / rect.width) * 100;
    const oranY = ((clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = `${oranX}% ${oranY}%`;
  }

  function fareTaşı(e) {
    if (!fareBasili) return;
    panX = startPanX + (e.clientX - fareX);
    panY = startPanY + (e.clientY - fareY);
    uygula();
  }

  function fareBırak() { fareBasili = false; }

  wrap.addEventListener('dblclick', (e) => {
    if (scale === 1) {
      origadaAyarla(e.clientX, e.clientY);
      scale = 2.5;
    } else {
      scale = 1; panX = 0; panY = 0;
    }
    uygula();
  });

  wrap.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      startDist = uzaklik(e.touches[0], e.touches[1]);
      startScale = scale;
      const m = orta(e.touches[0], e.touches[1]);
      origadaAyarla(m.x, m.y);
    } else if (e.touches.length === 1 && scale > 1) {
      sürükleniyor = true; startX = e.touches[0].clientX; startY = e.touches[0].clientY;
      startPanX = panX; startPanY = panY;
    }
  }, { passive: true });

  wrap.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      scale = Math.min(4, Math.max(1, startScale * (uzaklik(e.touches[0], e.touches[1]) / startDist)));
      sinirla(); uygula();
    } else if (e.touches.length === 1 && sürükleniyor) {
      panX = startPanX + (e.touches[0].clientX - startX);
      panY = startPanY + (e.touches[0].clientY - startY);
      uygula();
    }
  }, { passive: true });

  wrap.addEventListener('touchend', () => { sürükleniyor = false; });

  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (scale === 1 && e.deltaY < 0) origadaAyarla(e.clientX, e.clientY);
    scale = Math.min(4, Math.max(1, scale - e.deltaY * 0.0015));
    sinirla(); uygula();
  }, { passive: false });

  wrap.addEventListener('mousedown', (e) => {
    if (scale <= 1) return;
    fareBasili = true; fareX = e.clientX; fareY = e.clientY; startPanX = panX; startPanY = panY;
  });

  window.addEventListener('mousemove', fareTaşı);
  window.addEventListener('mouseup', fareBırak);

  return {
    sifirla: () => {
      scale = 1; panX = 0; panY = 0; img.style.transformOrigin = 'center center'; uygula();
      window.removeEventListener('mousemove', fareTaşı);
      window.removeEventListener('mouseup', fareBırak);
    }
  };
}