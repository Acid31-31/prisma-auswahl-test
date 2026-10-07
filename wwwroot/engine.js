/** Kernlogik (wie WPF ToolLoad + TableService) */
let MACHINE_MAX_MM = 3000;
const RM = 400;

const FIT = { Optimal: 3, Moeglich: 2, Eingeschraenkt: 1, Unzulaessig: 0 };

function die(v, minLeg, marks, maxBend) {
  return {
    v, minLeg, label: "V-" + v, isUni: false, uniV: null,
    maxBend: maxBend ?? null,
    marks: marks.map(m => [...m]), rm: RM
  };
}
function uni() {
  return {
    v: 0, minLeg: 6, label: "Unibend", isUni: true, uniV: 45, maxBend: 1000,
    article: "29150", manufacturer: "Trumpf", body: 45, dieMax: 1500,
    marks: [[0.5, "-"], [1.5, "x"], [3.0, "-"], [4.0, "-"]], rm: RM
  };
}

const DIE_MAX_KNM = {
  6: 170, 8: 400, 10: 400, 16: 500, 24: 650, 30: 900, 40: 1200,
  50: 1500, 60: 1500, 70: 1500, 80: 1500,
};
const UNI_DIE_MAX = 1500;
const PUNCHES = [
  // Trumpf OW210/S — H240 · ~88° · gekröpft · Art. 824677
  {
    id: "210S", label: "210S", max: 400, article: "824677", height: 240, angle: 88, tipR: 1.0,
    gooseneck: true, maxFlange: 85, throat: 85, tipOffset: 18, neck: 12, shoulder: 37.5, shoulderH: 28,
  },
  // Trumpf OW200/S — H220 · R1/86° · Art. 824476
  // Querschnitt Maßbild: 37,5 / 28 / 12 / 18 / 86° / R1, Höhe 220
  {
    id: "200S", label: "200S", max: 800, article: "824476", height: 220, angle: 86, tipR: 1.0,
    gooseneck: true, maxFlange: 80, throat: 80, tipOffset: 18, neck: 12, shoulder: 37.5, shoulderH: 28,
  },
];

/** Trumpf-Seitenansicht: Spitze (0,0)=Zapfenachse, Schaft links, Kröpfung +X. */
function punchOutlineMm(p) {
  const H = Math.max(120, p.height || 220);
  const tipA = p.angle || 86;
  const tipOffset = Math.max(6, p.tipOffset || 18);
  const neck = Math.max(8, p.neck || 12);
  const shoulder = Math.max(neck + 8, p.shoulder || 37.5);
  const shoulderH = Math.max(16, p.shoulderH || 28);
  const throat = Math.max(20, p.throat || 80);
  const tipR = p.tipR || 1;
  const tangH = 16;
  const tangHalf = Math.min(10, shoulder * 0.28);
  const tangNotch = 3.5;
  const t = Math.tan((tipA * Math.PI) / 360);
  const stemL = -tipOffset;
  const stemR = -tipOffset + neck;
  const yTipL = Math.abs(stemL) / t;
  const yTipR = Math.max(tipR + 4, Math.abs(stemR) / t + 2);
  const yShoulderBot = H - shoulderH;
  const yShoulderTop = H;
  const shL = -shoulder / 2;
  const shR = shoulder / 2;
  const yGooseBot = Math.max(yTipR + 10, H * 0.16);
  const yGooseTop = yShoulderBot - 4;
  const gooseR = stemR + throat;
  const yTangTop = yShoulderTop + tangH;

  if (!p.gooseneck) {
    return [
      [0, 0], [stemL, yTipL], [shL, yShoulderBot], [shL, yShoulderTop],
      [shR, yShoulderTop], [shR, yShoulderBot], [stemR, yTipR],
    ];
  }
  return [
    [0, 0],
    [stemL, yTipL],
    [stemL, yShoulderBot],
    [shL, yShoulderBot],
    [shL, yShoulderTop],
    [-tangHalf, yShoulderTop],
    [-tangHalf, yTangTop - tangNotch],
    [-tangHalf + 2, yTangTop - tangNotch],
    [-tangHalf + 2, yTangTop],
    [tangHalf - 2, yTangTop],
    [tangHalf - 2, yTangTop - tangNotch],
    [tangHalf, yTangTop - tangNotch],
    [tangHalf, yShoulderTop],
    [shR, yShoulderTop],
    [shR, yShoulderBot],
    [stemR + throat * 0.08, yGooseTop],
    [gooseR * 0.55 + stemR * 0.45, yGooseTop - (yGooseTop - yGooseBot) * 0.12],
    [gooseR, (yGooseTop + yGooseBot) * 0.55],
    [gooseR * 0.7 + stemR * 0.3, yGooseBot + 8],
    [stemR + 2, yGooseBot],
    [stemR, yTipR],
    [yTipR * t * 0.35, yTipR * 0.55],
  ];
}

function punchDimensionLines(p) {
  const H = p.height || 220;
  const tipOffset = p.tipOffset || 18;
  const neck = p.neck || 12;
  const shoulder = p.shoulder || 37.5;
  const shoulderH = p.shoulderH || 28;
  const tangH = 16;
  const stemL = -tipOffset;
  const stemR = -tipOffset + neck;
  const shL = -shoulder / 2;
  const shR = shoulder / 2;
  const yShBot = H - shoulderH;
  return [
    [fmtDe(H, 0), [shL - 12, 0], [shL - 12, H]],
    [fmtDe(shoulder, 1), [shL, H + tangH + 5], [shR, H + tangH + 5]],
    [fmtDe(shoulderH, 0), [shR + 8, yShBot], [shR + 8, H]],
    [fmtDe(neck, 0), [stemL, H * 0.52], [stemR, H * 0.52]],
    [fmtDe(tipOffset, 0), [stemL, (p.tipR || 1) + 8], [0, (p.tipR || 1) + 8]],
  ];
}

