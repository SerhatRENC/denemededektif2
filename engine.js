/* ============================================================
   ODA MOTORU — Sislidere Köyü Davası (Tam Sürüm)
   ============================================================ */

let CASE = null;
let currentRoom = null;
let inventory = [];
let currentDay = 1;
let calibMode = false;
let dialogueActive = false;

fetch('case.json')
  .then(r => r.json())
  .then(data => {
    CASE = data;
    document.getElementById('caseTitle').textContent = CASE.title || '';
    currentRoom = CASE.startRoom;

    const savedDay = localStorage.getItem('sd_day_' + CASE.caseLabel);
    const savedInv = localStorage.getItem('sd_inv_' + CASE.caseLabel);
    currentDay = savedDay ? parseInt(savedDay, 10) : (CASE.startDay || 1);
    inventory = savedInv ? JSON.parse(savedInv) : [];

    updateDayBadge();
    renderInventory();
    renderRoom();
  })
  .catch(err => {
    document.getElementById('stage').innerHTML =
      '<div style="padding:20px;color:#e07a5f;font-family:monospace;font-size:12px;">case.json okunamadı.</div>';
    console.error(err);
  });

/* ---------- Arka Plan Karartma Katmanı ---------- */
function getStageDim() {
  const stage = document.getElementById('stage');
  let dimEl = document.getElementById('stageDim');
  if (!dimEl && stage) {
    dimEl = document.createElement('div');
    dimEl.id = 'stageDim';
    dimEl.className = 'stage-dim';
    stage.appendChild(dimEl);
  }
  return dimEl;
}

/* ---------- Oda Çizimi, Ses ve Efekt Yükleyici ---------- */
function renderRoom() {
  const room = CASE.rooms[currentRoom];
  const stage = document.getElementById('stage');
  stage.classList.add('fading');

  // Ses ve VFX Efektlerini Tetikle
  if (typeof SFX !== 'undefined' && SFX.play) SFX.play(currentRoom);
  if (typeof VFX !== 'undefined' && VFX.load) VFX.load(currentRoom, stage);

  setTimeout(() => {
    stage.innerHTML = `<div class="room-label">${room.label}</div>`;
    getStageDim();

    const kapali = room.closedOnDays && room.closedOnDays.includes(currentDay);
    stage.style.backgroundImage = `url(${kapali ? room.closedImage : room.background})`;

    if (kapali) {
      const geri = document.createElement('div');
      geri.className = 'hotspot-pulse-wrap ikon-bekliyor';
      geri.style.left = '9%'; geri.style.top = '57.5%'; geri.style.width = '6%';
      geri.innerHTML = `<img src="assets/arayuz/geri.webp" alt="Geri dön">`;
      geri.onclick = () => { currentRoom = 'merkez'; renderRoom(); };
      stage.appendChild(geri);

      const tokmak = document.createElement('div');
      tokmak.className = 'hotspot-pulse-wrap ikon-bekliyor';
      tokmak.style.left = '50%'; tokmak.style.top = '45%'; tokmak.style.width = '7%';
      tokmak.innerHTML = `<img src="assets/arayuz/tokmak.webp" alt="Kapıyı çal"><div class="hotspot-pulse-label">Çal</div>`;
      tokmak.onclick = () => {
        showModal(`<p style="text-align:center;font-style:italic;color:#c9cabd;">(Kimse yok)</p><button class="ghost" onclick="closeModal()">Kapat</button>`);
      };
      stage.appendChild(tokmak);

      stage.classList.remove('fading');
      return;
    }

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
        wrap.appendChild(img);

        if (h.label) {
          const lbl = document.createElement('div');
          lbl.className = 'hotspot-pulse-label';
          lbl.textContent = h.label;
          wrap.appendChild(lbl);
        }

        wrap.onclick = () => { if (!calibMode && !dialogueActive) handleHotspot(h); };
        stage.appendChild(wrap);
        return;
      }

      const el = document.createElement('div');
      el.className = 'hotspot' + (h.icon ? ' hotspot-icon' : '');
      el.style.left = h.x; el.style.top = h.y; el.style.width = h.w; el.style.height = h.h;
      const iconHtml = h.icon ? `<img src="${h.icon}" class="hotspot-icon-img" alt="">` : '';
      el.innerHTML = `${iconHtml}<div class="hint">${h.hint || ''}</div>`;
      el.onclick = () => { if (!calibMode && !dialogueActive) handleHotspot(h); };
      stage.appendChild(el);
    });

    renderCharacter();
    stage.classList.remove('fading');
  }, 180);
}

