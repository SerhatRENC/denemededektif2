/* ============================================================
   SISLIDERE DAVASI — MODÜL 3: DİYALOG & KARAKTER YÖNETİMİ
   Günlük farklar (karakter değişimi, diyalog sonu olayları) artık
   gün JSON'unda: "characters" ve "events.dialogEnd".
   ============================================================ */

/* Odanın o günkü karakteri: game_config "characters" + gün JSON'u "characters" birleşimi.
   Gün JSON'unda oda için null yazılırsa o gün karakter yoktur; "showIf" koşulu varsa ona bakılır. */
function getRoomCharacter(roomKey) {
  const base = CASE && CASE.characters && CASE.characters[roomKey];
  const dayChars = CURRENT_DAY_DATA && CURRENT_DAY_DATA.characters;
  let ch = base ? JSON.parse(JSON.stringify(base)) : null;
  if (dayChars && Object.prototype.hasOwnProperty.call(dayChars, roomKey)) {
    const ov = dayChars[roomKey];
    if (ov === null) return null;
    ch = Object.assign(ch || {}, JSON.parse(JSON.stringify(ov)));
  }
  if (!ch) return null;
  if (ch.showIf && !checkCond(ch.showIf)) return null;
  return ch;
}

function updateCharacterSprite(charImg, line, defaultPath) {
  if (!charImg || !line) return;

  // Konuşan kişi dedektifse, sahnedeki NPC'nin duygu görselini değiştirme
  if (/^dedektif$/i.test((line.speaker || '').trim())) {
    if (defaultPath) charImg.src = defaultPath;
    return;
  }

  if (line.image) {
    charImg.src = line.image;
    return;
  }

  const emotion = line.emotion ? line.emotion.toLowerCase().trim() : 'normal';

  let base = '';
  let ext = '.webp';

  if (defaultPath) {
    const lastDot = defaultPath.lastIndexOf('.');
    if (lastDot !== -1) {
      base = defaultPath.substring(0, lastDot);
      ext = defaultPath.substring(lastDot);
    } else {
      base = defaultPath;
    }
  } else if (line.speaker) {
    const speakerKey = line.speaker
      .toLowerCase()
      .trim()
      .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
    base = `assets/karakterler/${speakerKey}`;
  }

  if (!base) return;

  const fallbackSrc = defaultPath || `${base}${ext}`;
  let targetSrc = fallbackSrc;

  if (emotion && emotion !== 'normal' && emotion !== 'netral') {
    targetSrc = `${base}_${emotion}${ext}`;
  }

  charImg.onerror = function () {
    this.onerror = null;
    this.src = fallbackSrc;
  };

  charImg.src = targetSrc;
}

function renderCharacter() {
  setUIElementsVisible(true);
  const ch = getRoomCharacter(currentRoom);
  if (!ch) return;
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;

  if (ch.clickableImage) renderClickableCharacter(ch, stage);
  else renderSceneCharacter(ch, stage);
}

function renderClickableCharacter(ch, stage) {
  const glow = document.createElement('img');
  glow.id = 'roomClickableGlow';
  glow.className = 'room-clickable-glow';
  glow.src = ch.clickableImage;
  stage.appendChild(glow);

  const area = ch.clickableArea || { x: '40%', y: '28%', w: '22%', h: '58%' };
  const hit = document.createElement('div');
  hit.id = 'roomClickableHit';
  hit.className = 'room-clickable-hit';
  hit.style.left = area.x; hit.style.top = area.y;
  hit.style.width = area.w; hit.style.height = area.h;
  hit.onclick = (e) => { 
    if (e) e.stopPropagation();
    if (!dialogueActive) startDialogueFromClickable(ch); 
  };
  stage.appendChild(hit);
}

function startDialogueFromClickable(ch) {
  document.getElementById('roomClickableGlow')?.remove();
  document.getElementById('roomClickableHit')?.remove();
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (stage) stage.classList.add('dialog-active');
  renderSceneCharacter(ch, stage);
  toggleCharacterLine(ch);
}

function renderSceneCharacter(ch, stage) {
  const el = document.createElement('img');
  el.id = 'sceneCharacter';
  el.className = 'scene-character';
  el.src = ch.image;
  el.style.bottom = ch.yOffset || '0%';
  el.onclick = (e) => { 
    if (e) e.stopPropagation();
    if (!calibMode) toggleCharacterLine(ch); 
  };
  stage.appendChild(el);
}

function getDialogForRoom(roomKey, defaultDialog) {
  return (CURRENT_DAY_DATA && CURRENT_DAY_DATA.dialogs && CURRENT_DAY_DATA.dialogs[roomKey]) || defaultDialog;
}

function toggleCharacterLine(ch) {
  document.getElementById('sceneCharacter')?.remove();
  // O gün için diyalog yazılmamışsa oyuncuya placeholder yerine nötr bir satır gösterilir
  const dialog = getDialogForRoom(currentRoom, null) ||
    [{ speaker: ch.name || '', text: ch.text || '…', emotion: 'normal' }];
  startOzelDialog(dialog, ch.image, () => finishDialog(currentRoom));
}

