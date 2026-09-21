/* ============================================================
   YÜKLEME YARDIMCISI — engine.js'ten bağımsız.

   1) "Kurtarıcı taktik": oyuncu bir yere gitmek istediğinde görsel HAZIRSA
      hiçbir şey görmez, anında geçilir. Hazır değilse ve yükleme 300 ms'den
      uzun sürerse ekranın ortasında "(Mekana yürünüyor...)" yazısı çıkar ve
      yürüme sesi çalar; görsel gelince kaybolur. Yükleme ekranı hissi yerine
      oyunun bir parçası gibi durur.

   2) Arka plan ön yükleme: oyuncu oynarken sıradaki odaların görselleri
      yavaş yavaş, tek tek (mobil veriyi ve o anki isteği boğmadan) önceden
      indirilir. Veri tasarrufu modu açıksa yapılmaz.

   Kullanım (oyun.html):
     Yukleme.kur({ sahne: stageFrame, ses: 'assets/ses/yurume_sesi.mp3' });
     Yukleme.gecis([görselUrl, ...], () => { ...odayı çiz... });
     Yukleme.arkaPlanda([url, url, ...]);
   ============================================================ */
const Yukleme = (function () {
  const hazirlar = new Set();     // yüklenmiş (tarayıcı önbelleğinde olan) url'ler
  const bekleyenler = new Map();  // url -> yüklenmekte olan Promise
  const ayar = {
    esik: 300,          // ms — bundan uzun sürerse yürüme ekranı çıkar
    minGosterim: 900,   // ms — ekran bir kez çıktıysa en az bu kadar kalır (yanıp sönmesin)
    zamanAsimi: 15000,  // ms — bu kadar bekledikten sonra yine de devam edilir
    metin: '(Mekana yürünüyor...)'
  };
  let sahne = null, katman = null, ses = null;
  let gosteriliyor = false, gosterimBasi = 0, beklemede = 0;

  function kur(a) {
    sahne = a.sahne;
    if (a.metin) ayar.metin = a.metin;
    Object.assign(ayar, a.ayar || {});
    if (a.ses) {
      ses = new Audio(a.ses);
      ses.loop = true;
      ses.preload = 'auto';
      ses.addEventListener('error', () => { ses = null; }); // dosya yoksa sessizce vazgeç
    }
  }

  function yukle(url) {
    if (!url || hazirlar.has(url)) return Promise.resolve();
    if (bekleyenler.has(url)) return bekleyenler.get(url);
    const p = new Promise(res => {
      const img = new Image();
      img.onload = () => { hazirlar.add(url); bekleyenler.delete(url); res(); };
      img.onerror = () => { bekleyenler.delete(url); res(); }; // bulunamadıysa oyunu kilitleme
      img.src = url;
    });
    bekleyenler.set(url, p);
    return p;
  }

  function katmanYap() {
    katman = document.createElement('div');
    katman.className = 'yuk-katman';
    katman.innerHTML = `<div class="yuk-metin">${ayar.metin}</div>`;
    sahne.appendChild(katman);
  }
  function goster() {
    if (!sahne) return;
    if (!katman) katmanYap();
    gosteriliyor = true;
    gosterimBasi = Date.now();
    katman.classList.add('aktif');
    if (ses) { ses.currentTime = 0; ses.play().catch(() => {}); }
  }
  function gizle() {
    if (beklemede > 0 || !katman) return; // başka bir geçiş hâlâ bekliyorsa ekran kalsın
    gosteriliyor = false;
    katman.classList.remove('aktif');
    setTimeout(() => { if (!gosteriliyor && ses) ses.pause(); }, 350);
  }

  // urls hazırsa devam() hemen çalışır. Değilse yüklenmesi beklenir; 300 ms'yi
  // aşarsa yürüme ekranı gösterilir, devam() ise görseller gelince çalışır.
  function gecis(urls, devam) {
    const liste = urls.filter(u => u && !hazirlar.has(u));
    if (!liste.length) { devam(); return; }

    beklemede++;
    let bitti = false;
    const esikZamani = setTimeout(() => { if (!bitti) goster(); }, ayar.esik);

    const tamam = () => {
      if (bitti) return;
      bitti = true;
      clearTimeout(esikZamani);
      const ekranVardi = gosteriliyor;
      const kalan = ekranVardi ? Math.max(0, ayar.minGosterim - (Date.now() - gosterimBasi)) : 0;
      setTimeout(() => {
        beklemede--;
        devam();                    // oda ekranın altında çizilmeye başlar…
        if (ekranVardi) setTimeout(gizle, 400); // …ve yürüme ekranı yavaşça çekilir
      }, kalan);
    };
    Promise.race([
      Promise.all(liste.map(yukle)),
      new Promise(r => setTimeout(r, ayar.zamanAsimi))
    ]).then(tamam);
  }

  // Sıradaki görselleri sırayla, aralarda kısa nefes payıyla önceden indirir
  function arkaPlanda(urls, secenek) {
    if (navigator.connection && navigator.connection.saveData) return;
    const kuyruk = urls.filter(u => u && !hazirlar.has(u));
    const bekle = (secenek && secenek.bekle != null) ? secenek.bekle : 2500;
    function sonraki() {
      const u = kuyruk.shift();
      if (!u) return;
      yukle(u).then(() => setTimeout(sonraki, 150));
    }
    setTimeout(sonraki, bekle);
  }

  return { kur, gecis, yukle, arkaPlanda };
})();
