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
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:15px; box-sizing:border-box;">
      <img src="assets/arayuz/evlilik_cuzdan.webp" style="max-height:55vh; max-width:85vw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95)); margin-bottom:10px;">
      <div style="background:rgba(20,14,8,0.9); border-left:4px solid #8a5a2b; color:#e9dcc0; padding:8px 18px; border-radius:6px; font-size:clamp(13px, 1.6cqw, 18px); max-width:650px; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.6); margin-bottom:12px;">
        Dedektif: "Gazetecinin çantasından çıkan eski bir evlilik cüzdanı..."
      </div>
      <button class="btn show" style="padding:8px 22px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:17px;" onclick="if(typeof calSes==='function') calSes('take'); collect('evlilik_cuzdan'); closeModal();">ENVANTERE AL</button>
    </div>
  `);
}

function openCantaKagitlarModal() {
  if (typeof gameState !== 'undefined' && gameState.setFlag) {
    gameState.setFlag('col_canta_kagitlar_incelendi', true);
  }
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:15px; box-sizing:border-box;">
      <img src="assets/arayuz/bos_kagit.webp" style="max-height:60vh; max-width:85vw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95)); margin-bottom:12px;">
      <div style="background:rgba(20,14,8,0.9); border-left:4px solid #8a5a2b; color:#e9dcc0; padding:10px 20px; border-radius:6px; font-size:clamp(14px, 1.8cqw, 19px); max-width:650px; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.6);">
        Dedektif: "Boş kağıtlar... Henüz bunlara bir şey yazamamış."
      </div>
    </div>
  `, 'cantaKagitlar');
}

function openCantaPolaroidModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:15px; box-sizing:border-box;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(16px, 2.2cqw, 26px); margin-bottom:8px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">(İşlenmemiş) Polaroid Fotoğraf</h3>
      <img src="assets/arayuz/poloroid.webp" style="max-height:50vh; max-width:85vw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95)); margin-bottom:10px;">
      <div style="background:rgba(20,14,8,0.9); border-left:4px solid #8a5a2b; color:#e9dcc0; padding:8px 18px; border-radius:6px; font-size:clamp(13px, 1.6cqw, 18px); max-width:650px; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.6); margin-bottom:12px;">
        Dedektif: "Bu fotoğraf tam çıkmamış, karanlık odada işleyip netleştirmem lazım."
      </div>
      <button class="btn show" style="padding:8px 22px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:17px;" onclick="if(typeof calSes==='function') calSes('take'); collect('polaroid'); closeModal();">ENVANTERE AL</button>
    </div>
  `);
}

function openYanikKagitModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:15px; box-sizing:border-box;">
      <img src="assets/arayuz/yanik_kagit_incele.webp" style="max-height:52vh; max-width:85vw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95)); margin-bottom:10px;">
      <div style="background:rgba(20,14,8,0.9); border-left:4px solid #8a5a2b; color:#e9dcc0; padding:8px 18px; border-radius:6px; font-size:clamp(13px, 1.6cqw, 18px); max-width:650px; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.6); margin-bottom:12px;">
        Dedektif: "Kağıdın her yeri yanmış, neredeyse hiç okunmuyor..."
      </div>
      <button class="btn show" style="padding:8px 22px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:17px;" onclick="if(typeof calSes==='function') calSes('take'); collect('yanik_kagit'); closeModal();">ENVANTERE EKLE</button>
    </div>
  `);
}

let currentGazeteciPagesList = typeof gazeteciDosyaPagesDefault !== 'undefined' ? gazeteciDosyaPagesDefault : [];

