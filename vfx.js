/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];
  let smokeParticles = [];

  // MEKANLARA ÖZEL FX YAPILANDIRMASI
  const roomVFXConfig = {
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
    'koy_giris': {
      dust: true, count: 100,
      beam: { xMin: 0.15, xMax: 0.95, yMin: 0.25, yMax: 0.90 }
    },
    'dedektif_ofis': {
      dust: true, count: 180,
      beam: { xMin: 0.01, xMax: 0.48, yMin: 0.02, yMax: 0.88 },
      lights: [{ x: '29%', y: '50%', color: 'rgba(255, 175, 50, 0.90)', size: '26cqw' }]
    },
    'degirmenci': {
      dust: true, count: 190,
      beams: [
        { xMin: 0.22, xMax: 0.58, yMin: 0.15, yMax: 0.58 },
        { xMin: 0.68, xMax: 0.95, yMin: 0.15, yMax: 0.58 }
      ]
    },
    'gazeteci_oda': {
      dust: true, count: 150,
      beam: { xMin: 0.38, xMax: 0.68, yMin: 0.18, yMax: 0.75 },
      lights: [{ x: '50%', y: '10%', color: 'rgba(255, 190, 80, 0.85)', size: '38cqw' }]
    },
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
    'han_mutfak': {
      dust: true, count: 120,
      beam: { xMin: 0.10, xMax: 0.80, yMin: 0.15, yMax: 0.75 },
      lights: [
        { x: '55%', y: '48%', color: 'rgba(255, 110, 20, 0.90)', size: '28cqw' },
        { x: '25%', y: '55%', color: 'rgba(255, 150, 30, 0.80)', size: '18cqw' }
      ]
    },
    'merkez': {
      smoke: true,
      lights: [{ x: '78%', y: '51%', color: 'rgba(255, 100, 20, 0.90)', size: '18cqw' }]
    },
    'mezarlik': {
      dust: true, count: 135,
      beam: { xMin: 0.15, xMax: 0.85, yMin: 0.30, yMax: 0.90 },
      lights: [{ x: '27%', y: '78%', color: 'rgba(255, 160, 50, 0.85)', size: '22cqw' }]
    },
    'sifahane': {
      dust: true, count: 150,
      beam: { xMin: 0.01, xMax: 0.42, yMin: 0.05, yMax: 0.88 }
    },
    'nadire_ev': {
      dust: true, count: 150,
      beam: { xMin: 0.22, xMax: 0.58, yMin: 0.30, yMax: 0.78 },
      lights: [{ x: '22%', y: '52%', color: 'rgba(255, 160, 40, 0.85)', size: '22cqw' }]
    },
    'demirci': {
      sparks: true, count: 100,
      beam: { xMin: 0.58, xMax: 0.95, yMin: 0.10, yMax: 0.85 },
      lights: [{ x: '58%', y: '42%', color: 'rgba(255, 90, 10, 0.90)', size: '38cqw' }]
    },
    'cadi': {
      dust: true, count: 165,
      beam: { xMin: 0.35, xMax: 0.75, yMin: 0.25, yMax: 0.88 }
    },
    'halit_ev': {
      dust: true, count: 150,
      beam: { xMin: 0.55, xMax: 0.98, yMin: 0.15, yMax: 0.90 }
    },
    'halit_ev_kapi': {},
    'muhtar': {
      dust: true, count: 150,
      beam: { xMin: 0.01, xMax: 0.78, yMin: 0.02, yMax: 0.98 }
    },
    'kilise': {
      dust: true, count: 180,
      beam: { xMin: 0.02, xMax: 0.98, yMin: 0.15, yMax: 0.95 }
    },
    'han_depo': {
      dust: true, count: 165,
      beam: { xMin: 0.05, xMax: 0.70, yMin: 0.10, yMax: 0.85 }
    },
    'ofis_sehir': {
      dust: true, count: 165,
      beam: { xMin: 0.15, xMax: 0.82, yMin: 0.08, yMax: 0.85 }
    },
    'kilise_kapi': {
      dust: true, count: 80,
      beam: { xMin: 0.58, xMax: 0.88, yMin: 0.25, yMax: 0.88 }
    }
  };

  function getRoomConfig(rawRoomId) {
    if (!rawRoomId) return null;
    let clean = rawRoomId.toString().split('/').pop().split('?')[0].replace(/\.(webp|jpg|jpeg|png)$/i, '').trim().toLowerCase();

    if (roomVFXConfig[clean]) return roomVFXConfig[clean];

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

    if (config.dust || config.sparks || config.smoke) {
      const canvas = document.createElement('canvas');
      canvas.className = 'vfx-canvas';
      stageElement.appendChild(canvas);

      const rect = stageElement.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 450;
      const ctx = canvas.getContext('2d');

      if (config.dust || config.sparks) {
        const beamsList = config.beams || [config.beam || { xMin: 0.1, xMax: 0.9, yMin: 0.1, yMax: 0.9 }];
        const count = config.count || 120;

        for (let i = 0; i < count; i++) {
          const targetBeam = beamsList[Math.floor(Math.random() * beamsList.length)];

          const minX = canvas.width * targetBeam.xMin;
          const maxX = canvas.width * targetBeam.xMax;
          const minY = canvas.height * targetBeam.yMin;
          const maxY = canvas.height * targetBeam.yMax;

          const hue = 38 + Math.floor(Math.random() * 12);
          const sat = 65 + Math.floor(Math.random() * 20);
          const light = 70 + Math.floor(Math.random() * 15);

          particles.push({
            x: minX + Math.random() * (maxX - minX),
            y: minY + Math.random() * (maxY - minY),
            r: config.sparks ? Math.random() * 1.6 + 0.8 : Math.random() * 1.1 + 0.9,
            vx: (Math.random() - 0.5) * (config.sparks ? 0.20 : 0.04),
            vy: config.sparks ? -(Math.random() * 0.25 + 0.10) : (Math.random() - 0.5) * 0.03,
            alpha: Math.random() * 0.35 + 0.20,
            maxAlpha: Math.random() * 0.30 + 0.40,
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

      if (config.smoke) {
        for (let i = 0; i < 35; i++) {
          smokeParticles.push({
            x: canvas.width * 0.81 + (Math.random() - 0.5) * 16,
            y: canvas.height * 0.15 + Math.random() * 25,
            r: Math.random() * 12 + 6,
            vy: -(Math.random() * 0.20 + 0.08),
            vx: Math.random() * 0.10 + 0.02,
            alpha: Math.random() * 0.35 + 0.15,
            grow: Math.random() * 0.05 + 0.02
          });
        }
      }

      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        smokeParticles.forEach(s => {
          s.y += s.vy;
          s.x += s.vx;
          s.r += s.grow;
          s.alpha -= 0.0007;

          if (s.alpha <= 0 || s.y < canvas.height * 0.02) {
            s.x = canvas.width * 0.81 + (Math.random() - 0.5) * 12;
            s.y = canvas.height * 0.15;
            s.r = Math.random() * 6 + 5;
            s.alpha = Math.random() * 0.35 + 0.15;
          }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(195, 195, 185, ${s.alpha})`;
          ctx.fill();
        });

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