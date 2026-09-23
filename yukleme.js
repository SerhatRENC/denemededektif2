/* ============================================================
   YÜKLEME YARDIMCISI — engine.js'ten bağımsız.
   ============================================================ */
const Yukleme = (function () {
  const hazirlar = new Set();
  const bekleyenler = new Map();
  const ayar = {
    esik: 300,
    minGosterim: 900,
    zamanAsimi: 15000,
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
      ses.addEventListener('error', () => { ses = null; });
    }
  }

  function yukle(url) {
    if (!url || hazirlar.has(url)) return Promise.resolve();
    if (bekleyenler.has(url)) return bekleyenler.get(url);
    const p = new Promise(res => {
      const img = new Image();
      img.onload = () => { hazirlar.add(url); bekleyenler.delete(url); res(); };
      img.onerror = () => { bekleyenler.delete(url); res(); };
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
    if (beklemede > 0 || !katman) return;
    gosteriliyor = false;
    katman.classList.remove('aktif');
    setTimeout(() => { if (!gosteriliyor && ses) ses.pause(); }, 350);
  }

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
        devam();
        if (ekranVardi) setTimeout(gizle, 400);
      }, kalan);
    };
    Promise.race([
      Promise.all(liste.map(yukle)),
      new Promise(r => setTimeout(r, ayar.zamanAsimi))
    ]).then(tamam);
  }

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