function openGazeteciDosyaModal(pages = null, index = 0) {
  if (pages && Array.isArray(pages)) {
    currentGazeteciPagesList = pages;
  }
  const activePages = currentGazeteciPagesList;
  if (!activePages || activePages.length === 0) return;
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
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="collect('polaroid_islenmis'); closeModal();">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(18px, 2.5cqw, 30px); margin-bottom:10px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">(İşlenmiş) Polaroid Fotoğraf</h3>
      <img src="assets/arayuz/poloroid_islenmis.webp" style="max-width:88cqw; max-height:39.375cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('polaroid_islenmis'); closeModal();">ENVANTERE AL</button>
    </div>
  `);
}

function openCevdetNotModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="collect('cevdet_not'); closeModal();">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(18px, 2.5cqw, 30px); margin-bottom:10px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">Cevdet'in Notu</h3>
      <img src="assets/arayuz/cevdet_not.webp" style="max-width:88cqw; max-height:39.375cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('cevdet_not'); closeModal();">ENVANTERE AL</button>
    </div>
  `);
}

/* ============================================================
   GÜN 4 MODALLARI: GÜNLÜK, İMZA VE EL YAZISI BULMACALARI
   ============================================================ */

function openGunlukModal() {
  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(18px, 2.5cqw, 30px); margin-bottom:10px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">Şefika'nın Günlüğü</h3>
      <img src="assets/arayuz/gunluk.webp" style="max-width:88cqw; max-height:39.375cqw; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <br>
      <button class="btn show" style="padding:10px 24px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer; font-size:18px;" onclick="if(typeof calSes==='function') calSes('take'); collect('gunluk'); closeModal();">ENVANTERE AL</button>
    </div>
  `);
}

/* --- 3 İMZA KARŞILAŞTIRMA VE NOKTA TESPİT BULMACASI --- */
let imzaSecilenNoktalar = [];

function openImzaKiyaslamaModal() {
  imzaSecilenNoktalar = [];
  if (typeof calSes === 'function') calSes('harita');

  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>
    
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:10px; box-sizing:border-box;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(16px, 2.2cqw, 26px); margin-bottom:8px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">
        Ortadaki Tapu İmzası Üzerinde 3 Farklı Nokta Bulun
      </h3>

      <div style="display:flex; justify-content:center; align-items:center; gap:15px; max-width:95vw; height:60vh;">
        <div style="text-align:center;">
          <span style="color:#a89379; font-size:12px; display:block; margin-bottom:4px;">Evlilik İmzası</span>
          <img src="assets/arayuz/evlilik_imza.webp" style="max-height:50vh; max-width:28vw; object-fit:contain; border:1px solid #3a2c1a; border-radius:4px;">
        </div>

        <div id="tapuImzaContainer" style="position:relative; text-align:center; cursor:crosshair; user-select:none;" onclick="imzaNoktaTikla(event)">
          <span style="color:#d1a76c; font-weight:bold; font-size:13px; display:block; margin-bottom:4px;">Tapu İmzası (İnceleyin)</span>
          <img id="tapuImzaImg" src="assets/arayuz/tapu_imza.webp" style="max-height:50vh; max-width:32vw; object-fit:contain; border:2px solid #8a5a2b; border-radius:6px; box-shadow:0 0 15px rgba(227,169,74,0.3);">
        </div>

        <div style="text-align:center;">
          <span style="color:#a89379; font-size:12px; display:block; margin-bottom:4px;">İkametgah İmzası</span>
          <img src="assets/arayuz/ikametgah_imza.webp" style="max-height:50vh; max-width:28vw; object-fit:contain; border:1px solid #3a2c1a; border-radius:4px;">
        </div>
      </div>

      <div style="margin-top:15px; display:flex; gap:15px; align-items:center;">
        <button class="btn show" style="padding:8px 22px; background:#6b4423; color:#e9dcc0; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer;" onclick="imzaBulmacaKontrol()">İLERLE</button>
        <button class="btn show" style="padding:8px 16px; background:#3a2c1a; color:#a89379; border:1px solid #6b4423; border-radius:6px; cursor:pointer; font-size:14px;" onclick="imzaNoktalariSifirla()">Sıfırla</button>
      </div>
    </div>
  `, 'imzaKiyaslama');
}

