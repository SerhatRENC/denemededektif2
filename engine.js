/* ============================================================
   ODA MOTORU — bu dosyayı değiştirmene gerek yok.
   Tüm içerik case.json içinden okunuyor.
   ============================================================ */

let CASE = null;
let currentRoom = null;
let inventory = [];
let currentDay = 1;
let calibMode = false;
let calibClicks = [];

fetch('case.json')
  .then(r => r.json())
  .then(data => {
    CASE = data;
    document.getElementById('caseLabel').textContent = CASE.caseLabel || 'DOSYA';
    document.getElementById('caseTitle').textContent = CASE.title || '';
    currentRoom = CASE.startRoom;

    // localStorage'dan kaldığı yerden devam et
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
      '<div style="padding:20px;color:#e07a5f;font-family:monospace;font-size:12px;">case.json okunamadı. Aynı klasörde olduğundan ve bir local server üzerinden açtığından emin ol (dosyayı doğrudan çift tıklayarak açarsan fetch çalışmaz — VSCode "Live Server" eklentisi veya GitHub Pages kullan).</div>';
    console.error(err);
  });

/* ---------- oda çizimi ---------- */
function renderRoom() {
  const room = CASE.rooms[currentRoom];
  const stage = document.getElementById('stage');
  stage.classList.add('fading');
  setTimeout(() => {
    stage.innerHTML = `<div class="room-label">${room.label}</div>`;
    stage.style.backgroundImage = `url(${room.background})`;

    room.hotspots.forEach(h => {
      if (h.requires && !inventory.includes(h.requires)) return; // basit kilit: eşya yoksa hotspot gizli
      if (h.activeDays && !h.activeDays.includes(currentDay)) return; // sadece belirli günlerde görünür
      const el = document.createElement('div');
      el.className = 'hotspot' + (h.icon ? ' hotspot-icon' : '');
      el.style.left = h.x; el.style.top = h.y; el.style.width = h.w; el.style.height = h.h;
      const iconHtml = h.icon
        ? `<img src="${h.icon}" class="hotspot-icon-img" alt="" onerror="this.outerHTML='<div class=\\'hotspot-icon-missing\\'>görsel yok:<br>${h.icon}</div>'">`
        : '';
      el.innerHTML = `${iconHtml}<div class="hint">${h.hint || ''}</div>`;
      el.onclick = (e) => { if (!calibMode) handleHotspot(h); };
      stage.appendChild(el);
    });

    renderCharacter(); // oda değiştikçe, o odaya atanmış karakter varsa sağ tarafta belirir

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
  if (h.type === 'sleep')    { sleep(); return; }
}

/* ---------- salt fotoğraf gösterici (başlık/açıklama YOK, sadece görsel) ---------- */
function openPhoto(src) {
  showModal(`
    <img class="reader-card-img" src="${src}" style="margin-bottom:14px;"
         onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${src}</div>'">
    <button class="ghost" onclick="closeModal()">Kapat</button>
  `);
}

/* ---------- gün döngüsü ---------- */
function updateDayBadge() {
  document.getElementById('dayBadge').textContent = `GÜN ${currentDay}`;
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
  renderRoom(); // gün değiştiği için bazı hotspot'lar görünür/gizli olabilir
}

/* ---------- ifade zaptı okuyucu ---------- */
let currentStatementIndex = 0;

function openStatement(index) {
  stopStatementAudio();
  currentStatementIndex = index;
  const s = CASE.statements[index];
  const total = CASE.statements.length;

  const audioHtml = s.audio ? `
    <div class="reader-audio" id="readerAudio">
      <div class="ring" id="readerRing" onclick="toggleStatementAudio('${s.audio}')">▶</div>
      <div>
        <div class="meta">Fonografta Dinle</div>
        <div class="time" id="readerTime">00:00</div>
      </div>
    </div>` : '';

  showModal(`
    <div class="reader-nav">
      <span class="reader-name">${s.name}</span>
      <span style="font-size:11px;color:var(--paper-dim);">${index + 1} / ${total}</span>
    </div>
    <img class="reader-card-img" src="${s.cardImage}"
         onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${s.cardImage}</div>'">
    ${audioHtml}
    <div class="reader-nav">
      <button class="reader-arrow" onclick="${index > 0 ? `openStatement(${index - 1})` : ''}" ${index === 0 ? 'disabled style="opacity:.3"' : ''}>‹</button>
      <button class="ghost" onclick="closeModal()">Kapat</button>
      <button class="reader-arrow" onclick="${index < total - 1 ? `openStatement(${index + 1})` : ''}" ${index === total - 1 ? 'disabled style="opacity:.3"' : ''}>›</button>
    </div>
  `, true);
}

// Modal açıkken ve bir ifade kartı gösterilirken klavye ok tuşlarıyla da gezinilebilir
document.addEventListener('keydown', (e) => {
  if (!document.querySelector('.reader-card-img')) return;
  if (e.key === 'ArrowRight' && currentStatementIndex < CASE.statements.length - 1) openStatement(currentStatementIndex + 1);
  if (e.key === 'ArrowLeft' && currentStatementIndex > 0) openStatement(currentStatementIndex - 1);
});

let statementAudio = null, statementPlaying = false, statementSeconds = 0, statementInterval = null;
function toggleStatementAudio(src) {
  if (!statementAudio) statementAudio = new Audio(src);
  statementPlaying = !statementPlaying;
  const ring = document.getElementById('readerRing');
  if (statementPlaying) {
    statementAudio.play().catch(() => {});
    ring.textContent = '⏸';
    statementInterval = setInterval(() => {
      statementSeconds++;
      const m = String(Math.floor(statementSeconds / 60)).padStart(2, '0');
      const s2 = String(statementSeconds % 60).padStart(2, '0');
      const timeEl = document.getElementById('readerTime');
      if (timeEl) timeEl.textContent = `${m}:${s2}`;
    }, 1000);
  } else {
    statementAudio.pause();
    ring.textContent = '▶';
    clearInterval(statementInterval);
  }
}
function stopStatementAudio() {
  clearInterval(statementInterval);
  statementPlaying = false; statementSeconds = 0;
  if (statementAudio) { statementAudio.pause(); statementAudio = null; }
}

/* ---------- inceleme (belge/fotoğraf) ---------- */
function openExamine(itemId) {
  const item = CASE.items[itemId];
  const imgHtml = item.image
    ? `<img class="doc-img" src="${item.image}" onerror="this.outerHTML='<div class=doc-fallback>görsel bulunamadı:<br>${item.image}</div>'">`
    : `<div class="doc-fallback">görsel yok</div>`;

  let bodyHtml = `<h3>${item.title}</h3>${imgHtml}<p>${item.desc || ''}</p>`;

  if (item.lockedCode) {
    // kilitli/kod gerektiren evrak
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
}

function tryUnlock(itemId) {
  const item = CASE.items[itemId];
  const val = document.getElementById('unlockInput').value.trim();
  if (val === item.lockedCode) {
    showModal(`<h3>${item.title}</h3><p>${item.unlockedText || 'çözüldü.'}</p><button class="ghost" onclick="closeModal()">Kapat</button>`);
  } else {
    document.getElementById('unlockInput').style.borderColor = '#8f3a2e';
    document.getElementById('unlockInput').placeholder = 'yanlış kod';
  }
}

function collect(collectId, image) {
  if (!inventory.includes(collectId)) {
    inventory.push(collectId);
    localStorage.setItem('sd_inv_' + CASE.caseLabel, JSON.stringify(inventory));
    renderInventory(image);
  }
  closeModal();
  renderRoom(); // requires ile açılmış yeni hotspot olabilir
}

function renderInventory(lastImage) {
  const inv = document.getElementById('inventory');
  if (inventory.length === 0) { inv.innerHTML = '<span class="inv-empty">envanter boş</span>'; return; }
  inv.innerHTML = '';
  inventory.forEach(id => {
    const el = document.createElement('div');
    el.className = 'inv-item';
    el.textContent = '📄';
    inv.appendChild(el);
  });
}

/* ---------- TV / video ---------- */
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

/* ---------- teyp / ses kaydedici ---------- */
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
    btn.textContent = '⏸'; btn.classList.add('active');
    reelL.classList.add('spin'); reelR.classList.add('spin');
    tapeInterval = setInterval(() => {
      tapeSeconds++;
      const m = String(Math.floor(tapeSeconds/60)).padStart(2,'0');
      const s = String(tapeSeconds%60).padStart(2,'0');
      document.getElementById('counter').textContent = `${m}:${s}`;
    }, 1000);
  } else {
    tapeAudio.pause();
    btn.textContent = '▶'; btn.classList.remove('active');
    reelL.classList.remove('spin'); reelR.classList.remove('spin');
    clearInterval(tapeInterval);
  }
}

/* ---------- modal yardımcıları ---------- */
function showModal(html, wide) {
  const body = document.getElementById('modalBody');
  body.innerHTML = html;
  body.classList.toggle('wide', !!wide);
  document.getElementById('modalBg').classList.add('active');
}
function closeModal() {
  clearInterval(tapeInterval); tapePlaying = false; tapeSeconds = 0;
  if (tapeAudio) { tapeAudio.pause(); tapeAudio = null; }
  stopStatementAudio();
  document.getElementById('modalBg').classList.remove('active');
}
document.getElementById('modalBg').onclick = (e) => { if (e.target.id === 'modalBg') closeModal(); };

/* ============================================================
   KALİBRASYON MODU — koordinat bulmayı kolaylaştırır.
   Aç, resme sırayla iki nokta tıkla (sol-üst köşe, sağ-alt köşe),
   ekranda ve konsolda hazır JSON satırı çıkar, case.json'a yapıştır.
   ============================================================ */
const calibToggle = document.getElementById('calibToggle');
const stageEl = document.getElementById('stage');
const readout = document.getElementById('calibReadout');

calibToggle.onclick = () => {
  calibMode = !calibMode;
  calibClicks = [];
  calibToggle.textContent = `🎯 Kalibrasyon Modu: ${calibMode ? 'Açık' : 'Kapalı'}`;
  calibToggle.classList.toggle('on', calibMode);
  stageEl.classList.toggle('calib-active', calibMode);
  readout.textContent = calibMode ? 'Sol-üst köşeye tıkla, sonra sağ-alt köşeye tıkla.' : '';
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
    readout.textContent = snippet;
    console.log('Hotspot koordinatı:', snippet);
    calibClicks = [];
    setTimeout(() => { document.querySelectorAll('.calib-marker').forEach(m => m.remove()); }, 1500);
  } else {
    readout.textContent = `İlk nokta: x:${xPct}% y:${yPct}%  — şimdi karşı köşeye tıkla`;
  }
});

