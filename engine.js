/* ============================================================
   ODA MOTORU — Sislidere Köyü Davası
   ============================================================ */

let CASE = null;
let currentRoom = null;
let inventory = [];
let currentDay = 1;
let calibMode = false;
let calibClicks = [];
let currentSleepAudio = null;

// case.json isteğine timestamp ekleyerek cache sorununu önlüyoruz
fetch('case.json?v=' + Date.now())
  .then(r => {
    if (!r.ok) throw new Error("HTTP Hata Kodu: " + r.status);
    return r.json();
  })
  .then(data => {
    CASE = data;
    
    // caseTitle kontrolü eklendi (index.html üzerinde yoksa hata fırlatmayacak)
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
  if (h.type === 'navigate') { currentRoom = h.target; renderRoom(); return; }
  if (h.type === 'examine')  { openExamine(h.target); return; }
  if (h.type === 'photo')    { openPhoto(h.image); return; }
  if (h.type === 'recorder') { openRecorder(h.target); return; }
  if (h.type === 'tv')       { openTV(h.target); return; }
  if (h.type === 'dosya')    { openStatement(0); return; }
  if (h.type === 'notebook') { openNotebook(); return; }
  if (h.type === 'sleep')    { confirmSleep(); return; }
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

function dosyaAdiNormalle(str) {
  return str.toLocaleLowerCase('tr-TR')
    .replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g')
    .replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
}

function suclamaGoster(html) {
  const ov = document.getElementById('suclamaOverlay');
  if (ov) {
    ov.innerHTML = html;
    ov.classList.add('active');
  }
}

function finalSuclamayaBaslat() {
  const suspects = (CASE.notebook && CASE.notebook.suspects) || [];
  const kartlar = suspects.map(s => `
    <div class="suclama-kart" onclick="suphesecildi('${s.name}')">
      <img src="${s.image}" alt="${s.name}">
      <div class="suclama-isim">${s.name}</div>
    </div>
  `).join('');
  suclamaGoster(`
    <h2 class="suclama-baslik">Katil Kim?</h2>
    <div class="suclama-grid">${kartlar}</div>
  `);
}

function suphesecildi(isim) {
  const finalDosyaMap = {
    'ansel': 'ansel_final_sorgu.png',
    'aylin': 'aylin_fnal_srogu.png',
    'cabbar': 'cabbar_final_srogu.png',
    'cevdet': 'cevdet_final_sorgu.png',
    'halit': 'halit_final_sorgu.png',
    'kamuran': 'kamuran_final_srogu.png',
    'mustafa': 'mustafa_final_srogu.png',
    'nadire': 'nadire_final_sorgu.png',
    'riza': 'riza_final_sorgu.png'
  };

  const key = dosyaAdiNormalle(isim);
  const dosyaAdi = finalDosyaMap[key] || `${key}_final_sorgu.png`;
  const dosya = `assets/sorgu/final_sorgu/${dosyaAdi}`;

  if (isim === 'Mustafa') {
    suclamaGoster(`
      <div class="zoom-wrap" style="width:70vw;height:80vh;">
        <img class="suclama-gorsel" id="itirafZoomImg" src="${dosya}" alt="Mustafa'nın İtirafı"
             onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${dosya}</div>'">
      </div>
      <button class="suclama-devam-btn" onclick="oyunKazanildi()">Devam Et</button>
    `);
    const itirafImg = document.getElementById('itirafZoomImg');
    if (itirafImg) zoomKur(itirafImg.parentElement, itirafImg);
  } else {
    suclamaGoster(`
      <div class="zoom-wrap" style="width:70vw;height:80vh;">
        <img class="suclama-gorsel" id="sorguZoomImg" src="${dosya}" alt="${isim} - Sorgu"
             onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${dosya}</div>'">
      </div>
      <button class="suclama-devam-btn" onclick="oyunKaybedildi()">Devam Et</button>
    `);
    const sorguImg = document.getElementById('sorguZoomImg');
    if (sorguImg) zoomKur(sorguImg.parentElement, sorguImg);
  }
}

function oyunKaybedildi() {
  suclamaGoster(`
    <p class="suclama-sonuc">Katili bulamadın.</p>
    <button class="suclama-devam-btn" onclick="oyunuSifirla()">Tekrar Başla</button>
  `);
}

function oyunKazanildi() {
  suclamaGoster(`
    <p class="suclama-sonuc">Bravo dedektif, katili buldun!</p>
    <button class="suclama-devam-btn" onclick="emegiGecenlerGoster()">Devam Et</button>
  `);
}

function emegiGecenlerGoster() {
  suclamaGoster(`
    <h2 class="suclama-baslik">Emeği Geçenler</h2>
    <p class="suclama-credits">✍️ Hikaye &amp; Senaryo — RENC, Aylin Kılınçarslan</p>
    <button class="suclama-devam-btn" onclick="finalEkranGoster()">Devam Et</button>
  `);
}

function finalEkranGoster() {
  suclamaGoster(`
    <button class="suclama-devam-btn" onclick="oyunuSifirla()">Tekrar Oyna</button>
  `);
}

function oyunuSifirla() {
  localStorage.removeItem('sd_day_' + CASE.caseLabel);
  localStorage.removeItem('sd_inv_' + CASE.caseLabel);
  localStorage.removeItem('sd_notebook_v3_' + CASE.caseLabel);
  window.location.href = 'index.html';
}

let currentStatementIndex = 0;

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

document.addEventListener('keydown', (e) => {
  if (!document.querySelector('.reader-card-img-wide')) return;
  if (e.key === 'ArrowRight' && currentStatementIndex < CASE.statements.length - 1) openStatement(currentStatementIndex + 1);
  if (e.key === 'ArrowLeft' && currentStatementIndex > 0) openStatement(currentStatementIndex - 1);
});

let statementAudio = null, statementPlaying = false;
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
  const imgHtml = item.image
    ? `<div class="zoom-wrap"><img class="doc-img" id="examineZoomImg" src="${item.image}" onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${item.image}</div>'"></div>`
    : `<div class="doc-fallback">görsel yok</div>`;
  let bodyHtml = `<h3>${item.title}</h3>${imgHtml}<p>${item.desc || ''}</p>`;

  if (item.lockedCode) {
    bodyHtml += `
      <div class="locked-box">
        <input id="unlockInput" placeholder="kod gir..." maxlength="8">
        <button onclick="tryUnlock('${itemId}')">Çöz</button>
      </div>`;
  } else if (item.collectId) {
    bodyHtml += `<button onclick="collect('${item.collectId}','${item.image || ''}')">Envantere Al</button>`;
  }
  bodyHtml += `<button class="ghost" onclick="closeModal()">Kapat</button>`;

  showModal(bodyHtml);
  if (item.image) { const el = document.getElementById('examineZoomImg'); if (el) zoomKur(el.parentElement, el); }
}

function tryUnlock(itemId) {
  const item = CASE.items[itemId];
  const val = document.getElementById('unlockInput').value.trim();
  if (val === item.lockedCode) {
    showModal(`<h3>${item.title}</h3><p>${item.unlockedText || 'çözüldü.'}</p><button class="ghost" onclick="closeModal()">Kapat</button>`);
  } else {
    const unInp = document.getElementById('unlockInput');
    if (unInp) {
      unInp.style.borderColor = '#8f3a2e';
      unInp.placeholder = 'yanlış kod';
    }
  }
}

function collect(collectId, image) {
  if (!inventory.includes(collectId)) {
    inventory.push(collectId);
    localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
    renderInventory(image);
  }
  closeModal();
  renderRoom();
}

function renderInventory(lastImage) {
  const inv = document.getElementById('inventory');
  if (!inv) return;
  if (inventory.length === 0) { inv.innerHTML = '<span class="inv-empty">envanter boş</span>'; return; }
  inv.innerHTML = '';
  inventory.forEach(id => {
    const el = document.createElement('div');
    el.className = 'inv-item';
    el.textContent = '📄';
    inv.appendChild(el);
  });
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
  if (bg) {
    bg.classList.remove('active');
    bg.classList.remove('reader-mode');
  }
}

const bgEl = document.getElementById('modalBg');
if (bgEl) {
  bgEl.onclick = (e) => { if (e.target.id === 'modalBg') closeModal(); };
}

const calibToggle = document.getElementById('calibToggle');
const stageEl = document.getElementById('stage') || document.getElementById('gameStage');
const readout = document.getElementById('calibReadout');

if (calibToggle && stageEl) {
  calibToggle.onclick = () => {
    calibMode = !calibMode;
    calibClicks = [];
    calibToggle.textContent = `🎯 Kalibrasyon Modu: ${calibMode ? 'Açık' : 'Kapalı'}`;
    calibToggle.classList.toggle('on', calibMode);
    stageEl.classList.toggle('calib-active', calibMode);
    if (readout) readout.textContent = calibMode ? 'Sol-üst köşeye tıkla, sonra sağ-alt köşeye tıkla.' : '';
  };

  stageEl.addEventListener('click', (e) => {
    if (!calibMode) return;
    const rect = stageEl.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const yPct = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);

    const marker = document.createElement('div');
    marker.className = 'calib-marker';
    marker.style.left = xPct + '%';
    marker.style.top = yPct + '%';
    stageEl.appendChild(marker);

    calibClicks.push({ x: parseFloat(xPct), y: parseFloat(yPct) });

    if (calibClicks.length === 2) {
      const [p1, p2] = calibClicks;
      const x = Math.min(p1.x, p2.x).toFixed(1);
      const y = Math.min(p1.y, p2.y).toFixed(1);
      const w = Math.abs(p2.x - p1.x).toFixed(1);
      const h = Math.abs(p2.y - p1.y).toFixed(1);
      const snippet = `{ "x": "${x}%", "y": "${y}%", "w": "${w}%", "h": "${h}%", "type": "examine", "target": "...", "hint": "..." }`;
      if (readout) readout.textContent = snippet;
      console.log('Hotspot koordinatı:', snippet);
      calibClicks = [];
      setTimeout(() => { document.querySelectorAll('.calib-marker').forEach(m => m.remove()); }, 1500);
    } else {
      if (readout) readout.textContent = `İlk nokta: x:${xPct}% y:${yPct}%  — şimdi karşı köşeye tıkla`;
    }
  });
}

function openMap() {
  if (!CASE.map) { alert('Bu vaka dosyasında harita tanımlı değil (case.json → "map").'); return; }
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
        if (h.target && CASE.rooms[h.target]) {
          currentRoom = h.target;
          closeMap();
          renderRoom();
        } else {
          alert(`"${h.label}" henüz case.json'a eklenmedi.`);
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
  document.querySelector('.corner-icons')?.classList.remove('dialog-gizli');

  const ch = CASE.characters && CASE.characters[currentRoom];
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
  window.addEventListener('mousemove', (e) => {
    if (!fareBasili) return;
    panX = startPanX + (e.clientX - fareX); panY = startPanY + (e.clientY - fareY);
    uygula();
  });
  window.addEventListener('mouseup', () => { fareBasili = false; });

  return { sifirla: () => { scale = 1; panX = 0; panY = 0; img.style.transformOrigin = 'center center'; uygula(); } };
}