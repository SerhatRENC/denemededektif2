/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası (v5 - Işık Huzmesi & Mikro Toz)
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];

  // MEKAN BAZLI IŞIK HUZMESİ VE EFEKT KONFİGÜRASYONU
  // beam: { xMin, xMax, yMin, yMax } -> Tozların hapsedildiği ışık huzmesi koordinat yüzdeleri
  const roomVFXConfig = {
    // --- Işık Huzmesi Olan Özel İç Mekanlar ---
    'ofis': {
      dust: true, count: 70,
      beam: { xMin: 0.45, xMax: 0.85, yMin: 0.05, yMax: 0.75 },
      lights: [{ x: '70%', y: '30%', color: 'rgba(255, 180, 80, 0.4)', size: '28cqw' }]
    },
    'dedektif': {
      dust: true, count: 70,
      beam: { xMin: 0.10, xMax: 0.55, yMin: 0.10, yMax: 0.80 },
      lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.65)', size: '24cqw' }]
    },
    'cadi': {
      dust: true, count: 75,
      beam: { xMin: 0.50, xMax: 0.85, yMin: 0.20, yMax: 0.85 }
    },
    'degirmenci': {
      dust: true, count: 80,
      beam: { xMin: 0.35, xMax: 0.65, yMin: 0.25, yMax: 0.75 }
    },
    'halit_ev': {
      dust: true, count: 65,
      beam: { xMin: 0.55, xMax: 0.90, yMin: 0.15, yMax: 0.80 },
      lights: [{ x: '10%', y: '58%', color: 'rgba(255, 160, 40, 0.5)', size: '20cqw' }]
    },
    'nadire_ev': {
      dust: true, count: 65,
      beam: { xMin: 0.18, xMax: 0.42, yMin: 0.20, yMax: 0.85 }
    },
    'han_depo': {
      dust: true, count: 75,
      beam: { xMin: 0.05, xMax: 0.38, yMin: 0.10, yMax: 0.85 }
    },
    'kilise': {
      dust: true, count: 70,
      beam: { xMin: 0.10, xMax: 0.90, yMin: 0.15, yMax: 0.85 }
    },
    'muhtar': {
      dust: true, count: 70,
      beam: { xMin: 0.05, xMax: 0.55, yMin: 0.10, yMax: 0.85 }
    },
    'sifahane': {
      dust: true, count: 65,
      beam: { xMin: 0.05, xMax: 0.45, yMin: 0.10, yMax: 0.80 },
      lights: [{ x: '73%', y: '58%', color: 'rgba(230, 110, 30, 0.5)', size: '22cqw' }]
    },
    'gazeteci': {
      dust: true, count: 60,
      beam: { xMin: 0.30, xMax: 0.70, yMin: 0.15, yMax: 0.80 }
    },

    // --- Ateş / Ocak Odaklı Genel Atmosferler ---
    'demirci': {
      sparks: true, count: 50,
      lights: [{ x: '60%', y: '42%', color: 'rgba(255, 100, 20, 0.75)', size: '32cqw' }]
    },
    'han_mutfak': {
      sparks: true, count: 45,
      lights: [{ x: '50%', y: '50%', color: 'rgba(255, 110, 30, 0.7)', size: '28cqw' }]
    },

    // --- Diğer İç Mekanlar ve Han ---
    'cevdet_ev': { dust: true, count: 55, beam: { xMin: 0.20, xMax: 0.60, yMin: 0.15, yMax: 0.80 } },
    'mustafa_ev': { dust: true, count: 50, beam: { xMin: 0.25, xMax: 0.65, yMin: 0.20, yMax: 0.80 } },
    'cabbar_ev': { dust: true, count: 50, beam: { xMin: 0.20, xMax: 0.60, yMin: 0.20, yMax: 0.80 } },
    'riza_ev': { dust: true, count: 50, beam: { xMin: 0.30, xMax: 0.70, yMin: 0.20, yMax: 0.80 } },
    'anselm_ev': { dust: true, count: 50, beam: { xMin: 0.25, xMax: 0.65, yMin: 0.20, yMax: 0.80 } },
    'aylin_ev': { dust: true, count: 50, beam: { xMin: 0.20, xMax: 0.60, yMin: 0.20, yMax: 0.80 } },
    'han': { dust: true, count: 50, beam: { xMin: 0.25, xMax: 0.75, yMin: 0.15, yMax: 0.85 } },

    // --- Dış Mekanlar (Sadece Sis ve Açık Hava) ---
    'merkez': { fog: true },
    'mezarlik': { fog: true },
    'koy': { fog: true },
    'araba': { fog: true },
    'giris': { fog: true }
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

    // 1. Dinamik Işıklar / Gaz Lambası Parlaklığı
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

    // 2. Sis Katmanı (Dış Mekanlar)
    if (config.fog) {
      const fog = document.createElement('div');
      fog.className = 'vfx-fog-overlay';
      stageElement.appendChild(fog);
    }

    // 3. Işık Huzmesi İçinde Süzülen Mikro Tozlar
    if (config.dust || config.sparks) {
      const canvas = document.createElement('canvas');
      canvas.className = 'vfx-canvas';
      stageElement.appendChild(canvas);

      const rect = stageElement.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 450;
      const ctx = canvas.getContext('2d');

      const beam = config.beam || { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
      const count = config.count || 50;

      // Parçacıkları doğrudan ışık huzmesinin koordinat aralığında doğur
      for (let i = 0; i < count; i++) {
        const minX = canvas.width * beam.xMin;
        const maxX = canvas.width * beam.xMax;
        const minY = canvas.height * beam.yMin;
        const maxY = canvas.height * beam.yMax;

        particles.push({
          x: minX + Math.random() * (maxX - minX),
          y: minY + Math.random() * (maxY - minY),
          // %30 Küçültülmüş Mikro Toz Boyutu (0.4px - 0.9px)
          r: config.sparks ? Math.random() * 1.2 + 0.6 : Math.random() * 0.5 + 0.4,
          vx: (Math.random() - 0.5) * (config.sparks ? 0.6 : 0.18),
          vy: config.sparks ? -(Math.random() * 0.8 + 0.3) : (Math.random() - 0.5) * 0.12,
          alpha: Math.random() * 0.65 + 0.25,
          maxAlpha: Math.random() * 0.6 + 0.3,
          fadeSpeed: Math.random() * 0.006 + 0.002,
          fadingIn: Math.random() > 0.5,
          wobble: Math.random() * Math.PI * 2,
          isSpark: !!config.sparks,
          bounds: { minX, maxX, minY, maxY }
        });
      }

      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
          // Doğal hava süzülmesi (sinüs dalgası)
          p.wobble += 0.015;
          p.x += p.vx + Math.sin(p.wobble) * 0.1;
          p.y += p.vy;

          // Nefes Alma / Yavaş Parlayıp Sönme
          if (p.fadingIn) {
            p.alpha += p.fadeSpeed;
            if (p.alpha >= p.maxAlpha) p.fadingIn = false;
          } else {
            p.alpha -= p.fadeSpeed;
            if (p.alpha <= 0.05) {
              p.fadingIn = true;
              // Sönünce huzme içinde yeni bir noktada doğsun
              p.x = p.bounds.minX + Math.random() * (p.bounds.maxX - p.bounds.minX);
              p.y = p.bounds.minY + Math.random() * (p.bounds.maxY - p.bounds.minY);
            }
          }

          // Huzme sınırından dışarı çıkarsa içeri geri yönlendir
          if (p.x < p.bounds.minX || p.x > p.bounds.maxX) p.vx *= -1;
          if (p.y < p.bounds.minY || p.y > p.bounds.maxY) p.vy *= -1;

          // MİKRO TOZ ÇİZİMİ
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

          if (p.isSpark) {
            ctx.fillStyle = `rgba(255, 165, 40, ${p.alpha})`;
          } else {
            // Işık huzmesinde parlayan ince altın-krem mikro toz
            ctx.fillStyle = `rgba(245, 235, 205, ${p.alpha})`;
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