/* ============================================================
   HARİTA MEKANİĞİ
   Konum verisi CASE.map içinden okunur (engine'e hardcode edilmedi),
   yani başka bir vaka dosyası kendi haritasını tanımlayabilir.
   ============================================================ */
function openMap() {
  if (!CASE.map) { alert('Bu vaka dosyasında harita tanımlı değil (case.json → "map").'); return; }
  document.getElementById('mapImage').src = CASE.map.image;

  const wrap = document.getElementById('mapHotspots');
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
        // hedef oda case.json'a henüz eklenmemiş — sessizce yok saymak yerine haber ver
        alert(`"${h.label}" henüz case.json'a eklenmedi.`);
      }
    };
    wrap.appendChild(dot);
  });

  document.getElementById('mapOverlay').classList.add('active');
}
function closeMap() {
  document.getElementById('mapOverlay').classList.remove('active');
}

/* ============================================================
   NOT DEFTERİ MEKANİĞİ
   Her sayfa: { sol, sag: metin | solÇizim, sagÇizim: canvas dataURL }
   localStorage'da mevcut gün/envanter kaydıyla aynı isimlendirme
   deseniyle saklanır: sd_notebook_<caseLabel>
   ============================================================ */
let notebookState = null;
let notebookDrawMode = false;

function notebookKey() {
  return 'sd_notebook_' + CASE.caseLabel;
}

