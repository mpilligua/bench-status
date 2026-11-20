const METRICS = [
  { key: "psnr", label: "PSNR", higher: true, fmt: 2 },
  { key: "ssim", label: "SSIM", higher: true, fmt: 3 },
  { key: "lpips", label: "LPIPS", higher: false, fmt: 3 },
  { key: "car_psnr", label: "Vehicle PSNR", higher: true, fmt: 2 },
];
const STATUS_LABEL = { done: "done", running: "running", queued: "queued", failed: "failed", todo: "not started" };
let DATA = null, METRIC = METRICS[0], OPEN = new Set();

const el = (t, a = {}, ...kids) => {
  const e = document.createElement(t);
  for (const [k, v] of Object.entries(a)) k === "class" ? (e.className = v) : k === "html" ? (e.innerHTML = v) : e.setAttribute(k, v);
  for (const k of kids) if (k != null) e.append(k);
  return e;
};
const fmt = (v, d) => (v == null || isNaN(v) ? "–" : v.toFixed(d));

async function load() {
  const r = await fetch("data.json?t=" + Date.now());
  DATA = await r.json();
  document.getElementById("updated").textContent = "updated " + DATA.updated;
  document.getElementById("protocol").textContent = DATA.protocol;
  renderMetricButtons();
  renderSummary();
  renderTable();
  renderMissing();
}

function renderMetricButtons() {
  const seg = document.getElementById("metric");
  seg.innerHTML = "";
  for (const m of METRICS) {
    const b = el("button", { class: m === METRIC ? "on" : "" }, m.label);
    b.onclick = () => { METRIC = m; renderMetricButtons(); renderTable(); };
    seg.append(b);
  }
}

function renderSummary() {
  const box = document.getElementById("summary");
  box.innerHTML = "";
  const n = DATA.scenes.length;
  for (const m of DATA.methods) {
    const c = { done: 0, running: 0, queued: 0, failed: 0, todo: 0 };
    for (const s of DATA.scenes) c[s.cells[m.key].status]++;
    const stack = el("div", { class: "stack" });
    for (const [k, col] of [["done", "--done"], ["failed", "--fail"], ["running", "--run"]])
      if (c[k]) stack.append(el("span", { style: `width:${(100 * c[k]) / n}%;background:var(${col})` }));
    const leg = el("div", { class: "legend" });
    for (const [k, col] of [["done", "--done"], ["running", "--run"], ["queued", "--queue"], ["failed", "--fail"], ["todo", "--queue"]])
      if (c[k]) leg.append(el("span", {}, el("i", { class: "dot", style: `background:var(${col})` }), `${c[k]} ${STATUS_LABEL[k]}`));
    box.append(el("div", { class: "card" },
      el("div", { class: "name" }, `${m.name} `, el("span", { class: "small" }, m.iters)),
      el("div", { class: "big" }, `${c.done + c.failed}`, el("small", {}, ` / ${n} finished`)),
      stack, leg));
  }
}

function value(cell, key) {
  return cell.status === "done" && cell.m ? cell.m[key] : null;
}

function cellNode(cell, best) {
  const td = el("td", { class: "cell" + (best ? " best" : "") });
  if (cell.status === "done") {
    td.append(el("div", { class: "v num" }, fmt(cell.m[METRIC.key], METRIC.fmt)));
    const other = METRIC.key === "car_psnr" ? ["PSNR", cell.m.psnr, 2] : ["veh.", cell.m.car_psnr, 2];
    td.append(el("div", { class: "v2" }, `${other[0]} ${fmt(other[1], other[2])}`));
  } else {
    td.append(el("span", { class: "chip " + cell.status }, STATUS_LABEL[cell.status]));
    if (cell.status === "running") {
      const p = cell.progress;
      if (p != null) td.append(el("div", { class: "pbar" }, el("span", { style: `width:${p}%` })));
      td.append(el("div", { class: "small" }, `${p != null ? p.toFixed(0) + "% · " : ""}${cell.where || ""}${cell.since ? " · since " + cell.since : ""}`));
    } else if (cell.status === "queued" && cell.where) td.append(el("div", { class: "small" }, cell.where));
    else if (cell.status === "failed") td.append(el("div", { class: "small" }, "out of memory"));
  }
  return td;
}

function renderTable() {
  const t = document.getElementById("tbl");
  t.innerHTML = "";
  const head = el("tr", {}, el("th", {}, "Scene"));
  for (const m of DATA.methods) head.append(el("th", {}, m.name));
  t.append(el("thead", {}, head));
  const body = el("tbody");
  for (const s of DATA.scenes) {
    const vals = DATA.methods.map((m) => value(s.cells[m.key], METRIC.key));
    const valid = vals.filter((v) => v != null);
    const bestV = valid.length > 1 ? (METRIC.higher ? Math.max(...valid) : Math.min(...valid)) : null;
    const tr = el("tr", { class: "scene" + (OPEN.has(s.id) ? " open" : "") },
      el("td", {}, el("div", { class: "sc" }, el("img", { src: s.thumb, alt: "", loading: "lazy" }),
        el("div", {}, el("div", { class: "t" }, `${s.dataset} ${s.short}`), el("div", { class: "d" }, `${s.speed} · ${s.frames} frames · ${s.held} held-out`)))));
    DATA.methods.forEach((m, i) => tr.append(cellNode(s.cells[m.key], bestV != null && vals[i] === bestV)));
    tr.onclick = () => { OPEN.has(s.id) ? OPEN.delete(s.id) : OPEN.add(s.id); renderTable(); };
    body.append(tr);
    if (OPEN.has(s.id)) body.append(detailRow(s));
  }
  const common = DATA.scenes.filter((s) => DATA.methods.every((m) => value(s.cells[m.key], METRIC.key) != null));
  const mr = el("tr", { class: "mean" }, el("td", {}, `Mean over ${common.length} scenes where all methods finished`));
  for (const m of DATA.methods) {
    const v = common.map((s) => value(s.cells[m.key], METRIC.key));
    mr.append(el("td", { class: "num" }, v.length ? fmt(v.reduce((a, b) => a + b, 0) / v.length, METRIC.fmt) : "–"));
  }
  body.append(mr);
  t.append(body);
}

