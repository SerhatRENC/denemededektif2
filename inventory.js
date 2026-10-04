/* ============================================================
   SISLIDERE DAVASI — MODÜL 2: ENVANTER SİSTEMİ
   ============================================================ */

const ITEM_DEFS = {
  anahtar:          { img: 'assets/tiklanabilir/anahtar.webp',          view: 'assets/tiklanabilir/anahtar.webp',        label: 'Anahtar',           title: 'Oda Anahtarı' },
  evlilik_cuzdan:   { img: 'assets/arayuz/evlilik_cuzdan.webp',          view: 'assets/arayuz/evlilik_cuzdan.webp',       label: 'Cüzdan',            title: 'Evlilik Cüzdanı' },
  polaroid:         { img: 'assets/arayuz/poloroid.webp',                view: 'assets/arayuz/poloroid.webp',             label: 'Polaroid',          title: '(İşlenmemiş) Polaroid Fotoğraf' },
  polaroid_islenmis:{ img: 'assets/arayuz/poloroid_islenmis.webp',       view: 'assets/arayuz/poloroid_islenmis.webp',    label: 'İşlenmiş Polaroid', title: '(İşlenmiş) Polaroid Fotoğraf' },
  cevdet_not:       { img: 'assets/arayuz/cevdet_not.webp',              view: 'assets/arayuz/cevdet_not.webp',           label: "Cevdet'in Notu",    title: "Cevdet'in Notu" },
  yanik_kagit:      { img: 'assets/tiklanabilir/yanik_kagit_tiklanabilir.webp', view: 'assets/arayuz/yanik_kagit_incele.webp', label: 'Yanık Kağıt',     title: 'Yanık Kağıt' },
  gazeteci_dosyasi: { img: 'assets/arayuz/gazeteci_dosya.webp',          view: null,                                      label: 'Dosya',             title: 'Gazeteci Dosyası' }
};

function openEnvanterEsyasi(id) {
  if (dialogueActive) return;
  if (typeof Ogretici !== 'undefined') { Ogretici.isaretle('envanter_ilk'); Ogretici.kapat(); }
  const def = ITEM_DEFS[id];
  if (!def) return;
  if (typeof calSes === 'function') calSes('incele');
  if (id === 'gazeteci_dosyasi') { openGazeteciDosyaModal(null, 0); return; }
  openGorselModal(def.view || def.img, def.title);
}

function renderInventory() {
  const inv = document.getElementById('inventory');
  if (!inv) return;
  const gorunen = (inventory || []).filter(id => ITEM_DEFS[id]);
  if (gorunen.length === 0) {
    inv.innerHTML = '<span class="inv-empty">envanter boş</span>';
    return;
  }
  inv.innerHTML = '';
  gorunen.forEach(id => {
    const def = ITEM_DEFS[id];
    const el = document.createElement('div');
    el.className = 'inv-item';
    el.style.cssText = "width:clamp(57px, 6.8cqw, 81px); height:clamp(57px, 6.8cqw, 81px); display:flex; flex-direction:column; align-items:center; justify-content:center; margin:0 3px; cursor:pointer;";
    el.title = def.title;
    el.innerHTML = `<img src="${def.img}" style="height:56%; object-fit:contain;"><span style="font-size:clamp(9px,1.25cqw,12px); line-height:1.05; text-align:center; color:#e9dcc0;">${def.label}</span>`;
    el.onclick = (ev) => { if (ev) ev.stopPropagation(); openEnvanterEsyasi(id); };
    inv.appendChild(el);
  });
}

/* Eşyayı envantere ekler, modalı kapatır, gün JSON'undaki events.collect[id] olaylarını çalıştırır
   (ör. anahtar alınınca gün durumu değişir), sonra odayı yeniler. */
async function collect(collectId) {
  gameState.setFlag('col_' + collectId, true);
  if (!inventory.includes(collectId)) {
    inventory.push(collectId);
    saveInventory();
  }
  renderInventory();
  closeModal();
  await runEvents('collect', collectId);
  renderRoom();
}
