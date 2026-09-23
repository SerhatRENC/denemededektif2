/* ============================================================
   ÖĞRETİCİ MODÜLÜ — engine.js'ten bağımsız.
   index.html (giriş sekansı) ve oyun.html (ana oyun) ikisi de kullanır.

   Fikir: oyuncu bir ekrana/odaya İLK kez geldiğinde, o ekrana özel kısa bir
   bilgi kartı çıkar. Kapat (✕) ya da "Anladım" ile kapanır; bir daha çıkmaz
   (localStorage). Kartın metni kod içinde değil, "içerik" nesnesinde durur:
     - oyun.html  → case.json içindeki "ogretici" bloğu
     - index.html → kendi içindeki OGRETICI_ICERIK nesnesi

   İçerik biçimi (hepsi isteğe bağlı, sadece baslik/metin bile yeter):
     "oda_id": {
       "baslik":  "Kartın başlığı",
       "metin":   "Tek paragraf"  veya  ["paragraf 1", "paragraf 2"],
       "maddeler":[ { "ikon": "assets/el.png", "baslik": "Bak", "metin": "açıklama" } ],
       "demo":    { "karakter": "assets/karakterler/halit.png", "isim": "Halit",
                    "satirlar": ["1. cümle", "2. cümle"] },   // "tıkla, tekrar tıkla" örneği
       "vurgu":   [".css-secici"],   // kart açıkken bu öğelere parlayan halka eklenir
       "konum":   "ust-orta" | "ust-sol" | "ust-sag" | "alt-orta" | "orta",
       "gecikme": 800                // ms — ekran açıldıktan kaç ms sonra çıksın
     }

   Konsoldan test: Ogretici.sifirla()  → tüm öğreticiler tekrar "ilk kez" olur.
   ============================================================ */
