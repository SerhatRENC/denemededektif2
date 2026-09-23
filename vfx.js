/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası (v2 - Belirgin & Optimize)
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];

  // Mekan bazlı efekt konfigürasyonları (X, Y yüzdesel konumlar)
  const roomVFXConfig = {
    // Lambalı ve Işıklı İç Mekanlar
    'dedektif': { dust: true, lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.75)', size: '24cqw' }] },
    'ofis': { dust: true, lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.75)', size: '24cqw' }] },
    'halit_ev': { dust: true, lights: [{ x: '10%', y: '58%', color: 'rgba(255, 160, 40, 0.7)', size: '20cqw' }, { x: '85%', y: '70%', color: 'rgba(240, 100, 30, 0.65)', size: '25cqw' }] },
    'nadire_ev': { dust: true, lights: [{ x: '22%', y: '55%', color: 'rgba(255, 160, 40, 0.75)', size: '22cqw' }, { x: '45%', y: '65%', color: 'rgba(230, 100, 30, 0.6)', size: '24cqw' }] },
    'sifahane': { dust: true, lights: [{ x: '73%', y: '58%', color: 'rgba(230, 110, 30, 0.65)', size: '26cqw' }] },
    
    // Ateşli / Isı Odaklı Mekanlar
    'demirci': { sparks: true, lights: [{ x: '60%', y: '42%', color: 'rgba(255, 100, 20, 0.85)', size: '35cqw' }] },
    'han_depo': { dust: true, lights: [{ x: '57%', y: '48%', color: 'rgba(255, 140, 40, 0.7)', size: '18cqw' }] },
    
    // Sisli ve Atmosferik Mekanlar
    'mezarlik': { dust: true, fog: true, lights: [{ x: '28%', y: '78%', color: 'rgba(255, 190, 80, 0.6)', size: '28cqw' }] },
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

    // 3. Canvas Parçacıkları (Daha Büyük & Belirgin Tozlar)
    if (config.dust || config.sparks) {
      const canvas = document.createElement('canvas');
      canvas.className = 'vfx-canvas';
      stageElement.appendChild(canvas);
      
      const rect = stageElement.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 450;
      const ctx = canvas.getContext('2d');

      // Sayıyı sadece biraz artırdık (35-45 arası), ama boyutları büyüttük!
      const particleCount = config.sparks ? 45 : 35;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          // Toz boyutları 0.5px yerine 1.8px - 3.2px arası yapıldı (daha net görünür)
          radius: config.sparks ? Math.random() * 2.2 + 0.8 : Math.random() * 2.0 + 1.2,
          vx: (Math.random() - 0.5) * (config.sparks ? 1.0 : 0.5),
          vy: config.sparks ? -(Math.random() * 1.0 + 0.4) : (Math.random() - 0.5) * 0.35,
          // Opaklık artırıldı
          alpha: Math.random() * 0.5 + 0.45,
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
            ctx.fillStyle = `rgba(255, 170, 50, ${p.alpha})`;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(255, 120, 0, 0.8)';
          } else {
            // Tozlar hafif parlayan sıcak krem rengi yapıldı
            ctx.fillStyle = `rgba(245, 235, 210, ${p.alpha})`;
            ctx.shadowBlur = 2;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
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