function detailRow(s) {
  const left = el("div");
  if (s.video) left.append(el("video", { src: s.video, controls: "", autoplay: "", muted: "", loop: "", playsinline: "" }),
    el("div", { class: "small" }, "Top: GT, Ours · bottom: AD-GS, IDSplat. Held-out frames are tagged. 5 fps."));
  else left.append(el("div", { class: "small" }, "No renders yet."));
  const right = el("div");
  const tb = el("table");
  const hr = el("tr", {}, el("th", {}, "Metric"));
  for (const m of DATA.methods) hr.append(el("th", {}, m.name));
  tb.append(hr);
  const rows = [["PSNR ↑", "psnr", 2], ["SSIM ↑", "ssim", 3], ["LPIPS ↓", "lpips", 3], ["Vehicle PSNR ↑", "car_psnr", 2],
    ["Vehicle SSIM ↑", "car_ssim", 3], ["Vehicle LPIPS ↓", "car_lpips", 3], ["Train PSNR", "train_psnr", 2], ["Train − held-out", "gap", 2],
    ["Held-out views", "views", 0], ["Views with vehicles", "car_views", 0]];
  for (const [lab, k, d] of rows) {
    const r = el("tr", {}, el("td", {}, lab));
    for (const m of DATA.methods) {
      const c = s.cells[m.key];
      let v = c.status === "done" ? (k === "gap" ? (c.m.train_psnr != null ? c.m.train_psnr - c.m.psnr : null) : c.m[k]) : null;
      r.append(el("td", { class: "num" }, c.status === "done" ? fmt(v, d) : STATUS_LABEL[c.status]));
    }
    tb.append(r);
  }
  right.append(tb);
  right.append(chart(s));
  for (const m of DATA.methods) {
    const c = s.cells[m.key];
    if (c.note) right.append(el("div", { class: "note" }, el("b", {}, m.name + ": "), c.note));
  }
  return el("tr", { class: "detail" }, el("td", { colspan: String(1 + DATA.methods.length) }, el("div", { class: "det" }, left, right)));
}

function chart(s) {
  const W = 420, H = 170, P = 28;
  const series = DATA.methods.map((m, i) => ({ m, col: `var(--s${i + 1})`, pts: s.cells[m.key].status === "done" ? s.cells[m.key].m.per_frame : [] }))
    .filter((x) => x.pts.length);
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("class", "chart");
  if (!series.length) return svg;
  const all = series.flatMap((x) => x.pts.map((p) => p.psnr));
  const lo = Math.floor(Math.min(...all)), hi = Math.ceil(Math.max(...all));
  const fs = series[0].pts.map((p) => p.f);
  const X = (f) => P + ((f - fs[0]) / Math.max(1, fs[fs.length - 1] - fs[0])) * (W - P - 10);
  const Y = (v) => H - 20 - ((v - lo) / Math.max(1, hi - lo)) * (H - 40);
  const add = (tag, attrs, txt) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (txt) e.textContent = txt; svg.append(e); return e; };
  for (const v of [lo, (lo + hi) / 2, hi]) { add("line", { x1: P, x2: W - 10, y1: Y(v), y2: Y(v), class: "grid" }); add("text", { x: 2, y: Y(v) + 3 }, v.toFixed(0)); }
  add("text", { x: P, y: H - 4 }, `held-out frame ${fs[0]}`);
  add("text", { x: W - 60, y: H - 4 }, `${fs[fs.length - 1]}`);
  series.forEach((x, i) => {
    add("polyline", { points: x.pts.map((p) => `${X(p.f)},${Y(p.psnr)}`).join(" "), fill: "none", stroke: x.col, "stroke-width": 2 });
    add("text", { x: P + 6 + i * 80, y: 12, style: `fill:${x.col};font-weight:600` }, x.m.name);
  });
  return svg;
}

function renderMissing() {
  const box = document.getElementById("missing");
  box.innerHTML = "";
  for (const m of DATA.methods) {
    const left = DATA.scenes.filter((s) => !["done", "failed"].includes(s.cells[m.key].status));
    box.append(el("div", { class: "grp" }, `${m.name}: ${left.length} remaining`));
    if (left.length) {
      const ul = el("ul");
      for (const s of left) {
        const c = s.cells[m.key];
        ul.append(el("li", {}, `${s.dataset} ${s.short} — `, el("span", { class: "chip " + c.status }, STATUS_LABEL[c.status]),
          c.where ? el("span", { class: "small" }, " " + c.where) : null));
      }
      box.append(ul);
    }
  }
}

load();
setInterval(load, 300000);
