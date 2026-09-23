/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası (v6 - Temizlenmiş & Görünür)
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];

  // MEKAN BAZLI TEMİZLENMİŞ IŞIK VE HUZME KORİDORLARI
  const roomVFXConfig = {
    // --- 1. Sadece Gerçekten Pencere Işığı Olan İç Mekanlar (Toz Huzmesi) ---
    'ofis': {
      dust: true, count: 110,
      beam: { xMin: 0.40, xMax: 0.85, yMin: 0.05, yMax: 0.80 }
    },
    'dedektif': {
      dust: true, count: 110,
      beam: { xMin: 0.05, xMax: 0.50, yMin: 0.10, yMax: 0.85 },
      lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.55)', size: '20cqw' }] // Masadaki gaz lambası
    },
    'cadi': {
      dust: true, count: 120,
      beam: { xMin: 0.52, xMax: 0.88, yMin: 0.20, yMax: 0.85 }
    },
    'degirmenci': {
      dust: true, count: 130,
      beam: { xMin: 0.35, xMax: 0.65, yMin: 0.20, yMax: 0.80 }
    },
    'halit_ev': {
      dust: true, count: 100,
      beam: { xMin: 0.55, xMax: 0.92, yMin: 0.15, yMax: 0.85 }
    },
    'nadire_ev': {
      dust: true, count: 100,
      beam: { xMin: 0.18, xMax: 0.45, yMin: 0.20, yMax: 0.85 },
      lights: [{ x: '22%', y: '55%', color: 'rgba(255, 160, 40, 0.5)', size: '18cqw' }] // Masadaki gaz lambası
    },
    'han_depo': {
      dust: true, count: 110,
      beam: { xMin: 0.05, xMax: 0.40, yMin: 0.10, yMax: 0.85 }
    },
    'kilise': {
      dust: true, count: 120,
      beam: { xMin: 0.10, xMax: 0.90, yMin: 0.15, yMax: 0.85 }
    },
    'muhtar': {
      dust: true, count: 110,
      beam: { xMin: 0.02, xMax: 0.55, yMin: 0.10, yMax: 0.85 }
    },
    'sifahane': {
      dust: true, count: 100,
      beam: { xMin: 0.05, xMax: 0.45, yMin: 0.10, yMax: 0.80 }
    },
    'gazeteci': {
      dust: true, count: 100,
      beam: { xMin: 0.30, xMax: 0.70, yMin: 0.15, yMax: 0.80 }
    },

    // --- 2. Ateş / Ocak Mekanları (Kıvılcım & Kor) ---
    'demirci': {
      sparks: true, count: 60,
      beam: { xMin: 0.60, xMax: 0.95, yMin: 0.10, yMax: 0.85 }, // Pencere huzmesi
      lights: [{ x: '60%', y: '42%', color: 'rgba(255, 90, 10, 0.7)', size: '30cqw' }] // Ocak ateşi
    },
    'han_mutfak': {
      sparks: true, count: 50,
      lights: [{ x: '50%', y: '50%', color: 'rgba(255, 100, 20, 0.65)', size: '26cqw' }]
    },

    // --- 3. Dış Mekanlar (Sadece Hafif Sis - SIFIR YAPAY IŞIK / SIFIR BÖLGE TOZU) ---
    'merkez': { fog: true },
    'mezarlik': { fog: true },
    'koy': { fog: true },
    'araba': { fog: true },
    'giris': { fog: true },
    'halit_ev_kapi': {}, // Dış kapı görünümünde efekt yok
    'kilise_kapi': {}
  };

  function cleanup() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    document.querySelectorAll('.vfx-canvas, .vfx-flicker-light, .vfx-fog-overlay').forEach(el => el.remove());
    particles = [];
  }

  function initRoomVFX(roomId, stageElement) {
    cleanup();
    if (!stageElement || !roomId) return;

    let configKey = Object.keys(roomVFXConfig).find(key => roomId.includes(key));
    let config = configKey ? roomVFXConfig[configKey] : null;

    if (!config) return;

    // 1. Gerçek Gaz Lambası / Ateş Parlaması
    if (config.lights) {
      config.lights.forEach(l => {
        const light = document.createElement('div');
        light.className = 'vfx-flicker-light';
        light.style.left = l.x;
        light.style.top = l.y;
        light.style.width = l.size;
        light.style.height = l.size;
        light.style.background = `radial-gradient(circle, ${l.color} 0%, transparent 70%)`;
        stageElement.appendChild(light);
      });
    }

    // 2. Dış Mekan Sisi
    if (config.fog) {
      const fog = document.createElement('div');
      fog.className = 'vfx-fog-overlay';
      stageElement.appendChild(fog);
    }

    // 3. Işık Huzmesi İçinde Görünür Toz Parçacıkları
    if (config.dust || config.sparks) {
      const canvas = document.createElement('canvas');
      canvas.className = 'vfx-canvas';
      stageElement.appendChild(canvas);

      const rect = stageElement.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 450;
      const ctx = canvas.getContext('2d');

      const beam = config.beam || { xMin: 0.1, xMax: 0.9, yMin: 0.1, yMax: 0.9 };
      const count = config.count || 100;

      for (let i = 0; i < count; i++) {
        const minX = canvas.width * beam.xMin;
        const maxX = canvas.width * beam.xMax;
        const minY = canvas.height * beam.yMin;
        const maxY = canvas.height * beam.yMax;

        particles.push({
          x: minX + Math.random() * (maxX - minX),
          y: minY + Math.random() * (maxY - minY),
          // Net Görünür Toz Boyutu (1.2px - 2.2px)
          r: config.sparks ? Math.random() * 1.8 + 0.8 : Math.random() * 1.0 + 1.2,
          vx: (Math.random() - 0.5) * (config.sparks ? 0.8 : 0.35),
          vy: config.sparks ? -(Math.random() * 0.9 + 0.4) : (Math.random() - 0.5) * 0.25,
          alpha: Math.random() * 0.6 + 0.35, // Daha belirgin opaklık
          maxAlpha: Math.random() * 0.5 + 0.45,
          fadeSpeed: Math.random() * 0.008 + 0.003,
          fadingIn: Math.random() > 0.5,
          wobble: Math.random() * Math.PI * 2,
          isSpark: !!config.sparks,
          bounds: { minX, maxX, minY, maxY }
        });
      }

      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
          // Doğal süzülüş
          p.wobble += 0.02;
          p.x += p.vx + Math.sin(p.wobble) * 0.18;
          p.y += p.vy;

          // Yanıp sönme (Fade in / Fade out)
          if (p.fadingIn) {
            p.alpha += p.fadeSpeed;
            if (p.alpha >= p.maxAlpha) p.fadingIn = false;
          } else {
            p.alpha -= p.fadeSpeed;
            if (p.alpha <= 0.1) {
              p.fadingIn = true;
              p.x = p.bounds.minX + Math.random() * (p.bounds.maxX - p.bounds.minX);
              p.y = p.bounds.minY + Math.random() * (p.bounds.maxY - p.bounds.minY);
            }
          }

          // Huzme alanı dışına taşarsa sıfırla
          if (p.x < p.bounds.minX || p.x > p.bounds.maxX || p.y < p.bounds.minY || p.y > p.bounds.maxY) {
            p.x = p.bounds.minX + Math.random() * (p.bounds.maxX - p.bounds.minX);
            p.y = p.bounds.minY + Math.random() * (p.bounds.maxY - p.bounds.minY);
          }

          // Çizim
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

          if (p.isSpark) {
            ctx.fillStyle = `rgba(255, 175, 50, ${p.alpha})`;
          } else {
            // Parlak krem rengi toz taneleri
            ctx.fillStyle = `rgba(255, 245, 220, ${p.alpha})`;
          }

          ctx.fill();
        });

        animFrameId = requestAnimationFrame(render);
      }
      render();
    }
  }

  return { load: initRoomVFX, clear: cleanup };
})();