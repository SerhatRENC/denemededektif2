/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası (v8 - Tam Gün Işığı & Sinematik Toz)
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];
  let smokeParticles = [];

  // HER BİR MEKANIN TAM HARİTALANMIŞ EFEKT KOORDİNATLARI
  const roomVFXConfig = {
    // 1. Cadı / Büyücü Odası
    'cadi': {
      dust: true, count: 110,
      beam: { xMin: 0.35, xMax: 0.75, yMin: 0.25, yMax: 0.88 }
    },

    // 2. Dedektif Ofisi (Ahşap Masa & Gaz Lambası)
    'dedektif': {
      dust: true, count: 110,
      beam: { xMin: 0.02, xMax: 0.60, yMin: 0.05, yMax: 0.90 },
      lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.55)', size: '22cqw' }] // Kırmızı Halka
    },

    // 3. Değirmenci İç Mekan
    'degirmenci': {
      dust: true, count: 120,
      beam: { xMin: 0.22, xMax: 0.98, yMin: 0.25, yMax: 0.85 }
    },

    // 4. Demirci Atölyesi
    'demirci': {
      sparks: true, count: 65,
      beam: { xMin: 0.60, xMax: 0.95, yMin: 0.10, yMax: 0.85 }, // Mavi Halka
      lights: [{ x: '58%', y: '42%', color: 'rgba(255, 90, 10, 0.7)', size: '32cqw' }] // Kırmızı Ateş Halkan
    },

    // 5. Gazeteci Odası
    'gazeteci': {
      dust: true, count: 90,
      beam: { xMin: 0.40, xMax: 0.65, yMin: 0.20, yMax: 0.70 },
      lights: [{ x: '50%', y: '0%', color: 'rgba(255, 200, 120, 0.3)', size: '40cqw' }]
    },

    // 6. Giriş / Köy Meydanı Karşılama
    'giris': {
      lights: [
        { x: '31%', y: '36%', color: 'rgba(255, 150, 30, 0.6)', size: '12cqw' },
        { x: '86%', y: '28%', color: 'rgba(255, 150, 30, 0.6)', size: '12cqw' },
        { x: '94%', y: '43%', color: 'rgba(255, 150, 30, 0.5)', size: '10cqw' }
      ]
    },

    // 7. Halit'in Evi İç Mekan
    'halit_ev': {
      dust: true, count: 100,
      beam: { xMin: 0.55, xMax: 0.98, yMin: 0.15, yMax: 0.90 }
    },

    // 8. Han İç Mekan (Restoran / Yemek Alanı)
    'han': {
      dust: true, count: 75,
      beam: { xMin: 0.15, xMax: 0.72, yMin: 0.00, yMax: 0.25 },
      lights: [
        { x: '5%', y: '28%', color: 'rgba(255, 140, 30, 0.6)', size: '14cqw' },
        { x: '21%', y: '33%', color: 'rgba(255, 140, 30, 0.6)', size: '14cqw' },
        { x: '31%', y: '35%', color: 'rgba(255, 140, 30, 0.6)', size: '14cqw' },
        { x: '42%', y: '33%', color: 'rgba(255, 140, 30, 0.6)', size: '14cqw' },
        { x: '68%', y: '34%', color: 'rgba(255, 140, 30, 0.6)', size: '14cqw' },
        { x: '65%', y: '44%', color: 'rgba(255, 140, 30, 0.6)', size: '14cqw' },
        { x: '98%', y: '84%', color: 'rgba(255, 140, 30, 0.6)', size: '14cqw' }
      ]
    },

    // 9. Han Depo / Mahzen
    'han_depo': {
      dust: true, count: 110,
      beam: { xMin: 0.05, xMax: 0.70, yMin: 0.10, yMax: 0.85 }
    },

    // 10. Kilise İç Mekan
    'kilise': {
      dust: true, count: 120,
      beam: { xMin: 0.02, xMax: 0.98, yMin: 0.15, yMax: 0.95 }
    },

    // 11. Kilise Kapısı (Dış Mekan)
    'kilise_kapi': {
      dust: true, count: 50,
      beam: { xMin: 0.58, xMax: 0.88, yMin: 0.25, yMax: 0.88 }
    },

    // 12. Köy Giriş Takı
    'koy_giris': {
      dust: true, count: 60,
      beam: { xMin: 0.35, xMax: 0.98, yMin: 0.55, yMax: 0.95 }
    },

    // 13. Merkez Meydanı
    'merkez': {
      smoke: true,
      lights: [{ x: '78%', y: '51%', color: 'rgba(255, 100, 20, 0.75)', size: '10cqw' }]
    },

    // 14. Mezarlık
    'mezarlik': {
      dust: true, count: 80,
      beam: { xMin: 0.18, xMax: 0.82, yMin: 0.35, yMax: 0.92 },
      lights: [{ x: '27%', y: '78%', color: 'rgba(255, 150, 40, 0.6)', size: '12cqw' }]
    },

    // 15. Muhtar Odası
    'muhtar': {
      dust: true, count: 100,
      beam: { xMin: 0.01, xMax: 0.78, yMin: 0.02, yMax: 0.98 }
    },

    // 16. Nadire'nin Evi
    'nadire_ev': {
      dust: true, count: 100,
      beam: { xMin: 0.22, xMax: 0.58, yMin: 0.30, yMax: 0.78 },
      lights: [{ x: '22%', y: '52%', color: 'rgba(255, 160, 40, 0.6)', size: '18cqw' }]
    },

    // 17. Ofis / Şehir Dedektiflik Bürosu
    'ofis_sehir': {
      dust: true, count: 110,
      beam: { xMin: 0.15, xMax: 0.82, yMin: 0.08, yMax: 0.85 }
    },

    // 18. Şifahane
    'sifahane': {
      dust: true, count: 100,
      beam: { xMin: 0.05, xMax: 0.62, yMin: 0.08, yMax: 0.95 }
    }
  };

  function cleanup() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    document.querySelectorAll('.vfx-canvas, .vfx-flicker-light').forEach(el => el.remove());
    particles = [];
    smokeParticles = [];
  }

  function initRoomVFX(roomId, stageElement) {
    cleanup();
    if (!stageElement || !roomId) return;

    let configKey = Object.keys(roomVFXConfig).find(key => roomId.includes(key));
    let config = configKey ? roomVFXConfig[configKey] : null;

    if (!config) return;

    // A. YAVAŞ & SİNEMATİK PARILTI / LAMBALAR (Kırmızı Halkalar)
    if (config.lights) {
      config.lights.forEach(l => {
        const light = document.createElement('div');
        light.className = 'vfx-flicker-light';
        light.style.left = l.x;
        light.style.top = l.y;
        light.style.width = l.size;
        light.style.height = l.size;
        light.style.background = `radial-gradient(circle, ${l.color} 0%, transparent 70%)`;
        light.style.animation = `vfxSlowFlicker ${3.5 + Math.random() * 2}s ease-in-out infinite alternate`;
        stageElement.appendChild(light);
      });
    }

    // B. CANVAS PARÇACIK MOTORU
    if (config.dust || config.sparks || config.smoke) {
      const canvas = document.createElement('canvas');
      canvas.className = 'vfx-canvas';
      stageElement.appendChild(canvas);

      const rect = stageElement.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 450;
      const ctx = canvas.getContext('2d');

      // 1. Toz & Kıvılcım Oluşturma
      if (config.dust || config.sparks) {
        const beam = config.beam || { xMin: 0.1, xMax: 0.9, yMin: 0.1, yMax: 0.9 };
        const count = config.count || 90;

        for (let i = 0; i < count; i++) {
          const minX = canvas.width * beam.xMin;
          const maxX = canvas.width * beam.xMax;
          const minY = canvas.height * beam.yMin;
          const maxY = canvas.height * beam.yMax;

          // Güneş ışığında sarımsı/amber kırılma renk yelpazesi
          const hue = 38 + Math.floor(Math.random() * 12); // Warm Golden Yellow
          const sat = 60 + Math.floor(Math.random() * 25);
          const light = 70 + Math.floor(Math.random() * 15);

          particles.push({
            x: minX + Math.random() * (maxX - minX),
            y: minY + Math.random() * (maxY - minY),
            r: config.sparks ? Math.random() * 1.6 + 0.8 : Math.random() * 1.1 + 0.8,
            // HIZ ÇOK YAVAŞLATILDI (İpeksi süzülme)
            vx: (Math.random() - 0.5) * (config.sparks ? 0.35 : 0.08),
            vy: config.sparks ? -(Math.random() * 0.4 + 0.2) : (Math.random() - 0.5) * 0.06,
            // OPAKLIĞI DÜŞÜRÜLDÜ (Daha doğal, göz yormayan görünüm)
            alpha: Math.random() * 0.35 + 0.15,
            maxAlpha: Math.random() * 0.35 + 0.25,
            fadeSpeed: Math.random() * 0.003 + 0.001, // Çok yavaş nefes alma
            fadingIn: Math.random() > 0.5,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.006 + 0.003,
            color: config.sparks ? 'rgba(255, 150, 40,' : `hsl(${hue}, ${sat}%, ${light}%,`,
            isSpark: !!config.sparks,
            bounds: { minX, maxX, minY, maxY }
          });
        }
      }

      // 2. Gri Alan Duman Parçacıkları (Merkez Baca & Sis)
      if (config.smoke) {
        for (let i = 0; i < 20; i++) {
          smokeParticles.push({
            x: canvas.width * 0.81 + (Math.random() - 0.5) * 15,
            y: canvas.height * 0.32 + Math.random() * 40,
            r: Math.random() * 10 + 6,
            vy: -(Math.random() * 0.20 + 0.10),
            vx: Math.random() * 0.12 + 0.03,
            alpha: Math.random() * 0.25 + 0.10,
            grow: Math.random() * 0.05 + 0.02
          });
        }
      }

      // ANİMASYON DÖNGÜSÜ (RENDER)
      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- A. DUMAN RENDER (BACA) ---
        smokeParticles.forEach(s => {
          s.y += s.vy;
          s.x += s.vx;
          s.r += s.grow;
          s.alpha -= 0.001;

          if (s.alpha <= 0 || s.y < canvas.height * 0.05) {
            s.x = canvas.width * 0.81 + (Math.random() - 0.5) * 12;
            s.y = canvas.height * 0.32;
            s.r = Math.random() * 6 + 5;
            s.alpha = Math.random() * 0.25 + 0.10;
          }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(170, 170, 160, ${s.alpha})`;
          ctx.fill();
        });

        // --- B. GÜNEŞ IŞIĞINDA SÜZÜLEN TOZ RENDER ---
        particles.forEach(p => {
          p.wobble += p.wobbleSpeed;
          p.x += p.vx + Math.sin(p.wobble) * 0.08;
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

          // Huzme dışına taşarsa huzme içine çek
          if (p.x < p.bounds.minX || p.x > p.bounds.maxX || p.y < p.bounds.minY || p.y > p.bounds.maxY) {
            p.x = p.bounds.minX + Math.random() * (p.bounds.maxX - p.bounds.minX);
            p.y = p.bounds.minY + Math.random() * (p.bounds.maxY - p.bounds.minY);
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

          if (p.isSpark) {
            ctx.fillStyle = `${p.color} ${p.alpha})`;
          } else {
            // Güneş ışığındaki sıcak sarı tonlu zerreler
            ctx.fillStyle = `${p.color} ${p.alpha})`;
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