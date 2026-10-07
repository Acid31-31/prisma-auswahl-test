(() => {
  const E = window.PrismaEngine;
  if (!E?.bohrResolve) return;

  const {
    fmtDe, GEWINDE, defaultBohrungEntries, bohrResolve, bohrMinLaserDiameter,
    bohrThresholdTable, gewindeCore, BOHR_T_MIN, BOHR_T_MAX,
  } = E;

  const STORE = "prisma-web-bohrung";
  const dickeOpts = ["0,5", "0,75", "1", "1,25", "1,5", "2", "2,5", "3", "4", "5", "6", "8", "10", "12", "15", "16", "18", "20", "22", "25"];
  const normalOpts = ["2", "2,5", "3", "3,3", "4", "4,2", "5", "5,1", "6", "6,8", "8", "8,5", "9", "10", "10,2", "11", "12", "14", "14,2", "15", "16", "17", "17,5", "18", "20", "22", "24", "25"];

  const el = {
    t: document.getElementById("bohrT"),
    mode: document.getElementById("bohrMode"),
    gewinde: document.getElementById("bohrGewinde"),
    normal: document.getElementById("bohrNormal"),
    dia: document.getElementById("bohrDia"),
    hero: document.getElementById("bohrHero"),
    hint: document.getElementById("bohrHint"),
    table: document.getElementById("bohrThresh"),
    notes: document.getElementById("bohrNotes"),
    gewindeWrap: document.getElementById("bohrGewindeWrap"),
    normalWrap: document.getElementById("bohrNormalWrap"),
  };
  if (!el.t) return;

  let entries = loadEntries();
  let syncing = false;
  let activeGewinde = null;

  function parseDe(text) {
    if (!text || !String(text).trim()) return null;
    const n = Number(String(text).trim().replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p) && p.length) return p;
      }
    } catch (_) { /* ignore */ }
    return defaultBohrungEntries();
  }

  function fill(sel, opts, def) {
    sel.innerHTML = opts.map(o => `<option value="${o}">${o}</option>`).join("");
    if (def) sel.value = def;
  }

  fill(el.t, dickeOpts, "2");
  el.gewinde.innerHTML = `<option value="">—</option>` + GEWINDE.map(([l]) => `<option value="${l}">${l}</option>`).join("");
  fill(el.normal, ["", ...normalOpts], "");
  el.normal.querySelector('option[value=""]').textContent = "—";

  function setMode() {
    const gew = el.mode.value === "gewinde";
    el.gewindeWrap.hidden = !gew;
    el.normalWrap.hidden = gew;
    if (gew) {
      el.normal.value = "";
    } else {
      el.gewinde.value = "";
      activeGewinde = null;
    }
    update();
  }

  function applyGewinde() {
    if (syncing) return;
    const g = gewindeCore(el.gewinde.value);
    if (!g) return;
    syncing = true;
    activeGewinde = g.label;
    el.mode.value = "gewinde";
    el.normal.value = "";
    el.dia.value = fmtDe(g.core);
    el.gewindeWrap.hidden = false;
    el.normalWrap.hidden = true;
    syncing = false;
    update();
  }

  function applyNormal() {
    if (syncing) return;
    const d = parseDe(el.normal.value);
    if (!(d > 0)) return;
    syncing = true;
    activeGewinde = null;
    el.mode.value = "normal";
    el.gewinde.value = "";
    el.dia.value = fmtDe(d);
    el.gewindeWrap.hidden = true;
    el.normalWrap.hidden = false;
    syncing = false;
    update();
  }

  function update() {
    const t = parseDe(el.t.value);
    renderTables();
    if (!(t > 0)) {
      el.hero.textContent = "—";
      el.hero.className = "hero-prisma";
      el.hint.textContent = "Materialstärke wählen.";
      return;
    }
    if (t < BOHR_T_MIN || t > BOHR_T_MAX) {
      el.hero.textContent = "außerhalb";
      el.hero.className = "hero-prisma fail";
      el.hint.textContent = `Dicke bitte zwischen ${fmtDe(BOHR_T_MIN)} und ${fmtDe(BOHR_T_MAX)} mm.`;
      return;
    }

    const th = bohrMinLaserDiameter(entries, t);
    const dia = parseDe(el.dia.value);
    if (!(dia > 0)) {
      el.hero.textContent = `ab Ø ${fmtDe(th)}`;
      el.hero.className = "hero-prisma";
      el.hint.textContent = `${fmtDe(t)} mm: ab diesem Ø Lasern. Gewinde oder Normalbohrung wählen.`;
      return;
    }

    const r = bohrResolve(entries, t, dia);
    let hint = activeGewinde
      ? `${activeGewinde} (Ø ${fmtDe(dia)}) · ${r.hint}`
      : `Normalbohrung Ø ${fmtDe(dia)} · ${r.hint}`;
    el.hero.textContent = r.action === "Laesern" ? "Lasern" : "Körnen";
    el.hero.className = r.action === "Laesern" ? "hero-prisma" : "hero-prisma fail";
    el.hint.textContent = hint;
  }

  function renderTables() {
    const rows = bohrThresholdTable(entries, 0.5);
    el.table.innerHTML = rows.map(r =>
      `<tr><td>${fmtDe(r.t)}</td><td>${fmtDe(r.d)}</td></tr>`).join("");
    el.notes.innerHTML = entries.map(e =>
      `<tr><td>${fmtDe(e.t)}</td><td>${fmtDe(e.d)}</td><td>${e.a === "Laesern" ? "Lasern" : "Körnen"}</td></tr>`).join("");
  }

  el.mode.addEventListener("change", setMode);
  el.t.addEventListener("change", update);
  el.gewinde.addEventListener("change", applyGewinde);
  el.normal.addEventListener("change", applyNormal);
  el.normal.addEventListener("blur", applyNormal);
  el.dia.addEventListener("input", update);

  document.getElementById("bohrReset")?.addEventListener("click", () => {
    entries = defaultBohrungEntries();
    try { localStorage.removeItem(STORE); } catch (_) { /* */ }
    update();
  });

  setMode();
  update();
})();