function punchCatalogCaption(p) {
  const art = p.article ? ` · Art. ${p.article}` : "";
  return `OW${p.label}/S · H${fmtDe(p.height, 0)} · R${fmtDe(p.tipR || 1, 1)}/${fmtDe(p.angle, 1)}°${art}`;
}

/** Spitzenwinkel = schärfster Innenwinkel (86°-OW kann 90°, nicht 70°). */
function punchCanBendAngle(punch, interiorDeg) {
  const tip = punch.angle > 0 ? punch.angle : 88;
  return interiorDeg + 0.51 >= tip;
}

function punchCanClearFlange(punch, flangeMm) {
  if (!punch.gooseneck) return flangeMm <= 0.02;
  if (!(punch.maxFlange > 0)) return true;
  return flangeMm <= punch.maxFlange + 0.02;
}

/** OW für Z: gekröpft, Winkel, Rücklauf, Presskraft vs. Matrize. */
function resolvePunchForZ(pressKnM, dieMax, w1, w2, s1, s2) {
  const sharpest = Math.min(w1, w2);
  const returnFlange = Math.max(s1, s2);
  const press = pressKnM > 0 ? pressKnM : 0;
  let angleFail = null, flangeFail = null, gooseFail = null, loadFail = null, loadLim = 0;

  for (const punch of PUNCHES) {
    if (!punch.gooseneck) {
      gooseFail = gooseFail || (punch.label + " nicht gekröpft (Z braucht Kröpfung)");
      continue;
    }
    if (!punchCanBendAngle(punch, sharpest)) {
      const tip = punch.angle > 0 ? punch.angle : 88;
      angleFail = angleFail || `${punch.label}: Spitze ${fmtDe(tip)}° — Innenwinkel ${fmtDe(sharpest)}° zu spitz (min. ${fmtDe(tip)}°)`;
      continue;
    }
    if (!punchCanClearFlange(punch, returnFlange)) {
      flangeFail = flangeFail || `${punch.label}: Rücklauf-Schenkel ${fmtDe(returnFlange)} > max ${fmtDe(punch.maxFlange)} mm (Kröpfung)`;
      continue;
    }
    const limit = dieMax > 0 ? Math.min(dieMax, punch.max) : punch.max;
    if (press > limit + 0.5) {
      if (!loadFail) { loadFail = punch; loadLim = limit; }
      continue;
    }
    return { punch, fail: "", limit };
  }

  if (angleFail) return { punch: null, fail: angleFail, limit: 0 };
  if (flangeFail) return { punch: null, fail: flangeFail, limit: 0 };
  if (PUNCHES.every(p => !p.gooseneck))
    return { punch: null, fail: "Z-Kantung braucht gekröpftes OW (kein passendes hinterlegt)", limit: 0 };
  if (loadFail)
    return { punch: null, fail: `Überlast: ${fmtDe(press)} > ${fmtDe(loadLim)} kN/m (Matrize/OW)`, limit: loadLim };
  return { punch: null, fail: gooseFail || flangeFail || angleFail || "Kein passendes OW für diese Z-Kantung", limit: 0 };
}

function dieMaxKnM(tool) {
  if (!tool) return 0;
  if (tool.dieMax > 0) return tool.dieMax;
  if (tool.isUni) return UNI_DIE_MAX;
  return DIE_MAX_KNM[tool.v] ?? 0;
}

function limitingSide(limit, dieMax, punchId, punchMax) {
  if (punchMax + 0.01 < dieMax) return punchId;
  if (dieMax + 0.01 < punchMax) return "Matrize";
  return punchId;
}

function resolveCapacity(pressKnM, tool) {
  const empty = {
    pressKnM: pressKnM ?? null, dieMaxKnM: 0, punchMaxKnM: null,
    upperToolLabel: "—", effectiveLimitKnM: 0, limitingSide: "", capacityOk: true,
    punchArticle: null, punchHeight: null,
  };
  if (!tool) return empty;
  const dieMax = dieMaxKnM(tool);
  const base = { ...empty, dieMaxKnM: dieMax };
  if (pressKnM == null || pressKnM <= 0) return base;

  for (const punch of PUNCHES) {
    const limit = Math.min(dieMax, punch.max);
    if (pressKnM <= limit + 0.5) {
      return {
        pressKnM, dieMaxKnM: dieMax, punchMaxKnM: punch.max,
        upperToolLabel: punch.label,
        effectiveLimitKnM: limit,
        limitingSide: limitingSide(limit, dieMax, punch.id, punch.max),
        capacityOk: true,
        punchArticle: punch.article || null,
        punchHeight: punch.height ?? null,
      };
    }
  }
  const failLimit = Math.min(dieMax, PUNCHES[1].max);
  return {
    pressKnM, dieMaxKnM: dieMax, punchMaxKnM: PUNCHES[1].max,
    upperToolLabel: "—",
    effectiveLimitKnM: failLimit,
    limitingSide: limitingSide(failLimit, dieMax, PUNCHES[1].id, PUNCHES[1].max),
    capacityOk: false,
    punchArticle: null, punchHeight: null,
  };
}

function thicknessSuitability(tool, thickness) {
  const f = fit(tool, thickness);
  if (f === "Eingeschraenkt") return "Moeglich";
  return f;
}

function displayFit(tool, thickness, capacityOk) {
  const s = thicknessSuitability(tool, thickness);
  if (s === "Unzulaessig") return "Unzulaessig";
  if (!capacityOk) return "Eingeschraenkt";
  return s;
}

function overloadReason(info) {
  if (info.capacityOk || info.pressKnM == null) return "Überlast";
  const p = Math.round(info.pressKnM).toLocaleString("de-DE");
  const l = Math.round(info.effectiveLimitKnM).toLocaleString("de-DE");
  if (info.limitingSide === "Matrize") return `Überlast: ${p} > ${l} kN/m (Matrize)`;
  if (info.upperToolLabel !== "—") return `Überlast: ${p} > ${l} kN/m (${info.upperToolLabel})`;
  return `Überlast: ${p} > ${l} kN/m`;
}

