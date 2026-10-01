/* ============================================================
   AMBİANCE & SFX ENGINE - Sislidere Köyü Davası
   ============================================================ */
const SFX = (function () {
  let currentAmbience = null;
  let currentRoomId = null;
  let currentFile = null;

  // Odalara özel ses haritası
  const audioMap = {
    'dedektif': 'assets/ses/ofis_ambiance.mp3',
    'ofis': 'assets/ses/ofis_ambiance.mp3',
    'merkez': 'assets/ses/koy_dis_ambiance.mp3',
    'koy': 'assets/ses/koy_dis_ambiance.mp3',
    'araba': 'assets/ses/at_arabasi_loop.mp3',
    'demirci': 'assets/ses/demirci_ambiance.mp3',
    'sifahane': 'assets/ses/soba_ve_ic_mekan.mp3',
    'nadire_ev': 'assets/ses/soba_ve_ic_mekan.mp3',
    'halit_ev': 'assets/ses/saat_ve_ic_mekan.mp3',
    'mezarlik': 'assets/ses/gece_ruzgar_ambiance.mp3',
    'kilise': 'assets/ses/kilise_eko_ambiance.mp3'
  };

  function fadeOut(audio) {
    const iv = setInterval(() => {
      if (audio.volume > 0.05) {
        audio.volume = Math.max(0, audio.volume - 0.05);
      } else {
        audio.pause();
        clearInterval(iv);
      }
    }, 50);
  }

  function playAmbience(roomId) {
    if (!roomId || currentRoomId === roomId) return;

    let soundFile = null;
    for (let key in audioMap) {
      if (roomId.includes(key)) {
        soundFile = audioMap[key];
        break;
      }
    }

    // Aynı ses dosyası zaten çalıyorsa kesmeden devam et
    if (soundFile && soundFile === currentFile && currentAmbience) {
      currentRoomId = roomId;
      return;
    }
    currentRoomId = roomId;

    // Eski ses yumuşakça kapansın
    if (currentAmbience) {
      fadeOut(currentAmbience);
      currentAmbience = null;
      currentFile = null;
    }

    // Yeni oda için ses varsa yükle ve fade-in yap
    if (soundFile) {
      const audio = new Audio(soundFile);
      audio.loop = true;
      audio.volume = 0;
      currentAmbience = audio;
      currentFile = soundFile;
      audio.play().then(() => {
        const fadeIn = setInterval(() => {
          if (audio !== currentAmbience) { clearInterval(fadeIn); return; }
          if (audio.volume < 0.35) {
            audio.volume = Math.min(0.35, audio.volume + 0.03);
          } else {
            clearInterval(fadeIn);
          }
        }, 50);
      }).catch((err) => {
        // Tarayıcı otomatik oynatmayı engellediyse bir sonraki odada/çağrıda tekrar denensin
        if (err && err.name === 'NotAllowedError') {
          if (currentAmbience === audio) { currentAmbience = null; currentFile = null; }
          currentRoomId = null;
        }
      });
    }
  }

  // Sesi tamamen kapat (ör. kapalı kapı ekranı)
  function stop() {
    if (currentAmbience) fadeOut(currentAmbience);
    currentAmbience = null;
    currentFile = null;
    currentRoomId = null;
  }

  // Çalmayı bırakmadan "bu oda için henüz çalmadım" durumuna döner (intro sonrası vb.)
  function reset() {
    currentRoomId = null;
  }

  return { play: playAmbience, stop, reset };
})();
