(() => {
  const { find, fmtDe, fitText, MACHINE_MAX_MM } = window.PrismaEngine;
  let rows = [];

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
  };

  function parseDe(text) {
    if (!text || !String(text).trim()) return null;
    const s = String(text).trim().replace(/\s/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function groups() {
    return [...new Set(rows.map(r => r.group))].sort((a, b) => a.localeCompare(b, "de"));
  }
  function materials(group) {
    return [...new Set(rows.filter(r => r.group === group).map(r => r.material))].sort((a, b) => a.localeCompare(b, "de"));
  }
  function thicknesses(group, material) {
    return [...new Set(
      rows.filter(r => r.group === group && r.material === material && r.thickness != null)
        .map(r => r.thickness)
    )].sort((a, b) => a - b);
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

  function refreshMaterials() {
    const g = el.group.value;
    const mats = materials(g);
    fillSelect(el.material, mats, mats[0]);
    refreshThicknesses();
  }

  function refreshThicknesses() {
    const thicks = thicknesses(el.group.value, el.material.value);
    const idx = Math.min(2, Math.max(0, thicks.length - 1));
    fillSelect(el.thickness, thicks, thicks[idx]);
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
      const status = r.empfohlen ? "empfohlen" : (r.reason || "");
      tr.innerHTML = `
        <td>${r.row.prisma}</td>
        <td>${r.dickeLabel}</td>
        <td>${fitText(r.fit)}</td>
        <td>${kraft}</td>
        <td>${gesamt}</td>
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
        ? "Kein Werkzeug passt (Überlast, Länge, Schenkel oder Min.-Abwicklung)."
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
    if (best.row.radiusText) parts.push(best.row.radiusText);
    if (best.abw != null) parts.push("Abwicklung " + fmtDe(best.abw) + " mm");
    el.heroDetail.textContent = parts.join(" · ");

    const blocked = results.filter(r => !r.ok).length;
    let note = `${results.length} Prismen — empfohlen: ${best.row.prisma} (geringste Gesamtkraft unter den machbaren).`;
    if (laenge != null) note += ` Länge ${fmtDe(laenge)} mm.`;
    if (blocked) note += ` ${blocked} nicht möglich (rot).`;
    el.status.textContent = note;
  }

  el.group.addEventListener("change", refreshMaterials);
  el.material.addEventListener("change", refreshThicknesses);
  el.thickness.addEventListener("change", recalc);
  el.fertigung.addEventListener("input", recalc);
  el.laenge.addEventListener("input", recalc);

  el.laengeHint.textContent =
    `Maschine max. ${MACHINE_MAX_MM} mm · Uniband max. 1000 mm · Empfehlung: geringste Gesamtkraft`;

  fetch("table.json")
    .then(r => {
      if (!r.ok) throw new Error("table.json nicht geladen");
      return r.json();
    })
    .then(data => {
      rows = data.map(d => ({
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
      fillSelect(el.group, groups(), groups().includes("Stahl") ? "Stahl" : groups()[0]);
      refreshMaterials();
      el.status.textContent = `${rows.length} Zeilen geladen (Web-Test).`;
    })
    .catch(err => {
      el.status.textContent = "Fehler: " + err.message;
    });
})();