function imzaNoktaTikla(e) {
  const container = document.getElementById('tapuImzaContainer');
  const img = document.getElementById('tapuImzaImg');
  if (!container || !img) return;

  if (imzaSecilenNoktalar.length >= 3) {
    if (typeof showCustomSubtitle === 'function') showCustomSubtitle("En fazla 3 nokta seçebilirsiniz.", true);
    return;
  }

  const rect = img.getBoundingClientRect();
  const xPercent = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
  const yPercent = (((e.clientY - rect.top) / rect.height) * 100).toFixed(1);

  if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;

  imzaSecilenNoktalar.push({ x: parseFloat(xPercent), y: parseFloat(yPercent) });

  const dot = document.createElement('div');
  dot.className = 'imza-halka';
  dot.style.position = 'absolute';
  dot.style.left = (img.offsetLeft + (parseFloat(xPercent) / 100) * img.offsetWidth) + 'px';
  dot.style.top = (img.offsetTop + (parseFloat(yPercent) / 100) * img.offsetHeight) + 'px';
  dot.style.width = '20px';
  dot.style.height = '20px';
  dot.style.border = '2px solid #c0392b';
  dot.style.borderRadius = '50%';
  dot.style.transform = 'translate(-50%, -50%)';
  dot.style.pointerEvents = 'none';
  dot.style.boxShadow = '0 0 8px rgba(192,57,43,0.8)';

  container.appendChild(dot);
  if (typeof calSes === 'function') calSes('incele');
}

function imzaNoktalariSifirla() {
  imzaSecilenNoktalar = [];
  document.querySelectorAll('.imza-halka').forEach(el => el.remove());
}

function imzaBulmacaKontrol() {
  if (imzaSecilenNoktalar.length < 3) {
    if (typeof showCustomSubtitle === 'function') showCustomSubtitle("Dedektif: Şüpheli 3 noktayı da işaretlemeliyim.", true);
    return;
  }

  closeModal();
  setTimeout(() => {
    openElYazisiModal();
  }, 400);
}