/* Diyalog bitince gün JSON'undaki events.dialogEnd[oda] çalışır; tanımlı değilse sadece odayı yeniler */
async function finishDialog(roomKey) {
  const ran = await runEvents('dialogEnd', roomKey);
  if (!ran) renderRoom();
}

/* Açık bir özel diyalog varsa temiz şekilde iptal eder (oda yenilenirken çağrılır) */
function cancelActiveDialog() {
  if (activeDialogCancel) {
    const f = activeDialogCancel;
    activeDialogCancel = null;
    f();
  }
}

function preloadDialogImages(dialogList, defaultPath) {
  if (!dialogList || !Array.isArray(dialogList)) return;

  const uniqueUrls = new Set();

  dialogList.forEach(item => {
    let targetSrc = item.image;
    if (!targetSrc) {
      const emotion = item.emotion ? item.emotion.toLowerCase().trim() : 'normal';
      let base = '';
      let ext = '.webp';

      if (defaultPath) {
        const lastDot = defaultPath.lastIndexOf('.');
        if (lastDot !== -1) {
          base = defaultPath.substring(0, lastDot);
          ext = defaultPath.substring(lastDot);
        } else {
          base = defaultPath;
        }
      } else if (item.speaker) {
        const speakerKey = item.speaker
          .toLowerCase()
          .trim()
          .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ğ/g, 'g')
          .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
        base = `assets/karakterler/${speakerKey}`;
      }

      if (base) {
        const fallbackSrc = defaultPath || `${base}${ext}`;
        targetSrc = (emotion && emotion !== 'normal' && emotion !== 'netral') ? `${base}_${emotion}${ext}` : fallbackSrc;
      }
    }

    if (targetSrc && !preloadedImages.has(targetSrc)) {
      uniqueUrls.add(targetSrc);
    }
  });

  uniqueUrls.forEach(url => preloadImage(url));
}

function startOzelDialog(dialogList, charImgPath, onCompleteCallback) {
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;

  cancelActiveDialog();
  preloadDialogImages(dialogList, charImgPath);

  if (!dialogList || !Array.isArray(dialogList) || dialogList.length === 0) {
    stage.classList.remove('dialog-active');
    setUIElementsVisible(true);
    dialogueActive = false;
    if (onCompleteCallback) onCompleteCallback();
    return;
  }

  dialogueActive = true;
  stage.classList.add('dialog-active');
  setUIElementsVisible(false);

  let charImg = document.getElementById('tempDialogChar');
  if (!charImg) {
    charImg = document.createElement('img');
    charImg.id = 'tempDialogChar';
    charImg.className = 'scene-character talking';
    stage.appendChild(charImg);
  }

  const conf = getRoomCharacter(currentRoom);
  charImg.style.bottom = (conf && conf.yOffset) || '0%';
  if (charImgPath) charImg.src = charImgPath;

  let index = 0;
  let listenerTimer = null;

  function temizle() {
    clearTimeout(listenerTimer);
    stage.removeEventListener('click', sonrakiSatir);
    charImg.remove();
    document.getElementById('sceneSubtitle')?.remove();
    stage.classList.remove('dialog-active');
    dialogueActive = false;
    activeDialogCancel = null;
  }

  function sonrakiSatir(e) {
    if (e) e.stopPropagation();
    if (index < dialogList.length) {
      const item = dialogList[index];
      let sub = document.getElementById('sceneSubtitle');
      if (!sub) {
        sub = document.createElement('div');
        sub.id = 'sceneSubtitle';
        sub.className = 'scene-subtitle';
        stage.appendChild(sub);
      }
      sub.innerHTML = `<div class="scene-subtitle-name">${item.speaker}</div><div class="scene-subtitle-text">${item.text}</div>`;
      updateCharacterSprite(charImg, item, charImgPath);
      index++;
      return;
    }
    temizle();
    setUIElementsVisible(true);
    if (onCompleteCallback) onCompleteCallback();
  }

  activeDialogCancel = temizle;
  sonrakiSatir();
  listenerTimer = setTimeout(() => stage.addEventListener('click', sonrakiSatir), 100);
}

function showCustomSubtitle(text, clickToDismiss = false) {
  const stage = document.getElementById('stage') || document.getElementById('gameStage');
  if (!stage) return;
  
  setUIElementsVisible(false);
  document.getElementById('sceneSubtitle')?.remove();

  const sub = document.createElement('div');
  sub.id = 'sceneSubtitle';
  sub.className = 'scene-subtitle';
  sub.style.zIndex = '99999';
  sub.innerHTML = `<div class="scene-subtitle-text">${text}</div>`;
  stage.appendChild(sub);

  const kaldir = () => {
    sub.remove();
    setUIElementsVisible(true);
  };

  clearTimeout(subtitleTimer);
  if (!clickToDismiss) subtitleTimer = setTimeout(kaldir, 5000);

  sub.onclick = (e) => {
    e.stopPropagation();
    clearTimeout(subtitleTimer);
    kaldir();
  };
}