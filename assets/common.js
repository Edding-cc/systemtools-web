"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem("st." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("st." + k, JSON.stringify(v)); } catch {} }
};
let toastTimer;
function toast(msg) {
  let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Kopiert"); }
  catch { toast("Kopieren nicht möglich"); }
}
const nf = (n, d = 1) => Number(n).toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
function fmtBits(bps) {
  if (!isFinite(bps) || bps <= 0) return "–";
  if (bps >= 1e9) return nf(bps / 1e9, 2) + " Gbit/s";
  if (bps >= 1e6) return nf(bps / 1e6, 1) + " Mbit/s";
  return nf(bps / 1e3, 0) + " kbit/s";
}
function fmtBytes(b) {
  if (b == null || !isFinite(b)) return "–";
  const u = ["B","KB","MB","GB","TB"]; let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return nf(b, i ? 1 : 0) + " " + u[i];
}
const kv = obj => "<dl class='kv'>" + Object.entries(obj).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v == null || v === "" ? "–" : esc(v)}</dd>`).join("") + "</dl>";
const supported = ok => ok ? "<span class='badge ok'>verfügbar</span>" : "<span class='badge err'>nicht verfügbar</span>";

/* ---------- Icons ---------- */
const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  calc: I('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/>'),
  speed: I('<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>'),
  sensors: I('<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>'),
  devices: I('<rect x="2" y="4" width="14" height="10" rx="2"/><rect x="17" y="8" width="5" height="12" rx="1"/><path d="M6 18h6M9 14v4"/>'),
  fps: I('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
  battery: I('<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M6 10v4M10 10v4"/>'),
  palette: I('<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2A5.6 5.6 0 0 0 22 11c0-5-4.5-9-10-9z"/>'),
  shortcut: I('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  torch: I('<path d="M18 6H6l2 5v10h8V11z"/><path d="M6 2h12v4H6zM12 14v2"/>'),
  info: I('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  network: I('<path d="M5 12.6a10 10 0 0 1 14 0M8.5 16.1a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 20 0M12 20h.01"/>'),
  screen: I('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  mic: I('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>')
};

/* ---------- Werkzeuge / Apps ----------
   TOOLS-Felder:
     id     Ordnername (tools/<id>/ bzw. apps/<id>/)
     group  Gruppe auf der Startseite (siehe GROUPS)
     dir    "tools" oder "apps" (Oberordner)
     icon   Schlüssel in ICONS (unbekannt -> "info")
     title  Anzeigename (auch Seitentitel: "<title> · Systemtools")
     desc   Kurzbeschreibung auf der Kachel
*/
const GROUPS = ["Werkzeuge", "Spiele", "Alltag", "Technik & Lernen"];
const TOOLS = [
  { id: "rechner", group: "Werkzeuge", dir: "tools", icon: "calc", title: "Rechner", desc: "Ausdrucksrechner mit Tastenfeld und Schnellrechnen" },
  { id: "transkription", group: "Werkzeuge", dir: "tools", icon: "mic", title: "Transkription", desc: "Audio- und Videodateien in Text umwandeln, lokal auf dem Gerät" },
  { id: "speedtest", group: "Werkzeuge", dir: "tools", icon: "speed", title: "Speedtest", desc: "Internetgeschwindigkeit messen (M-Lab + Cloudflare)" },
  { id: "sensoren", group: "Werkzeuge", dir: "tools", icon: "sensors", title: "Sensoren", desc: "Bewegung, Lage, Kompass, Licht und GPS live" },
  { id: "geraete", group: "Werkzeuge", dir: "tools", icon: "devices", title: "Verbundene Geräte", desc: "Audio, Kameras, Controller, USB, HID, Bluetooth, Seriell" },
  { id: "fps", group: "Werkzeuge", dir: "tools", icon: "fps", title: "Bildrate (FPS)", desc: "Bildrate und Bildwiederholrate messen, mit Overlay" },
  { id: "akku", group: "Werkzeuge", dir: "tools", icon: "battery", title: "Akku", desc: "Ladestand und Ladezustand" },
  { id: "netzwerk", group: "Werkzeuge", dir: "tools", icon: "network", title: "Netzwerk", desc: "Verbindungstyp, öffentliche IP, Rechenzentrum" },
  { id: "geraeteinfo", group: "Werkzeuge", dir: "tools", icon: "info", title: "Geräteinfo", desc: "Bildschirm, Prozessor, Speicher, Browser, Grafik" },
  { id: "palette", group: "Werkzeuge", dir: "tools", icon: "palette", title: "Farbe & Palette", desc: "Akzentfarbe wählen und Farbtöne erzeugen" },
  { id: "verknuepfungen", group: "Werkzeuge", dir: "tools", icon: "shortcut", title: "Verknüpfungen", desc: "Links und Texte sammeln, Werkzeuge direkt verlinken" },
  { id: "licht", group: "Werkzeuge", dir: "tools", icon: "torch", title: "Taschenlampe & Bildschirm", desc: "Kamerablitz, Bildschirmlicht, wach halten, Vibration" }
];
const toolHref = (t, root = ROOT) => root + t.dir + "/" + t.id + "/";
const NOT_POSSIBLE = [
  ["Systemfarbe einstellen", "Browser dürfen die Systemfarbe nicht ändern. Hier gibt es stattdessen „Farbe & Palette“."],
  ["Temperaturen auslesen", "Browser haben keinen Zugriff auf Temperatursensoren."],
  ["Austaste-Aktionen", "Hardwaretasten sind für Webseiten nicht erreichbar."],
  ["Datenverbrauch-Widget", "Kein Zugriff auf die Nutzungsstatistik, und Webseiten können keine Widgets anlegen."],
  ["iperf3", "Browser können keine rohen TCP-Verbindungen öffnen."],
  ["Bildschirm übertragen", "Miracast und Cast-Suche per mDNS sind im Browser nicht verfügbar. Chrome bietet „Streamen“ im eigenen Menü."]
];

/* ---------- Einstellungen / Theme ---------- */
const settings = Object.assign({ theme: "system", oled: false, accent: "#1F3A5F" }, store.get("settings", {}));
function hexToRgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function luminance(hex) { return hexToRgb(hex).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); }
const mql = matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  const r = document.documentElement;
  if (settings.theme === "system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", settings.theme);
  const dark = settings.theme === "dark" || (settings.theme === "system" && mql.matches);
  r.dataset.dark = dark ? "1" : "0";
  r.classList.toggle("oled", !!settings.oled);
  // Im Dark-Mode dunkle Akzentfarben aufhellen, sonst verschwinden Knöpfe im Hintergrund
  let ui = settings.accent;
  if (dark && luminance(ui) < .18) { const [h, s] = rgbToHsl(hexToRgb(ui)); ui = hslToHex(h, Math.min(s, 70), 72); }
  r.style.setProperty("--accent", ui);
  r.style.setProperty("--on-accent", luminance(ui) > .4 ? "#111" : "#fff");
  const mt = $('meta[name="theme-color"]'); if (mt) mt.content = settings.accent;
}
mql.addEventListener?.("change", applyTheme);
function saveSettings() { store.set("settings", settings); applyTheme(); }
applyTheme();
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s * 100, l * 100];
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0"); };
  return "#" + f(0) + f(8) + f(4);
}

/* ---------- FPS-Overlay (seitenübergreifend) ---------- */
const fpsCfg = Object.assign({ on: false, pos: 2, color: "#ffffff", bg: "#000000", bgOn: true, bgAlpha: 60, size: 16, radius: 8 }, store.get("fps", {}));
const fpsMeter = {
  frames: [], subs: new Set(), raf: 0, fps: 0,
  tick(t) {
    const f = fpsMeter.frames; f.push(t);
    while (f.length && t - f[0] > 1000) f.shift();
    fpsMeter.fps = f.length;
    fpsMeter.subs.forEach(fn => fn(t));
    fpsMeter.raf = requestAnimationFrame(fpsMeter.tick);
  },
  sub(fn) { fpsMeter.subs.add(fn); if (!fpsMeter.raf) fpsMeter.raf = requestAnimationFrame(fpsMeter.tick); return () => { fpsMeter.subs.delete(fn); if (!fpsMeter.subs.size) { cancelAnimationFrame(fpsMeter.raf); fpsMeter.raf = 0; fpsMeter.frames = []; } }; }
};
let overlayUnsub = null;
function applyOverlay() {
  store.set("fps", fpsCfg);
  let o = $("#fpsOverlay");
  if (!fpsCfg.on) { if (o) o.style.display = "none"; overlayUnsub?.(); overlayUnsub = null; return; }
  if (!o) { o = document.createElement("div"); o.id = "fpsOverlay"; document.body.appendChild(o); }
  const col = fpsCfg.pos % 3, row = Math.floor(fpsCfg.pos / 3);
  const [r, g, b] = hexToRgb(fpsCfg.bg);
  Object.assign(o.style, {
    display: "block", color: fpsCfg.color, fontSize: fpsCfg.size + "px", borderRadius: fpsCfg.radius + "px",
    background: fpsCfg.bgOn ? `rgba(${r},${g},${b},${fpsCfg.bgAlpha / 100})` : "transparent",
    top: row === 0 ? "calc(8px + env(safe-area-inset-top))" : row === 1 ? "50%" : "auto",
    bottom: row === 2 ? "calc(8px + env(safe-area-inset-bottom))" : "auto",
    left: col === 0 ? "8px" : col === 1 ? "50%" : "auto", right: col === 2 ? "8px" : "auto",
    transform: `translate(${col === 1 ? "-50%" : "0"},${row === 1 ? "-50%" : "0"})`
  });
  if (!overlayUnsub) { let last = 0; overlayUnsub = fpsMeter.sub(t => { if (t - last > 250) { last = t; o.textContent = fpsMeter.fps + " FPS"; } }); }
}


/* ---------- Seiten-Grundgerüst ---------- */
// Wurzelpfad der Seite ("../../" bei tools/NAME/, "../" bei einstellungen/, sonst "")
if (typeof ROOT === "undefined") window.ROOT = "";
// Aufräumfunktionen beim Verlassen der Seite (früher: Router-Wechsel)
const cleanup = [];
const onLeave = fn => cleanup.push(fn);
addEventListener("pagehide", () => { cleanup.splice(0).forEach(fn => { try { fn(); } catch {} }); });
// Aus dem Zurück-/Vorwärts-Cache wiederhergestellte Seiten neu laden (Zustand wäre sonst abgeräumt)
addEventListener("pageshow", e => { if (e.persisted) location.reload(); });
// Das FPS-Overlay gilt auf allen Seiten
if (document.body) applyOverlay(); else addEventListener("DOMContentLoaded", applyOverlay);
addEventListener("scroll", () => { const t = $("#top"); if (t) t.classList.toggle("scrolled", scrollY > 4); }, { passive: true });