/* --- DOSYA ODASI BÜYÜK BELGELER MODALI --- */
function openDosyaOdasiBelgelerModal(index = 0) {
  const pages = [
    { title: 'Tapu Senetleri', src: 'assets/arayuz/tapu_senetleri.webp' },
    { title: "Şefika İkametgah Belgesi", src: 'assets/arayuz/sefika_ikametgah.webp' },
    { title: "Şefika Evlilik Belgesi", src: 'assets/arayuz/sefika_evlilik.webp' }
  ];
  const cur = pages[index];
  const prevDisabled = index === 0 ? 'disabled' : '';
  const nextDisabled = index === pages.length - 1 ? 'disabled' : '';

  if (typeof calSes === 'function') calSes('sayfa');

  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9);" onclick="closeModal()">✕</button>
    <button class="reader-side-arrow left" style="position:fixed; left:25px; top:50%; transform:translateY(-50%); z-index:10002; font-size:48px; background:none; border:none; color:#e9dcc0; cursor:pointer;" onclick="openDosyaOdasiBelgelerModal(${index - 1})" ${prevDisabled}>‹</button>
    
    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:10px;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(16px, 2.2cqw, 26px); text-shadow:0 2px 8px rgba(0,0,0,0.9);">${cur.title} (${index + 1}/3)</h3>
      <img src="${cur.src}" style="max-width:85cqw; max-height:52vh; object-fit:contain; filter:drop-shadow(0 0 25px rgba(0,0,0,0.95));">
      <div style="display:flex; gap:15px; margin-top:10px;">
        <button class="btn show" style="padding:10px 24px; background:#8a5a2b; color:#f3e5ab; border:2px solid #2c1c0e; border-radius:6px; font-weight:bold; cursor:pointer;" onclick="closeModal(); setTimeout(() => openImzaKiyaslamaModal(), 300);">✍️ İMZALARI KARŞILAŞTIR</button>
      </div>
    </div>

    <button class="reader-side-arrow right" style="position:fixed; right:25px; top:50%; transform:translateY(-50%); z-index:10002; font-size:48px; background:none; border:none; color:#e9dcc0; cursor:pointer;" onclick="openDosyaOdasiBelgelerModal(${index + 1})" ${nextDisabled}>›</button>
  `, 'dosyaOdasiBelgeler');
}

/* --- EL YAZILARI VE CEVDET'İN NOTU YAN YANA KARŞILAŞTIRMA MODALI --- */
function openElYazisiModal() {
  if (typeof calSes === 'function') calSes('harita');

  showFramelessModal(`
    <button class="reader-close" style="position:fixed; top:20px; right:25px; z-index:10002; font-size:42px; background:none; border:none; color:#e9dcc0; cursor:pointer; text-shadow:0 2px 10px rgba(0,0,0,0.9); line-height:1;" onclick="closeModal()">✕</button>

    <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:10px; box-sizing:border-box;">
      <h3 style="color:#e9dcc0; font-family:'Georgia', serif; font-size:clamp(16px, 2.2cqw, 24px); margin-bottom:8px; text-shadow:0 2px 8px rgba(0,0,0,0.9);">
        Cevdet'in Notundaki El Yazısı Kimin Yazısına Benziyor?
      </h3>

      <div style="display:flex; justify-content:center; align-items:center; gap:15px; max-width:95vw; height:58vh;">
        <div style="text-align:center;">
          <span style="color:#d1a76c; font-weight:bold; font-size:13px; display:block; margin-bottom:4px;">Cevdet'e Verilen Not</span>
          <img src="assets/arayuz/cevdet_not.webp" style="max-height:50vh; max-width:38vw; object-fit:contain; border:2px solid #8a5a2b; border-radius:6px; box-shadow:0 0 15px rgba(227,169,74,0.3);">
        </div>

        <div style="text-align:center;">
          <span style="color:#a89379; font-size:12px; display:block; margin-bottom:4px;">Köylülerin El Yazısı Örnekleri</span>
          <img src="assets/arayuz/el_yazilari.webp" style="max-height:50vh; max-width:48vw; object-fit:contain; border:1px solid #3a2c1a; border-radius:4px;">
        </div>
      </div>

      <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:10px; justify-content:center; max-width:800px;">
        <button class="btn show" style="padding:6px 16px; font-size:15px; background:#4a2f18;" onclick="elYazisiSecim('halit')">Muhtar Halit</button>
        <button class="btn show" style="padding:6px 16px; font-size:15px; background:#4a2f18;" onclick="elYazisiSecim('cabbar')">Demirci Cabbar</button>
        <button class="btn show" style="padding:6px 16px; font-size:15px; background:#4a2f18;" onclick="elYazisiSecim('mustafa')">Değirmenci Mustafa</button>
        <button class="btn show" style="padding:6px 16px; font-size:15px; background:#4a2f18;" onclick="elYazisiSecim('riza')">Hancı Rıza</button>
        <button class="btn show" style="padding:6px 16px; font-size:15px; background:#4a2f18;" onclick="elYazisiSecim('peder')">Peder Anselm</button>
      </div>
    </div>
  `, 'elYazisiKiyaslama');
}

function elYazisiSecim(isim) {
  if (isim === 'halit') {
    if (typeof calSes === 'function') calSes('incele');
    if (typeof gameState !== 'undefined' && gameState.setFlag) {
      gameState.setFlag('day4_halit_yazdi_tespit', true);
    }
    closeModal();
    setTimeout(() => {
      if (typeof showCustomSubtitle === 'function') showCustomSubtitle("Dedektif: Demek bu notu Halit yazmış!", true);
      if (typeof renderRoom === 'function') renderRoom();
    }, 300);
  } else {
    if (typeof calSes === 'function') calSes('geri');
    if (typeof showCustomSubtitle === 'function') showCustomSubtitle("Dedektif: Bu yazı pek de benzemiyor...", true);
  }
}