function loadNotebook() {
  const saved = localStorage.getItem(notebookKey());
  const total = (CASE.notebook && CASE.notebook.totalPages) || 5;
  notebookState = saved ? JSON.parse(saved) : {
    page: 0,
    pages: Array.from({ length: total }, () => ({ sol: '', sag: '', solÇizim: null, sagÇizim: null }))
  };
}
function saveNotebook() {
  localStorage.setItem(notebookKey(), JSON.stringify(notebookState));
}

function openNotebook() {
  if (!notebookState) loadNotebook();
  const nbImg = document.getElementById('notebookImage');
  const nbFallback = document.getElementById('notebookImgFallback');
  const src = (CASE.notebook && CASE.notebook.image) || 'assets/yazi.png';

  nbImg.style.display = '';
  nbFallback.style.display = 'none';
  nbImg.onerror = () => {
    nbImg.style.display = 'none';
    nbFallback.style.display = 'flex';
    nbFallback.textContent = `görsel bulunamadı: ${src} — not defteri görseli tam olarak bu yolda olmalı`;
  };
  // ÖNEMLİ: canvas boyutu, görsel gerçekten yüklenip sayfa yüksekliği oturduktan
  // SONRA ölçülmeli — yoksa çizim yüzeyi 0 piksel kalır ve kalem görünmez çalışır.
  nbImg.onload = () => renderNotebookPage();
  nbImg.src = src;

  document.getElementById('notebookOverlay').classList.add('active');
  requestAnimationFrame(renderNotebookPage); // görsel önbellekten geliyorsa onload hiç tetiklenmeyebilir
}
function closeNotebook() {
  document.getElementById('notebookOverlay').classList.remove('active');
}

