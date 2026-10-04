/* ============================================================
   SISLIDERE DAVASI — MODÜL 4: POPUP & İNCELEME MODALLARI
   ============================================================ */

function showFramelessModal(innerHtml, modalId = null) {
  stopStatementAudio();
  currentModalId = modalId;
  const body = document.getElementById('modalBody');
  const bg = document.getElementById('modalBg');
  if (!body || !bg) return;

  bg.className = 'modal-bg active reader-mode';
  bg.style.background = 'rgba(0, 0, 0, 0.88)';
  bg.style.backdropFilter = 'blur(8px)';

  body.className = 'modal modal-fullscreen';
  body.style.cssText = "background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; max-width:100% !important; width:100% !important; height:100% !important; max-height:100% !important; overflow:hidden !important; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative;";

  body.innerHTML = innerHtml;
}

function showModal(html, wide) {
  const body = document.getElementById('modalBody');
  if (!body) return;
  currentModalId = null;
  body.innerHTML = html;
  body.className = 'modal' + (wide ? ' wide' : '');
  document.getElementById('modalBg')?.classList.add('active');
}

function closeModal() {
  stopStatementAudio();
  if (typeof fonogramAudio !== 'undefined' && fonogramAudio) {
    fonogramAudio.pause();
    fonogramAudio.currentTime = 0;
    fonogramAudio = null;
    fonogramPlaying = false;
  }
  const bg = document.getElementById('modalBg');
  const body = document.getElementById('modalBody');

  const kapananModal = currentModalId;
  currentModalId = null;

  if (body) { body.className = 'modal'; body.style.cssText = ''; }
  if (bg) {
    bg.classList.remove('active');
    bg.classList.remove('reader-mode');
    bg.style.background = "";
    bg.style.backdropFilter = "";
  }
  // Gün JSON'undaki events.modalClose[modalId] (ör. otopsi incelendi)
  if (kapananModal) runEvents('modalClose', kapananModal);
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
    <div class="zoom-wrap" style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
      <img id="photoZoomImg" src="${src}" style="max-width:90cqw; max-height:49.5cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
    </div>
    <button class="reader-side-arrow right" style="position:fixed; right:25px; top:50%; transform:translateY(-50%); z-index:10002; font-size:48px; background:none; border:none; color:#e9dcc0; cursor:pointer;" onclick="openOtopsiMerkezKaydiModal(${index + 1}, true)" ${nextDisabled}>›</button>
  `, 'otopsi');
}

function openCantaEvlilikCuzdanModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <img src="assets/arayuz/evlilik_cuzdan.webp" style="max-width:88cqw; max-height:43.875cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('evlilik_cuzdan');">ENVANTERE AL</button>
    </div>
  `);
}

function openCantaKagitlarModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeCantaKagitlarModal()">✕</button>
    <div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
      <img src="assets/arayuz/bos_kagit.webp" style="max-width:88cqw; max-height:47.8125cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
    </div>
  `);
}

async function closeCantaKagitlarModal() {
  gameState.setFlag('col_canta_kagitlar_incelendi', true);
  closeModal();
  await renderRoom();
  showCustomSubtitle("Dedektif: Henüz bunlara bir şey yazamamış.", true);
}

function openCantaPolaroidModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(18px, 2.5cqw, 30px); margin-bottom:10px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">(İşlenmemiş) Polaroid Fotoğraf</h3>
      <img src="assets/arayuz/poloroid.webp" style="max-width:88cqw; max-height:39.375cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('polaroid'); closeModal(); setTimeout(() => showCustomSubtitle('Dedektif: Bu fotoğrafı fotoğraf odasına götürüp netleştirmem lazım.', true), 300);">ENVANTERE AL</button>
    </div>
  `);
}

function openYanikKagitModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <img src="assets/arayuz/yanik_kagit_incele.webp" style="max-width:88cqw; max-height:43.875cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
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
    <div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
      <img src="${src}" style="max-width:88cqw; max-height:47.8125cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
    </div>
    <button class="reader-side-arrow right" style="position:fixed; right:25px; top:50%; transform:translateY(-50%); z-index:10002; font-size:48px; background:none; border:none; color:#e9dcc0; cursor:pointer;" onclick="openGazeteciDosyaModal(null, ${index + 1})" ${nextDisabled}>›</button>
  `);
}

function showAnahtarAcquisitionModal() {
  showFramelessModal(`
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#e9dcc0;">
      <h2 style="font-family:'Georgia', serif; font-size:28px; margin-bottom:15px; text-shadow:0 2px 8px rgba(0,0,0,0.8);">Oda Anahtarı Alındı</h2>
      <img src="assets/tiklanabilir/anahtar.webp" style="max-width:280px; max-height:22.5cqw; object-fit:contain; margin:20px 0; filter:drop-shadow(0 0 15px rgba(0,0,0,0.9));">
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('anahtar');">ENVANTERE AL</button>
    </div>
  `);
}

function openGorselModal(src, title) {
  if (!src) return;
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      ${title ? `<h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(18px, 2.5cqw, 30px); margin-bottom:10px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">${title}</h3>` : ''}
      <img src="${src}" style="max-width:88cqw; max-height:40cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
    </div>
  `);
}

/* ---------- MAGNETOPHON / SES KAYDI MODALI ---------- */
let fonogramAudio = null;
let fonogramPlaying = false;

function openGazeteciSesKaydiModal() {
  if (typeof calSes === 'function') calSes('al');
  
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeFonogramModal()">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:15px;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(18px, 2.5cqw, 30px); text-shadow:0 2px 8px rgba(0,0,0,0.9);">Gazetecinin Ses Kaydı</h3>
      
      <div style="position:relative; width:100%; display:flex; justify-content:center; align-items:center;">
        <img id="fonogramImg" src="assets/tiklanabilir/gazeteci_oda_masa_fonogram_tiklanabilir.webp" style="max-width:85cqw; max-height:38cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95)); transition:all 0.3s ease;">
      </div>

      <button id="fonogramPlayBtn" class="btn show" style="position:relative; opacity:1; pointer-events:auto; padding:10px 26px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:clamp(15px, 1.8cqw, 20px); display:flex; align-items:center; gap:10px; box-shadow:0 4px 12px rgba(0,0,0,0.8);" onclick="toggleFonogramAudio()">
        <span id="fonogramIcon">▶</span> <span id="fonogramText">Ses Kaydını Dinle</span>
      </button>
    </div>
  `);
}

function toggleFonogramAudio() {
  if (!fonogramAudio) {
    fonogramAudio = new Audio('assets/ses/gazeteci_gunluk.mp3');
    fonogramAudio.onended = () => {
      fonogramPlaying = false;
      updateFonogramUI();
    };
  }

  fonogramPlaying = !fonogramPlaying;

  if (fonogramPlaying) {
    fonogramAudio.play().catch(e => console.warn("Ses oynatılamadı:", e));
  } else {
    fonogramAudio.pause();
  }
  updateFonogramUI();
}

function updateFonogramUI() {
  const btnIcon = document.getElementById('fonogramIcon');
  const btnText = document.getElementById('fonogramText');
  const img = document.getElementById('fonogramImg');

  if (fonogramPlaying) {
    if (btnIcon) {
      btnIcon.textContent = '⚙';
      btnIcon.className = 'makara-ikon-donuyor';
    }
    if (btnText) btnText.textContent = 'Kaydı Duraklat';
    if (img) img.classList.add('fonogram-donuyor');
  } else {
    if (btnIcon) {
      btnIcon.textContent = '▶';
      btnIcon.className = '';
    }
    if (btnText) btnText.textContent = 'Ses Kaydını Dinle';
    if (img) img.classList.remove('fonogram-donuyor');
  }
}

function closeFonogramModal() {
  if (fonogramAudio) {
    fonogramAudio.pause();
    fonogramAudio.currentTime = 0;
    fonogramAudio = null;
  }
  fonogramPlaying = false;
  closeModal();
}

function openPolaroidIslenmisModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="collect('polaroid_islenmis')">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(18px, 2.5cqw, 30px); margin-bottom:10px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">(İşlenmiş) Polaroid Fotoğraf</h3>
      <img src="assets/arayuz/poloroid_islenmis.webp" style="max-width:88cqw; max-height:39.375cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('polaroid_islenmis');">ENVANTERE AL</button>
    </div>
  `);
}

function openCevdetNotModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="collect('cevdet_not')">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(18px, 2.5cqw, 30px); margin-bottom:10px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">Cevdet'in Notu</h3>
      <img src="assets/arayuz/cevdet_not.webp" style="max-width:88cqw; max-height:39.375cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('cevdet_not');">ENVANTERE AL</button>
    </div>
  `);
}