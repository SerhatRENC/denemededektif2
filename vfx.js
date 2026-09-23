/* ============================================================
   VFX ENGINE - Sislidere Köyü Davası (v9 - Tam Analiz & Revizyon)
   ============================================================ */
const VFX = (function () {
  let animFrameId = null;
  let particles = [];
  let smokeParticles = [];

  // HER BİR MEKANIN REVİZE EDİLMİŞ EFEKT VE HUZME KOORDİNATLARI
  const roomVFXConfig = {
    // 1. Giriş / Ana Karşılama Ekranı (Görsel 66 - Yüksek Atmosfer)
    'giris': {
      dust: true, count: 85,
      beam: { xMin: 0.25, xMax: 0.92, yMin: 0.35, yMax: 0.85 },
      lights: [
        { x: '31%', y: '36%', color: 'rgba(255, 150, 30, 0.7)', size: '12cqw' },
        { x: '86%', y: '28%', color: 'rgba(255, 150, 30, 0.75)', size: '14cqw' },
        { x: '94%', y: '43%', color: 'rgba(255, 150, 30, 0.6)', size: '10cqw' },
        { x: '45%', y: '42%', color: 'rgba(255, 140, 30, 0.5)', size: '8cqw' }
      ]
    },

    // 2. Dedektif Ofisi (Görsel 61 - Pencere Sola Çekildi & Lamba Eklendi)
    'dedektif': {
      dust: true, count: 110,
      beam: { xMin: 0.02, xMax: 0.50, yMin: 0.05, yMax: 0.85 }, // Sol Pencere
      lights: [{ x: '29%', y: '52%', color: 'rgba(255, 170, 50, 0.7)', size: '20cqw' }] // Masadaki Lamba
    },

    // 3. Han İç Mekan / Restoran (Görsel 68 - Tüm Ateşler & Toz Aktifleşti)
    'han': {
      dust: true, count: 80,
      beam: { xMin: 0.10, xMax: 0.75, yMin: 0.02, yMax: 0.35 }, // Üst Balkon
      lights: [
        { x: '5%', y: '58%', color: 'rgba(255, 140, 30, 0.65)', size: '12cqw' },
        { x: '21%', y: '33%', color: 'rgba(255, 140, 30, 0.65)', size: '12cqw' },
        { x: '31%', y: '35%', color: 'rgba(255, 140, 30, 0.65)', size: '12cqw' },
        { x: '42%', y: '33%', color: 'rgba(255, 140, 30, 0.65)', size: '12cqw' },
        { x: '65%', y: '44%', color: 'rgba(255, 140, 30, 0.65)', size: '12cqw' },
        { x: '68%', y: '34%', color: 'rgba(255, 140, 30, 0.65)', size: '12cqw' },
        { x: '98%', y: '84%', color: 'rgba(255, 140, 30, 0.75)', size: '14cqw' }
      ]
    },

    // 4. Değirmenci (Görsel 63 - Sağ Teraziye Toz Eklendi, Tabandaki Toz Temizlendi)
    'degirmenci': {
      dust: true, count: 120,
      beams: [
        { xMin: 0.25, xMax: 0.65, yMin: 0.20, yMax: 0.60 }, // Sol Pencereden Taş Üstüne
        { xMin: 0.65, xMax: 0.98, yMin: 0.20, yMax: 0.70 }  // Sağ Masa & Terazi Hizası
      ]
    },

    // 5. Gazeteci Odası (Görsel 64 - Tavan Işığı/Ateşi Eklendi)
    'gazeteci': {
      dust: true, count: 90,
      beam: { xMin: 0.40, xMax: 0.65, yMin: 0.20, yMax: 0.70 },
      lights: [{ x: '50%', y: '5%', color: 'rgba(255, 190, 100, 0.65)', size: '30cqw' }] // Tavandaki Ateş/Işık
    },

    // 6. Mezarlık (Görsel 73 - Mum Işıkları ve Toz Aktifleşti)
    'mezarlik': {
      dust: true, count: 90,
      beam: { xMin: 0.15, xMax: 0.82, yMin: 0.35, yMax: 0.90 },
      lights: [{ x: '27%', y: '78%', color: 'rgba(255, 150, 40, 0.75)', size: '16cqw' }] // Mumlar
    },

    // 7. Merkez Meydanı (Görsel 72 - Belirgin Baca Dumanı & Fırın Ateşi)
    'merkez': {
      smoke: true,
      lights: [{ x: '78%', y: '51%', color: 'rgba(255, 100, 20, 0.8)', size: '12cqw' }]
    },

    // 8. Cadı / Büyücü Odası (Görsel 60)
    'cadi': {
      dust: true, count: 110,
      beam: { xMin: 0.35, xMax: 0.75, yMin: 0.25, yMax: 0.88 }
    },

    // 9. Demirci Atölyesi (Görsel 62)
    'demirci': {
      sparks: true, count: 65,
      beam: { xMin: 0.60, xMax: 0.95, yMin: 0.10, yMax: 0.85 },
      lights: [{ x: '58%', y: '42%', color: 'rgba(255, 90, 10, 0.75)', size: '32cqw' }]
    },

    // 10. Nadire'nin Evi (Görsel 76 - Mükemmel Çalışan Düzen)
    'nadire_ev': {
      dust: true, count: 100,
      beam: { xMin: 0.22, xMax: 0.58, yMin: 0.30, yMax: 0.78 },
      lights: [{ x: '22%', y: '52%', color: 'rgba(255, 160, 40, 0.65)', size: '18cqw' }]
    },

    // 11. Muhtar Odası (Görsel 75)
    'muhtar': {
      dust: true, count: 100,
      beam: { xMin: 0.01, xMax: 0.78, yMin: 0.02, yMax: 0.98 }
    },

    // 12. Kilise İç Mekan (Görsel 69)
    'kilise': {
      dust: true, count: 120,
      beam: { xMin: 0.02, xMax: 0.98, yMin: 0.15, yMax: 0.95 }
    },

    // 13. Halit'in Evi İç Mekan (Görsel 67)
    'halit_ev': {
      dust: true, count: 100,
      beam: { xMin: 0.55, xMax: 0.98, yMin: 0.15, yMax: 0.90 }
    },

    // 14. Şifahane (Görsel 77)
    'sifahane': {
      dust: true, count: 100,
      beam: { xMin: 0.05, xMax: 0.62, yMin: 0.08, yMax: 0.95 }
    },

    // 15. Han Depo / Mahzen (Görsel 68)
    'han_depo': {
      dust: true, count: 110,
      beam: { xMin: 0.05, xMax: 0.70, yMin: 0.10, yMax: 0.85 }
    },

    // 16. Diğer Odalar & Kapılar (Düzeltildi)
    'cevdet_ev': { dust: true, count: 80, beam: { xMin: 0.20, xMax: 0.60, yMin: 0.15, yMax: 0.80 } },
    'halit_ev_kapi': {}, // Kapıda toz tamamen silindi
    'kilise_kapi': { dust: true, count: 50, beam: { xMin: 0.58, xMax: 0.88, yMin: 0.25, yMax: 0.88 } },
    'koy_giris': { dust: true, count: 60, beam: { xMin: 0.35, xMax: 0.98, yMin: 0.55, yMax: 0.95 } }
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

    // HASSAS MEKAN EŞLEŞTİRMESİ (En uzun ve spesifik ID önce kontrol edilir)
    let sortedKeys = Object.keys(roomVFXConfig).sort((a, b) => b.length - a.length);
    let configKey = sortedKeys.find(key => roomId === key || roomId.includes(key));
    let config = configKey ? roomVFXConfig[configKey] : null;

    if (!config) return;

    // A. YAVAŞ & SİNEMATİK PARILTI / ATEŞLER (Kırmızı Halkalar)
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

    // B. CANVAS PARÇACIK MOTORU (Toz, Kıvılcım & Duman)
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
        const beamsList = config.beams || [config.beam || { xMin: 0.1, xMax: 0.9, yMin: 0.1, yMax: 0.9 }];
        const count = config.count || 90;

        for (let i = 0; i < count; i++) {
          // Çoklu huzme varsa rastgele birini seç (ör. Değirmenci)
          const targetBeam = beamsList[Math.floor(Math.random() * beamsList.length)];

          const minX = canvas.width * targetBeam.xMin;
          const maxX = canvas.width * targetBeam.xMax;
          const minY = canvas.height * targetBeam.yMin;
          const maxY = canvas.height * targetBeam.yMax;

          const hue = 38 + Math.floor(Math.random() * 12); // Sıcak Gün Işığı Sarısı
          const sat = 60 + Math.floor(Math.random() * 25);
          const light = 70 + Math.floor(Math.random() * 15);

          particles.push({
            x: minX + Math.random() * (maxX - minX),
            y: minY + Math.random() * (maxY - minY),
            r: config.sparks ? Math.random() * 1.6 + 0.8 : Math.random() * 1.1 + 0.8,
            // HIZ YARI YARIYA DÜŞÜRÜLDÜ (Çok yavaş süzülüş)
            vx: (Math.random() - 0.5) * (config.sparks ? 0.20 : 0.04),
            vy: config.sparks ? -(Math.random() * 0.25 + 0.10) : (Math.random() - 0.5) * 0.03,
            alpha: Math.random() * 0.35 + 0.15,
            maxAlpha: Math.random() * 0.35 + 0.25,
            // YOK OLMA SÜRESİ 2 KATINA ÇIKARILDI (Çok yavaş nefes alma)
            fadeSpeed: Math.random() * 0.0015 + 0.0006,
            fadingIn: Math.random() > 0.5,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.003 + 0.0015,
            color: config.sparks ? 'rgba(255, 150, 40,' : `hsl(${hue}, ${sat}%, ${light}%,`,
            isSpark: !!config.sparks,
            bounds: { minX, maxX, minY, maxY }
          });
        }
      }

      // 2. Gri Alan Baca Dumanı (Merkez Meydanı)
      if (config.smoke) {
        for (let i = 0; i < 28; i++) {
          smokeParticles.push({
            x: canvas.width * 0.81 + (Math.random() - 0.5) * 16,
            y: canvas.height * 0.32 + Math.random() * 35,
            r: Math.random() * 12 + 6,
            vy: -(Math.random() * 0.18 + 0.08),
            vx: Math.random() * 0.10 + 0.02,
            alpha: Math.random() * 0.30 + 0.12,
            grow: Math.random() * 0.04 + 0.02
          });
        }
      }

      // ANİMASYON DÖNGÜSÜ (RENDER)
      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- A. BACA DUMANI RENDER ---
        smokeParticles.forEach(s => {
          s.y += s.vy;
          s.x += s.vx;
          s.r += s.grow;
          s.alpha -= 0.0008;

          if (s.alpha <= 0 || s.y < canvas.height * 0.05) {
            s.x = canvas.width * 0.81 + (Math.random() - 0.5) * 12;
            s.y = canvas.height * 0.32;
            s.r = Math.random() * 6 + 5;
            s.alpha = Math.random() * 0.30 + 0.12;
          }

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 180, 170, ${s.alpha})`;
          ctx.fill();
        });

        // --- B. TOZ RENDER ---
        particles.forEach(p => {
          p.wobble += p.wobbleSpeed;
          p.x += p.vx + Math.sin(p.wobble) * 0.05;
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
  }

  return { load: initRoomVFX, clear: cleanup };
})();