function renderNotebookPage() {
  const total = notebookState.pages.length;
  const p = notebookState.pages[notebookState.page];

  const yaziSol = document.getElementById('nbYaziSol');
  const yaziSag = document.getElementById('nbYaziSag');
  const canvasSol = document.getElementById('nbCanvasSol');
  const canvasSag = document.getElementById('nbCanvasSag');
  const ctxSol = canvasSol.getContext('2d');
  const ctxSag = canvasSag.getContext('2d');

  yaziSol.value = p.sol;
  yaziSag.value = p.sag;

  [canvasSol, canvasSag].forEach(c => {
    const rect = c.getBoundingClientRect();
    c.width = rect.width;
    c.height = rect.height;
  });
  ctxSol.clearRect(0, 0, canvasSol.width, canvasSol.height);
  ctxSag.clearRect(0, 0, canvasSag.width, canvasSag.height);

  if (p.solÇizim) {
    const img = new Image();
    img.onload = () => ctxSol.drawImage(img, 0, 0, canvasSol.width, canvasSol.height);
    img.src = p.solÇizim;
  }
  if (p.sagÇizim) {
    const img = new Image();
    img.onload = () => ctxSag.drawImage(img, 0, 0, canvasSag.width, canvasSag.height);
    img.src = p.sagÇizim;
  }

  document.getElementById('nbSayfaGöstergesi').textContent = `Sayfa ${notebookState.page + 1} / ${total}`;
  document.getElementById('nbGeri').disabled = notebookState.page === 0;
  document.getElementById('nbIleri').disabled = notebookState.page === total - 1;
}

function notebookYaziKaydet(taraf, val) {
  notebookState.pages[notebookState.page][taraf] = val;
  saveNotebook();
}

function notebookSayfaGeri() {
  if (notebookState.page > 0) { notebookState.page--; saveNotebook(); renderNotebookPage(); }
}
function notebookSayfaIleri() {
  if (notebookState.page < notebookState.pages.length - 1) { notebookState.page++; saveNotebook(); renderNotebookPage(); }
}

