/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası (v13 - Hassas Revizyon)
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];
  let smokeParticles = [];

  // MEKANLARA ÖZEL FX YAPILANDIRMASI
  const roomVFXConfig = {
    // 1. giris.webp (Ana Giriş & Karşılama - Belirgin Ateşler + Yoğun Toz)
    'giris': {
      dust: true, count: 180,
      beam: { xMin: 0.10, xMax: 0.95, yMin: 0.15, yMax: 0.90 },
      lights: [
        { x: '31%', y: '36%', color: 'rgba(255, 160, 40, 0.85)', size: '18cqw' },
        { x: '86%', y: '28%', color: 'rgba(255, 160, 40, 0.85)', size: '18cqw' },
        { x: '94%', y: '43%', color: 'rgba(255, 150, 30, 0.75)', size: '15cqw' },
        { x: '46%', y: '42%', color: 'rgba(255, 140, 30, 0.70)', size: '14cqw' }
      ]
    },

    // 2. koy_giris.webp (Köy Giriş Takı - Toz Katmanı)
    'koy_giris': {
      dust: true, count: 100,
      beam: { xMin: 0.15, xMax: 0.95, yMin: 0.25, yMax: 0.90 }
    },

    // 3. dedektif_ofis.webp (Sol Pencere Tozu & Masadaki Belirgin Lamba Ateşi)
    'dedektif_ofis': {
      dust: true, count: 180,
      beam: { xMin: 0.01, xMax: 0.48, yMin: 0.02, yMax: 0.88 },
      lights: [{ x: '29%', y: '50%', color: 'rgba(255, 175, 50, 0.90)', size: '26cqw' }]
    },

    // 4. degirmenci.webp (Sol Taş + Sağ Terazi Hizası, Orta Taban Temiz)
    'degirmenci': {
      dust: true, count: 190,
      beams: [
        { xMin: 0.22, xMax: 0.58, yMin: 0.15, yMax: 0.58 }, // Sol pencereden taş üstüne
        { xMin: 0.68, xMax: 0.95, yMin: 0.15, yMax: 0.58 }  // Sağ masa ve terazi hizası
      ]
    },

    // 5. gazeteci_oda.webp (Tavan Ateşi/Işığı & Pencere Hizası)
    'gazeteci_oda': {
      dust: true, count: 150,
      beam: { xMin: 0.38, xMax: 0.68, yMin: 0.18, yMax: 0.75 },
      lights: [{ x: '50%', y: '10%', color: 'rgba(255, 190, 80, 0.85)', size: '38cqw' }]
    },

    // 6. han.webp (Han İç Mekan - Doğru Masalar ve Fenerler)
    'han': {
      dust: true, count: 140,
      beam: { xMin: 0.15, xMax: 0.85, yMin: 0.05, yMax: 0.35 },
      lights: [
        { x: '14%', y: '62%', color: 'rgba(255, 150, 30, 0.85)', size: '18cqw' },
        { x: '38%', y: '68%', color: 'rgba(255, 150, 30, 0.85)', size: '18cqw' },
        { x: '75%', y: '64%', color: 'rgba(255, 150, 30, 0.85)', size: '18cqw' },
        { x: '28%', y: '32%', color: 'rgba(255, 140, 30, 0.75)', size: '16cqw' },
        { x: '62%', y: '32%', color: 'rgba(255, 140, 30, 0.75)', size: '16cqw' }
      ]
    },

    // 7. han_mutfak.webp (Han Mutfağı - Sadeleştirilmiş Doğru Ateş Konumları)
    'han_mutfak': {
      dust: true, count: 120,
      beam: { xMin: 0.10, xMax: 0.80, yMin: 0.15, yMax: 0.75 },
      lights: [
        { x: '55%', y: '48%', color: 'rgba(255, 110, 20, 0.90)', size: '28cqw' }, // Ocak ateşi
        { x: '25%', y: '55%', color: 'rgba(255, 150, 30, 0.80)', size: '18cqw' }  // Tezgah mumu
      ]
    },

    // 8. merkez.webp (Baca Dumanı Bacadan Yükseliyor + Fırın Ateşi)
    'merkez': {
      smoke: true,
      lights: [{ x: '78%', y: '51%', color: 'rgba(255, 100, 20, 0.90)', size: '18cqw' }]
    },

    // 9. mezarlik.webp (Taş Masa Mumları & Süzülen Toz)
    'mezarlik': {
      dust: true, count: 135,
      beam: { xMin: 0.15, xMax: 0.85, yMin: 0.30, yMax: 0.90 },
      lights: [{ x: '27%', y: '78%', color: 'rgba(255, 160, 50, 0.85)', size: '22cqw' }]
    },

    // 10. sifahane.webp (Tozlar Sola Yaklaştırıldı)
    'sifahane': {
      dust: true, count: 150,
      beam: { xMin: 0.01, xMax: 0.42, yMin: 0.05, yMax: 0.88 }
    },

    // 11. nadire_ev.webp (Harika Çalışan Mevcut Yapı)
    'nadire_ev': {
      dust: true, count: 150,
      beam: { xMin: 0.22, xMax: 0.58, yMin: 0.30, yMax: 0.78 },
      lights: [{ x: '22%', y: '52%', color: 'rgba(255, 160, 40, 0.85)', size: '22cqw' }]
    },

    // 12. demirci.webp (Atölye Kıvılcım & Ocak Ateşi)
    'demirci': {
      sparks: true, count: 100,
      beam: { xMin: 0.58, xMax: 0.95, yMin: 0.10, yMax: 0.85 },
      lights: [{ x: '58%', y: '42%', color: 'rgba(255, 90, 10, 0.90)', size: '38cqw' }]
    },

    // 13. cadi.webp
    'cadi': {
      dust: true, count: 165,
      beam: { xMin: 0.35, xMax: 0.75, yMin: 0.25, yMax: 0.88 }
    },

    // 14. halit_ev.webp
    'halit_ev': {
      dust: true, count: 150,
      beam: { xMin: 0.55, xMax: 0.98, yMin: 0.15, yMax: 0.90 }
    },

    // 15. halit_ev_kapi.webp (Tozsuz)
    'halit_ev_kapi': {},

    // 16. muhtar.webp
    'muhtar': {
      dust: true, count: 150,
      beam: { xMin: 0.01, xMax: 0.78, yMin: 0.02, yMax: 0.98 }
    },

    // 17. kilise.webp
    'kilise': {
      dust: true, count: 180,
      beam: { xMin: 0.02, xMax: 0.98, yMin: 0.15, yMax: 0.95 }
    },

    // 18. han_depo.webp
    'han_depo': {
      dust: true, count: 165,
      beam: { xMin: 0.05, xMax: 0.70, yMin: 0.10, yMax: 0.85 }
    },

    // 19. ofis_sehir.webp
    'ofis_sehir': {
      dust: true, count: 165,
      beam: { xMin: 0.15, xMax: 0.82, yMin: 0.08, yMax: 0.85 }
    },

    // 20. kilise_kapi.webp
    'kilise_kapi': {
      dust: true, count: 80,
      beam: { xMin: 0.58, xMax: 0.88, yMin: 0.25, yMax: 0.88 }
    }
  };

  // İNDEX & OYUN SAYFASI GEÇİŞLERİ İÇİN KESİN MEKAN BULMA FONKSİYONU
  function getRoomConfig(rawRoomId) {
    if (!rawRoomId) return null;
    let clean = rawRoomId.toString().split('/').pop().split('?')[0].replace(/\.(webp|jpg|jpeg|png)$/i, '').trim().toLowerCase();

    if (roomVFXConfig[clean]) return roomVFXConfig[clean];

    // Sayfalar Arası Özel İsim Farklılıkları (Aliases)
    const aliases = {
      'dedektif': 'dedektif_ofis',
      'ofis': 'dedektif_ofis',
      'gazeteci': 'gazeteci_oda',
      'halit': 'halit_ev',
      'nadire': 'nadire_ev',
      'kilise_kapisi': 'kilise_kapi',
      'koy_girisi': 'koy_giris',
      'han_mutfagi': 'han_mutfak'
    };
    if (aliases[clean] && roomVFXConfig[aliases[clean]]) {
      return roomVFXConfig[aliases[clean]];
    }

    // Kelime Sınırına Göre Doğru Eşleştirme (Çakışmaları önler)
    for (let key of Object.keys(roomVFXConfig)) {
      if (clean === key || clean.startsWith(key + '_') || clean.endsWith('_' + key)) {
        return roomVFXConfig[key];
      }
    }
    return null;
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

    let config = getRoomConfig(rawRoomId);
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
        light.style.background = `radial-gradient(circle, ${l.color} 0%, rgba(255, 140, 20, 0.30) 45%, transparent 70%)`;
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
        const count = config.count || 120;

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
            // HIZ YARI YARIYA DÜŞÜK (İpeksi süzülüş)
            vx: (Math.random() - 0.5) * (config.sparks ? 0.20 : 0.04),
            vy: config.sparks ? -(Math.random() * 0.25 + 0.10) : (Math.random() - 0.5) * 0.03,
            alpha: Math.random() * 0.35 + 0.20,
            maxAlpha: Math.random() * 0.30 + 0.40,
            // YOK OLMA SÜRESİ 2 KAT DAHA YAVAŞ (Yavaş nefes alma)
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

      // 2. Gri Baca Dumanı (Merkez Meydanı - Baca Ağzından Yükseliyor)
      if (config.smoke) {
        for (let i = 0; i < 35; i++) {
          smokeParticles.push({
            x: canvas.width * 0.81 + (Math.random() - 0.5) * 16,
            y: canvas.height * 0.15 + Math.random() * 25, // Baca tepesine alındı
            r: Math.random() * 12 + 6,
            vy: -(Math.random() * 0.20 + 0.08),
            vx: Math.random() * 0.10 + 0.02,
            alpha: Math.random() * 0.35 + 0.15,
            grow: Math.random() * 0.05 + 0.02
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

          if (s.alpha <= 0 || s.y < canvas.height * 0.02) {
            s.x = canvas.width * 0.81 + (Math.random() - 0.5) * 12;
            s.y = canvas.height * 0.15; // Baca ağzı
            s.r = Math.random() * 6 + 5;
            s.alpha = Math.random() * 0.35 + 0.15;
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