function handleHotspot(h) {
  if (h.type === 'navigate') { currentRoom = h.target; renderRoom(); return; }
  if (h.type === 'examine')  { openExamine(h.target); return; }
  if (h.type === 'photo')    { openPhoto(h.image); return; }
  if (h.type === 'dosya')    { openStatement(0); return; }
  if (h.type === 'notebook') { openNotebook(); return; }
  if (h.type === 'sleep')    { confirmSleep(); return; }
}

function renderInventory() {
  const invEl = document.getElementById('inventory');
  if (!invEl) return;
  if (!inventory.length) {
    invEl.innerHTML = '<span class="inv-empty">envanter boş</span>';
    return;
  }
  invEl.innerHTML = inventory.map(i => `<span class="inv-item">${i}</span>`).join(' ');
}

function openPhoto(src) {
  showModal(`
    <div class="zoom-wrap"><img class="reader-card-img" id="photoZoomImg" src="${src}" style="margin-bottom:14px;"></div>
    <button class="reader-close" onclick="closeModal()">✕</button>
  `);
}

function updateDayBadge() {
  const badge = document.getElementById('dayBadge');
  if (badge) badge.src = `assets/arayuz/takvim_gun${currentDay}.webp`;
}

function confirmSleep() {
  const sonGun = currentDay >= 7;
  showModal(`
    <h3>Uyumadan Önce</h3>
    <p>${sonGun
      ? 'Bu son gece. Uyumadan önce köyde henüz bulmadığın kanıtlar olabilir mi bir kontrol et.'
      : 'Uyumak istediğine emin misin? Bir sonraki güne geçilecek.'}</p>
    <button class="reader-play-simple" onclick="closeModal(); ${sonGun ? 'finalSuclamayaBaslat();' : 'sleep();'}">Evet, Uyu</button>
  `);
}

function sleep() {
  currentDay++;
  localStorage.setItem('sd_day_' + CASE.caseLabel, currentDay);
  updateDayBadge();

  const evt = CASE.sleepEvents && CASE.sleepEvents[currentDay];
  document.getElementById('sleepDayNum').textContent = `GÜN ${currentDay}`;
  document.getElementById('sleepText').textContent = evt || 'Yeni bir gün başlıyor.';
  document.getElementById('sleepOverlay').classList.add('active');
}

function wakeUp() {
  document.getElementById('sleepOverlay').classList.remove('active');
  renderRoom();
}

/* ---------- HARİTA SİSTEMİ ---------- */
function openMap() {
  if (!CASE || !CASE.map) return;
  const mapImg = document.getElementById('mapImage');
  const mapContainer = document.getElementById('mapHotspots');
  if (mapImg) mapImg.src = CASE.map.image;

  if (mapContainer) {
    mapContainer.innerHTML = '';
    (CASE.map.hotspots || []).forEach(h => {
      const btn = document.createElement('div');
      btn.className = 'map-hotspot-btn';
      btn.style.position = 'absolute';
      btn.style.left = h.x;
      btn.style.top = h.y;
      btn.style.transform = 'translate(-50%, -50%)';
      btn.style.cursor = 'pointer';
      btn.style.padding = '4px 8px';
      btn.style.background = 'rgba(10,10,8,0.85)';
      btn.style.border = '1px solid #c98a2c';
      btn.style.color = '#e3a94a';
      btn.style.borderRadius = '4px';
      btn.style.fontSize = '0.8em';
      btn.textContent = h.label;
      btn.onclick = () => {
        closeMap();
        currentRoom = h.target;
        renderRoom();
      };
      mapContainer.appendChild(btn);
    });
  }
  document.getElementById('mapOverlay').classList.add('active');
}

function closeMap() {
  document.getElementById('mapOverlay').classList.remove('active');
}

/* ---------- NOT DEFTERİ SİSTEMİ ---------- */
let currentNotebookPage = 1;

function openNotebook() {
  if (!CASE || !CASE.notebook) return;
  const nbImg = document.getElementById('notebookImage');
  if (nbImg) nbImg.src = CASE.notebook.image;
  renderNotebookPage();
  document.getElementById('notebookOverlay').classList.add('active');
}

function closeNotebook() {
  document.getElementById('notebookOverlay').classList.remove('active');
}

