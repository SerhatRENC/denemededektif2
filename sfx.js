/* ============================================================
   AMBİANCE & SFX ENGINE - Sislidere Köyü Davası
   ============================================================ */
const SFX = (function () {
  let currentAmbience = null;
  let currentRoomId = null;

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

  function playAmbience(roomId) {
    if (!roomId || currentRoomId === roomId) return;
    currentRoomId = roomId;

    let soundFile = null;
    for (let key in audioMap) {
      if (roomId.includes(key)) {
        soundFile = audioMap[key];
        break;
      }
    }

    // Eski ses yumuşakça fade-out olsun
    if (currentAmbience) {
      let oldAudio = currentAmbience;
      let fadeOut = setInterval(() => {
        if (oldAudio.volume > 0.05) {
          oldAudio.volume -= 0.05;
        } else {
          oldAudio.pause();
          clearInterval(fadeOut);
        }
      }, 50);
    }

    // Yeni oda için ses varsa yükle ve fade-in yap
    if (soundFile) {
      currentAmbience = new Audio(soundFile);
      currentAmbience.loop = true;
      currentAmbience.volume = 0;
      currentAmbience.play().then(() => {
        let fadeIn = setInterval(() => {
          if (currentAmbience.volume < 0.35) {
            currentAmbience.volume += 0.03;
          } else {
            clearInterval(fadeIn);
          }
        }, 50);
      }).catch(() => {});
    }
  }

  return { play: playAmbience };
})();