function formatLoadInfo(info) {
  if (info.dieMaxKnM <= 0 && info.upperToolLabel === "—") return { ow: "—", matr: "—", grenze: "—", detail: "—" };
  const matr = info.dieMaxKnM > 0 ? Math.round(info.dieMaxKnM).toLocaleString("de-DE") + " kN/m" : "—";
  let ow = info.upperToolLabel;
  if (ow !== "—" && info.punchMaxKnM)
    ow = ow + " · " + Math.round(info.punchMaxKnM).toLocaleString("de-DE") + " kN/m";
  let grenze = "—";
  if (info.effectiveLimitKnM > 0) {
    grenze = Math.round(info.effectiveLimitKnM).toLocaleString("de-DE") + " kN/m";
    if (info.limitingSide === "Matrize") grenze += " (Matrize)";
    else if (info.limitingSide === "210S" || info.limitingSide === "200S"
      || info.limitingSide === "OW210" || info.limitingSide === "OW200") {
      const side = info.limitingSide === "OW210" ? "210S"
        : info.limitingSide === "OW200" ? "200S" : info.limitingSide;
      grenze += " (" + side + ")";
    }
  }
  const parts = [];
  if (info.upperToolLabel !== "—") {
    let owp = "OW " + info.upperToolLabel;
    if (info.punchArticle) owp += " · Art. " + info.punchArticle;
    if (info.punchHeight) owp += " · H" + info.punchHeight;
    parts.push(owp);
  }
  if (info.dieMaxKnM > 0) parts.push("Matr. max " + matr);
  if (info.effectiveLimitKnM > 0) parts.push("Grenze " + grenze);
  return { ow, matr, grenze, detail: parts.length ? parts.join(" · ") : "—" };
}

function defaultTools() {
  return [
    die(6, 4.5, [[0.5, "-"], [0.8, "x"], [1.0, "-"], [1.2, "!"]]),
    die(8, 6.0, [[0.5, "!"], [0.8, "-"], [1.0, "x"], [1.2, "-"], [1.5, "!"]], 2700),
    die(10, 7.5, [[0.8, "!"], [1.0, "-"], [1.2, "x"], [1.5, "-"], [2.0, "!"]]),
    die(16, 12.0, [[1.2, "!"], [1.5, "-"], [2.0, "x"], [2.5, "-"], [3.0, "!"]]),
    die(20, 15.0, [[1.5, "!"], [2.0, "-"], [2.5, "x"], [3.0, "-"], [4.0, "!"]]),
    die(24, 18.0, [[2.0, "!"], [2.5, "-"], [3.0, "x"], [4.0, "-"], [5.0, "!"]]),
    die(30, 22.5, [[2.5, "!"], [3.0, "-"], [4.0, "x"], [5.0, "-"], [6.0, "!"]]),
    // V-40: Werkstatt bis 10 mm (eingeschränkt) — wie WPF ToolLoad
    die(40, 30.0, [[3.0, "!"], [4.0, "-"], [5.0, "x"], [6.0, "-"], [8.0, "!"], [10.0, "!"]], 400),
    die(50, 37.5, [[4.0, "!"], [5.0, "-"], [6.0, "x"], [8.0, "-"], [10.0, "!"]]),
    die(60, 45.0, [[5.0, "!"], [6.0, "x"], [8.0, "-"], [10.0, "!"]]),
    die(70, 52.5, [[6.0, "!"], [8.0, "x"], [10.0, "-"]], 2100),
    die(80, 60.0, [[6.0, "!"], [8.0, "-"], [10.0, "x"]]),
    uni(),
  ];
}

let TOOLS = defaultTools();

function setTools(list) {
  TOOLS = list;
}
function setMachineMax(mm) {
  MACHINE_MAX_MM = mm > 0 ? mm : 3000;
}
function getMachineMax() { return MACHINE_MAX_MM; }
function getTools() { return TOOLS; }

function marksToText(marks) {
  return (marks || []).map(([t, m]) =>
    String(t).replace(".", ",") + ":" + m
  ).join("; ");
}

function parseMarks(text) {
  if (!text || !String(text).trim()) return [];
  const out = [];
  String(text).split(/[;]+/).forEach(part => {
    const p = part.trim();
    if (!p) return;
    const [a, b] = p.split(":");
    if (!a || !b) return;
    const t = Number(String(a).trim().replace(",", "."));
    const m = String(b).trim()[0];
    if (!Number.isFinite(t) || t <= 0) return;
    const mark = (m === "x" || m === "X" || m === "o" || m === "O") ? "x" : (m === "!" ? "!" : "-");
    out.push([t, mark]);
  });
  return out.sort((x, y) => x[0] - y[0]);
}

function fromMark(m) {
  if (m === "x") return "Optimal";
  if (m === "-") return "Moeglich";
  return "Eingeschraenkt";
}
function fitText(f) {
  return ({ Optimal: "optimal", Moeglich: "möglich", Eingeschraenkt: "Überlast (!)", Unzulaessig: "unzulässig" })[f];
}
function worse(a, b) {
  return FIT[a] <= FIT[b] ? a : b;
}

function resolveTool(prisma) {
  const s = (prisma || "").trim();
  if (/^UNI/i.test(s)) return TOOLS.find(t => t.isUni) || null;
  const digits = s.replace(/\D/g, "");
  if (!digits) return null;
  const v = parseInt(digits, 10);
  return TOOLS.find(t => !t.isUni && t.v === v) || null;
}

