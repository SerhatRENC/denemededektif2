/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];

  // Mekan bazlı efekt konfigürasyonları (X, Y yüzdesel konumlar)
  const roomVFXConfig = {
    // Lambalı ve Işıklı İç Mekanlar
    'dedektif': { dust: true, lights: [{ x: '29%', y: '52%', color: 'rgba(230, 160, 60, 0.5)', size: '18cqw' }] },
    'ofis': { dust: true, lights: [{ x: '29%', y: '52%', color: 'rgba(230, 160, 60, 0.5)', size: '18cqw' }] },
    'halit_ev': { dust: true, lights: [{ x: '10%', y: '58%', color: 'rgba(240, 150, 50, 0.45)', size: '15cqw' }, { x: '85%', y: '70%', color: 'rgba(220, 100, 40, 0.4)', size: '20cqw' }] },
    'nadire_ev': { dust: true, lights: [{ x: '22%', y: '55%', color: 'rgba(240, 150, 50, 0.5)', size: '16cqw' }, { x: '45%', y: '65%', color: 'rgba(220, 100, 40, 0.35)', size: '18cqw' }] },
    'sifahane': { dust: true, lights: [{ x: '73%', y: '58%', color: 'rgba(220, 100, 40, 0.4)', size: '20cqw' }] },
    
    // Ateşli / Isı Odaklı Mekanlar
    'demirci': { sparks: true, lights: [{ x: '60%', y: '42%', color: 'rgba(255, 90, 20, 0.6)', size: '28cqw' }] },
    'han_depo': { dust: true, lights: [{ x: '57%', y: '48%', color: 'rgba(230, 120, 40, 0.5)', size: '12cqw' }] },
    
    // Sisli ve Atmosferik Mekanlar
    'mezarlik': { dust: true, fog: true, lights: [{ x: '28%', y: '78%', color: 'rgba(240, 180, 80, 0.35)', size: '22cqw' }] },
    'kilise': { dust: true },
    'degirmenci': { dust: true },
    'merkez': { fog: true },
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

    // Anahtar kelime eşleşmesi (örn: 'scr-ofis' -> 'ofis')
    let configKey = Object.keys(roomVFXConfig).find(key => roomId.includes(key));
    let config = configKey ? roomVFXConfig[configKey] : { dust: true };

    // 1. Dinamik Işıklar / Lambalar
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

      const particleCount = config.sparks ? 30 : 20;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: config.sparks ? Math.random() * 1.8 + 0.6 : Math.random() * 1.4 + 0.5,
          vx: (Math.random() - 0.5) * (config.sparks ? 0.8 : 0.3),
          vy: config.sparks ? -(Math.random() * 0.8 + 0.3) : (Math.random() - 0.5) * 0.2,
          alpha: Math.random() * 0.6 + 0.2,
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
          ctx.fillStyle = p.isSpark 
            ? `rgba(255, 160, 50, ${p.alpha})` 
            : `rgba(230, 220, 190, ${p.alpha * 0.5})`;
          ctx.fill();
        });
        animFrameId = requestAnimationFrame(render);
      }
      render();
    }
  }

  return { load: initRoomVFX, clear: cleanup };
})();