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
load();
