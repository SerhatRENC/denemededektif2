/* ============================================================
   ODA MOTORU — bu dosyayı değiştirmene gerek yok.
   Tüm içerik case.json içinden okunuyor.
   ============================================================ */

let CASE = null;
let currentRoom = null;
let inventory = [];
let calibMode = false;
let calibClicks = [];

fetch('case.json')
  .then(r => r.json())
  .then(data => {
    CASE = data;
    document.getElementById('caseLabel').textContent = CASE.caseLabel || 'DOSYA';
    document.getElementById('caseTitle').textContent = CASE.title || '';
    currentRoom = CASE.startRoom;
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
      const el = document.createElement('div');
      el.className = 'hotspot';
      el.style.left = h.x; el.style.top = h.y; el.style.width = h.w; el.style.height = h.h;
      el.innerHTML = `<div class="hint">${h.hint || ''}</div>`;
      el.onclick = (e) => { if (!calibMode) handleHotspot(h); };
      stage.appendChild(el);
    });

    stage.classList.remove('fading');
  }, 180);
}

function handleHotspot(h) {
  if (h.type === 'navigate') { currentRoom = h.target; renderRoom(); return; }
  if (h.type === 'examine')  { openExamine(h.target); return; }
  if (h.type === 'recorder') { openRecorder(h.target); return; }
  if (h.type === 'tv')       { openTV(h.target); return; }
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
function showModal(html) {
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalBg').classList.add('active');
}
function closeModal() {
  clearInterval(tapeInterval); tapePlaying = false; tapeSeconds = 0;
  if (tapeAudio) { tapeAudio.pause(); tapeAudio = null; }
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