function renderNotebookPage() {
  const totalPages = (CASE.notebook && CASE.notebook.totalPages) || 5;
  const indicator = document.getElementById('nbSayfaGöstergesi');
  if (indicator) indicator.textContent = `Sayfa ${currentNotebookPage} / ${totalPages}`;

  const suspects = (CASE.notebook && CASE.notebook.suspects) || [];
  const idx0 = (currentNotebookPage - 1) * 2;
  const idx1 = idx0 + 1;

  const s0 = suspects[idx0];
  const photo0 = document.getElementById('nbPhoto0');
  const name0 = document.getElementById('nbName0');
  if (s0) {
    if (photo0) { photo0.src = s0.image; photo0.style.display = 'block'; }
    if (name0) name0.textContent = s0.name;
  } else {
    if (photo0) photo0.style.display = 'none';
    if (name0) name0.textContent = '';
  }

  const s1 = suspects[idx1];
  const photo1 = document.getElementById('nbPhoto1');
  const name1 = document.getElementById('nbName1');
  if (s1) {
    if (photo1) { photo1.src = s1.image; photo1.style.display = 'block'; }
    if (name1) name1.textContent = s1.name;
  } else {
    if (photo1) photo1.style.display = 'none';
    if (name1) name1.textContent = '';
  }

  const savedNotes = JSON.parse(localStorage.getItem('sd_notebook_v3_' + CASE.caseLabel) || '{}');
  const elSolUst = document.getElementById('nbYaziSolUst');
  const elSolAlt = document.getElementById('nbYaziSolAlt');
  const elSag = document.getElementById('nbYaziSag');

  if (elSolUst) elSolUst.value = savedNotes[`p${currentNotebookPage}_solUst`] || '';
  if (elSolAlt) elSolAlt.value = savedNotes[`p${currentNotebookPage}_solAlt`] || '';
  if (elSag) elSag.value = savedNotes[`p${currentNotebookPage}_sag`] || '';
}

function notebookSayfaIleri() {
  const totalPages = (CASE.notebook && CASE.notebook.totalPages) || 5;
  if (currentNotebookPage < totalPages) {
    currentNotebookPage++;
    renderNotebookPage();
  }
}

function notebookSayfaGeri() {
  if (currentNotebookPage > 1) {
    currentNotebookPage--;
    renderNotebookPage();
  }
}

function notebookYaziKaydet(alan, el) {
  if (!CASE) return;
  const savedNotes = JSON.parse(localStorage.getItem('sd_notebook_v3_' + CASE.caseLabel) || '{}');
  savedNotes[`p${currentNotebookPage}_${alan}`] = el.value;
  localStorage.setItem('sd_notebook_v3_' + CASE.caseLabel, JSON.stringify(savedNotes));
}

function notebookModAyarla(mod) {
  ['nbModYaz', 'nbModCiz', 'nbModSil'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });
  if (mod === 'yaz') document.getElementById('nbModYaz')?.classList.add('active');
  if (mod === 'ciz') document.getElementById('nbModCiz')?.classList.add('active');
  if (mod === 'sil') document.getElementById('nbModSil')?.classList.add('active');
}

function notebookRenkSec(renk) {
  document.querySelectorAll('.nb-renk-btn').forEach(b => b.classList.remove('aktif'));
  if (renk === '#1a1a1a') document.getElementById('nbRenkSiyah')?.classList.add('aktif');
  if (renk === '#8f2a1e') document.getElementById('nbRenkKirmizi')?.classList.add('aktif');
}

function kosePop(btn, callback) {
  if (btn) {
    btn.classList.add('tiklandi');
    setTimeout(() => btn.classList.remove('tiklandi'), 200);
  }
  if (typeof callback === 'function') callback();
}

/* ---------- SUÇLAMA VE FİNAL SORGULARI ---------- */
function dosyaAdiNormalle(str) {
  return str.toLocaleLowerCase('tr-TR')
    .replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g')
    .replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
}

