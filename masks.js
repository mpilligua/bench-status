const el = (t, a = {}, ...kids) => {
  const e = document.createElement(t);
  for (const [k, v] of Object.entries(a)) k === "class" ? (e.className = v) : e.setAttribute(k, v);
  for (const k of kids) if (k != null) e.append(k);
  return e;
};

async function load() {
  const d = await (await fetch("masks.json?t=" + Date.now())).json();
  document.getElementById("dil").textContent = d.dilation_px;
  const keys = [];
  for (const s of d.scenes) for (const v of s.variants) if (!keys.find((k) => k.key === v.key)) keys.push(v);
  const t = document.getElementById("cov");
  const hr = el("tr", {}, el("th", {}, "Scene"));
  for (const k of keys) hr.append(el("th", {}, k.label));
  t.append(el("thead", {}, hr));
  const tb = el("tbody");
  for (const s of d.scenes) {
    const r = el("tr", { class: "scene" }, el("td", {}, s.name.split("_").slice(1).join(" ")));
    for (const k of keys) {
      const v = s.variants.find((x) => x.key === k.key);
      r.append(el("td", { class: "num" }, v ? `${v.px.toFixed(2)}%` : "–"));
    }
    r.onclick = () => document.getElementById("s_" + s.id).scrollIntoView({ behavior: "smooth" });
    tb.append(r);
  }
  t.append(tb);
  const box = document.getElementById("scenes");
  for (const s of d.scenes) {
    const vid = el("video", { src: s.video, controls: "", muted: "", loop: "", playsinline: "", preload: "none", poster: s.strip });
    const lst = el("div", { class: "small" }, s.variants.map((v) => `${v.label}: ${v.px.toFixed(2)}% (max ${v.px_max.toFixed(1)}%)`).join(" · "));
    box.append(el("section", { class: "panel", id: "s_" + s.id },
      el("h2", {}, s.name.split("_").slice(1).join(" ")),
      el("p", { class: "hint" }, `${s.frames} frames, every 4th held out. Strip: four frames; press play for all frames at 5 fps.`),
      el("img", { src: s.strip, class: "strip", loading: "lazy", alt: "" }),
      vid, lst));
  }
}
async function loadShadow() {
  const d = await (await fetch("shadow.json?t=" + Date.now())).json();
  const defs = {
    vehicle: "Our vehicle masks, exactly what all models receive now.",
    shadowT: "Vehicle mask dilated 10 px, plus road pixels that are clearly darker than their median over the other frames where no vehicle covers them (temporal shadow), keeping the component that touches the vehicle.",
    shadowTS: "T plus same-frame shadow: road pixels clearly darker than the local bright road in the same frame, checked against the road plane, touching a vehicle.",
    shadowTSC: "TS plus dark road regions found in the render of a background trained 10k steps with TS (shadows that got baked into it), touching the vehicle region.",
  };
  const ul = document.getElementById("shadow_def");
  for (const v of d.variants) ul.append(el("li", {}, el("b", {}, v.label + ": "), defs[v.key] || ""));
  const t = document.getElementById("shadow_tab");
  t.append(el("thead", {}, el("tr", {}, el("th", {}, "Variant"), el("th", {}, "Mask, % of pixels"), el("th", {}, "Added over previous, % of pixels"))));
  const tb = el("tbody");
  for (const v of d.variants) tb.append(el("tr", {}, el("td", {}, v.label), el("td", { class: "num" }, v.px.toFixed(2) + "%"), el("td", { class: "num" }, v.added.toFixed(2) + "%")));
  t.append(tb);
  document.getElementById("shadow_strip").src = d.strip;
  const vid = document.getElementById("shadow_video");
  vid.poster = d.strip;
  vid.src = d.video;
}
load();
loadShadow();