const Ogretici = (function () {
  const DEPO_ONEK = 'renc_ogretici_v1_';
  let sahne = null;      // kartın ekleneceği kapsayıcı (stage-frame)
  let icerik = {};
  let onek = 'oyun';     // localStorage anahtarı için oyun/vaka adı
  let mevcutFn = null;   // '?' düğmesi için: şu anki oda id'sini döndüren fonksiyon
  let kart = null;
  let vurgular = [];
  let bekleyen = null;   // gecikmeli gösterim için zamanlayıcı

  function depoAnahtar(k) { return DEPO_ONEK + onek + '_' + k; }
  function goruldu(k) {
    try { return localStorage.getItem(depoAnahtar(k)) === '1'; } catch (e) { return false; }
  }
  function gordu(k) {
    try { localStorage.setItem(depoAnahtar(k), '1'); } catch (e) { /* özel gezinme vb. */ }
  }

  function kur(ayar) {
    sahne = ayar.sahne;
    icerik = ayar.icerik || {};
    onek = ayar.onek || 'oyun';
    mevcutFn = ayar.mevcut || null;
  }

  function demoHtml(d) {
    const s = d.satirlar || ['Merhaba dedektif.', 'Size bir şey göstermem lazım.'];
    return `
      <div class="ogr-demo">
        <div class="ogr-demo-sol">
          <img class="ogr-demo-kar" src="${d.karakter}" alt="">
          <img class="ogr-demo-el" src="${d.el || 'assets/el.png'}" alt="">
        </div>
        <div class="ogr-demo-sag">
          <div class="ogr-demo-balon">
            <div class="ogr-demo-isim">${d.isim || ''}</div>
            <div class="ogr-demo-satirlar">
              <span class="ogr-demo-satir a">${s[0]}</span>
              <span class="ogr-demo-satir b">${s[1] || s[0]}</span>
            </div>
          </div>
          <div class="ogr-demo-adim">
            <span class="a">${d.adim1 || '1. tık: konuşma başlar'}</span>
            <span class="b">${d.adim2 || '2. tık: sonraki cümle'}</span>
          </div>
        </div>
      </div>`;
  }

  function ac(k, veri) {
    if (!sahne) return;
    kapat();

    const metinler = [].concat(veri.metin || []);
    const maddeler = veri.maddeler || [];
    let html = '<div class="ogr-icerik">';
    if (veri.baslik) html += `<div class="ogr-baslik">${veri.baslik}</div>`;
    if (metinler.length) html += '<div class="ogr-metin">' + metinler.map(m => `<p>${m}</p>`).join('') + '</div>';
    if (veri.demo) html += demoHtml(veri.demo);
    if (maddeler.length) {
      html += `<div class="ogr-maddeler${maddeler.length > 3 ? ' iki-sutun' : ''}">` +
        maddeler.map(m => `
          <div class="ogr-madde">
            <img class="ogr-ikon" src="${m.ikon}" alt="">
            <div class="ogr-madde-metin"><b>${m.baslik || ''}</b>${m.metin ? ' — ' + m.metin : ''}</div>
          </div>`).join('') +
        '</div>';
    }
    html += '<button class="ogr-tamam" type="button">Anladım</button></div>';
    // ✕ düğmesi kartın DIŞINA taşan bir çıkıntı (içerik kaydırılsa bile sabit kalır)
    html += '<button class="ogr-kapat" type="button" aria-label="Kapat">✕</button>';

    kart = document.createElement('div');
    kart.className = 'ogr-kart ogr-' + (veri.konum || 'ust-orta');
    kart.setAttribute('role', 'dialog');
    kart.innerHTML = html;
    kart.querySelector('.ogr-kapat').onclick = () => kapat();
    kart.querySelector('.ogr-tamam').onclick = () => kapat();
    sahne.appendChild(kart);

    // Vurgulanacak öğeler (ör. mors yazı alanı, köşedeki harita/defter ikonları)
    (veri.vurgu || []).forEach(sel => {
      sahne.querySelectorAll(sel).forEach(el => { el.classList.add('ogr-vurgu'); vurgular.push(el); });
    });

    gordu(k); // kart ekrana geldiği anda "görüldü" sayılır
  }

  function kapat() {
    if (kart) { kart.remove(); kart = null; }
    vurgular.forEach(el => el.classList.remove('ogr-vurgu'));
    vurgular = [];
  }

  // Bekleyen kartı iptal eder, açık kart varsa kapatır (ekran/oda değişirken çağır)
  function iptal() {
    if (bekleyen) { clearTimeout(bekleyen); bekleyen = null; }
    kapat();
  }

  // İlk kez görülüyorsa (ve içeriği varsa) kartı gecikmeyle gösterir
  function goster(anahtar, secenek) {
    const veri = icerik[anahtar];
    if (!veri || goruldu(anahtar)) return false;
    if (bekleyen) clearTimeout(bekleyen);
    const gecikme = (secenek && secenek.gecikme != null) ? secenek.gecikme
                  : (veri.gecikme != null ? veri.gecikme : 800);
    bekleyen = setTimeout(() => { bekleyen = null; ac(anahtar, veri); }, gecikme);
    return true;
  }

  // '?' düğmesi: görülmüş olsa bile şimdi göster. Odaya özel içerik yoksa "genel" kartı açılır.
  function yeniden(anahtar) {
    anahtar = anahtar || (mevcutFn ? mevcutFn() : null);
    const k = icerik[anahtar] ? anahtar : 'genel';
    if (!icerik[k]) return;
    iptal();
    ac(k, Object.assign({}, icerik[k], { konum: icerik[k].konum || 'orta' }));
  }

  // Oyuncu zaten gösterilecek şeyi yaptıysa (ör. karaktere tıkladıysa) kartı "görüldü" say
  function isaretle(anahtar) { gordu(anahtar); }

  function sifirla() {
    try {
      Object.keys(localStorage)
        .filter(k => k.indexOf(DEPO_ONEK) === 0)
        .forEach(k => localStorage.removeItem(k));
    } catch (e) { /* yoksay */ }
  }

  return { kur, goster, yeniden, iptal, kapat, isaretle, sifirla };
})();

/* ============================================================
   SES YARDIMCISI — hem index.html hem oyun.html kullanıyor.
   assets/ses/<ad>.mp3 dosyasını bir kez çalar. Her çağrıda yeni bir Audio
   nesnesi oluşturuluyor ki art arda hızlı tıklamalarda sesler birbirini
   kesmesin.
   ============================================================ */
function calSes(ad) {
  try { new Audio('assets/ses/' + ad + '.mp3').play().catch(() => {}); } catch (e) { /* yoksay */ }
}