function suclamaGoster(html) {
  const ov = document.getElementById('suclamaOverlay');
  ov.innerHTML = html;
  ov.classList.add('active');
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
  const normIsim = dosyaAdiNormalle(isim);
  if (isim === 'Mustafa') {
    const dosya = 'assets/sorgu/final_sorgu/mustafa_final_sorgu.png';
    suclamaGoster(`
      <div class="zoom-wrap" style="width:70vw;height:80vh;">
        <img class="suclama-gorsel" id="itirafZoomImg" src="${dosya}" alt="Mustafa'nın İtirafı" onerror="this.src='assets/sorgu/final_sorgu/mustafa_final_sorgu.webp'">
      </div>
      <button class="suclama-devam-btn" onclick="oyunKazanildi()">Devam Et</button>
    `);
  } else {
    let dosyaIsmi = `${normIsim}_final_sorgu.png`;
    if (normIsim === 'aylin') dosyaIsmi = 'aylin_fnal_srogu.png';
    if (normIsim === 'cabbar') dosyaIsmi = 'cabbar_final_srogu.png';
    if (normIsim === 'kamuran') dosyaIsmi = 'kamuran_final_srogu.png';

    const dosya = `assets/sorgu/final_sorgu/${dosyaIsmi}`;
    suclamaGoster(`
      <div class="zoom-wrap" style="width:70vw;height:80vh;">
        <img class="suclama-gorsel" id="sorguZoomImg" src="${dosya}" alt="${isim} - Sorgu">
      </div>
      <button class="suclama-devam-btn" onclick="oyunKaybedildi()">Devam Et</button>
    `);
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
    <button class="suclama-devam-btn" onclick="oyunuSifirla()">Tekrar Oyna</button>
  `);
}

function oyunuSifirla() {
  localStorage.removeItem('sd_day_' + CASE.caseLabel);
  localStorage.removeItem('sd_inv_' + CASE.caseLabel);
  localStorage.removeItem('sd_notebook_v3_' + CASE.caseLabel);
  window.location.href = 'index.html';
}

/* ---------- SORGU DOSYALARI VE SESLER ---------- */
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
      <img class="reader-card-img-wide" id="statementZoomImg" src="${s.cardImage}">
    </div>
    <button class="reader-side-arrow right" onclick="${index < total - 1 ? `openStatement(${index + 1})` : ''}" ${index === total - 1 ? 'disabled' : ''}>›</button>
    ${audioHtml}
  `, true);
}

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

function showModal(html, wide) {
  const body = document.getElementById('modalBody');
  body.innerHTML = html;
  body.className = 'modal' + (wide ? ' wide' : '');
  const bg = document.getElementById('modalBg');
  bg.classList.add('active');
}
function closeModal() {
  stopStatementAudio();
  document.getElementById('modalBg').classList.remove('active');
}

/* ---------- KARAKTER DİYALOG SİSTEMİ ---------- */
let characterAudio = null;
let dialogIndex = 0;

function renderCharacter() {
  dialogueActive = false;
  characterAudio = null;
  dialogIndex = 0;

  const ch = CASE.characters && CASE.characters[currentRoom];
  if (!ch) return;

  const stage = document.getElementById('stage');

  if (ch.clickableImage) {
    const clickOverlay = document.createElement('img');
    clickOverlay.id = 'roomCharOverlay';
    clickOverlay.className = 'room-character-overlay';
    clickOverlay.src = ch.clickableImage;
    clickOverlay.alt = ch.name;
    clickOverlay.onclick = () => { if (!calibMode) toggleCharacterLine(ch); };
    stage.appendChild(clickOverlay);
  }

  const el = document.createElement('img');
  el.id = 'sceneCharacter';
  el.className = 'scene-character';
  el.src = ch.image;
  el.alt = ch.name;
  el.onclick = () => { if (!calibMode) toggleCharacterLine(ch); };
  stage.appendChild(el);
}

function toggleCharacterLine(ch) {
  const charEl = document.getElementById('sceneCharacter');
  const clickOverlay = document.getElementById('roomCharOverlay');
  const dimEl = getStageDim();
  const dialog = (ch.dialog && ch.dialog.length) ? ch.dialog : [{ speaker: ch.name, text: ch.text || '' }];

  if (!dialogueActive) {
    dialogueActive = true;
    dialogIndex = 0;

    if (dimEl) dimEl.classList.add('active');
    if (clickOverlay) clickOverlay.classList.add('hidden');
    if (charEl) charEl.classList.add('talking');

    if (ch.audio) {
      characterAudio = new Audio(ch.audio);
      characterAudio.play().catch(() => {});
    }
    gosterDialogSatiri(dialog);
  } else {
    dialogIndex++;
    if (dialogIndex >= dialog.length) {
      if (characterAudio) { characterAudio.pause(); characterAudio = null; }
      const sub = document.getElementById('sceneSubtitle');
      if (sub) sub.remove();

      if (charEl) charEl.classList.remove('talking');
      if (clickOverlay) clickOverlay.classList.remove('hidden');
      if (dimEl) dimEl.classList.remove('active');

      dialogueActive = false;
      return;
    }
    gosterDialogSatiri(dialog);
  }
}

function gosterDialogSatiri(dialog) {
  const stage = document.getElementById('stage');
  let sub = document.getElementById('sceneSubtitle');
  if (!sub) {
    sub = document.createElement('div');
    sub.id = 'sceneSubtitle';
    sub.className = 'scene-subtitle';
    stage.appendChild(sub);
  }
  const satir = dialog[dialogIndex];
  sub.innerHTML = `<div class="scene-subtitle-name">${satir.speaker}</div><div class="scene-subtitle-text">${satir.text}</div>`;
}