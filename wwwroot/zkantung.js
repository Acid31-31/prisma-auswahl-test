(() => {
  const E = window.PrismaEngine;
  if (!E?.evaluateZKantung) return;

  const {
    evaluateZKantung, fmtDe, ZK_LIMITS, PUNCHES, punchOutlineMm, punchCatalogCaption,
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
    zoomIn: document.getElementById("zkZoomIn"),
    zoomOut: document.getElementById("zkZoomOut"),
    zoomReset: document.getElementById("zkZoomReset"),
  };

  if (!el.t || !el.canvas) return;

  let results = [];
  let activeKey = null;
  let viewZoom = 1;
  let panX = 0;
  let panY = 0;
  let panning = false;
  let panLast = null;

  function updateZoomLabel() {
    if (el.zoomReset) el.zoomReset.textContent = `${Math.round(viewZoom * 100)} %`;
  }

  function resetView() {
    viewZoom = 1;
    panX = 0;
    panY = 0;
    updateZoomLabel();
  }

  function zoomAt(viewX, viewY, factor) {
    const next = Math.min(6, Math.max(0.4, viewZoom * factor));
    factor = next / viewZoom;
    if (Math.abs(factor - 1) < 1e-6) return;
    panX = viewX - factor * (viewX - panX);
    panY = viewY - factor * (viewY - panY);
    viewZoom = next;
    updateZoomLabel();
  }

  function currentSel() {
    return results.find(r => r.die.key === activeKey) || results.find(r => r.possible) || null;
  }

  function redraw() {
    draw(currentSel());
  }

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

    results = evaluateZKantung(t, s1, steg, s2, w1, w2).filter(r => r.possible);
    const best = results[0] || null;
    activeKey = best?.die.key || null;

    if (!best) {
      el.hero.textContent = "kein Werkzeug";
      el.hero.className = "hero-prisma fail";
      el.hint.textContent = `t=${fmtDe(t)} · ${fmtDe(s1)}/${fmtDe(w1)}° · Steg ${fmtDe(steg)} · ${fmtDe(s2)}/${fmtDe(w2)}° — keine passende Prisma/OW.`;
      el.drawHint.textContent = "Maße/Winkel anpassen — Simulation folgt automatisch.";
    } else {
      el.hero.textContent = best.die.label + " + OW " + (best.punchLabel || "—");
      el.hero.className = "hero-prisma";
      el.hint.textContent = `Simulation: t=${fmtDe(t)} · Steg ${fmtDe(steg)}`
        + (best.owText && best.owText !== "—" ? " · " + best.owText : "")
        + (best.reason ? " · " + best.reason : "");
      el.drawHint.textContent = `Automatisch: ${best.die.label} + OW ${best.punchLabel || "—"} an beiden Knicken (Matrize blau, OW farbig).`;
    }

    el.tbody.innerHTML = results.map(r => {
      const sel = r.die.key === activeKey ? " class=\"sel\"" : "";
      const st = String(r.ergebnis).includes("Dicke") ? "warn" : "ok";
      return `<tr data-key="${r.die.key}"${sel}>
        <td>${r.die.label}</td>
        <td>${r.owText || "—"}</td>
        <td>${r.minSchenkel != null ? fmtDe(r.minSchenkel) : "—"}</td>
        <td>${r.minSteg != null ? fmtDe(r.minSteg) : "—"}</td>
        <td class="${st}" title="${(r.reason || "").replace(/"/g, "&quot;")}">${r.ergebnis}</td>
      </tr>`;
    }).join("");

    draw(best);
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
    // Zoom/Pan wie WPF-Vorschau
    ctx.translate(panX, panY);
    ctx.scale(viewZoom, viewZoom);

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
    const punchColors = (r) => {
      if (!r?.possible || !r.punchLabel)
        return { stroke: "#E05555", fill: "rgba(224,85,85,0.85)" };
      if (String(r.ergebnis || "").includes("Dicke"))
        return { stroke: "#FFC040", fill: "rgba(255,192,64,0.88)" };
      if (/200/i.test(r.punchLabel))
        return { stroke: "#FF8A3D", fill: "rgba(255,138,61,0.9)" };
      return { stroke: "#2EC4C9", fill: "rgba(46,196,201,0.9)" };
    };

    function norm(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx / len, y: dy / len };
    }
    function drawDie(corner, legA, legB, angleDeg, result) {
      if (!result) return;
      const aa = legA, bb = legB;
      let ix = aa.x + bb.x, iy = aa.y + bb.y;
      const il = Math.hypot(ix, iy);
      if (il < 1e-6) return;
      ix /= il; iy /= il;
      const ox = -ix, oy = -iy;
      const vOpen = result.opening || 16;
      const bodyMm = result.die.body || vOpen * 1.25;
      const openingPx = Math.min(110, Math.max(14, vOpen * scale));
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

    function resolvePunch(r) {
      if (!PUNCHES?.length) return null;
      if (r?.punchLabel) {
        const hit = PUNCHES.find(p => p.label === r.punchLabel || p.id === r.punchLabel);
        if (hit) return hit;
      }
      return PUNCHES.find(p => /200/i.test(p.label || p.id || "")) || PUNCHES[0];
    }

    function drawPunch(corner, legA, legB, angleDeg, result) {
      if (!result) return;
      const punch = resolvePunch(result);
      if (!punch || !punchOutlineMm) return;
      const aa = legA, bb = legB;
      let ix = aa.x + bb.x, iy = aa.y + bb.y;
      const il = Math.hypot(ix, iy);
      if (il < 1e-6) return;
      ix /= il; iy /= il;
      // Körper in Innenwinkel; Spitze auf Blech-Biegekante (nicht Prisma) — wie WPF
      let px = -iy, py = ix;
      if (px * bb.x + py * bb.y < 0) { px = -px; py = -py; }

      const vOpen = result.opening || 16;
      const targetH = Math.min(cssH * 0.52, Math.max(72, vOpen * scale * 3.2));
      const toolScale = targetH / Math.max(60, punch.height || 220);
      const tip = { x: corner.x + ix * sheet * 0.5, y: corner.y + iy * sheet * 0.5 };
      const mapMm = (mm) => ({
        x: tip.x + px * mm[0] * toolScale + ix * mm[1] * toolScale,
        y: tip.y + py * mm[0] * toolScale + iy * mm[1] * toolScale,
      });

      const outline = punchOutlineMm(punch).map(mapMm);
      const col = punchColors(result);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = col.fill;
      ctx.strokeStyle = col.stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(outline[0].x, outline[0].y);
      for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i].x, outline[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = col.stroke;
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "#fff";
      ctx.stroke();

      const labelAt = mapMm([0, (punch.height || 220) * 0.55]);
      ctx.fillStyle = col.stroke;
      ctx.font = "bold 12px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`OW ${punch.label} · ${fmtDe(punch.angle, 1)}°`, labelAt.x, labelAt.y);
    }

    const d1a = norm(mJ1, mE1), d1b = norm(mJ1, mJ2);
    const d2a = norm(mJ2, mJ1), d2b = norm(mJ2, mE2);
    // Matrize außen → Blech → OW-Spitze auf Biegekante
    if (sel) drawDie(mJ1, d1a, d1b, w1, sel);

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

    if (sel) drawPunch(mJ1, d1a, d1b, w1, sel);

    function segDim(a, b, text) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len * 12, ny = dx / len * 12;
      ctx.strokeStyle = "#6a7a8c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x + nx, a.y + ny);
      ctx.lineTo(b.x + nx, b.y + ny);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.font = "600 11px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, mx + nx, my + ny);
    }
    segDim(mE1, mJ1, `S1 ${fmtDe(s1)}`);
    segDim(mJ1, mJ2, `Steg ${fmtDe(steg)}`);
    segDim(mJ2, mE2, `S2 ${fmtDe(s2)}`);
    ctx.fillStyle = accent;
    ctx.font = "600 11px Arial, sans-serif";
    ctx.fillText(`${fmtDe(w1)}°`, mJ1.x - 18, mJ1.y - 10);
    ctx.fillText(`${fmtDe(w2)}°`, mJ2.x + 18, mJ2.y + 16);

    ctx.fillStyle = "#9aabbd";
    ctx.font = "600 13px Arial, sans-serif";
    ctx.textAlign = "left";
    const title = sel
      ? `Knick 1: ${sel.die.label}` + (sel.punchLabel ? ` + OW ${sel.punchLabel}` : "")
        + ` · t=${fmtDe(t)} · ∠ ${fmtDe(w1)}° / ${fmtDe(w2)}°`
      : `Z-Profil · t=${fmtDe(t)} · ∠ ${fmtDe(w1)}° / ${fmtDe(w2)}°`;
    ctx.fillText(title, 16, 22);

    const legend = [
      ["Matrize", dieBlue],
      ["OW 210S", "#2EC4C9"],
      ["OW 200S", "#FF8A3D"],
    ];
    let lx = 16;
    ctx.font = "600 10px Arial, sans-serif";
    for (const [txt, col] of legend) {
      ctx.fillStyle = col;
      ctx.fillRect(lx, 30, 9, 9);
      ctx.fillText(txt, lx + 13, 38);
      lx += 13 + ctx.measureText(txt).width + 12;
    }
  }

  el.tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-key]");
    if (!tr) return;
    activeKey = tr.dataset.key;
    const sel = results.find(r => r.die.key === activeKey);
    [...el.tbody.querySelectorAll("tr")].forEach(r => r.classList.toggle("sel", r.dataset.key === activeKey));
    if (sel) {
      el.hero.textContent = sel.die.label + " + OW " + (sel.punchLabel || "—");
      el.hero.className = sel.possible ? "hero-prisma" : "hero-prisma fail";
      el.hint.textContent = sel.reason;
      el.drawHint.textContent = `${sel.die.label} + OW ${sel.punchLabel || "—"} · V=${fmtDe(sel.opening)} · Mausrad zoomen`;
    }
    draw(sel || null);
  });

  el.canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = el.canvas.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    redraw();
  }, { passive: false });

  el.canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 1 && e.button !== 2) return;
    panning = true;
    panLast = { x: e.clientX, y: e.clientY };
    el.canvas.classList.add("is-panning");
    el.canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  el.canvas.addEventListener("pointermove", (e) => {
    if (!panning || !panLast) return;
    panX += e.clientX - panLast.x;
    panY += e.clientY - panLast.y;
    panLast = { x: e.clientX, y: e.clientY };
    redraw();
  });
  function endPan(e) {
    if (!panning) return;
    panning = false;
    panLast = null;
    el.canvas.classList.remove("is-panning");
    try { el.canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }
  el.canvas.addEventListener("pointerup", endPan);
  el.canvas.addEventListener("pointercancel", endPan);
  el.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  el.zoomIn?.addEventListener("click", () => {
    zoomAt(el.canvas.clientWidth / 2, el.canvas.clientHeight / 2, 1.2);
    redraw();
  });
  el.zoomOut?.addEventListener("click", () => {
    zoomAt(el.canvas.clientWidth / 2, el.canvas.clientHeight / 2, 1 / 1.2);
    redraw();
  });
  el.zoomReset?.addEventListener("click", () => {
    resetView();
    redraw();
  });

  ["change", "input"].forEach(ev => {
    [el.t, el.s1, el.steg, el.s2, el.w1, el.w2].forEach(n => n.addEventListener(ev, update));
  });
  window.addEventListener("resize", redraw);

  updateZoomLabel();
  update();
})();