function notebookTemizle() {
  if (!confirm('Bu sayfadaki yazı ve çizimler silinsin mi?')) return;
  const p = notebookState.pages[notebookState.page];
  p.sol = ''; p.sag = ''; p.solÇizim = null; p.sagÇizim = null;
  saveNotebook();
  renderNotebookPage();
}

function notebookModAyarla(çizim) {
  notebookDrawMode = çizim;
  document.getElementById('nbModYaz').classList.toggle('active', !çizim);
  document.getElementById('nbModCiz').classList.toggle('active', çizim);
  document.querySelectorAll('.nb-canvas').forEach(c => c.classList.toggle('pasif', !çizim));
  document.querySelectorAll('.nb-yazi').forEach(t => t.style.pointerEvents = çizim ? 'none' : 'auto');
}

function nbKalemKur(canvas, taraf) {
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#c98a2c'; // --amber ile aynı ton, kalem izi
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  let çiziyor = false;

  function konum(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  function başla(e) {
    if (!notebookDrawMode) return;
    çiziyor = true;
    const { x, y } = konum(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function çiz(e) {
    if (!notebookDrawMode || !çiziyor) return;
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
  canvas.addEventListener('touchstart', başla);
  canvas.addEventListener('touchmove', çiz);
  canvas.addEventListener('touchend', bitir);
}
nbKalemKur(document.getElementById('nbCanvasSol'), 'solÇizim');
nbKalemKur(document.getElementById('nbCanvasSag'), 'sagÇizim');

/* ============================================================
   ORTAMDAKİ KARAKTER MEKANİĞİ
   Oda id'sine göre CASE.characters içinden okunur — hangi odada
   hangi karakterin durduğu tamamen case.json'da tanımlı.
   İlk tık: altyazı açılır, ses çalmaya başlar, KENDİLİĞİNDEN kapanmaz.
   İkinci tık (karaktere tekrar tıklamak): konuşma biter, hem altyazı
   hem karakter ekrandan kaybolur (ör. Rıza'yla konuşup bitirince
   handa onun arkasındaki gazeteci odası kapısı ortaya çıkar).
   ============================================================ */
let characterAudio = null;
let dialogueActive = false;

function renderCharacter() {
  dialogueActive = false;
  characterAudio = null;

  const ch = CASE.characters && CASE.characters[currentRoom];
  if (!ch) return; // bu odaya atanmış karakter yok

  const stage = document.getElementById('stage');
  const el = document.createElement('img');
  el.id = 'sceneCharacter';
  el.className = 'scene-character';
  el.src = ch.image;
  el.alt = ch.name;
  el.title = ch.name;
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
  const stage = document.getElementById('stage');
  const charEl = document.getElementById('sceneCharacter');

  if (!dialogueActive) {
    // İLK TIK — konuşmayı başlat, altyazı kalıcı kalsın
    dialogueActive = true;
    if (charEl) charEl.classList.add('talking');

    let sub = document.getElementById('sceneSubtitle');
    if (!sub) {
      sub = document.createElement('div');
      sub.id = 'sceneSubtitle';
      sub.className = 'scene-subtitle';
      stage.appendChild(sub);
    }
    sub.innerHTML = `<div class="scene-subtitle-name">${ch.name}</div><div class="scene-subtitle-text">${ch.text || ''}</div>`;

    if (ch.audio) {
      characterAudio = new Audio(ch.audio);
      characterAudio.play().catch(() => {});
    }
  } else {
    // İKİNCİ TIK — konuşmayı bitir, karakter ve altyazı kaybolsun
    if (characterAudio) { characterAudio.pause(); characterAudio = null; }
    const sub = document.getElementById('sceneSubtitle');
    if (sub) sub.remove();
    const c = document.getElementById('sceneCharacter');
    if (c) c.remove();
    dialogueActive = false;
  }
}
