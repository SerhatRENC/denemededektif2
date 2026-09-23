/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası (v12 - Tam Revizyon)
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];
  let smokeParticles = [];

  // HER BİR MEKANIN BİREBİR DOSYA İSMİ VE KOORDİNATLARI
  const roomVFXConfig = {
    // 1. Giriş / Ana Karşılama Ekranı (giris.webp - Yüksek Atmosfer)
    'giris': {
      dust: true, count: 120,
      beam: { xMin: 0.15, xMax: 0.95, yMin: 0.15, yMax: 0.90 },
      lights: [
        { x: '31%', y: '36%', color: 'rgba(255, 160, 40, 0.80)', size: '15cqw' },
        { x: '86%', y: '28%', color: 'rgba(255, 160, 40, 0.80)', size: '15cqw' },
        { x: '94%', y: '43%', color: 'rgba(255, 160, 40, 0.70)', size: '12cqw' },
        { x: '46%', y: '42%', color: 'rgba(255, 140, 30, 0.60)', size: '10cqw' }
      ]
    },

    // 2. Dedektif Ofisi (dedektif_ofis.webp - Sol Pencere Huzmesi & Masadaki Lamba)
    'dedektif_ofis': {
      dust: true, count: 120,
      beam: { xMin: 0.01, xMax: 0.48, yMin: 0.02, yMax: 0.88 }, // Sadece sol pencere ve masa
      lights: [{ x: '29%', y: '50%', color: 'rgba(255, 170, 50, 0.80)', size: '22cqw' }] // Masadaki gaz lambası
    },

    // 3. Değirmenci (degirmenci.webp - Sol Taş + Sağ Terazi, Orta Taban Temiz)
    'degirmenci': {
      dust: true, count: 130,
      beams: [
        { xMin: 0.22, xMax: 0.58, yMin: 0.15, yMax: 0.60 }, // Sol pencereden değirmen taşına
        { xMin: 0.68, xMax: 0.95, yMin: 0.15, yMax: 0.60 }  // Sağ masa ve terazi hizası
      ]
    },

    // 4. Gazeteci Odası (gazeteci_oda.webp - Tavan Işığı/Ateşi)
    'gazeteci_oda': {
      dust: true, count: 100,
      beam: { xMin: 0.38, xMax: 0.68, yMin: 0.18, yMax: 0.75 },
      lights: [{ x: '50%', y: '10%', color: 'rgba(255, 190, 80, 0.80)', size: '32cqw' }] // Tavandaki ateş/ışık
    },

    // 5. Han İç Mekan (han.webp - Tüm Masalar & Duvar Fenerleri)
    'han': {
      dust: true, count: 90,
      beam: { xMin: 0.15, xMax: 0.85, yMin: 0.05, yMax: 0.40 }, // Üst balkon hizası
      lights: [
        { x: '18%', y: '68%', color: 'rgba(255, 150, 30, 0.80)', size: '18cqw' },
        { x: '42%', y: '72%', color: 'rgba(255, 150, 30, 0.80)', size: '18cqw' },
        { x: '72%', y: '65%', color: 'rgba(255, 150, 30, 0.80)', size: '18cqw' },
        { x: '31%', y: '35%', color: 'rgba(255, 140, 30, 0.70)', size: '16cqw' },
        { x: '68%', y: '34%', color: 'rgba(255, 140, 30, 0.70)', size: '16cqw' }
      ]
    },

    // 6. Merkez Meydanı (merkez.webp - Yükselen Baca Dumanı & Fırın Ateşi)
    'merkez': {
      smoke: true,
      lights: [{ x: '78%', y: '51%', color: 'rgba(255, 100, 20, 0.85)', size: '16cqw' }]
    },

    // 7. Mezarlik (mezarlik.webp - Taş Masa Mumları & Süzülen Toz)
    'mezarlik': {
      dust: true, count: 90,
      beam: { xMin: 0.15, xMax: 0.85, yMin: 0.30, yMax: 0.90 },
      lights: [{ x: '27%', y: '78%', color: 'rgba(255, 160, 50, 0.80)', size: '18cqw' }]
    },

    // 8. Nadire'nin Evi (nadire_ev.webp - Mükemmel Çalışan Yapı)
    'nadire_ev': {
      dust: true, count: 100,
      beam: { xMin: 0.22, xMax: 0.58, yMin: 0.30, yMax: 0.78 },
      lights: [{ x: '22%', y: '52%', color: 'rgba(255, 160, 40, 0.65)', size: '18cqw' }]
    },

    // 9. Demirci Atölyesi (demirci.webp)
    'demirci': {
      sparks: true, count: 65,
      beam: { xMin: 0.58, xMax: 0.95, yMin: 0.10, yMax: 0.85 },
      lights: [{ x: '58%', y: '42%', color: 'rgba(255, 90, 10, 0.85)', size: '34cqw' }]
    },

    // 10. Cadı / Büyücü Odası (cadi.webp)
    'cadi': {
      dust: true, count: 110,
      beam: { xMin: 0.35, xMax: 0.75, yMin: 0.25, yMax: 0.88 }
    },

    // 11. Halit'in Evi İç Mekan (halit_ev.webp)
    'halit_ev': {
      dust: true, count: 100,
      beam: { xMin: 0.55, xMax: 0.98, yMin: 0.15, yMax: 0.90 }
    },

    // 12. Halit'in Evi Kapısı (halit_ev_kapi.webp - Tozsuz)
    'halit_ev_kapi': {},

    // 13. Muhtar Odası (muhtar.webp)
    'muhtar': {
      dust: true, count: 100,
      beam: { xMin: 0.01, xMax: 0.78, yMin: 0.02, yMax: 0.98 }
    },

    // 14. Kilise İç Mekan (kilise.webp)
    'kilise': {
      dust: true, count: 120,
      beam: { xMin: 0.02, xMax: 0.98, yMin: 0.15, yMax: 0.95 }
    },

    // 15. Şifahane (sifahane.webp)
    'sifahane': {
      dust: true, count: 100,
      beam: { xMin: 0.05, xMax: 0.62, yMin: 0.08, yMax: 0.95 }
    },

    // 16. Han Depo / Mahzen (han_depo.webp)
    'han_depo': {
      dust: true, count: 110,
      beam: { xMin: 0.05, xMax: 0.70, yMin: 0.10, yMax: 0.85 }
    },

    // 17. Ofis / Şehir (ofis_sehir.webp)
    'ofis_sehir': {
      dust: true, count: 110,
      beam: { xMin: 0.15, xMax: 0.82, yMin: 0.08, yMax: 0.85 }
    },

    // 18. Diğer Kapı ve Dış Mekanlar
    'cevdet_ev': { dust: true, count: 90, beam: { xMin: 0.20, xMax: 0.60, yMin: 0.15, yMax: 0.80 } },
    'kilise_kapi': { dust: true, count: 50, beam: { xMin: 0.58, xMax: 0.88, yMin: 0.25, yMax: 0.88 } },
    'koy_giris': { dust: true, count: 60, beam: { xMin: 0.35, xMax: 0.98, yMin: 0.55, yMax: 0.95 } }
  };

  // İNDEX & OYUN SAYFASI GEÇİŞLERİ İÇİN ALİAS (TAKMA İSİM) DESTEĞİ
  roomVFXConfig['dedektif'] = roomVFXConfig['dedektif_ofis'];
  roomVFXConfig['gazeteci'] = roomVFXConfig['gazeteci_oda'];
  roomVFXConfig['ofis'] = roomVFXConfig['dedektif_ofis'];
  roomVFXConfig['halit'] = roomVFXConfig['halit_ev'];
  roomVFXConfig['nadire'] = roomVFXConfig['nadire_ev'];

  function parseRoomKey(rawId) {
    if (!rawId) return '';
    return rawId.toString().split('/').pop().split('?')[0].replace(/\.(webp|jpg|jpeg|png)$/i, '').trim();
  }

  function cleanup() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    document.querySelectorAll('.vfx-canvas, .vfx-flicker-light').forEach(el => el.remove());
    particles = [];
    smokeParticles = [];
  }

  function initRoomVFX(rawRoomId, stageElement) {
    cleanup();
    if (!stageElement || !rawRoomId) return;

    let cleanId = parseRoomKey(rawRoomId);

    // Tam veya Alt Kelime Eşleştirme Güvenlik Ağı
    let config = roomVFXConfig[cleanId];
    if (!config) {
      let keys = Object.keys(roomVFXConfig).sort((a, b) => b.length - a.length);
      let matchedKey = keys.find(k => cleanId.includes(k) || k.includes(cleanId));
      if (matchedKey) config = roomVFXConfig[matchedKey];
    }

    if (!config) return;

    // A. YAVAŞ & SİNEMATİK PARILTI / LAMBALAR (Ateş Flicker)
    if (config.lights) {
      config.lights.forEach(l => {
        const light = document.createElement('div');
        light.className = 'vfx-flicker-light';
        light.style.left = l.x;
        light.style.top = l.y;
        light.style.width = l.size;
        light.style.height = l.size;
        light.style.background = `radial-gradient(circle, ${l.color} 0%, rgba(255, 140, 20, 0.25) 45%, transparent 70%)`;
        light.style.animation = `vfxSlowFlicker ${3.2 + Math.random() * 2}s ease-in-out infinite alternate`;
        stageElement.appendChild(light);
      });
    }

    // B. CANVAS PARÇACIK MOTORU (Toz, Kıvılcım & Duman)
    if (config.dust || config.sparks || config.smoke) {
      const canvas = document.createElement('canvas');
      canvas.className = 'vfx-canvas';
      stageElement.appendChild(canvas);

      const rect = stageElement.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 450;
      const ctx = canvas.getContext('2d');

      // 1. Toz & Kıvılcım Parçacıkları
      if (config.dust || config.sparks) {
        const beamsList = config.beams || [config.beam || { xMin: 0.1, xMax: 0.9, yMin: 0.1, yMax: 0.9 }];
        const count = config.count || 90;

        for (let i = 0; i < count; i++) {
          const targetBeam = beamsList[Math.floor(Math.random() * beamsList.length)];

          const minX = canvas.width * targetBeam.xMin;
          const maxX = canvas.width * targetBeam.xMax;
          const minY = canvas.height * targetBeam.yMin;
          const maxY = canvas.height * targetBeam.yMax;

          // Gün ışığında parlayan sıcak amber-sarı tonlar
          const hue = 38 + Math.floor(Math.random() * 12);
          const sat = 65 + Math.floor(Math.random() * 20);
          const light = 70 + Math.floor(Math.random() * 15);

          particles.push({
            x: minX + Math.random() * (maxX - minX),
            y: minY + Math.random() * (maxY - minY),
            r: config.sparks ? Math.random() * 1.6 + 0.8 : Math.random() * 1.1 + 0.9,
            // HIZ YARI YARIYA DÜŞÜRÜLDÜ (Son derece yavaş süzülüş)
            vx: (Math.random() - 0.5) * (config.sparks ? 0.20 : 0.04),
            vy: config.sparks ? -(Math.random() * 0.25 + 0.10) : (Math.random() - 0.5) * 0.03,
            alpha: Math.random() * 0.35 + 0.20,
            maxAlpha: Math.random() * 0.30 + 0.40,
            // YOK OLMA SÜRESİ 2 KATINA ÇIKARILDI (Çok yavaş nefes alma)
            fadeSpeed: Math.random() * 0.0012 + 0.0005,
            fadingIn: Math.random() > 0.5,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.004 + 0.002,
            color: config.sparks ? 'rgba(255, 150, 40,' : `hsl(${hue}, ${sat}%, ${light}%,`,
            isSpark: !!config.sparks,
            bounds: { minX, maxX, minY, maxY }
          });
        }
      }

      // 2. Gri Baca Dumanı (Merkez Meydanı)
      if (config.smoke) {
        for (let i = 0; i < 35; i++) {
          smokeParticles.push({
            x: canvas.width * 0.81 + (Math.random() - 0.5) * 20,
            y: canvas.height * 0.32 + Math.random() * 30,
            r: Math.random() * 14 + 8,
            vy: -(Math.random() * 0.22 + 0.08),
            vx: Math.random() * 0.12 + 0.03,
            alpha: Math.random() * 0.35 + 0.18,
            grow: Math.random() * 0.06 + 0.03
          });
        }
      }

      // ANİMASYON DÖNGÜSÜ (RENDER)
      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- A. BACA DUMANI RENDER ---
        smokeParticles.forEach(s => {
          s.y += s.vy;
          s.x += s.vx;
          s.r += s.grow;
          s.alpha -= 0.0007;

          if (s.alpha <= 0 || s.y < canvas.height * 0.05) {
            s.x = canvas.width * 0.81 + (Math.random() - 0.5) * 16;
            s.y = canvas.height * 0.32;
            s.r = Math.random() * 8 + 6;
            s.alpha = Math.random() * 0.35 + 0.18;
          }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(195, 195, 185, ${s.alpha})`;
          ctx.fill();
        });

        // --- B. TOZ & KIVILCIM RENDER ---
        particles.forEach(p => {
          p.wobble += p.wobbleSpeed;
          p.x += p.vx + Math.sin(p.wobble) * 0.05;
          p.y += p.vy;

          if (p.fadingIn) {
            p.alpha += p.fadeSpeed;
            if (p.alpha >= p.maxAlpha) p.fadingIn = false;
          } else {
            p.alpha -= p.fadeSpeed;
            if (p.alpha <= 0.03) {
              p.fadingIn = true;
              p.x = p.bounds.minX + Math.random() * (p.bounds.maxX - p.bounds.minX);
              p.y = p.bounds.minY + Math.random() * (p.bounds.maxY - p.bounds.minY);
            }
          }

          if (p.x < p.bounds.minX || p.x > p.bounds.maxX || p.y < p.bounds.minY || p.y > p.bounds.maxY) {
            p.x = p.bounds.minX + Math.random() * (p.bounds.maxX - p.bounds.minX);
            p.y = p.bounds.minY + Math.random() * (p.bounds.maxY - p.bounds.minY);
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color} ${p.alpha})`;
          ctx.fill();
        });

        animFrameId = requestAnimationFrame(render);
      }

      render();
    }
  }

  return { load: initRoomVFX, clear: cleanup };
})();