/* ============================================================
   SISLIDERE DAVASI — MODÜL 7: KOŞUL / OLAY / KAPI MOTORU
   Gün JSON'larındaki "gates", "events", "hotspotRules", "sleepRequires",
   "characters" alanlarını yorumlar. Yeni gün yazmak = sadece JSON yazmak.

   KOŞUL (cond) alanları — hepsi isteğe bağlı, hepsi birden sağlanmalı:
     state: "X" | ["X","Y"]     gün durumu bunlardan biri
     notState: ...              gün durumu bunlardan biri değil
     flag: "a" | ["a","b"]      hepsi true
     notFlag: ...               hiçbiri true değil
     hasItem: ...               hepsi envanterde
     notItem: ...               hiçbiri envanterde değil
   Oda listelerinde "@grup" yazılırsa game_config.json > roomGroups içindeki grup kastedilir.
   ============================================================ */

function asArr(v) { return v == null ? [] : [].concat(v); }

function checkCond(c) {
  if (!c) return true;
  const st = getDayState();
  if (c.state && !asArr(c.state).includes(st)) return false;
  if (c.notState && asArr(c.notState).includes(st)) return false;
  if (c.flag && !asArr(c.flag).every(f => gameState.getFlag(f))) return false;
  if (c.notFlag && asArr(c.notFlag).some(f => gameState.getFlag(f))) return false;
  if (c.hasItem && !asArr(c.hasItem).every(i => inventory.includes(i))) return false;
  if (c.notItem && asArr(c.notItem).some(i => inventory.includes(i))) return false;
  return true;
}

function matchRooms(spec, room) {
  return asArr(spec).some(s => {
    if (typeof s !== 'string') return false;
    if (s[0] === '@') return ((CASE && CASE.roomGroups && CASE.roomGroups[s.slice(1)]) || []).includes(room);
    return s === room;
  });
}

/* ---------- KAPILAR: hotspot ve harita aynı fonksiyonu kullanır ---------- */
function canNavigate(target) {
  const day = CURRENT_DAY_DATA || {};
  const gates = day.gates || [];
  if (!target || !gates.length || !checkCond(day.gatesIf)) return { ok: true };

  for (const g of gates) {
    if (!checkCond(g.if)) continue;
    if (g.state && !asArr(g.state).includes(getDayState())) continue;
    if (g.from && !matchRooms(g.from, currentRoom)) continue;
    if (g.allow) {
      if (matchRooms(g.allow, target)) continue;
      return { ok: false, msg: g.msg };
    }
    if (g.toNot && matchRooms(g.toNot, target)) continue;
    if (g.to && !matchRooms(g.to, target)) continue;
    if (g.setState) setDayState(g.setState);
    if (g.msg) return { ok: false, msg: g.msg };
  }
  return { ok: true };
}

/* Belirli koşulda bazı hotspot'ları gizler (gün JSON'unda "hotspotRules") */
function isHotspotHidden(h) {
  const rules = CURRENT_DAY_DATA && CURRENT_DAY_DATA.hotspotRules;
  if (!rules) return false;
  return rules.some(r => {
    if (r.room && !matchRooms(r.room, currentRoom)) return false;
    if (r.target && !(h.target && matchRooms(r.target, h.target))) return false;
    if (r.targetNot && !(h.target && !matchRooms(r.targetNot, h.target))) return false;
    return checkCond(r.hideIf);
  });
}

/* Uyumadan önce gün JSON'undaki "sleepRequires" kontrol edilir. Eksik varsa mesajı döndürür. */
function checkSleepRequirements() {
  const list = (CURRENT_DAY_DATA && CURRENT_DAY_DATA.sleepRequires) || [];
  for (const r of list) {
    if (!checkCond(r.need)) return r.msg || 'Dedektif: Uyumadan önce yapmam gereken şeyler var.';
  }
  return null;
}

/* ---------- OLAYLAR ---------- */
function openRegisteredModal(name) {
  const registry = {
    polaroidIslenmis: typeof openPolaroidIslenmisModal === 'function' ? openPolaroidIslenmisModal : null,
    cevdetNot: typeof openCevdetNotModal === 'function' ? openCevdetNotModal : null,
    anahtar: typeof showAnahtarAcquisitionModal === 'function' ? showAnahtarAcquisitionModal : null
  };
  if (registry[name]) registry[name]();
  else console.warn('Tanımsız modal:', name);
}

/* Eylemler: setState, setFlag, giveItem, removeItem, delay, render, subtitle, modal */
async function runActions(list) {
  for (const a of list) {
    if (a.setState) setDayState(a.setState);
    if (a.setFlag) asArr(a.setFlag).forEach(f => gameState.setFlag(f, true));
    if (a.giveItem) {
      if (!inventory.includes(a.giveItem)) { inventory.push(a.giveItem); saveInventory(); }
      renderInventory();
    }
    if (a.removeItem) {
      inventory = inventory.filter(i => i !== a.removeItem);
      saveInventory();
      renderInventory();
    }
    if (a.delay) await new Promise(r => setTimeout(r, a.delay));
    if (a.render) await renderRoom();
    if (a.subtitle) showCustomSubtitle(a.subtitle, true);
    if (a.modal) openRegisteredModal(a.modal);
  }
}

/* events[tip][anahtar] = [ { if, do:[...], stop } ]. Koşulu tutan kurallar sırayla çalışır;
   "stop": true olan kural çalışınca sonrakilere bakılmaz. En az bir kural çalıştıysa true döner. */
async function runEvents(type, key) {
  const rules = CURRENT_DAY_DATA && CURRENT_DAY_DATA.events && CURRENT_DAY_DATA.events[type] && CURRENT_DAY_DATA.events[type][key];
  if (!rules || !rules.length) return false;
  let ran = false;
  for (const r of rules) {
    if (!checkCond(r.if)) continue;
    ran = true;
    await runActions(r.do || []);
    if (r.stop) break;
  }
  return ran;
}
