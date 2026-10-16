/* ============================================================
   SISLIDERE DAVASI — GELİŞTİRİCİ TEST PANELİ (ADMIN PANEL)
   Kısayol: Shift + A
   ============================================================ */

(function initAdminPanel() {
  // 1. Panel HTML Tasarımı (Ekran Kaplaması)
  const panelHtml = `
    <div id="adminPanelOverlay" style="display:none; position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,0.88); backdrop-filter:blur(6px); color:#e9dcc0; font-family:sans-serif; padding:20px; box-sizing:border-box; overflow-y:auto;">
      <div style="max-width:650px; margin:30px auto; background:#1c150c; border:2px solid #8a5a2b; border-radius:10px; padding:24px; box-shadow:0 0 30px rgba(0,0,0,0.9); position:relative;">
        
        <!-- Kapat Butonu -->
        <button onclick="toggleAdminPanel()" style="position:absolute; top:12px; right:16px; background:none; border:none; color:#e9dcc0; font-size:28px; cursor:pointer;">✕</button>
        
        <h2 style="color:#d1a76c; font-family:'Georgia', serif; margin-top:0; margin-bottom:15px; border-bottom:1px solid #3a2c1a; padding-bottom:10px;">🛠️ Geliştirici Test Paneli</h2>

        <!-- GÜN SEÇİMİ -->
        <div style="margin-bottom:20px;">
          <h4 style="color:#a89379; margin-bottom:8px; font-size:14px;">📅 İstediğin Güne Işınlan:</h4>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="admin-btn" onclick="jumpToDay(1)">Gün 1</button>
            <button class="admin-btn" onclick="jumpToDay(2)">Gün 2</button>
            <button class="admin-btn" onclick="jumpToDay(3)">Gün 3</button>
            <button class="admin-btn" onclick="jumpToDay(4)">Gün 4</button>
            <button class="admin-btn" onclick="jumpToDay(5)">Gün 5</button>
            <button class="admin-btn" onclick="jumpToDay(6)">Gün 6</button>
            <button class="admin-btn" onclick="jumpToDay(7)">Gün 7</button>
          </div>
        </div>

        <!-- BAYRAK (FLAG) TETİKLEYİCİLERİ -->
        <div style="margin-bottom:20px;">
          <h4 style="color:#a89379; margin-bottom:8px; font-size:14px;">⚡ Kilit Bayrakları Aktif Et:</h4>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="admin-btn" onclick="setAdminFlag('day2_muhtar_goruldu')">Muhtar Görüldü (Gün 2)</button>
            <button class="admin-btn" onclick="setAdminFlag('day2_polis_goruldu')">Polis Görüldü (Gün 2)</button>
            <button class="admin-btn" onclick="setAdminFlag('otopsi_incelendi')">Otopsi İncelendi</button>
            <button class="admin-btn" onclick="setAdminFlag('day4_imza_incelendi')">İmzalar İncelendi (Gün 4)</button>
            <button class="admin-btn" onclick="setAdminFlag('day4_halit_yazdi_tespit')">Halit Yazdı Tespit (Gün 4)</button>
          </div>
        </div>

        <!-- HIZLI ENVANTER EŞYASI ALMA -->
        <div style="margin-bottom:15px;">
          <h4 style="color:#a89379; margin-bottom:8px; font-size:14px;">🎒 Envantere Eşya Ekle:</h4>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="admin-btn" onclick="giveAdminItem('evlilik_cuzdan')">+ Evlilik Cüzdanı</button>
            <button class="admin-btn" onclick="giveAdminItem('polaroid')">+ Polaroid Fotoğraf</button>
            <button class="admin-btn" onclick="giveAdminItem('yanik_kagit')">+ Yanık Kağıt</button>
            <button class="admin-btn" onclick="giveAdminItem('cevdet_not')">+ Cevdet'in Notu</button>
            <button class="admin-btn" onclick="giveAdminItem('gunluk')">+ Şefika'nın Günlüğü</button>
          </div>
        </div>

        <p style="font-size:12px; color:#8a5a2b; margin-top:20px; text-align:right;">Kapatmak için <kbd style="background:#2c1c0e; padding:2px 6px; border-radius:3px;">Shift + A</kbd> tuşuna basın.</p>
      </div>
    </div>

    <style>
      .admin-btn {
        background: #3a2c1a;
        color: #e9dcc0;
        border: 1px solid #8a5a2b;
        padding: 8px 14px;
        border-radius: 5px;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
        font-weight: bold;
        transition: all 0.15s ease;
      }
      .admin-btn:hover {
        background: #8a5a2b;
        color: #ffffff;
        transform: translateY(-1px);
      }
    </style>
  `;

  document.body.insertAdjacentHTML('beforeend', panelHtml);

  // 2. Shift + A Kısayol Dinleyicisi
  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      toggleAdminPanel();
    }
  });
})();

// Paneli Aç / Kapat Fonksiyonu
function toggleAdminPanel() {
  const panel = document.getElementById('adminPanelOverlay');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }
}

// Güne Işınlanma Fonksiyonu
function jumpToDay(dayNum) {
  window.location.href = window.location.pathname + '?day=' + dayNum;
}

// Bayrak Set Etme Fonksiyonu
function setAdminFlag(flagName) {
  if (typeof gameState !== 'undefined' && gameState.setFlag) {
    gameState.setFlag(flagName, true);
    if (typeof showCustomSubtitle === 'function') {
      showCustomSubtitle(`[ADMIN] Bayrak Aktif Edildi: ${flagName}`, true);
    }
    if (typeof renderRoom === 'function') renderRoom();
  }
}

// Eşya Verme Fonksiyonu
function giveAdminItem(itemId) {
  if (typeof collect === 'function') {
    collect(itemId);
  } else if (typeof addItem === 'function') {
    addItem(itemId);
  }
}