/** Kernlogik (wie WPF ToolLoad + TableService) */
let MACHINE_MAX_MM = 3000;
const RM = 450;

const FIT = { Optimal: 3, Moeglich: 2, Eingeschraenkt: 1, Unzulaessig: 0 };

function die(v, minLeg, marks) {
  return { v, minLeg, label: "V-" + v, isUni: false, uniV: null, maxBend: null, marks: marks.map(m => [...m]), rm: RM };
}
function uni() {
  return {
    v: 0, minLeg: 6, label: "UNI", isUni: true, uniV: 45, maxBend: 1000,
    marks: [[0.5, "-"], [1.5, "x"], [3.0, "-"], [4.0, "-"]], rm: RM
  };
}

function defaultTools() {
  return [
    die(6, 4.5, [[0.5, "-"], [0.8, "x"], [1.0, "-"], [1.2, "!"]]),
    die(8, 6.0, [[0.5, "!"], [0.8, "-"], [1.0, "x"], [1.2, "-"], [1.5, "!"]]),
    die(10, 7.5, [[0.8, "!"], [1.0, "-"], [1.2, "x"], [1.5, "-"], [2.0, "!"]]),
    die(16, 12.0, [[1.2, "!"], [1.5, "-"], [2.0, "x"], [2.5, "-"], [3.0, "!"]]),
    die(20, 15.0, [[1.5, "!"], [2.0, "-"], [2.5, "x"], [3.0, "-"], [4.0, "!"]]),
    die(24, 18.0, [[2.0, "!"], [2.5, "-"], [3.0, "x"], [4.0, "-"], [5.0, "!"]]),
    die(30, 22.5, [[2.5, "!"], [3.0, "-"], [4.0, "x"], [5.0, "-"], [6.0, "!"]]),
    die(40, 30.0, [[3.0, "!"], [4.0, "-"], [5.0, "x"], [6.0, "-"], [8.0, "!"]]),
    die(50, 37.5, [[4.0, "!"], [5.0, "-"], [6.0, "x"], [8.0, "-"], [10.0, "!"]]),
    die(60, 45.0, [[5.0, "!"], [6.0, "x"], [8.0, "-"], [10.0, "!"]]),
    die(70, 52.5, [[6.0, "!"], [8.0, "x"], [10.0, "-"]]),
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

function loadKnPerM(tool, thickness) {
  if (!tool || thickness <= 0) return null;
  const v = effectiveV(tool);
  if (v <= 0) return null;
  return 1.42 * tool.rm * thickness * thickness / v;
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

function evaluatePossible(row, tool, fitVal, fert, abw, laenge) {
  if (fitVal === "Unzulaessig") return { ok: false, reason: "unzulässig" };
  if (fitVal === "Eingeschraenkt") return { ok: false, reason: "Überlast" };
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

function find(rows, group, material, thickness, fert, laenge) {
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
  const lengthM = laenge != null && laenge > 0 ? laenge / 1000 : null;
  const scored = match.map(r => {
    const tool = resolveTool(r.prisma);
    const f = tool ? fit(tool, thickness) : "Unzulaessig";
    const abw = abwicklung(r, fert);
    const load = tool ? loadKnPerM(tool, thickness) : null;
    const total = load != null && lengthM != null ? load * lengthM : null;
    const ev = evaluatePossible(r, tool, f, fert, abw, laenge);
    return { row: r, tool, fit: f, load, total, abw, ok: ev.ok, reason: ev.reason };
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

window.PrismaEngine = {
  find, fmtDe, fitText, getMachineMax, setMachineMax, getTools, setTools,
  defaultTools, resolveTool, marksToText, parseMarks, MACHINE_MAX_MM: 3000,
};
