/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası (v12 - İnce Zarif Toz & Dengeli Yoğunluk)
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];
  let smokeParticles = [];

  // HER BİR MEKANIN VFX KOORDİNATLARI & DENGELENMİŞ DUST SAYILARI
  const roomVFXConfig = {
    'cadi': {
      dust: true, count: 180,
      beam: { xMin: 0.20, xMax: 0.85, yMin: 0.15, yMax: 0.90 },
      lights: [{ x: '50%', y: '45%', color: 'rgba(255, 150, 40, 0.85)', size: '28cqw' }]
    },
    'ofis': {
      dust: true, count: 200,
      beam: { xMin: 0.02, xMax: 0.95, yMin: 0.05, yMax: 0.95 },
      lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.85)', size: '30cqw' }]
    },
    'scr-dedektif': { // Dedektif Ofisi / Polis Ekranı
      dust: true, count: 200,
      beam: { xMin: 0.02, xMax: 0.95, yMin: 0.05, yMax: 0.95 },
      lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.85)', size: '30cqw' }]
    },
    'degirmenci': {
      dust: true, count: 200,
      beam: { xMin: 0.15, xMax: 0.98, yMin: 0.15, yMax: 0.90 }
    },
    'demirci': {
      sparks: true, count: 120,
      beam: { xMin: 0.50, xMax: 0.95, yMin: 0.10, yMax: 0.85 },
      lights: [{ x: '58%', y: '42%', color: 'rgba(255, 90, 10, 0.90)', size: '38cqw' }]
    },
    'gazeteci_oda': {
      dust: true, count: 160,
      beam: { xMin: 0.20, xMax: 0.80, yMin: 0.15, yMax: 0.85 },
      lights: [{ x: '50%', y: '10%', color: 'rgba(255, 200, 120, 0.60)', size: '48cqw' }]
    },
    'scr-ana': { // Giriş Ekranı
      dust: true, count: 220,
      beam: { xMin: 0.10, xMax: 0.95, yMin: 0.15, yMax: 0.95 },
      lights: [
        { x: '29.8%', y: '35.5%', color: 'rgba(255, 160, 40, 0.85)', size: '18cqw' },
        { x: '47.5%', y: '42.2%', color: 'rgba(255, 160, 40, 0.75)', size: '13cqw' },
        { x: '68.5%', y: '42.0%', color: 'rgba(255, 160, 40, 0.75)', size: '13cqw' },
        { x: '87.5%', y: '28.8%', color: 'rgba(255, 170, 50, 0.95)', size: '22cqw' }
      ]
    },
    'halit_ev': {
      dust: true, count: 180,
      beam: { xMin: 0.40, xMax: 0.98, yMin: 0.15, yMax: 0.90 },
      lights: [{ x: '65%', y: '40%', color: 'rgba(255, 150, 40, 0.80)', size: '25cqw' }]
    },
    'han': {
      dust: true, count: 160,
      beam: { xMin: 0.05, xMax: 0.95, yMin: 0.00, yMax: 0.90 },
      lights: [
        { x: '5%', y: '28%', color: 'rgba(255, 140, 30, 0.80)', size: '18cqw' },
        { x: '21%', y: '33%', color: 'rgba(255, 140, 30, 0.80)', size: '18cqw' },
        { x: '31%', y: '35%', color: 'rgba(255, 140, 30, 0.80)', size: '18cqw' },
        { x: '42%', y: '33%', color: 'rgba(255, 140, 30, 0.80)', size: '18cqw' },
        { x: '68%', y: '34%', color: 'rgba(255, 140, 30, 0.80)', size: '18cqw' },
        { x: '65%', y: '44%', color: 'rgba(255, 140, 30, 0.80)', size: '18cqw' },
        { x: '98%', y: '84%', color: 'rgba(255, 140, 30, 0.80)', size: '18cqw' }
      ]
    },
    'han_depo': {
      dust: true, count: 180,
      beam: { xMin: 0.05, xMax: 0.80, yMin: 0.10, yMax: 0.88 }
    },
    'kilise': {
      dust: true, count: 220,
      beam: { xMin: 0.02, xMax: 0.98, yMin: 0.10, yMax: 0.95 },
      lights: [{ x: '50%', y: '30%', color: 'rgba(255, 170, 50, 0.85)', size: '32cqw' }]
    },
    'kilise_kapi': {
      dust: true, count: 120,
      beam: { xMin: 0.40, xMax: 0.90, yMin: 0.20, yMax: 0.90 }
    },
    'scr-koy': {
      dust: true, count: 140,
      beam: { xMin: 0.20, xMax: 0.98, yMin: 0.40, yMax: 0.95 }
    },
    'merkez': {
      dust: true, count: 140,
      beam: { xMin: 0.05, xMax: 0.95, yMin: 0.20, yMax: 0.90 },
      smoke: true,
      smokeSource: { xPct: 0.795, yPct: 0.315 },
      lights: [{ x: '78%', y: '51%', color: 'rgba(255, 100, 20, 0.90)', size: '16cqw' }]
    },
    'mezarlik': {
      dust: true, count: 150,
      beam: { xMin: 0.10, xMax: 0.90, yMin: 0.25, yMax: 0.95 },
      lights: [{ x: '27%', y: '78%', color: 'rgba(255, 150, 40, 0.85)', size: '18cqw' }]
    },
    'muhtar': {
      dust: true, count: 180,
      beam: { xMin: 0.01, xMax: 0.85, yMin: 0.02, yMax: 0.98 },
      lights: [{ x: '45%', y: '35%', color: 'rgba(255, 160, 40, 0.80)', size: '25cqw' }]
    },
    'nadire_ev': {
      dust: true, count: 180,
      beam: { xMin: 0.15, xMax: 0.75, yMin: 0.20, yMax: 0.85 },
      lights: [{ x: '22%', y: '52%', color: 'rgba(255, 160, 40, 0.85)', size: '24cqw' }]
    },
    'scr-ofis': {
      dust: true, count: 200,
      beam: { xMin: 0.05, xMax: 0.90, yMin: 0.05, yMax: 0.90 }
    },
    'sifahane': {
      dust: true, count: 180,
      beam: { xMin: 0.05, xMax: 0.75, yMin: 0.05, yMax: 0.95 },
      lights: [{ x: '35%', y: '40%', color: 'rgba(255, 160, 40, 0.80)', size: '22cqw' }]
    }
  };

  function cleanup() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    document.querySelectorAll('.vfx-canvas, .vfx-flicker-light').forEach(el => {
      el.classList.remove('vfx-show');
      setTimeout(() => el.remove(), 600);
    });
    particles = [];
    smokeParticles = [];
  }

  function initRoomVFX(roomId, stageElement) {
    cleanup();
    if (!stageElement || !roomId) return;

    let config = roomVFXConfig[roomId] || null;
    if (!config) return;

    // A. YAVAŞ & DOĞAL ATEŞ IŞIKLARI
    const createdLights = [];
    if (config.lights) {
      config.lights.forEach((l, idx) => {
        const light = document.createElement('div');
        light.className = 'vfx-flicker-light';
        light.style.left = l.x;
        light.style.top = l.y;
        light.style.width = l.size;
        light.style.height = l.size;
        light.style.background = `radial-gradient(circle, ${l.color} 0%, rgba(255,120,20,0.25) 50%, transparent 75%)`;
        
        const duration = 4.5 + Math.random() * 2.5;
        const delay = Math.random() * 3;
        const animType = idx % 2 === 0 ? 'vfxFlameFlickerA' : 'vfxFlameFlickerB';
        light.style.animation = `${animType} ${duration}s ease-in-out ${delay}s infinite alternate`;
        
        stageElement.appendChild(light);
        createdLights.push(light);
      });
    }

    // B. CANVAS PARÇACIK MOTORU (MİKRO VE KİBAR TOZLAR)
    let canvas = null;
    if (config.dust || config.sparks || config.smoke) {
      canvas = document.createElement('canvas');
      canvas.className = 'vfx-canvas';
      stageElement.appendChild(canvas);

      const rect = stageElement.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 450;
      const ctx = canvas.getContext('2d');

      if (config.dust || config.sparks) {
        const beam = config.beam || { xMin: 0.1, xMax: 0.9, yMin: 0.1, yMax: 0.9 };
        const count = config.count || 180;

        for (let i = 0; i < count; i++) {
          const minX = canvas.width * beam.xMin;
          const maxX = canvas.width * beam.xMax;
          const minY = canvas.height * beam.yMin;
          const maxY = canvas.height * beam.yMax;

          const hue = 36 + Math.floor(Math.random() * 16);
          const sat = 65 + Math.floor(Math.random() * 20);
          const light = 70 + Math.floor(Math.random() * 15);

          particles.push({
            x: minX + Math.random() * (maxX - minX),
            y: minY + Math.random() * (maxY - minY),
            // Yarıçap küçültüldü: Mikro, yumuşak toz tanecikleri
            r: config.sparks ? Math.random() * 1.5 + 0.6 : Math.random() * 0.9 + 0.5,
            vx: (Math.random() - 0.5) * (config.sparks ? 0.30 : 0.08),
            vy: config.sparks ? -(Math.random() * 0.35 + 0.15) : (Math.random() - 0.5) * 0.06,
            alpha: Math.random() * 0.35 + 0.12,
            maxAlpha: Math.random() * 0.35 + 0.25,
            fadeSpeed: Math.random() * 0.003 + 0.001,
            fadingIn: Math.random() > 0.5,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.008 + 0.003,
            color: config.sparks ? 'rgba(255, 150, 40,' : `hsl(${hue}, ${sat}%, ${light}%,`,
            bounds: { minX, maxX, minY, maxY }
          });
        }
      }

      if (config.smoke) {
        const smokeX = config.smokeSource ? config.smokeSource.xPct : 0.81;
        const smokeY = config.smokeSource ? config.smokeSource.yPct : 0.32;

        for (let i = 0; i < 25; i++) {
          smokeParticles.push({
            x: canvas.width * smokeX + (Math.random() - 0.5) * 12,
            y: canvas.height * smokeY + Math.random() * 20,
            r: Math.random() * 7 + 3,
            vy: -(Math.random() * 0.20 + 0.10),
            vx: Math.random() * 0.08 - 0.02,
            alpha: Math.random() * 0.25 + 0.08,
            grow: Math.random() * 0.03 + 0.02,
            sourceX: smokeX,
            sourceY: smokeY
          });
        }
      }

      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Duman
        smokeParticles.forEach(s => {
          s.y += s.vy;
          s.x += s.vx;
          s.r += s.grow;
          s.alpha -= 0.001;

          if (s.alpha <= 0 || s.y < canvas.height * 0.05) {
            s.x = canvas.width * (s.sourceX || 0.81) + (Math.random() - 0.5) * 10;
            s.y = canvas.height * (s.sourceY || 0.32);
            s.r = Math.random() * 5 + 3;
            s.alpha = Math.random() * 0.22 + 0.08;
          }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(170, 170, 160, ${s.alpha})`;
          ctx.fill();
        });

        // Toz Tanecikleri
        particles.forEach(p => {
          p.wobble += p.wobbleSpeed;
          p.x += p.vx + Math.sin(p.wobble) * 0.09;
          p.y += p.vy;

          if (p.fadingIn) {
            p.alpha += p.fadeSpeed;
            if (p.alpha >= p.maxAlpha) p.fadingIn = false;
          } else {
            p.alpha -= p.fadeSpeed;
            if (p.alpha <= 0.02) {
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

    setTimeout(() => {
      if (canvas) canvas.classList.add('vfx-show');
      createdLights.forEach(l => l.classList.add('vfx-show'));
    }, 50);
  }

  return { load: initRoomVFX, clear: cleanup };
})();