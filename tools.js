/* ============================================================
   SISLIDERE DAVASI — MODÜL 5: DEFTER, HARİTA VE SORGU KARTLARI
   ============================================================ */

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
    <div class="zoom-wrap" style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
      <img id="statementZoomImg" src="${s.cardImage}" style="max-width:90cqw; max-height:49.5cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
    </div>
    <button class="reader-side-arrow right" style="position:fixed; right:25px; top:50%; transform:translateY(-50%); z-index:10002; font-size:48px; background:none; border:none; color:#e9dcc0; cursor:pointer;" onclick="openStatement(${index < total - 1 ? index + 1 : 0}, true)">›</button>
    ${audioHtml}
  `);
}

function toggleStatementAudio(src) {
  if (!statementAudio) {
    statementAudio = new Audio(src);
    statementAudio.onended = () => {
      statementPlaying = false;
      const b = document.getElementById('readerPlayBtn');
      if (b) b.textContent = '▶ Sorguyu Oynat';
    };
  }
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
  try {
    localStorage.setItem(notebookKey(), JSON.stringify(notebookState));
  } catch (err) {
    console.warn('Defter kaydedilemedi (depolama dolu olabilir):', err);
  }
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
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
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
    return {
      x: (t.clientX - rect.left) * (canvas.width / (rect.width || 1)),
      y: (t.clientY - rect.top) * (canvas.height / (rect.height || 1))
    };
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

// Script <head>'de yüklendiği için canvas ancak DOM hazır olunca bulunabilir
window.addEventListener('DOMContentLoaded', () => {
  const cFullEl = document.getElementById('nbCanvasFull');
  if (cFullEl) nbKalemKur(cFullEl, 'pageDrawing');
});

/* ---------- HARİTA SİSTEMİ ---------- */
function openMap() {
  if (!CASE.map) return;

  const mapImg = document.getElementById('mapImage');  
  if (mapImg) mapImg.src = CASE.map.image;

  const wrap = document.getElementById('mapHotspots');
  if (wrap) {
    wrap.innerHTML = '';
    CASE.map.hotspots.forEach(h => {
      const dot = document.createElement('div');
      dot.className = 'map-hotspot';
      dot.style.left = h.x; dot.style.top = h.y;
      dot.innerHTML = `<span class="map-hotspot-label">${h.label}</span>`;
      dot.onclick = () => {
        if (!h.target || !CASE.rooms[h.target]) return;
        const nav = canNavigate(h.target);   // hotspot'larla aynı kapı kuralları
        if (!nav.ok) {
          closeMap();
          if (nav.msg) showCustomSubtitle(nav.msg, true);
          return;
        }
        currentRoom = h.target;
        closeMap();
        renderRoom();
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