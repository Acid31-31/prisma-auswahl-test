(() => {
  const E = window.PrismaEngine;
  if (!E?.entResolve) return;

  const {
    fmtDe, defaultEntlastungEntries, entResolve, ENT_T_MIN, ENT_T_MAX,
  } = E;

  const STORE = "prisma-web-entlastung";
  const dickeOpts = ["1", "1,5", "2", "2,5", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  const el = {
    t: document.getElementById("entT"),
    hero: document.getElementById("entHero"),
    hint: document.getElementById("entHint"),
    label: document.getElementById("entLabel"),
    table: document.getElementById("entRows"),
    bar: document.getElementById("entBar"),
  };
  if (!el.t) return;

  let entries = loadEntries();

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
    return defaultEntlastungEntries();
  }

  el.t.innerHTML = dickeOpts.map(o => `<option value="${o}">${o}</option>`).join("");
  el.t.value = "3";

  function update() {
    const t = parseDe(el.t.value);
    renderTable();
    if (!(t > 0)) {
      set("—", "Materialstärke 1–12 mm wählen.", true);
      return;
    }
    const r = entResolve(entries, t);
    if (!r.ok) {
      set("nicht vorgesehen", r.hint, true);
      return;
    }
    set(`${fmtDe(r.width)} mm`, r.hint, false);
  }

  function set(title, hint, fail) {
    el.hero.textContent = title;
    el.hint.textContent = hint;
    el.label.textContent = fail ? "Status" : "Langloch-Breite";
    el.hero.className = fail ? "hero-prisma fail" : "hero-prisma";
    el.bar?.classList.toggle("fail", fail);
    el.bar?.classList.toggle("ok", !fail);
  }

  function renderTable() {
    // Anzeige: Standardstufen + Notizen
    const rows = [];
    for (let t = ENT_T_MIN; t <= ENT_T_MAX; t++) {
      const r = entResolve(entries, t);
      if (r.ok) rows.push({ t, w: r.width });
    }
    el.table.innerHTML = rows.map(r =>
      `<tr><td>${fmtDe(r.t)}</td><td>${fmtDe(r.w)}</td></tr>`).join("");
  }

  el.t.addEventListener("change", update);
  el.t.addEventListener("input", update);

  document.getElementById("entReset")?.addEventListener("click", () => {
    entries = defaultEntlastungEntries();
    try { localStorage.removeItem(STORE); } catch (_) { /* */ }
    update();
  });

  update();
})();
