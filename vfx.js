/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası (v11 - Tam Dosya İsmi Entegrasyonu)
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];
  let smokeParticles = [];

  // KLASÖRDEKİ GERÇEK DOSYA İSİMLERİNE GÖRE TAM HARİTALANMIŞ EFEKT BİLGİLERİ
  const roomVFXConfig = {
    // 1. giris.jpg / giris.webp (Ana Giriş & Karşılama Ekranı)
    'giris': {
      dust: true, count: 120,
      beam: { xMin: 0.20, xMax: 0.95, yMin: 0.20, yMax: 0.90 },
      lights: [
        { x: '31%', y: '36%', color: 'rgba(255, 150, 30, 0.75)', size: '14cqw' },
        { x: '86%', y: '28%', color: 'rgba(255, 150, 30, 0.80)', size: '16cqw' },
        { x: '94%', y: '43%', color: 'rgba(255, 150, 30, 0.65)', size: '12cqw' },
        { x: '46%', y: '42%', color: 'rgba(255, 140, 30, 0.55)', size: '10cqw' }
      ]
    },

    // 2. dedektif_ofis.jpg / dedektif_ofis.webp (Sol Pencere Tozu & Masadaki Lamba)
    'dedektif_ofis': {
      dust: true, count: 120,
      beam: { xMin: 0.01, xMax: 0.52, yMin: 0.05, yMax: 0.88 }, // Sol pencereden masaya
      lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.75)', size: '22cqw' }] // Masadaki gaz lambası
    },

    // 3. ofis_sehir.jpg / ofis_sehir.webp (Şehir Dedektiflik Bürosu)
    'ofis_sehir': {
      dust: true, count: 120,
      beam: { xMin: 0.15, xMax: 0.82, yMin: 0.08, yMax: 0.85 }
    },

    // 4. gazeteci_oda.jpg / gazeteci_oda.webp (Tavan Işığı & Pencere Hizası)
    'gazeteci_oda': {
      dust: true, count: 100,
      beam: { xMin: 0.38, xMax: 0.68, yMin: 0.18, yMax: 0.75 },
      lights: [{ x: '50%', y: '5%', color: 'rgba(255, 190, 100, 0.7)', size: '32cqw' }] // Tavan parlaması
    },

    // 5. han.jpg / han.webp (Tüm Mum/Lamba Ateşleri & Üst Balkon Tozu)
    'han': {
      dust: true, count: 95,
      beam: { xMin: 0.10, xMax: 0.75, yMin: 0.00, yMax: 0.28 }, // Üst balkon hizası
      lights: [
        { x: '5%', y: '58%', color: 'rgba(255, 140, 30, 0.7)', size: '14cqw' },
        { x: '21%', y: '33%', color: 'rgba(255, 140, 30, 0.7)', size: '14cqw' },
        { x: '31%', y: '35%', color: 'rgba(255, 140, 30, 0.7)', size: '14cqw' },
        { x: '42%', y: '33%', color: 'rgba(255, 140, 30, 0.7)', size: '14cqw' },
        { x: '65%', y: '44%', color: 'rgba(255, 140, 30, 0.7)', size: '14cqw' },
        { x: '68%', y: '34%', color: 'rgba(255, 140, 30, 0.7)', size: '14cqw' },
        { x: '98%', y: '84%', color: 'rgba(255, 140, 30, 0.8)', size: '16cqw' }
      ]
    },

    // 6. degirmenci.jpg / degirmenci.webp (Sol Taş + Sağ Masa Huzmesi)
    'degirmenci': {
      dust: true, count: 130,
      beams: [
        { xMin: 0.25, xMax: 0.62, yMin: 0.20, yMax: 0.58 }, // Sol pencereden taş üstüne
        { xMin: 0.65, xMax: 0.98, yMin: 0.20, yMax: 0.72 }  // Sağ masa & terazi hizası
      ]
    },

    // 7. merkez.jpg / merkez.webp (Baca Dumanı & Fırın Ateşi)
    'merkez': {
      smoke: true,
      lights: [{ x: '78%', y: '51%', color: 'rgba(255, 100, 20, 0.85)', size: '14cqw' }]
    },

    // 8. mezarlik.jpg / mezarlik.webp (Mum Işıkları & Toz)
    'mezarlik': {
      dust: true, count: 110,
      beam: { xMin: 0.15, xMax: 0.85, yMin: 0.30, yMax: 0.90 },
      lights: [{ x: '27%', y: '78%', color: 'rgba(255, 150, 40, 0.8)', size: '18cqw' }]
    },

    // 9. cadi.jpg / cadi.webp
    'cadi': {
      dust: true, count: 120,
      beam: { xMin: 0.35, xMax: 0.82, yMin: 0.20, yMax: 0.88 }
    },

    // 10. demirci.jpg / demirci.webp (Ocak Ateşi & Kıvılcım/Toz)
    'demirci': {
      sparks: true, count: 75,
      beam: { xMin: 0.58, xMax: 0.95, yMin: 0.10, yMax: 0.85 },
      lights: [{ x: '58%', y: '42%', color: 'rgba(255, 90, 10, 0.8)', size: '34cqw' }]
    },

    // 11. nadire_ev.jpg / nadire_ev.webp
    'nadire_ev': {
      dust: true, count: 120,
      beam: { xMin: 0.20, xMax: 0.60, yMin: 0.25, yMax: 0.82 },
      lights: [{ x: '22%', y: '52%', color: 'rgba(255, 160, 40, 0.7)', size: '20cqw' }]
    },

    // 12. muhtar.jpg / muhtar.webp
    'muhtar': {
      dust: true, count: 120,
      beam: { xMin: 0.01, xMax: 0.80, yMin: 0.02, yMax: 0.98 }
    },

    // 13. kilise.jpg / kilise.webp
    'kilise': {
      dust: true, count: 150,
      beam: { xMin: 0.02, xMax: 0.98, yMin: 0.10, yMax: 0.95 }
    },

    // 14. halit_ev.jpg / halit_ev.webp
    'halit_ev': {
      dust: true, count: 110,
      beam: { xMin: 0.52, xMax: 0.98, yMin: 0.12, yMax: 0.92 }
    },

    // 15. sifahane.jpg / sifahane.webp
    'sifahane': {
      dust: true, count: 110,
      beam: { xMin: 0.05, xMax: 0.65, yMin: 0.05, yMax: 0.95 }
    },

    // 16. han_depo.jpg / han_depo.webp
    'han_depo': {
      dust: true, count: 120,
      beam: { xMin: 0.05, xMax: 0.72, yMin: 0.10, yMax: 0.85 }
    },

    // 17. kilise_kapi.jpg / kilise_kapi.webp
    'kilise_kapi': {
      dust: true, count: 60,
      beam: { xMin: 0.58, xMax: 0.88, yMin: 0.25, yMax: 0.88 }
    },

    // 18. koy_giris.jpg / koy_giris.webp
    'koy_giris': {
      dust: true, count: 70,
      beam: { xMin: 0.35, xMax: 0.98, yMin: 0.55, yMax: 0.95 }
    },

    // 19. halit_ev_kapi.jpg / halit_ev_kapi.webp (İsteğin Üzerine Tozsuz)
    'halit_ev_kapi': {}
  };

  function cleanup() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    document.querySelectorAll('.vfx-canvas, .vfx-flicker-light').forEach(el => el.remove());
    particles = [];
    smokeParticles = [];
  }

  function initRoomVFX(rawRoomId, stageElement) {
    cleanup();
    if (!stageElement || !rawRoomId) return;

    // Gelen ID'yi temizle (Örn: "assets/dedektif_ofis.jpg" -> "dedektif_ofis")
    let cleanId = rawRoomId.toString().split('/').pop().replace(/\.(webp|jpg|jpeg|png)$/i, '').trim();

    // Tam İsim Eşleştirme
    let config = roomVFXConfig[cleanId];

    // Eğer tam eşleşme bulamazsa alt kelime arama güvenlik ağı
    if (!config) {
      let keys = Object.keys(roomVFXConfig).sort((a, b) => b.length - a.length);
      let matchedKey = keys.find(k => cleanId.includes(k));
      if (matchedKey) config = roomVFXConfig[matchedKey];
    }

    if (!config) return;

    // A. YAVAŞ & SİNEMATİK LAMBALAR / ATEŞLER
    if (config.lights) {
      config.lights.forEach(l => {
        const light = document.createElement('div');
        light.className = 'vfx-flicker-light';
        light.style.left = l.x;
        light.style.top = l.y;
        light.style.width = l.size;
        light.style.height = l.size;
        light.style.background = `radial-gradient(circle, ${l.color} 0%, transparent 70%)`;
        light.style.animation = `vfxSlowFlicker ${3.0 + Math.random() * 2}s ease-in-out infinite alternate`;
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

      // 1. Toz & Kıvılcım Parçacıkları
      if (config.dust || config.sparks) {
        const beamsList = config.beams || [config.beam || { xMin: 0.1, xMax: 0.9, yMin: 0.1, yMax: 0.9 }];
        const count = config.count || 110;

        for (let i = 0; i < count; i++) {
          const targetBeam = beamsList[Math.floor(Math.random() * beamsList.length)];

          const minX = canvas.width * targetBeam.xMin;
          const maxX = canvas.width * targetBeam.xMax;
          const minY = canvas.height * targetBeam.yMin;
          const maxY = canvas.height * targetBeam.yMax;

          // Gün ışığında parlayan sıcak amber-sarı tonlar
          const hue = 40 + Math.floor(Math.random() * 10);
          const sat = 80 + Math.floor(Math.random() * 20);
          const light = 75 + Math.floor(Math.random() * 15);

          particles.push({
            x: minX + Math.random() * (maxX - minX),
            y: minY + Math.random() * (maxY - minY),
            r: config.sparks ? Math.random() * 1.8 + 0.9 : Math.random() * 1.0 + 1.2,
            // SÜZÜLME HIZI (Çok yavaş ve doğal)
            vx: (Math.random() - 0.5) * (config.sparks ? 0.20 : 0.05),
            vy: config.sparks ? -(Math.random() * 0.30 + 0.12) : (Math.random() - 0.5) * 0.04,
            alpha: Math.random() * 0.4 + 0.3,
            maxAlpha: Math.random() * 0.35 + 0.50,
            // KAYBOLMA VE BELİRME SÜRESİ (2 kat daha uzun ömürlü)
            fadeSpeed: Math.random() * 0.0015 + 0.0008,
            fadingIn: Math.random() > 0.5,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.004 + 0.002,
            color: config.sparks ? 'rgba(255, 160, 40,' : `hsl(${hue}, ${sat}%, ${light}%,`,
            isSpark: !!config.sparks,
            bounds: { minX, maxX, minY, maxY }
          });
        }
      }

      // 2. Gri Baca Dumanı (Merkez Meydanı)
      if (config.smoke) {
        for (let i = 0; i < 30; i++) {
          smokeParticles.push({
            x: canvas.width * 0.81 + (Math.random() - 0.5) * 16,
            y: canvas.height * 0.32 + Math.random() * 35,
            r: Math.random() * 12 + 6,
            vy: -(Math.random() * 0.22 + 0.10),
            vx: Math.random() * 0.12 + 0.03,
            alpha: Math.random() * 0.35 + 0.15,
            grow: Math.random() * 0.05 + 0.02
          });
        }
      }

      // ANİMASYON DÖNGÜSÜ
      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- A. BACA DUMANI RENDER ---
        smokeParticles.forEach(s => {
          s.y += s.vy;
          s.x += s.vx;
          s.r += s.grow;
          s.alpha -= 0.001;

          if (s.alpha <= 0 || s.y < canvas.height * 0.05) {
            s.x = canvas.width * 0.81 + (Math.random() - 0.5) * 12;
            s.y = canvas.height * 0.32;
            s.r = Math.random() * 6 + 5;
            s.alpha = Math.random() * 0.35 + 0.15;
          }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(190, 190, 180, ${s.alpha})`;
          ctx.fill();
        });

        // --- B. TOZ RENDER ---
        particles.forEach(p => {
          p.wobble += p.wobbleSpeed;
          p.x += p.vx + Math.sin(p.wobble) * 0.08;
          p.y += p.vy;

          if (p.fadingIn) {
            p.alpha += p.fadeSpeed;
            if (p.alpha >= p.maxAlpha) p.fadingIn = false;
          } else {
            p.alpha -= p.fadeSpeed;
            if (p.alpha <= 0.05) {
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