const el = (t, a = {}, ...kids) => {
  const e = document.createElement(t);
  for (const [k, v] of Object.entries(a)) k === "class" ? (e.className = v) : e.setAttribute(k, v);
  for (const k of kids) if (k != null) e.append(k);
  return e;
};

async function loadGallery() {
  const d = await (await fetch("gallery.json?t=" + Date.now())).json();
  const g = document.getElementById("gallery");
  for (const s of d) g.append(el("figure", {}, el("video", { src: s.video, poster: s.poster, controls: "", muted: "", loop: "", playsinline: "", preload: "none" }), el("figcaption", {}, s.name)));
}
loadGallery();
