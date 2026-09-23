/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası (v3 - Tüm Odalar & Optimize)
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];

  // MEKAN BAZLI GELİŞMİŞ EFEKT HARİTASI
  const roomVFXConfig = {
    // --- Ateşli & Isı Odaklı Mekanlar (Ateş Parlaklığı + Kıvılcımlar) ---
    'demirci': { sparks: true, particleCount: 50, lights: [{ x: '60%', y: '42%', color: 'rgba(255, 100, 20, 0.85)', size: '35cqw' }] },
    'han_mutfak': { sparks: true, particleCount: 45, lights: [{ x: '50%', y: '50%', color: 'rgba(255, 110, 30, 0.8)', size: '30cqw' }] },

    // --- Ekstra Yoğun Tozlu Mekanlar ---
    'cevdet_ev': { dust: true, particleCount: 60, lights: [{ x: '30%', y: '50%', color: 'rgba(255, 170, 50, 0.75)', size: '25cqw' }] },
    'degirmenci': { dust: true, particleCount: 55 },
    'kilise': { dust: true, particleCount: 50 },

    // --- Evler ve İç Mekanlar (Lamba Işığı + Odun/Toz Parçacıkları) ---
    'dedektif': { dust: true, lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.75)', size: '24cqw' }] },
    'ofis': { dust: true, lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.75)', size: '24cqw' }] },
    'halit_ev': { dust: true, lights: [{ x: '10%', y: '58%', color: 'rgba(255, 160, 40, 0.7)', size: '20cqw' }, { x: '85%', y: '70%', color: 'rgba(240, 100, 30, 0.65)', size: '25cqw' }] },
    'nadire_ev': { dust: true, lights: [{ x: '22%', y: '55%', color: 'rgba(255, 160, 40, 0.75)', size: '22cqw' }, { x: '45%', y: '65%', color: 'rgba(230, 100, 30, 0.6)', size: '24cqw' }] },
    'sifahane': { dust: true, lights: [{ x: '73%', y: '58%', color: 'rgba(230, 110, 30, 0.65)', size: '26cqw' }] },
    'mustafa_ev': { dust: true, lights: [{ x: '40%', y: '50%', color: 'rgba(255, 160, 40, 0.7)', size: '22cqw' }] },
    'cabbar_ev': { dust: true, lights: [{ x: '35%', y: '45%', color: 'rgba(240, 150, 40, 0.7)', size: '22cqw' }] },
    'riza_ev': { dust: true, lights: [{ x: '50%', y: '55%', color: 'rgba(240, 140, 30, 0.65)', size: '20cqw' }] },
    'anselm_ev': { dust: true, lights: [{ x: '45%', y: '48%', color: 'rgba(255, 170, 50, 0.7)', size: '24cqw' }] },
    'aylin_ev': { dust: true, lights: [{ x: '30%', y: '52%', color: 'rgba(255, 165, 45, 0.7)', size: '22cqw' }] },

    // --- Han ve Depolar ---
    'han_depo': { dust: true, lights: [{ x: '57%', y: '48%', color: 'rgba(255, 140, 40, 0.7)', size: '20cqw' }] },
    'han': { dust: true, lights: [{ x: '50%', y: '40%', color: 'rgba(255, 160, 50, 0.7)', size: '26cqw' }] },

    // --- Dış Mekanlar (Sis + Açık Hava Tozları) ---
    'merkez': { dust: true, fog: true, particleCount: 35, lights: [{ x: '50%', y: '60%', color: 'rgba(255, 180, 70, 0.5)', size: '30cqw' }] },
    'mezarlik': { dust: true, fog: true, lights: [{ x: '28%', y: '78%', color: 'rgba(255, 190, 80, 0.6)', size: '28cqw' }] },
    'koy': { fog: true, dust: true },
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

    // Isim eşleşmesi (örn: 'scr-han-mutfak' -> 'han_mutfak')
    let configKey = Object.keys(roomVFXConfig).find(key => roomId.includes(key));
    // Eğer listede özel bir tanımı yoksa varsayılan olarak hafif toz efekti ver
    let config = configKey ? roomVFXConfig[configKey] : { dust: true };

    // 1. Dinamik Işıklar / Gaz Lambaları / Soba Ateşleri
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

    // 3. Canvas Parçacıkları (Toz veya Kıvılcım)
    if (config.dust || config.sparks) {
      const canvas = document.createElement('canvas');
      canvas.className = 'vfx-canvas';
      stageElement.appendChild(canvas);
      
      const rect = stageElement.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 450;
      const ctx = canvas.getContext('2d');

      // Mobil cihazlar için ideal ve kasmayan parçacık sayısı
      const count = config.particleCount || (config.sparks ? 45 : 40);

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: config.sparks ? Math.random() * 2.2 + 0.8 : Math.random() * 2.2 + 1.1,
          vx: (Math.random() - 0.5) * (config.sparks ? 1.0 : 0.45),
          vy: config.sparks ? -(Math.random() * 1.1 + 0.4) : (Math.random() - 0.5) * 0.35,
          alpha: Math.random() * 0.55 + 0.4,
          isSpark: !!config.sparks
        });
      }

      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          
          if (p.isSpark) {
            ctx.fillStyle = `rgba(255, 160, 40, ${p.alpha})`;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(255, 100, 0, 0.8)';
          } else {
            ctx.fillStyle = `rgba(245, 235, 200, ${p.alpha})`;
            ctx.shadowBlur = 2;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.25)';
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