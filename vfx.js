/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası (v4 - Doğal Mikro Tozlar)
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];

  const roomVFXConfig = {
    // Ateş ve Mutfak Mekanları
    'demirci': { sparks: true, count: 50, lights: [{ x: '60%', y: '42%', color: 'rgba(255, 100, 20, 0.75)', size: '32cqw' }] },
    'han_mutfak': { sparks: true, count: 45, lights: [{ x: '50%', y: '50%', color: 'rgba(255, 110, 30, 0.7)', size: '28cqw' }] },

    // Yoğun Tozlu Mekanlar
    'cevdet_ev': { dust: true, count: 65, lights: [{ x: '30%', y: '50%', color: 'rgba(255, 170, 50, 0.65)', size: '25cqw' }] },
    'degirmenci': { dust: true, count: 60 },
    'kilise': { dust: true, count: 55 },

    // Standart Evler & Odalar
    'dedektif': { dust: true, count: 45, lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.65)', size: '24cqw' }] },
    'ofis': { dust: true, count: 45, lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.65)', size: '24cqw' }] },
    'halit_ev': { dust: true, count: 45, lights: [{ x: '10%', y: '58%', color: 'rgba(255, 160, 40, 0.6)', size: '20cqw' }, { x: '85%', y: '70%', color: 'rgba(240, 100, 30, 0.55)', size: '25cqw' }] },
    'nadire_ev': { dust: true, count: 45, lights: [{ x: '22%', y: '55%', color: 'rgba(255, 160, 40, 0.65)', size: '22cqw' }] },
    'sifahane': { dust: true, count: 45, lights: [{ x: '73%', y: '58%', color: 'rgba(230, 110, 30, 0.6)', size: '26cqw' }] },
    'mustafa_ev': { dust: true, count: 40, lights: [{ x: '40%', y: '50%', color: 'rgba(255, 160, 40, 0.6)', size: '22cqw' }] },
    'cabbar_ev': { dust: true, count: 40, lights: [{ x: '35%', y: '45%', color: 'rgba(240, 150, 40, 0.6)', size: '22cqw' }] },
    'riza_ev': { dust: true, count: 40, lights: [{ x: '50%', y: '55%', color: 'rgba(240, 140, 30, 0.55)', size: '20cqw' }] },
    'anselm_ev': { dust: true, count: 40, lights: [{ x: '45%', y: '48%', color: 'rgba(255, 170, 50, 0.6)', size: '24cqw' }] },
    'aylin_ev': { dust: true, count: 40, lights: [{ x: '30%', y: '52%', color: 'rgba(255, 165, 45, 0.6)', size: '22cqw' }] },

    // Hanlar ve Depolar
    'han_depo': { dust: true, count: 50, lights: [{ x: '57%', y: '48%', color: 'rgba(255, 140, 40, 0.6)', size: '20cqw' }] },
    'han': { dust: true, count: 50, lights: [{ x: '50%', y: '40%', color: 'rgba(255, 160, 50, 0.6)', size: '26cqw' }] },

    // Dış Mekanlar
    'merkez': { dust: true, fog: true, count: 35, lights: [{ x: '50%', y: '60%', color: 'rgba(255, 180, 70, 0.4)', size: '30cqw' }] },
    'mezarlik': { dust: true, fog: true, count: 40, lights: [{ x: '28%', y: '78%', color: 'rgba(255, 190, 80, 0.5)', size: '28cqw' }] },
    'koy': { fog: true, dust: true, count: 30 },
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
    let config = configKey ? roomVFXConfig[configKey] : { dust: true, count: 40 };

    // 1. Dinamik Işıklar
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

    // 2. Sis Katmanı
    if (config.fog) {
      const fog = document.createElement('div');
      fog.className = 'vfx-fog-overlay';
      stageElement.appendChild(fog);
    }

    // 3. Mikro Toz Parçacıkları (Doğal & Dinamik)
    if (config.dust || config.sparks) {
      const canvas = document.createElement('canvas');
      canvas.className = 'vfx-canvas';
      stageElement.appendChild(canvas);
      
      const rect = stageElement.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 450;
      const ctx = canvas.getContext('2d');

      const count = config.count || 45;

      // HEDEF: Her odaya girişte tamamen farklı rastgele konumlar (Random Seed)
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          // İnce mikro boyutlar (0.6px - 1.4px)
          w: config.sparks ? Math.random() * 1.5 + 0.8 : Math.random() * 1.2 + 0.6,
          h: config.sparks ? Math.random() * 2.5 + 1.2 : Math.random() * 1.2 + 0.6,
          vx: (Math.random() - 0.5) * (config.sparks ? 0.8 : 0.25),
          vy: config.sparks ? -(Math.random() * 0.9 + 0.3) : (Math.random() - 0.5) * 0.18,
          alpha: Math.random() * 0.6 + 0.2,
          maxAlpha: Math.random() * 0.5 + 0.35,
          fadeSpeed: Math.random() * 0.008 + 0.003,
          fadingIn: Math.random() > 0.5,
          wobble: Math.random() * Math.PI * 2,
          isSpark: !!config.sparks
        });
      }

      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
          // Doğal süzülme için hafif sinüs sallantısı (wobble)
          p.wobble += 0.02;
          p.x += p.vx + Math.sin(p.wobble) * 0.15;
          p.y += p.vy;

          // Nefes alma / Solma efekti (Fade In / Fade Out)
          if (p.fadingIn) {
            p.alpha += p.fadeSpeed;
            if (p.alpha >= p.maxAlpha) p.fadingIn = false;
          } else {
            p.alpha -= p.fadeSpeed;
            if (p.alpha <= 0.05) {
              p.fadingIn = true;
              // Sönünce rastgele yeni bir noktada doğsun
              p.x = Math.random() * canvas.width;
              p.y = Math.random() * canvas.height;
            }
          }

          // Ekran dışına çıkma kontrolü
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;

          // ÇİZİM: İnce mikro dikdörtgen/toz zerreleri
          ctx.beginPath();
          if (p.isSpark) {
            ctx.fillStyle = `rgba(255, 175, 50, ${p.alpha})`;
            ctx.fillRect(p.x, p.y, p.w, p.h);
          } else {
            // Işık huzmesinde parlayan doğal krem rengi mikro toz
            ctx.fillStyle = `rgba(235, 225, 205, ${p.alpha})`;
            ctx.fillRect(p.x, p.y, p.w, p.h);
          }
        });

        animFrameId = requestAnimationFrame(render);
      }
      render();
    }
  }

  return { load: initRoomVFX, clear: cleanup };
})();