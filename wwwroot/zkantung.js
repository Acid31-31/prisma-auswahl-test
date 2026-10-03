(() => {
  const E = window.PrismaEngine;
  if (!E?.evaluateZKantung) return;

  const {
    evaluateZKantung, fmtDe, ZK_LIMITS,
  } = E;

  const dickeOpts = ["0,5", "0,75", "1", "1,25", "1,5", "2", "2,5", "3", "4", "5", "6", "8", "10", "12"];
  const massOpts = ["8", "10", "12", "15", "18", "20", "22", "22,5", "25", "28", "30", "35", "40", "45", "50", "55", "60", "65", "70", "80", "100"];
  const winkelOpts = ["30", "45", "60", "75", "90", "105", "120", "135", "150"];

  const el = {
    t: document.getElementById("zkT"),
    s1: document.getElementById("zkS1"),
    steg: document.getElementById("zkSteg"),
    s2: document.getElementById("zkS2"),
    w1: document.getElementById("zkW1"),
    w2: document.getElementById("zkW2"),
    hero: document.getElementById("zkHero"),
    hint: document.getElementById("zkHint"),
    drawHint: document.getElementById("zkDrawHint"),
    tbody: document.getElementById("zkRows"),
    canvas: document.getElementById("zkCanvas"),
  };

  if (!el.t || !el.canvas) return;

  let results = [];
  let activeKey = null;

  function parseDe(text) {
    if (!text || !String(text).trim()) return null;
    const n = Number(String(text).trim().replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function fillSelect(sel, opts, def) {
    sel.innerHTML = opts.map(o => `<option value="${o}">${o}</option>`).join("");
    if (def) sel.value = def;
  }
  function fillDatalist(id, opts) {
    const dl = document.getElementById(id);
    if (!dl) return;
    dl.innerHTML = opts.map(o => `<option value="${o}"></option>`).join("");
  }

  fillSelect(el.t, dickeOpts, "2");
  fillDatalist("zkMassList", massOpts);
  fillDatalist("zkWinkelList", winkelOpts);
  el.s1.value = "20";
  el.steg.value = "30";
  el.s2.value = "20";
  el.w1.value = "90";
  el.w2.value = "90";

  function readInputs() {
    const t = parseDe(el.t.value);
    const s1 = parseDe(el.s1.value);
    const steg = parseDe(el.steg.value);
    const s2 = parseDe(el.s2.value);
    const w1 = parseDe(el.w1.value);
    const w2 = parseDe(el.w2.value);
    return { t, s1, steg, s2, w1, w2 };
  }

  function update() {
    const { t, s1, steg, s2, w1, w2 } = readInputs();
    const L = ZK_LIMITS;
    if (t == null || s1 == null || steg == null || s2 == null || w1 == null || w2 == null) {
      results = [];
      activeKey = null;
      el.hero.textContent = "—";
      el.hint.textContent = "Alle Maße setzen — Auswertung läuft automatisch.";
      el.drawHint.textContent = "Maße eingeben.";
      el.tbody.innerHTML = "";
      draw(null);
      return;
    }
    if (t < L.tMin || t > L.tMax || s1 < L.LMin || steg < L.LMin || s2 < L.LMin
      || w1 < L.aMin || w2 < L.aMin || w1 > L.aMax || w2 > L.aMax) {
      results = [];
      activeKey = null;
      el.hero.textContent = "ungültig";
      el.hint.textContent = `Bereiche: t ${fmtDe(L.tMin)}…${fmtDe(L.tMax)} · Längen ${L.LMin}…${L.LMax} · Winkel ${L.aMin}…${L.aMax}°`;
      el.tbody.innerHTML = "";
      draw(null);
      return;
    }

    results = evaluateZKantung(t, s1, steg, s2, w1, w2);
    const best = results.find(r => r.possible) || null;
    activeKey = best?.die.key || null;

    if (!best) {
      el.hero.textContent = "kein Prisma";
      el.hero.className = "hero-prisma fail";
      el.hint.textContent = `t=${fmtDe(t)} · ${fmtDe(s1)}/${fmtDe(w1)}° · Steg ${fmtDe(steg)} · ${fmtDe(s2)}/${fmtDe(w2)}° — kein Werkzeug möglich.`;
      el.drawHint.textContent = "Geometrie/Dicke ändern — Auswertung automatisch.";
    } else {
      el.hero.textContent = best.die.label;
      el.hero.className = "hero-prisma";
      const ok = results.filter(r => r.possible).map(r => r.die.label);
      el.hint.textContent = `Automatisch: ${ok.join(" · ")} · t=${fmtDe(t)} · Steg ${fmtDe(steg)}`;
      el.drawHint.textContent = `${best.die.label} an beiden Knicken (V=${fmtDe(best.opening)}). Liste tippen zum Vergleich.`;
    }

    el.tbody.innerHTML = results.map(r => {
      const sel = r.die.key === activeKey ? " class=\"sel\"" : "";
      const st = r.possible
        ? (String(r.ergebnis).includes("Dicke") ? "warn" : "ok")
        : "fail";
      return `<tr data-key="${r.die.key}"${sel}>
        <td>${r.die.label}</td>
        <td>${r.minSchenkel != null ? fmtDe(r.minSchenkel) : "—"}</td>
        <td>${r.minSteg != null ? fmtDe(r.minSteg) : "—"}</td>
        <td class="${st}">${r.ergebnis}</td>
      </tr>`;
    }).join("");

    draw(best || (activeKey ? results.find(r => r.die.key === activeKey) : null));
  }

  function draw(sel) {
    const c = el.canvas;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const cssW = c.clientWidth || 600;
    const cssH = c.clientHeight || 340;
    c.width = Math.floor(cssW * dpr);
    c.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const { t, s1, steg, s2, w1, w2 } = readInputs();
    if (t == null || s1 == null || steg == null || s2 == null || w1 == null || w2 == null) return;

    const deg = Math.PI / 180;
    const j1 = { x: 0, y: 0 };
    const j2 = { x: steg, y: 0 };
    const e1 = { x: j1.x + s1 * Math.cos(w1 * deg), y: j1.y - s1 * Math.sin(w1 * deg) };
    const e2 = { x: j2.x + s2 * Math.cos((180 - w2) * deg), y: j2.y + s2 * Math.sin((180 - w2) * deg) };
    const pts = [e1, j1, j2, e2];
    const minX = Math.min(...pts.map(p => p.x));
    const maxX = Math.max(...pts.map(p => p.x));
    const minY = Math.min(...pts.map(p => p.y));
    const maxY = Math.max(...pts.map(p => p.y));
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const openMm = sel?.opening || 0;
    const pad = Math.min(140, Math.max(64, 56 + openMm * 0.55));
    const scale = Math.min((cssW - 2 * pad) / spanX, (cssH - 2 * pad) / spanY) * 0.82;
    const sheet = Math.max(3, Math.min(28, t * scale * 0.75));
    const map = (p) => ({
      x: pad + (p.x - minX) * scale + ((cssW - 2 * pad) - spanX * scale) / 2,
      y: pad + (p.y - minY) * scale + ((cssH - 2 * pad) - spanY * scale) / 2,
    });
    const mE1 = map(e1), mJ1 = map(j1), mJ2 = map(j2), mE2 = map(e2);
    const ok = !!sel?.possible;
    const accent = ok ? "#31c95b" : "#ff7a7a";
    const dieBlue = "#1A3D66";
    const dieFill = "rgba(26,61,102,0.82)";

    function norm(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx / len, y: dy / len };
    }
    function drawDie(corner, legA, legB, angleDeg, result) {
      if (!result) return;
      const a = norm(corner, { x: corner.x + legA.x, y: corner.y + legA.y });
      // legA/legB already unit from caller
      const aa = legA, bb = legB;
      let ix = aa.x + bb.x, iy = aa.y + bb.y;
      const il = Math.hypot(ix, iy);
      if (il < 1e-6) return;
      ix /= il; iy /= il;
      const ox = -ix, oy = -iy;
      const vOpen = result.opening || 16;
      const bodyMm = result.die.body || vOpen * 1.25;
      const openingPx = Math.min(320, Math.max(14, vOpen * scale));
      const half = Math.max(0.18, (Math.min(160, Math.max(20, angleDeg)) * Math.PI) / 360);
      let depthPx = (openingPx * 0.5) / Math.tan(half);
      depthPx = Math.min(openingPx * 1.35, Math.max(openingPx * 0.35, depthPx));
      const nest = Math.max(sheet * 0.55, 6);
      const lipReach = Math.max(openingPx * 0.5, 12);
      const lip1 = { x: corner.x + aa.x * lipReach - ox * nest * 0.12, y: corner.y + aa.y * lipReach - oy * nest * 0.12 };
      const lip2 = { x: corner.x + bb.x * lipReach - ox * nest * 0.12, y: corner.y + bb.y * lipReach - oy * nest * 0.12 };
      const apex = { x: corner.x + ox * (depthPx + nest * 0.3), y: corner.y + oy * (depthPx + nest * 0.3) };
      const f1 = norm(apex, lip1), f2 = norm(apex, lip2);
      let n1 = { x: -f1.y, y: f1.x };
      if (n1.x * f2.x + n1.y * f2.y > 0) { n1.x = -n1.x; n1.y = -n1.y; }
      let n2 = { x: -f2.y, y: f2.x };
      if (n2.x * f1.x + n2.y * f1.y > 0) { n2.x = -n2.x; n2.y = -n2.y; }
      const wall = Math.min(36, Math.max(8, openingPx * 0.16));
      const oL1 = { x: lip1.x + n1.x * wall, y: lip1.y + n1.y * wall };
      const oL2 = { x: lip2.x + n2.x * wall, y: lip2.y + n2.y * wall };
      const oA1 = { x: apex.x + n1.x * wall + ox * wall * 0.55, y: apex.y + n1.y * wall + oy * wall * 0.55 };
      const oA2 = { x: apex.x + n2.x * wall + ox * wall * 0.55, y: apex.y + n2.y * wall + oy * wall * 0.55 };
      const bodyDepth = Math.max(bodyMm * scale * 0.3, openingPx * 0.28);
      const bodyHalf = Math.max(bodyMm * scale * 0.35, openingPx * 0.42);
      const perp = { x: -oy, y: ox };
      const backMid = { x: apex.x + ox * bodyDepth, y: apex.y + oy * bodyDepth };
      const b1 = { x: backMid.x + perp.x * bodyHalf, y: backMid.y + perp.y * bodyHalf };
      const b2 = { x: backMid.x - perp.x * bodyHalf, y: backMid.y - perp.y * bodyHalf };

      ctx.fillStyle = dieFill;
      ctx.strokeStyle = dieBlue;
      ctx.lineWidth = 2;
      const poly = (pts) => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };
      poly([lip1, apex, oA1, oL1]);
      poly([lip2, apex, oA2, oL2]);
      poly([oA1, b1, b2, oA2]);
      ctx.beginPath();
      ctx.moveTo(lip1.x, lip1.y); ctx.lineTo(apex.x, apex.y);
      ctx.moveTo(lip2.x, lip2.y); ctx.lineTo(apex.x, apex.y);
      ctx.stroke();
      ctx.fillStyle = dieBlue;
      ctx.font = "bold 12px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${result.die.label} · V=${fmtDe(vOpen)} · ${fmtDe(angleDeg)}°`, backMid.x, backMid.y);
    }

    const d1a = norm(mJ1, mE1), d1b = norm(mJ1, mJ2);
    const d2a = norm(mJ2, mJ1), d2b = norm(mJ2, mE2);
    if (sel) {
      drawDie(mJ1, d1a, d1b, w1, sel);
      drawDie(mJ2, d2a, d2b, w2, sel);
    }

    ctx.strokeStyle = accent;
    ctx.lineWidth = sheet;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(mE1.x, mE1.y);
    ctx.lineTo(mJ1.x, mJ1.y);
    ctx.lineTo(mJ2.x, mJ2.y);
    ctx.lineTo(mE2.x, mE2.y);
    ctx.stroke();

    ctx.fillStyle = "#9aabbd";
    ctx.font = "600 13px Arial, sans-serif";
    ctx.textAlign = "left";
    const title = sel
      ? `Z-Profil · t=${fmtDe(t)} · ∠ ${fmtDe(w1)}° / ${fmtDe(w2)}° · ${sel.die.label}`
      : `Z-Profil · t=${fmtDe(t)} · ∠ ${fmtDe(w1)}° / ${fmtDe(w2)}°`;
    ctx.fillText(title, 16, 22);
  }

  el.tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-key]");
    if (!tr) return;
    activeKey = tr.dataset.key;
    const sel = results.find(r => r.die.key === activeKey);
    [...el.tbody.querySelectorAll("tr")].forEach(r => r.classList.toggle("sel", r.dataset.key === activeKey));
    if (sel) {
      el.hero.textContent = sel.die.label;
      el.hero.className = sel.possible ? "hero-prisma" : "hero-prisma fail";
      el.hint.textContent = sel.reason;
      el.drawHint.textContent = `${sel.die.label} an beiden Knicken · V=${fmtDe(sel.opening)}`;
    }
    draw(sel || null);
  });

  ["change", "input"].forEach(ev => {
    [el.t, el.s1, el.steg, el.s2, el.w1, el.w2].forEach(n => n.addEventListener(ev, update));
  });
  window.addEventListener("resize", () => {
    const sel = results.find(r => r.die.key === activeKey) || results.find(r => r.possible) || null;
    draw(sel);
  });

  update();
})();
