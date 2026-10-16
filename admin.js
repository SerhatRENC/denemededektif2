/* SISLIDERE DAVASI — ADMIN PANELİ (Shift + A) */
(function initAdminPanel() {
  
  const btn = (label, fn) => `<button class="admin-btn" onclick="${fn}">${label}</button>`;
  const html = `
  <div id="adminPanelOverlay" style="display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);backdrop-filter:blur(6px);color:#e9dcc0;font-family:sans-serif;padding:20px;box-sizing:border-box;overflow-y:auto;">
    <div style="max-width:650px;margin:30px auto;background:#1c150c;border:2px solid #8a5a2b;border-radius:10px;padding:24px;position:relative;">
      <button onclick="toggleAdminPanel()" style="position:absolute;top:12px;right:16px;background:none;border:none;color:#e9dcc0;font-size:28px;cursor:pointer;">✕</button>
      <h2 style="color:#d1a76c;font-family:Georgia,serif;margin-top:0;">🛠️ Geliştirici Test Paneli</h2>

      <h4 style="color:#a89379;">📅 Güne Işınlan (önceki günler tamamlanmış sayılır):</h4>
      <div class="admin-row">${[1,2,3,4,5,6,7].map(n => btn('Gün ' + n, `jumpToDay(${n})`)).join('')}</div>

      <h4 style="color:#a89379;">⚡ Bayrak Aktif Et:</h4>
      <div class="admin-row">
        ${btn('Muhtar Görüldü (G2)', "setAdminFlag('day2_muhtar_goruldu')")}
        ${btn('Polis Görüldü (G2)', "setAdminFlag('day2_polis_goruldu')")}
        ${btn('Otopsi İncelendi', "setAdminFlag('otopsi_incelendi')")}
        ${btn('İmzalar İncelendi (G4)', "setAdminFlag('day4_imza_incelendi')")}
        ${btn('Halit Yazdı Tespit (G4)', "setAdminFlag('day4_halit_yazdi_tespit')")}
      </div>

      <h4 style="color:#a89379;">🎒 Envantere Eşya Ekle:</h4>
      <div class="admin-row">
        ${btn('+ Anahtar', "giveAdminItem('anahtar')")}
        ${btn('+ Evlilik Cüzdanı', "giveAdminItem('evlilik_cuzdan')")}
        ${btn('+ Polaroid', "giveAdminItem('polaroid')")}
        ${btn('+ İşlenmiş Polaroid', "giveAdminItem('polaroid_islenmis')")}
        ${btn('+ Yanık Kağıt', "giveAdminItem('yanik_kagit')")}
        ${btn("+ Cevdet'in Notu", "giveAdminItem('cevdet_not')")}
        ${btn("+ Şefika'nın Günlüğü", "giveAdminItem('gunluk')")}
      </div>
      <p style="font-size:12px;color:#8a5a2b;text-align:right;">Kapat: Shift + A</p>
    </div>
  </div>
  <style>
    .admin-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;}
    .admin-btn{background:#3a2c1a;color:#e9dcc0;border:1px solid #8a5a2b;padding:8px 14px;border-radius:5px;cursor:pointer;font-size:13px;font-weight:bold;}
    .admin-btn:hover{background:#8a5a2b;color:#fff;}
  </style>`;
  document.body.insertAdjacentHTML('beforeend', html);

  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return; // defterde "A" yazarken açılmasın
    if (e.shiftKey && e.code === 'KeyA') { e.preventDefault(); toggleAdminPanel(); }
  });

  // Işınlanma sonrası intro ekranını atla
  if (sessionStorage.getItem('sd_skip_intro')) {
    sessionStorage.removeItem('sd_skip_intro');
    window.addEventListener('load', () => setTimeout(() => {
      if (typeof kapatIntroOverlay === 'function') kapatIntroOverlay();
    }, 400));
  }
})();

function toggleAdminPanel() {
  const p = document.getElementById('adminPanelOverlay');
  if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

/* Bir güne GİRMEK için gereken durum (önceki günlerin tamamlanmış hali).
   Yeni gün yazdıkça buraya ekle. */
const ADMIN_DAY_DONE = {
  1: { flags: ['day1_started'], items: [] },
  2: {
    flags: ['day2_started', 'day2_muhtar_goruldu', 'day2_polis_goruldu', 'otopsi_incelendi',
            'gazeteci_oda_acik', 'col_anahtar', 'col_evlilik_cuzdan', 'col_yanik_kagit',
            'col_polaroid', 'col_canta_kagitlar_incelendi'],
    items: ['evlilik_cuzdan', 'yanik_kagit']
  },
  3: {
    flags: ['day3_polis_goruldu', 'col_polaroid_islenmis', 'col_cevdet_not'],
    items: ['polaroid_islenmis', 'cevdet_not']
  },
  4: {
    flags: ['day4_halit_izin_verdi', 'day4_imza_incelendi', 'day4_halit_yazdi_tespit',
            'day4_imza_halit_yuzlesildi', 'col_gunluk', 'day4_peder_konusuldu',
            'day4_riza_konusuldu', 'day4_cabbar_konusuldu', 'day4_mustafa_konusuldu',
            'day4_kamuran_konusuldu', 'day4_nadire_konusuldu', 'day4_cevdet_konusuldu'],
    items: ['gunluk']
  },
  5: { flags: [], items: [] },
  6: { flags: [], items: [] }
};

function jumpToDay(dayNum) {
  const label = (typeof CASE !== 'undefined' && CASE && CASE.caseLabel) || 'KANIT-04';
  const flags = { _migrated_v2: true };
  const items = [];
  for (let d = 1; d < dayNum; d++) {
    const p = ADMIN_DAY_DONE[d];
    if (!p) continue;
    p.flags.forEach(f => { flags[f] = true; });
    p.items.forEach(i => { if (!items.includes(i)) items.push(i); });
  }
  localStorage.setItem('sd_day_' + label, String(dayNum));
  localStorage.setItem('sd_flags_' + label, JSON.stringify(flags));
  localStorage.setItem('sd_inv_' + label, JSON.stringify(items));
  sessionStorage.setItem('sd_skip_intro', '1');
  location.reload();
}

function setAdminFlag(name) {
  gameState.setFlag(name, true);
  if (typeof showCustomSubtitle === 'function') showCustomSubtitle(`[ADMIN] Bayrak: ${name}`, true);
  if (typeof renderRoom === 'function') renderRoom();
}

function giveAdminItem(id) { if (typeof collect === 'function') collect(id); }