(() => {
  const E = window.PrismaEngine;
  const {
    find, fmtDe, fitText, getMachineMax, setMachineMax, getTools, setTools,
    defaultTools, resolveTool, marksToText, parseMarks,
  } = E;

  const STORE_ROWS = "prisma-web-rows";
  const STORE_TOOLS = "prisma-web-tools";
  const STORE_MAX = "prisma-web-machineMax";

  let baseRows = [];
  let rows = [];
  let editBuffer = [];
  let currentTool = null;

  const el = {
    group: document.getElementById("group"),
    material: document.getElementById("material"),
    thickness: document.getElementById("thickness"),
    fertigung: document.getElementById("fertigung"),
    laenge: document.getElementById("laenge"),
    laengeHint: document.getElementById("laengeHint"),
    hero: document.getElementById("hero"),
    heroLabel: document.getElementById("heroLabel"),
    heroPrisma: document.getElementById("heroPrisma"),
    heroDetail: document.getElementById("heroDetail"),
    tbody: document.getElementById("rows"),
    status: document.getElementById("status"),
    btnSettings: document.getElementById("btnSettings"),
    modalSettings: document.getElementById("modalSettings"),
    modalPrisma: document.getElementById("modalPrisma"),
    btnPrismaAnpassung: document.getElementById("btnPrismaAnpassung"),
    btnCloseSettings: document.getElementById("btnCloseSettings"),
    btnSaveMachine: document.getElementById("btnSaveMachine"),
    cfgMachineMax: document.getElementById("cfgMachineMax"),
    editGroup: document.getElementById("editGroup"),
    editMaterial: document.getElementById("editMaterial"),
    editPrisma: document.getElementById("editPrisma"),
    editValues: document.getElementById("editValues"),
    editEmpty: document.getElementById("editEmpty"),
    editRows: document.getElementById("editRows"),
    toolLabel: document.getElementById("toolLabel"),
    toolV: document.getElementById("toolV"),
    toolMinLeg: document.getElementById("toolMinLeg"),
    toolMaxLen: document.getElementById("toolMaxLen"),
    toolUniV: document.getElementById("toolUniV"),
    toolMarks: document.getElementById("toolMarks"),
    btnAddDicke: document.getElementById("btnAddDicke"),
    btnSavePrisma: document.getElementById("btnSavePrisma"),
    btnCancelPrisma: document.getElementById("btnCancelPrisma"),
    btnResetTable: document.getElementById("btnResetTable"),
  };

  function parseDe(text) {
    if (!text || !String(text).trim()) return null;
    const s = String(text).trim().replace(/\s/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function cloneRows(list) {
    return list.map(r => ({ ...r }));
  }

  function cloneTools(list) {
    return list.map(t => ({
      ...t,
      marks: (t.marks || []).map(m => [...m]),
    }));
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORE_ROWS, JSON.stringify(rows));
      localStorage.setItem(STORE_TOOLS, JSON.stringify(getTools()));
      localStorage.setItem(STORE_MAX, String(getMachineMax()));
    } catch (_) { /* ignore */ }
  }

  function loadLocalOverrides() {
    try {
      const max = localStorage.getItem(STORE_MAX);
      if (max) setMachineMax(Number(max) || 3000);
      const tools = localStorage.getItem(STORE_TOOLS);
      if (tools) {
        const parsed = JSON.parse(tools);
        if (Array.isArray(parsed) && parsed.length) setTools(parsed);
      }
      const saved = localStorage.getItem(STORE_ROWS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  function groupsOf(list) {
    return [...new Set(list.map(r => r.group))].sort((a, b) => a.localeCompare(b, "de"));
  }
  function materialsOf(list, group) {
    return [...new Set(list.filter(r => r.group === group).map(r => r.material))]
      .sort((a, b) => a.localeCompare(b, "de"));
  }
  function thicknesses(group, material) {
    return [...new Set(
      rows.filter(r => r.group === group && r.material === material && r.thickness != null)
        .map(r => r.thickness)
    )].sort((a, b) => a - b);
  }
  function prismasOf(list, group, material) {
    return [...new Set(
      list.filter(r => r.group === group && r.material === material).map(r => r.prisma)
    )].sort((a, b) => {
      const na = /^UNI/i.test(a) ? 1000 : (parseInt(a.replace(/\D/g, ""), 10) || 2000);
      const nb = /^UNI/i.test(b) ? 1000 : (parseInt(b.replace(/\D/g, ""), 10) || 2000);
      return na - nb || a.localeCompare(b, "de");
    });
  }

  function fillSelect(sel, items, selected) {
    sel.innerHTML = "";
    items.forEach(v => {
      const o = document.createElement("option");
      o.value = String(v);
      o.textContent = typeof v === "number" ? fmtDe(v) : v;
      if (String(v) === String(selected)) o.selected = true;
      sel.appendChild(o);
    });
  }

  function updateLengthHint() {
    const uni = getTools().find(t => t.isUni);
    const uniMax = uni?.maxBend ?? 1000;
    el.laengeHint.textContent =
      `Maschine max. ${fmtDe(getMachineMax())} mm · Uniband max. ${fmtDe(uniMax)} mm · Empfehlung: geringste Gesamtkraft`;
    el.cfgMachineMax.value = fmtDe(getMachineMax());
  }

  function refreshMaterials() {
    const g = el.group.value;
    const mats = materialsOf(rows, g);
    fillSelect(el.material, mats, mats[0]);
    refreshThicknesses();
  }

  function refreshThicknesses() {
    const thicks = thicknesses(el.group.value, el.material.value);
    const idx = Math.min(2, Math.max(0, thicks.length - 1));
    fillSelect(el.thickness, thicks, thicks[idx]);
    recalc();
  }

  function refreshMainSelectors(keep) {
    const prevG = keep?.group || el.group.value;
    const prevM = keep?.material || el.material.value;
    const prevT = keep?.thickness || el.thickness.value;
    const gs = groupsOf(rows);
    fillSelect(el.group, gs, gs.includes(prevG) ? prevG : (gs.includes("Stahl") ? "Stahl" : gs[0]));
    const mats = materialsOf(rows, el.group.value);
    fillSelect(el.material, mats, mats.includes(prevM) ? prevM : mats[0]);
    const thicks = thicknesses(el.group.value, el.material.value);
    const tNum = parseDe(prevT);
    const match = thicks.find(t => Math.abs(t - (tNum || -1)) <= 0.051);
    fillSelect(el.thickness, thicks, match ?? thicks[Math.min(2, thicks.length - 1)]);
    updateLengthHint();
    recalc();
  }

  function recalc() {
    const group = el.group.value;
    const material = el.material.value;
    const thickness = parseDe(el.thickness.value);
    const fert = parseDe(el.fertigung.value);
    const laenge = parseDe(el.laenge.value);
    if (thickness == null) {
      el.tbody.innerHTML = "";
      el.heroPrisma.textContent = "—";
      el.heroDetail.textContent = "Blechdicke wählen";
      return;
    }

    const results = find(rows, group, material, thickness, fert, laenge);
    const best = results.find(r => r.empfohlen);

    el.tbody.innerHTML = "";
    results.forEach((r, i) => {
      const tr = document.createElement("tr");
      if (r.empfohlen) tr.className = "ok";
      else if (!r.ok) tr.className = "bad";
      else if (i % 2) tr.className = "alt";
      const kraft = r.load == null ? "—" : Math.round(r.load).toLocaleString("de-DE") + " kN/m"
        + (/^UNI/i.test(r.row.prisma) ? " (V≈45)" : "");
      const gesamt = r.total == null ? "—" : Math.round(r.total).toLocaleString("de-DE") + " kN";
      const minKante = r.tool?.minLeg == null ? "—" : fmtDe(r.tool.minLeg);
      const status = r.empfohlen ? "empfohlen" : (r.reason || "");
      tr.innerHTML = `
        <td>${r.row.prisma}</td>
        <td>${r.dickeLabel}</td>
        <td>${fitText(r.fit)}</td>
        <td>${kraft}</td>
        <td>${gesamt}</td>
        <td>${minKante}</td>
        <td>${r.row.verfahren || "—"}</td>
        <td>${r.row.radiusText || "—"}</td>
        <td>${r.row.massabzug == null ? "—" : fmtDe(r.row.massabzug)}</td>
        <td>${r.abw == null ? "—" : fmtDe(r.abw)}</td>
        <td>${r.row.mindestAbwicklung == null ? "—" : fmtDe(r.row.mindestAbwicklung)}</td>
        <td>${status}</td>`;
      el.tbody.appendChild(tr);
    });

    if (!best) {
      el.hero.classList.add("fail");
      el.heroLabel.textContent = "NICHT MÖGLICH";
      el.heroPrisma.textContent = "—";
      el.heroDetail.textContent = results.length
        ? "Kein Werkzeug passt (Überlast, Länge, Mindestkante oder Min.-Abwicklung)."
        : "Keine Treffer in der Tabelle.";
      el.status.textContent = results.length
        ? `${results.length} Einträge — alle gesperrt.`
        : "Keine Treffer.";
      return;
    }

    el.hero.classList.remove("fail");
    el.heroLabel.textContent = "EMPFOHLEN";
    el.heroPrisma.textContent = best.row.prisma;
    const parts = [
      best.row.material,
      best.dickeLabel + " mm",
      "Belastung " + fitText(best.fit),
      "Maßabzug " + (best.row.massabzug == null ? "—" : fmtDe(best.row.massabzug)),
    ];
    if (best.load != null) parts.push(Math.round(best.load).toLocaleString("de-DE") + " kN/m");
    if (best.total != null) parts.push("Gesamt " + Math.round(best.total).toLocaleString("de-DE") + " kN");
    if (best.tool?.minLeg != null) parts.push("Mindestkante " + fmtDe(best.tool.minLeg) + " mm");
    if (best.row.radiusText) parts.push(best.row.radiusText);
    if (best.abw != null) parts.push("Abwicklung " + fmtDe(best.abw) + " mm");
    el.heroDetail.textContent = parts.join(" · ");

    const blocked = results.filter(r => !r.ok).length;
    let note = `${results.length} Prismen — empfohlen: ${best.row.prisma} (geringste Gesamtkraft unter den machbaren).`;
    if (laenge != null) note += ` Länge ${fmtDe(laenge)} mm.`;
    if (blocked) note += ` ${blocked} nicht möglich (rot).`;
    el.status.textContent = note;
  }

  function openModal(node) { node.hidden = false; document.body.style.overflow = "hidden"; }
  function closeModal(node) { node.hidden = true; document.body.style.overflow = ""; }

  function openSettings() {
    el.cfgMachineMax.value = fmtDe(getMachineMax());
    openModal(el.modalSettings);
  }

  function openPrismaEditor() {
    editBuffer = cloneRows(rows);
    const gs = groupsOf(editBuffer);
    fillSelect(el.editGroup, gs, gs.includes("Stahl") ? "Stahl" : gs[0]);
    refreshEditMaterials();
    closeModal(el.modalSettings);
    openModal(el.modalPrisma);
  }

  function refreshEditMaterials() {
    const mats = materialsOf(editBuffer, el.editGroup.value);
    fillSelect(el.editMaterial, mats, mats[0]);
    refreshEditPrismas();
  }

  function refreshEditPrismas() {
    const ps = prismasOf(editBuffer, el.editGroup.value, el.editMaterial.value);
    fillSelect(el.editPrisma, ps, ps[0]);
    loadEditValues();
  }

  function loadEditValues() {
    const g = el.editGroup.value;
    const m = el.editMaterial.value;
    const p = el.editPrisma.value;
    if (!g || !m || !p) {
      el.editValues.hidden = true;
      el.editEmpty.hidden = false;
      return;
    }
    el.editValues.hidden = false;
    el.editEmpty.hidden = true;

    currentTool = resolveTool(p);
    if (currentTool) {
      el.toolLabel.value = currentTool.label || p;
      el.toolV.value = currentTool.isUni ? "0" : String(currentTool.v);
      el.toolMinLeg.value = fmtDe(currentTool.minLeg);
      el.toolMaxLen.value = currentTool.maxBend != null ? fmtDe(currentTool.maxBend) : "";
      el.toolUniV.value = currentTool.uniV != null ? fmtDe(currentTool.uniV) : "";
      el.toolMarks.value = marksToText(currentTool.marks);
      el.toolUniV.disabled = !currentTool.isUni;
    } else {
      el.toolLabel.value = p;
      el.toolV.value = "";
      el.toolMinLeg.value = "";
      el.toolMaxLen.value = "";
      el.toolUniV.value = "";
      el.toolMarks.value = "";
      el.toolUniV.disabled = true;
    }

    renderEditRows();
  }

  function filteredEditRows() {
    return editBuffer.filter(r =>
      r.group === el.editGroup.value
      && r.material === el.editMaterial.value
      && r.prisma === el.editPrisma.value
    ).sort((a, b) => (a.thickness || 0) - (b.thickness || 0));
  }

  function renderEditRows() {
    const list = filteredEditRows();
    el.editRows.innerHTML = "";
    list.forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input data-f="dicke" data-i="${idx}" value="${r.thicknessLabel || fmtDe(r.thickness) || ""}"/></td>
        <td><input data-f="verfahren" data-i="${idx}" value="${r.verfahren || ""}"/></td>
        <td><input data-f="radius" data-i="${idx}" value="${r.radiusText || ""}"/></td>
        <td><input data-f="ma" data-i="${idx}" value="${r.massabzug == null ? "" : fmtDe(r.massabzug)}"/></td>
        <td><input data-f="min" data-i="${idx}" value="${r.mindestAbwicklung == null ? "" : fmtDe(r.mindestAbwicklung)}"/></td>
        <td><button type="button" class="btn btn-sm" data-del="${idx}">✕</button></td>`;
      el.editRows.appendChild(tr);
    });
    el.editRows.dataset.count = String(list.length);
  }

  function syncEditInputsToBuffer() {
    const list = filteredEditRows();
    el.editRows.querySelectorAll("input[data-f]").forEach(inp => {
      const i = Number(inp.dataset.i);
      const f = inp.dataset.f;
      const row = list[i];
      if (!row) return;
      if (f === "dicke") {
        row.thicknessLabel = inp.value.trim();
        row.thickness = parseDe(inp.value);
      } else if (f === "verfahren") row.verfahren = inp.value.trim();
      else if (f === "radius") row.radiusText = inp.value.trim();
      else if (f === "ma") {
        const n = parseDe(inp.value);
        row.massabzug = inp.value.trim() === "" ? null : n;
      } else if (f === "min") {
        const n = parseDe(inp.value);
        row.mindestAbwicklung = inp.value.trim() === "" ? null : n;
      }
    });
  }

  el.btnSettings.addEventListener("click", openSettings);
  el.btnCloseSettings.addEventListener("click", () => closeModal(el.modalSettings));
  el.btnPrismaAnpassung.addEventListener("click", openPrismaEditor);
  el.btnCancelPrisma.addEventListener("click", () => closeModal(el.modalPrisma));

  el.btnSaveMachine.addEventListener("click", () => {
    const n = parseDe(el.cfgMachineMax.value);
    setMachineMax(n || 3000);
    saveLocal();
    updateLengthHint();
    recalc();
    el.status.textContent = "Maschinen-Max. gespeichert (dieser Browser).";
  });

  el.editGroup.addEventListener("change", refreshEditMaterials);
  el.editMaterial.addEventListener("change", refreshEditPrismas);
  el.editPrisma.addEventListener("change", () => {
    syncEditInputsToBuffer();
    loadEditValues();
  });

  el.btnAddDicke.addEventListener("click", () => {
    syncEditInputsToBuffer();
    editBuffer.push({
      group: el.editGroup.value,
      material: el.editMaterial.value,
      prisma: el.editPrisma.value,
      thickness: null,
      thicknessLabel: "",
      verfahren: "",
      radiusText: "",
      massabzug: null,
      mindestAbwicklung: null,
    });
    renderEditRows();
  });

  el.editRows.addEventListener("click", e => {
    const btn = e.target.closest("[data-del]");
    if (!btn) return;
    syncEditInputsToBuffer();
    const list = filteredEditRows();
    const row = list[Number(btn.dataset.del)];
    if (!row) return;
    editBuffer = editBuffer.filter(r => r !== row);
    renderEditRows();
  });

  el.btnSavePrisma.addEventListener("click", () => {
    syncEditInputsToBuffer();
    // replace rows for current material/prisma selection already in buffer
    rows = cloneRows(editBuffer).filter(r => r.prisma && r.material);

    if (currentTool) {
      const tools = cloneTools(getTools());
      const marks = parseMarks(el.toolMarks.value);
      const updated = {
        ...currentTool,
        label: el.toolLabel.value.trim() || currentTool.label,
        v: currentTool.isUni ? 0 : (parseDe(el.toolV.value) || currentTool.v),
        minLeg: parseDe(el.toolMinLeg.value) ?? currentTool.minLeg,
        maxBend: el.toolMaxLen.value.trim() === "" ? null : parseDe(el.toolMaxLen.value),
        uniV: currentTool.isUni ? (parseDe(el.toolUniV.value) ?? 45) : null,
        marks: marks.length ? marks : currentTool.marks,
        rm: currentTool.rm || 450,
        isUni: currentTool.isUni,
      };
      const idx = tools.findIndex(t =>
        (t.isUni && updated.isUni) || (!t.isUni && !updated.isUni && t.v === updated.v)
      );
      if (idx >= 0) tools[idx] = updated;
      else tools.push(updated);
      setTools(tools);
    }

    saveLocal();
    closeModal(el.modalPrisma);
    refreshMainSelectors();
    el.status.textContent = `Prisma/Werkstoff gespeichert — ${rows.length} Zeilen (dieser Browser).`;
  });

  el.btnResetTable.addEventListener("click", () => {
    if (!confirm("Alle Prisma-/Werkstoff-Werte auf Standard zurücksetzen?")) return;
    localStorage.removeItem(STORE_ROWS);
    localStorage.removeItem(STORE_TOOLS);
    localStorage.removeItem(STORE_MAX);
    setTools(defaultTools());
    setMachineMax(3000);
    rows = cloneRows(baseRows);
    editBuffer = cloneRows(rows);
    closeModal(el.modalPrisma);
    refreshMainSelectors();
    el.status.textContent = `${rows.length} Zeilen Standard geladen.`;
  });

  el.modalSettings.addEventListener("click", e => {
    if (e.target === el.modalSettings) closeModal(el.modalSettings);
  });
  el.modalPrisma.addEventListener("click", e => {
    if (e.target === el.modalPrisma) closeModal(el.modalPrisma);
  });

  el.group.addEventListener("change", refreshMaterials);
  el.material.addEventListener("change", refreshThicknesses);
  el.thickness.addEventListener("change", recalc);
  el.fertigung.addEventListener("input", recalc);
  el.laenge.addEventListener("input", recalc);

  fetch("table.json")
    .then(r => {
      if (!r.ok) throw new Error("table.json nicht geladen");
      return r.json();
    })
    .then(data => {
      baseRows = data.map(d => ({
        group: d.group,
        material: d.material,
        thickness: d.thickness,
        thicknessLabel: d.thicknessLabel || (d.thickness != null ? fmtDe(d.thickness) : ""),
        prisma: d.prisma,
        verfahren: d.verfahren || "",
        radiusText: d.radiusText || "",
        massabzug: d.massabzug,
        mindestAbwicklung: d.mindestAbwicklung,
      }));
      const saved = loadLocalOverrides();
      rows = saved ? cloneRows(saved) : cloneRows(baseRows);
      refreshMainSelectors();
      const src = saved ? "gespeicherte Einstellungen" : "Standard";
      el.status.textContent = `${rows.length} Zeilen geladen (${src}).`;
    })
    .catch(err => {
      el.status.textContent = "Fehler: " + err.message;
    });
})();