function fit(tool, thickness) {
  if (!tool || !tool.marks.length) return "Unzulaessig";
  const marks = tool.marks;
  const tMin = marks[0][0], tMax = marks[marks.length - 1][0];
  if (thickness < tMin - 0.051 || thickness > tMax + 0.051) return "Unzulaessig";
  for (const [t, m] of marks) {
    if (Math.abs(t - thickness) <= 0.051) return fromMark(m);
  }
  for (let i = 1; i < marks.length; i++) {
    if (thickness > marks[i - 1][0] && thickness < marks[i][0])
      return worse(fromMark(marks[i - 1][1]), fromMark(marks[i][1]));
  }
  return "Unzulaessig";
}

function effectiveV(tool) {
  return tool.isUni ? (tool.uniV ?? 45) : tool.v;
}

/** Trumpf Presskrafttabelle @ Rm 400 [kN/m]. s=2 / W=16 → 186 (Trumpf-App S235). */
const PRESS_W = [6, 8, 10, 12, 16, 20, 24, 30, 40, 50, 60, 70, 80];
const PRESS_ROWS = [
  [0.75, { 6: 52, 8: 39, 10: 31, 12: 26 }],
  [1.00, { 6: 93, 8: 70, 10: 56, 12: 47, 16: 35 }],
  [1.25, { 6: 145, 8: 109, 10: 87, 12: 73, 16: 55, 20: 44 }],
  [1.50, { 6: 209, 8: 157, 10: 126, 12: 105, 16: 79, 20: 63 }],
  [1.75, { 6: 214, 8: 171, 10: 143, 12: 107, 16: 86, 20: 71 }],
  [2.00, { 12: 223, 16: 186, 20: 140, 24: 112, 30: 93 }],
  [2.50, { 16: 291, 20: 218, 24: 175, 30: 145, 40: 116 }],
  [3.00, { 16: 314, 20: 251, 24: 209, 30: 168, 40: 126 }],
  [3.50, { 16: 428, 20: 342, 24: 285, 30: 228, 40: 171, 50: 137 }],
  [4.00, { 16: 447, 20: 372, 24: 298, 30: 223, 40: 179, 50: 149 }],
  [4.50, { 16: 566, 20: 471, 24: 377, 30: 283, 40: 226, 50: 189, 60: 162 }],
  [5.00, { 20: 466, 24: 349, 30: 279, 40: 233, 50: 200, 60: 175 }],
  [6.00, { 24: 670, 30: 503, 40: 402, 50: 335, 60: 287, 70: 251, 80: 223 }],
  [7.00, { 30: 684, 40: 547, 50: 456, 60: 391, 70: 342, 80: 304 }],
  [8.00, { 40: 715, 50: 596, 60: 511, 70: 447, 80: 397 }],
  [10.0, { 50: 798, 60: 698, 70: 621, 80: 559 }],
  [12.0, { 60: 1005, 70: 894, 80: 804 }],
];

function interpolateV(cells, v) {
  if (cells[v] != null) return cells[v];
  let loV = null, loF = null, hiV = null, hiF = null;
  for (const wv of PRESS_W) {
    const f = cells[wv];
    if (f == null) continue;
    if (wv <= v) { loV = wv; loF = f; }
    if (wv >= v && hiV == null) { hiV = wv; hiF = f; }
  }
  if (loV == null && hiV == null) return null;
  if (loV == null) return hiF;
  if (hiV == null) return loF;
  if (Math.abs(hiV - loV) < 1e-9) return loF;
  const w = (v - loV) / (hiV - loV);
  return loF * (1 - w) + hiF * w;
}

function lookupPressAt400(s, v) {
  const formula = () => 1.33 * 400 * s * s / v;
  for (const [ts, cells] of PRESS_ROWS) {
    if (Math.abs(ts - s) <= 0.001) {
      const f = interpolateV(cells, v);
      return f == null ? formula() : f;
    }
  }
  let lo = -1, hi = -1;
  for (let i = 0; i < PRESS_ROWS.length; i++) {
    if (PRESS_ROWS[i][0] <= s) lo = i;
    if (PRESS_ROWS[i][0] >= s && hi < 0) hi = i;
  }
  if (lo < 0 && hi < 0) return formula();
  if (lo < 0) {
    const f = interpolateV(PRESS_ROWS[hi][1], v);
    return f == null ? formula() : f;
  }
  if (hi < 0) {
    const f = interpolateV(PRESS_ROWS[lo][1], v);
    return f == null ? formula() : f;
  }
  if (lo === hi) {
    const f = interpolateV(PRESS_ROWS[lo][1], v);
    return f == null ? formula() : f;
  }
  const fLo = interpolateV(PRESS_ROWS[lo][1], v);
  const fHi = interpolateV(PRESS_ROWS[hi][1], v);
  if (fLo == null && fHi == null) return formula();
  if (fLo == null) return fHi;
  if (fHi == null) return fLo;
  const t0 = PRESS_ROWS[lo][0], t1 = PRESS_ROWS[hi][0];
  const w = (s - t0) / (t1 - t0);
  return fLo * (1 - w) + fHi * w;
}

function loadKnPerM(tool, thickness, rmOverride) {
  if (!tool || thickness <= 0) return null;
  const v = effectiveV(tool);
  if (v <= 0) return null;
  const at400 = lookupPressAt400(thickness, v);
  const rm = (rmOverride != null && rmOverride > 0) ? rmOverride : (tool.rm > 0 ? tool.rm : RM);
  return at400 * (rm / 400);
}

const MATERIAL_GRADES = [
  { id: "DC-01", label: "DC-01", group: "Stahl", rm: 400 },
  { id: "S235", label: "S235", group: "Stahl", rm: 550 },
  { id: "S355", label: "S355", group: "Stahl", rm: 550 },
  { id: "Hardox", label: "Hardox", group: "Stahl", rm: 1250 },
  { id: "Edelstahl", label: "Edelstahl", group: "VA", rm: 700 },
  { id: "Aluminium", label: "Aluminium", group: "ALU", rm: 300 },
];

function gradesForGroup(group) {
  const g = (group || "").toLowerCase();
  if (g === "va" || g === "v2a" || g.includes("edel"))
    return MATERIAL_GRADES.filter(x => x.id === "Edelstahl");
  if (g === "alu" || g.includes("alu"))
    return MATERIAL_GRADES.filter(x => x.id === "Aluminium");
  return MATERIAL_GRADES.filter(x => x.group === "Stahl");
}

function defaultGrade(group) {
  return gradesForGroup(group)[0];
}

function gradeDisplay(g) {
  return g.label;
}

function autoGrade(group, thickness) {
  const grades = gradesForGroup(group);
  if (grades.length === 1) return grades[0];
  const g = (group || "").toLowerCase();
  if (g !== "stahl" && !g.includes("stahl")) return grades[0];
  return (thickness + 0.001 < 3) ? grades.find(x => x.id === "DC-01") : grades.find(x => x.id === "S235");
}

function optimalThickness(tool) {
  const x = tool.marks.find(m => m[1] === "x");
  return x ? x[0] : tool.marks[tool.marks.length - 1][0];
}

function fmtDe(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("de-DE", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function abwicklung(row, fert) {
  if (row.massabzug == null || fert == null) return null;
  return fert + row.massabzug * 0.5;
}

function evaluatePossible(row, tool, fitVal, loadInfo, fert, abw, laenge) {
  if (fitVal === "Unzulaessig") return { ok: false, reason: "unzulässig" };
  if (!loadInfo.capacityOk) return { ok: false, reason: overloadReason(loadInfo) };
  if (fitVal === "Eingeschraenkt") return { ok: false, reason: overloadReason(loadInfo) };
  if (laenge != null) {
    if (MACHINE_MAX_MM > 0 && laenge > MACHINE_MAX_MM + 0.02)
      return { ok: false, reason: `Maschinen-Max. Biegelänge überschritten (max. ${fmtDe(MACHINE_MAX_MM)} mm)` };
    if (tool?.maxBend != null && laenge > tool.maxBend + 0.02)
      return { ok: false, reason: `Max. Biegelänge überschritten (max. ${fmtDe(tool.maxBend)} mm)` };
  }
  if (fert != null) {
    if (tool?.minLeg != null && fert + 0.02 < tool.minLeg)
      return { ok: false, reason: `Mindestkante zu kurz (min. ${fmtDe(tool.minLeg)} mm)` };
    if (abw != null && row.mindestAbwicklung != null && abw + 0.02 < row.mindestAbwicklung)
      return { ok: false, reason: `Abw. zu kurz (${fmtDe(abw)} < ${fmtDe(row.mindestAbwicklung)} mm)` };
  }
  return { ok: true, reason: "" };
}

function rankVerfahren(v) {
  const s = (v || "").toUpperCase();
  if (s.includes("MATRITZE") || s.includes("MATRIZE")) return 0;
  if (s.includes("DIN")) return 1;
  if (s.includes("INNEN")) return 2;
  if (!s.trim()) return 3;
  return 4;
}

function prismaOrder(prisma) {
  if (/^UNI/i.test(prisma || "")) return 1000;
  const m = /V\s*-?\s*(\d+)/i.exec(prisma || "");
  return m ? parseInt(m[1], 10) : 2000;
}

function pickBest(scored, thickness) {
  let pool = scored.filter(s => s.ok);
  if (!pool.length) return null;
  const dies = pool.filter(s => s.tool && !s.tool.isUni);
  if (dies.length) pool = dies;
  pool.sort((a, b) => {
    const r = FIT[b.fit] - FIT[a.fit];
    if (r) return r;
    const ta = a.total ?? a.load ?? 99999;
    const tb = b.total ?? b.load ?? 99999;
    if (ta !== tb) return ta - tb;
    const ua = a.tool?.isUni ? 1 : 0;
    const ub = b.tool?.isUni ? 1 : 0;
    if (ua !== ub) return ua - ub;
    const oa = a.tool ? Math.abs(optimalThickness(a.tool) - thickness) : 999;
    const ob = b.tool ? Math.abs(optimalThickness(b.tool) - thickness) : 999;
    if (oa !== ob) return oa - ob;
    const ma = a.tool?.minLeg ?? 999;
    const mb = b.tool?.minLeg ?? 999;
    if (ma !== mb) return ma - mb;
    const va = rankVerfahren(a.row.verfahren);
    const vb = rankVerfahren(b.row.verfahren);
    if (va !== vb) return va - vb;
    return prismaOrder(a.row.prisma) - prismaOrder(b.row.prisma);
  });
  return pool[0].row;
}

function find(rows, group, material, thickness, fert, laenge, rmOverride) {
  let pool = rows.filter(r =>
    r.group.toLowerCase() === group.toLowerCase()
    && (!material || r.material.toLowerCase() === material.toLowerCase())
    && r.thickness != null
  );
  if (!pool.length) return [];
  let exact = pool.filter(r => Math.abs(r.thickness - thickness) <= 0.051);
  let match;
  if (exact.length) match = exact;
  else {
    const nearest = pool.slice().sort((a, b) => Math.abs(a.thickness - thickness) - Math.abs(b.thickness - thickness))[0].thickness;
    match = pool.filter(r => Math.abs(r.thickness - nearest) <= 0.051);
  }
  const rm = (rmOverride != null && rmOverride > 0) ? rmOverride : RM;
  const lengthM = laenge != null && laenge > 0 ? laenge / 1000 : null;
  const scored = match.map(r => {
    const tool = resolveTool(r.prisma);
    const abw = abwicklung(r, fert);
    const load = tool ? loadKnPerM(tool, thickness, rm) : null;
    const total = load != null && lengthM != null ? load * lengthM : null;
    const loadInfo = resolveCapacity(load, tool);
    const f = tool ? displayFit(tool, thickness, loadInfo.capacityOk) : "Unzulaessig";
    const ev = evaluatePossible(r, tool, f, loadInfo, fert, abw, laenge);
    const li = formatLoadInfo(loadInfo);
    return {
      row: r, tool, fit: f, load, total, abw, ok: ev.ok, reason: ev.reason,
      loadInfo, ow: li.ow, matrMax: li.matr, grenze: li.grenze, werkzeugDetail: li.detail,
      rm,
    };
  });
  const preferred = pickBest(scored, thickness);
  return scored
    .map(s => ({
      ...s,
      empfohlen: preferred != null && s.row === preferred,
      dickeLabel: s.row.thicknessLabel || fmtDe(s.row.thickness),
    }))
    .sort((a, b) => {
      if (a.empfohlen !== b.empfohlen) return a.empfohlen ? -1 : 1;
      if (a.ok !== b.ok) return a.ok ? -1 : 1;
      const fr = FIT[b.fit] - FIT[a.fit];
      if (fr) return fr;
      return (a.total ?? a.load ?? 99999) - (b.total ?? b.load ?? 99999);
    });
}

/* ========== Z-Kantung (wie WPF ZKantungService) ========== */
const ZK_MIN_OPEN_RATIO = 4.0;
const ZK_LIMITS = {
  tMin: 0.3, tMax: 25, LMin: 1, LMax: 500, aMin: 1, aMax: 179,
};

function defaultZDies() {
  return [
    { key: "V-6", label: "V-6", body: 16 },
    { key: "V-8", label: "V-8", body: 20 },
    { key: "V-10", label: "V-10", body: 20 },
    { key: "V-16", label: "V-16", body: 30 },
    { key: "V-24", label: "V-24", body: 40 },
    { key: "V-30", label: "V-30", body: 45 },
    { key: "V-40", label: "V-40", body: 55 },
    { key: "V-50", label: "V-50", body: 65 },
    { key: "V-70", label: "V-70", body: 85 },
    { key: "UNI", label: "UNI", body: 45 },
  ];
}

function zkOpeningMm(die) {
  const tool = resolveTool(die.key || die.label);
  if (tool) return effectiveV(tool);
  const m = String(die.key || "").match(/V-?(\d+)/i);
  if (m) return Number(m[1]);
  return die.body > 0 ? die.body : 0;
}

function zkMinSteg(bodyMm, thicknessMm) {
  return bodyMm / 2 + Math.max(0, thicknessMm);
}

function zkAngleFactor(w1, w2) {
  const f = (w) => {
    if (w >= 89.5) return 1;
    return 1 + (90 - w) / 120;
  };
  return Math.max(f(w1), f(w2));
}

function evaluateZKantungOne(die, thicknessMm, s1, steg, s2, stegFactor, w1 = 90, w2 = 90) {
  const body = die.body;
  if (!(body > 0)) {
    return {
      die, possible: false, ergebnis: "—", reason: "Matrizenbreite unbekannt",
      minSteg: null, minSchenkel: null, opening: 0, punchLabel: null, owText: "—",
    };
  }
  const factor = Math.max(1, Math.min(2.5, stegFactor || 1));
  const minSteg = zkMinSteg(body, thicknessMm) * factor;
  const tool = resolveTool(die.key);
  const minSchenkel = tool?.minLeg ?? (body / 2) * 0.7;
  const opening = zkOpeningMm(die) || body;

  if (opening + 0.02 < thicknessMm) {
    return {
      die, possible: false, minSteg, minSchenkel, opening, punchLabel: null, owText: "—",
      ergebnis: `t=${fmtDe(thicknessMm)} ungeeignet`,
      reason: `V-Öffnung ${fmtDe(opening)} < t=${fmtDe(thicknessMm)}`,
    };
  }

  const thickByRule = opening + 0.02 >= ZK_MIN_OPEN_RATIO * thicknessMm;
  if (!thickByRule) {
    return {
      die, possible: false, minSteg, minSchenkel, opening, punchLabel: null, owText: "—",
      ergebnis: `t=${fmtDe(thicknessMm)} ungeeignet`,
      reason: `Dicke ${fmtDe(thicknessMm)} mm für ${die.label} ungeeignet (V=${fmtDe(opening)}, braucht ≥ ${fmtDe(ZK_MIN_OPEN_RATIO * thicknessMm)})`,
    };
  }

  const thickFit = tool ? fit(tool, thicknessMm) : "Moeglich";
  // Markentabelle: UNI nur bis 4 mm usw. — unzulässig = nicht möglich
  if (thickFit === "Unzulaessig") {
    return {
      die, possible: false, minSteg, minSchenkel, opening, punchLabel: null, owText: "—",
      ergebnis: `t=${fmtDe(thicknessMm)} ungeeignet`,
      reason: `Dicke ${fmtDe(thicknessMm)} mm für ${die.label} unzulässig (Werkstatt-Belastungstabelle)`,
    };
  }
  let thickHint = "";
  if (thickFit === "Eingeschraenkt")
    thickHint = ` · t=${fmtDe(thicknessMm)} eingeschränkt`;

  const s1Ok = s1 + 0.02 >= minSchenkel;
  const s2Ok = s2 + 0.02 >= minSchenkel;
  const stegOk = steg + 0.02 >= minSteg;
  if (!s1Ok || !s2Ok || !stegOk) {
    const parts = [];
    if (!s1Ok) parts.push(`Schenkel1 ${fmtDe(s1)} < min ${fmtDe(minSchenkel)}`);
    if (!stegOk) parts.push(`Steg ${fmtDe(steg)} < min ${fmtDe(minSteg)}`);
    if (!s2Ok) parts.push(`Schenkel2 ${fmtDe(s2)} < min ${fmtDe(minSchenkel)}`);
    return {
      die, possible: false, minSteg, minSchenkel, opening, punchLabel: null, owText: "—",
      ergebnis: "nicht möglich",
      reason: parts.join(" · ") + thickHint,
    };
  }

  const press = tool ? loadKnPerM(tool, thicknessMm) : null;
  const dMax = dieMaxKnM(tool);
  const { punch, fail } = resolvePunchForZ(press, dMax, w1, w2, s1, s2);
  if (!punch) {
    return {
      die, possible: false, minSteg, minSchenkel, opening, punchLabel: null, owText: "—",
      ergebnis: "OW ungeeignet",
      reason: fail + thickHint,
      pressKnM: press,
    };
  }

  const tip = punch.angle > 0 ? punch.angle : null;
  const owText = [punch.label, tip != null ? fmtDe(tip) + "°" : null, fmtDe(punch.max) + " kN/m"]
    .filter(Boolean).join(" · ");
  return {
    die, possible: true, minSteg, minSchenkel, opening,
    punchLabel: punch.label, punchTip: tip, punchMax: punch.max, owText,
    pressKnM: press,
    ergebnis: thickHint ? "möglich · Dicke!" : "möglich",
    reason: `OK: S1/S2 ≥ ${fmtDe(minSchenkel)}, Steg ≥ ${fmtDe(minSteg)} · OW ${punch.label}`
      + (tip != null ? ` (${fmtDe(tip)}°)` : "") + thickHint,
  };
}

function evaluateZKantung(thicknessMm, s1, steg, s2, w1 = 90, w2 = 90, dies) {
  const L = ZK_LIMITS;
  if (!(thicknessMm >= L.tMin && thicknessMm <= L.tMax)) return [];
  if (!(s1 >= L.LMin && s1 <= L.LMax && steg >= L.LMin && steg <= L.LMax && s2 >= L.LMin && s2 <= L.LMax)) return [];
  if (!(w1 >= L.aMin && w1 <= L.aMax && w2 >= L.aMin && w2 <= L.aMax)) return [];

  const factor = zkAngleFactor(w1, w2);
  const list = (dies || defaultZDies()).map(d =>
    evaluateZKantungOne(d, thicknessMm, s1, steg, s2, factor, w1, w2)
  );
  return list.sort((a, b) => {
    if (a.possible !== b.possible) return a.possible ? -1 : 1;
    const aw = String(a.ergebnis).includes("Dicke") ? 1 : 0;
    const bw = String(b.ergebnis).includes("Dicke") ? 1 : 0;
    if (aw !== bw) return aw - bw;
    const av = a.die.key.startsWith("UNI") ? 1000 : (parseInt(String(a.die.key).replace(/\D/g, ""), 10) || 2000);
    const bv = b.die.key.startsWith("UNI") ? 1000 : (parseInt(String(b.die.key).replace(/\D/g, ""), 10) || 2000);
    return av - bv;
  });
}

/* ========== Bohrung (wie WPF BohrungService + GewindeCatalog) ========== */
const BOHR_T_MIN = 0.5, BOHR_T_MAX = 25, BOHR_FLOOR = 1.0;

const GEWINDE = [
  ["M3", 2.5], ["M4", 3.3], ["M5", 4.2], ["M6", 5.1], ["M8", 6.8],
  ["M10", 8.5], ["M12", 10.2], ["M14", 12.0], ["M16", 14.2], ["M18", 15.5],
  ["M20", 17.5], ["M22", 19.5], ["M24", 21.0], ["M27", 24.0], ["M30", 26.5],
];

function defaultBohrungEntries() {
  return [
    { t: 5, d: 3.3, a: "Laesern" }, { t: 6, d: 3.3, a: "Laesern" },
    { t: 8, d: 3.3, a: "Koernen" }, { t: 8, d: 4.2, a: "Koernen" }, { t: 8, d: 5.1, a: "Laesern" },
    { t: 10, d: 4.2, a: "Koernen" }, { t: 10, d: 5.1, a: "Laesern" }, { t: 10, d: 6.8, a: "Laesern" },
    { t: 12, d: 4.2, a: "Koernen" }, { t: 12, d: 8.5, a: "Laesern" },
    { t: 15, d: 9.0, a: "Koernen" }, { t: 15, d: 10.2, a: "Laesern" },
    { t: 20, d: 10.2, a: "Koernen" }, { t: 20, d: 11.0, a: "Laesern" },
    { t: 20, d: 14.0, a: "Laesern" }, { t: 20, d: 17.0, a: "Laesern" },
    { t: 25, d: 17.5, a: "Koernen" },
  ];
}

function bohrBuildAnchors(entries) {
  const map = new Map();
  for (const e of entries || []) {
    if (!(e.t >= BOHR_T_MIN - 0.01 && e.t <= BOHR_T_MAX + 0.01)) continue;
    const k = Math.round(e.t * 100) / 100;
    if (!map.has(k)) map.set(k, { koernen: [], laesern: [] });
    const g = map.get(k);
    if (e.a === "Koernen") g.koernen.push(e.d);
    else g.laesern.push(e.d);
  }
  const anchors = [...map.entries()].sort((a, b) => a[0] - b[0]).map(([t, g]) => {
    let dMin;
    if (g.koernen.length && g.laesern.length)
      dMin = (Math.max(...g.koernen) + Math.min(...g.laesern)) / 2;
    else if (g.laesern.length) dMin = Math.min(...g.laesern);
    else dMin = Math.max(...g.koernen) + 0.5;
    return [t, Math.max(BOHR_FLOOR, dMin)];
  });
  if (!anchors.length) return [[5, 3.3], [25, 18]];
  if (anchors[0][0] > BOHR_T_MIN + 0.01) {
    const thin = Math.max(BOHR_FLOOR, anchors[0][1] * (BOHR_T_MIN / anchors[0][0]));
    anchors.unshift([BOHR_T_MIN, thin]);
  }
  const last = anchors[anchors.length - 1];
  if (last[0] < BOHR_T_MAX - 0.01)
    anchors.push([BOHR_T_MAX, last[1] + (BOHR_T_MAX - last[0]) * 0.4]);
  return anchors;
}

function bohrMinLaserDiameter(entries, thicknessMm) {
  const t = Math.min(BOHR_T_MAX, Math.max(BOHR_T_MIN, thicknessMm));
  const anchors = bohrBuildAnchors(entries);
  if (anchors.length === 1) return anchors[0][1];
  if (t <= anchors[0][0]) return anchors[0][1];
  if (t >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [t0, d0] = anchors[i], [t1, d1] = anchors[i + 1];
    if (t + 1e-9 < t0 || t - 1e-9 > t1) continue;
    if (Math.abs(t1 - t0) < 1e-9) return d0;
    return d0 + ((t - t0) / (t1 - t0)) * (d1 - d0);
  }
  return anchors[anchors.length - 1][1];
}

function bohrResolve(entries, thicknessMm, diameterMm) {
  const th = bohrMinLaserDiameter(entries, thicknessMm);
  const exact = (entries || []).find(e =>
    Math.abs(e.t - thicknessMm) < 0.051 && Math.abs(e.d - diameterMm) < 0.051);
  if (diameterMm + 1e-9 >= th) {
    const hint = exact?.a === "Laesern"
      ? `Notiz · Schwelle Ø ${fmtDe(th)} mm`
      : `${fmtDe(thicknessMm)} mm: ab Ø ${fmtDe(th)} mm → Lasern (ST/VA/ALU)`;
    return { action: "Laesern", hint, threshold: th };
  }
  const hintK = exact?.a === "Koernen"
    ? `Notiz · Schwelle Ø ${fmtDe(th)} mm`
    : `${fmtDe(thicknessMm)} mm: unter Ø ${fmtDe(th)} mm → nur Körnen`;
  return { action: "Koernen", hint: hintK, threshold: th };
}

function bohrThresholdTable(entries, stepMm = 0.5) {
  const out = [];
  for (let t = BOHR_T_MIN; t <= BOHR_T_MAX + 1e-9; t += stepMm) {
    const tt = Math.round(t * 100) / 100;
    if (tt > 3 && Math.abs(tt % 1) > 0.01) continue;
    out.push({ t: tt, d: Math.round(bohrMinLaserDiameter(entries, tt) * 100) / 100 });
  }
  return out;
}

function gewindeCore(label) {
  if (!label) return null;
  const hit = GEWINDE.find(g => g[0].toLowerCase() === String(label).trim().toLowerCase());
  return hit ? { label: hit[0], core: hit[1] } : null;
}

/* ========== Entlastungsschlitze (wie WPF EntlastungService) ========== */
const ENT_T_MIN = 1, ENT_T_MAX = 12;

function defaultEntlastungEntries() {
  return [
    { t: 1, w: 1 }, { t: 2, w: 1 }, { t: 3, w: 1 }, { t: 4, w: 2 },
    { t: 5, w: 3 }, { t: 6, w: 3 }, { t: 8, w: 4 }, { t: 10, w: 5 }, { t: 12, w: 5 },
  ];
}

function entSlotWidthFor(thicknessMm) {
  if (thicknessMm + 1e-9 < ENT_T_MIN || thicknessMm - 1e-9 > ENT_T_MAX) return null;
  if (thicknessMm <= 3) return 1;
  if (thicknessMm <= 4) return 2;
  if (thicknessMm <= 6) return 3;
  if (thicknessMm <= 8) return 4;
  return 5;
}

function entResolve(entries, thicknessMm) {
  if (thicknessMm + 1e-9 < ENT_T_MIN)
    return { ok: false, width: 0, hint: `Entlastungsschlitz erst ab ${fmtDe(ENT_T_MIN)} mm.` };
  if (thicknessMm - 1e-9 > ENT_T_MAX)
    return { ok: false, width: 0, hint: `Nur bis ${fmtDe(ENT_T_MAX)} mm (Kantengrenze).` };
  const exact = (entries || []).find(e => Math.abs(e.t - thicknessMm) < 0.051);
  if (exact)
    return { ok: true, width: exact.w, hint: `${fmtDe(thicknessMm)} mm → Langloch ${fmtDe(exact.w)} mm (Notiz)` };
  const w = entSlotWidthFor(thicknessMm);
  if (w == null) return { ok: false, width: 0, hint: "Kein Wert ermittelbar." };
  const rule = thicknessMm <= 3 ? "1–3 mm → Schlitz 1 mm"
    : thicknessMm <= 4 ? "4 mm → Breite 2 mm"
      : thicknessMm <= 6 ? "5–6 mm → Breite 3 mm"
        : thicknessMm <= 8 ? "7–8 mm → Breite 4 mm"
          : "9–12 mm → Breite 5 mm";
  return { ok: true, width: w, hint: `${fmtDe(thicknessMm)} mm → Langloch-Breite ${fmtDe(w)} mm · ${rule}` };
}

window.PrismaEngine = {
  find, fmtDe, fitText, getMachineMax, setMachineMax, getTools, setTools,
  defaultTools, resolveTool, marksToText, parseMarks, MACHINE_MAX_MM: 3000,
  gradesForGroup, defaultGrade, gradeDisplay, autoGrade, MATERIAL_GRADES,
  evaluateZKantung, defaultZDies, zkOpeningMm, zkAngleFactor, zkMinSteg, ZK_LIMITS, ZK_MIN_OPEN_RATIO,
  PUNCHES, punchOutlineMm, punchCatalogCaption, punchDimensionLines,
  GEWINDE, defaultBohrungEntries, bohrResolve, bohrMinLaserDiameter, bohrThresholdTable, gewindeCore,
  BOHR_T_MIN, BOHR_T_MAX,
  defaultEntlastungEntries, entResolve, entSlotWidthFor, ENT_T_MIN, ENT_T_MAX,
};
