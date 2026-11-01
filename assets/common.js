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
  mic: I('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>'),
  minesweeper: I('<circle cx="12" cy="13" r="6"/><path d="M12 3v3M12 20v1M3 13h1M20 13h1M5.6 6.6l1.4 1.4M18.4 6.6L17 8"/>'),
  g2048: I('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>'),
  snake: I('<path d="M3 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h10"/><circle cx="19" cy="7" r="1"/>'),
  tetris: I('<path d="M4 4h16v6h-5v10H9V10H4z"/>'),
  sudoku: I('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>'),
  memory: I('<rect x="3" y="6" width="10" height="14" rx="2"/><path d="M9 6V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>'),
  schiebepuzzle: I('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v18"/><path d="M15 15h3v3h-3z"/>'),
  tictactoe: I('<path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>'),
  notizen: I('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  todo: I('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>'),
  stoppuhr: I('<circle cx="12" cy="14" r="8"/><path d="M12 10v4l2 2M10 2h4M12 2v4"/>'),
  timer: I('<path d="M6 2h12M6 22h12M7 2v4l5 6 5-6V2M7 22v-4l5-6 5 6v4"/>'),
  wuerfel: I('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="16" cy="16" r="1.2"/>'),
  passwort: I('<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20 3M16 7l3 3M18 5l2 2"/>'),
  einheiten: I('<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>'),
  prozent: I('<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>'),
  trinkgeld: I('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'),
  zaehler: I('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12h8M12 8v8"/>'),
  datum: I('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 15h2"/>'),
  text: I('<path d="M4 7V4h16v3M9 20h6M12 4v16"/>'),
  subnetz: I('<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>'),
  zahlensysteme: I('<path d="M5 4h2v6M5 10h4M17 4a2 2 0 0 0-2 2v2a2 2 0 0 0 4 0V6a2 2 0 0 0-2-2zM7 14a2 2 0 0 0-2 2v2a2 2 0 0 0 4 0v-2a2 2 0 0 0-2-2zM15 14h2v6M15 20h4"/>'),
  ports: I('<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>'),
  lernkarten: I('<path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>'),
  befehle: I('<path d="M4 17l6-6-6-6M12 19h8"/>'),
  buchstabieren: I('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>'),
  vierreihe: I('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><circle cx="12" cy="9" r="1.5"/><circle cx="16" cy="9" r="1.5"/><circle cx="8" cy="15" r="1.5"/><circle cx="12" cy="15" r="1.5"/><circle cx="16" cy="15" r="1.5"/>'),
  reversi: I('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>'),
  codeknacken: I('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="M12 15v2"/>'),
  galgen: I('<path d="M4 21h10M7 21V3h9v3"/><circle cx="16" cy="9" r="2.5"/><path d="M16 11.5V16M13.5 14h5"/>'),
  mauerbrecher: I('<rect x="3" y="4" width="5" height="3"/><rect x="9.5" y="4" width="5" height="3"/><rect x="16" y="4" width="5" height="3"/><circle cx="12" cy="13" r="1.5"/><path d="M8 19h8"/>'),
  flattervogel: I('<circle cx="11" cy="12" r="7"/><path d="M18 11l3 1-3 1"/><path d="M13 9h.01"/><path d="M5 13c2 0 3-1 4-2"/>'),
  farbfolge: I('<path d="M12 3a9 9 0 0 1 9 9h-9z"/><path d="M12 21a9 9 0 0 1-9-9h9z"/><path d="M3 12a9 9 0 0 1 9-9v9z"/><path d="M21 12a9 9 0 0 1-9 9v-9z"/>'),
  lichteraus: I('<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>'),
  reaktion: I('<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>'),
  solitaer: I('<rect x="3" y="5" width="11" height="15" rx="2"/><path d="M10 5V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-5"/><path d="M8.5 10l2 2.5-2 2.5-2-2.5z"/>'),
  kopfrechnen: I('<path d="M5 7h4M7 5v4M15 7h4M5 17h4M15 15h4M15 19h4"/><path d="M12 3v18"/>'),
  fuenfwuerfel: I('<rect x="3" y="3" width="11" height="11" rx="2"/><path d="M14 10h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-5"/><path d="M7 7h.01M10 10h.01M14.5 14.5h.01M17 17h.01"/>'),
  pingpong: I('<rect x="7" y="3" width="10" height="3" rx="1"/><rect x="7" y="18" width="10" height="3" rx="1"/><circle cx="13" cy="12" r="1.8"/>'),
  zeichnen: I('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  gluecksrad: I('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>'),
  laufschrift: I('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h8M14 9l3 3-3 3"/>'),
  social: I('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'),
  datenvolumen: I('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 18h4"/><path d="M12 6v7M9.5 10.5L12 13l2.5-2.5"/>')
};

/* ---------- Werkzeuge / Apps ----------
   TOOLS-Felder:
     id     Ordnername (tools/<id>/ bzw. apps/<id>/)
     group  Gruppe auf der Startseite (siehe GROUPS)
     dir    "tools" oder "apps" (Oberordner)
     icon   Schlüssel in ICONS (unbekannt -> "info")
     title  Anzeigename (auch Seitentitel: "<title> · Systemtools")
     desc   Kurzbeschreibung auf der Kachel
     href   optional: externe Adresse statt der eigenen Seite (z. B. Datenvolumen)
*/
const GROUPS = ["Werkzeuge", "Spiele", "Unterhaltung", "Alltag", "Technik & Lernen"];
const TOOLS = [
  { id: "rechner", group: "Werkzeuge", dir: "tools", icon: "calc", title: "Rechner", desc: "Ausdrucksrechner mit Tastenfeld und Schnellrechnen" },
  { id: "transkription", group: "Werkzeuge", dir: "tools", icon: "mic", title: "Transkription", desc: "Audio- und Videodateien in Text umwandeln, lokal auf dem Gerät" },
  { id: "speedtest", group: "Werkzeuge", dir: "tools", icon: "speed", title: "Speedtest", desc: "Internetgeschwindigkeit messen (M-Lab + Cloudflare)" },
  { id: "sensoren", group: "Werkzeuge", dir: "tools", icon: "sensors", title: "Sensoren", desc: "Bewegung, Lage, Kompass, Licht und GPS live" },
  { id: "geraete", group: "Werkzeuge", dir: "tools", icon: "devices", title: "Verbundene Geräte", desc: "Audio, Kameras, Controller, USB, HID, Bluetooth, Seriell" },
  { id: "fps", group: "Werkzeuge", dir: "tools", icon: "fps", title: "Bildrate (FPS)", desc: "Bildrate und Bildwiederholrate messen, mit Overlay" },
  { id: "akku", group: "Werkzeuge", dir: "tools", icon: "battery", title: "Akku", desc: "Ladestand und Ladezustand" },
  { id: "netzwerk", group: "Werkzeuge", dir: "tools", icon: "network", title: "Netzwerk", desc: "Verbindungstyp, öffentliche IP, Rechenzentrum" },
  { id: "datenvolumen", group: "Werkzeuge", dir: "tools", icon: "datenvolumen", title: "Datenvolumen", desc: "Telekom: öffnet pass.telekom.de (WLAN aus)", href: "https://pass.telekom.de/" },
  { id: "geraeteinfo", group: "Werkzeuge", dir: "tools", icon: "info", title: "Geräteinfo", desc: "Bildschirm, Prozessor, Speicher, Browser, Grafik" },
  { id: "palette", group: "Werkzeuge", dir: "tools", icon: "palette", title: "Farbe & Palette", desc: "Akzentfarbe wählen und Farbtöne erzeugen" },
  { id: "verknuepfungen", group: "Werkzeuge", dir: "tools", icon: "shortcut", title: "Verknüpfungen", desc: "Links und Texte sammeln, Werkzeuge direkt verlinken" },
  { id: "licht", group: "Werkzeuge", dir: "tools", icon: "torch", title: "Taschenlampe & Bildschirm", desc: "Kamerablitz, Bildschirmlicht, wach halten, Vibration" },
  { id: "minesweeper", group: "Spiele", dir: "apps", icon: "minesweeper", title: "Minesweeper", desc: "Minen finden, mit Flaggenmodus für Touch" },
  { id: "2048", group: "Spiele", dir: "apps", icon: "g2048", title: "2048", desc: "Zahlen per Wischen verschmelzen" },
  { id: "snake", group: "Spiele", dir: "apps", icon: "snake", title: "Snake", desc: "Klassiker mit Wischen und Touch-Tasten" },
  { id: "tetris", group: "Spiele", dir: "apps", icon: "tetris", title: "Tetris", desc: "Fallende Blöcke mit Touch-Tasten" },
  { id: "sudoku", group: "Spiele", dir: "apps", icon: "sudoku", title: "Sudoku", desc: "Drei Schwierigkeitsstufen, Notizen und Tipps" },
  { id: "memory", group: "Spiele", dir: "apps", icon: "memory", title: "Memory", desc: "Paare finden, allein oder zu zweit" },
  { id: "schiebepuzzle", group: "Spiele", dir: "apps", icon: "schiebepuzzle", title: "Schiebepuzzle", desc: "Zahlen in die richtige Reihenfolge schieben" },
  { id: "tictactoe", group: "Spiele", dir: "apps", icon: "tictactoe", title: "Tic-Tac-Toe", desc: "Gegen den Computer oder zu zweit" },
  { id: "vierreihe", group: "Spiele", dir: "apps", icon: "vierreihe", title: "Vier in einer Reihe", desc: "Steine einwerfen, gegen den Computer oder zu zweit" },
  { id: "reversi", group: "Spiele", dir: "apps", icon: "reversi", title: "Reversi", desc: "Steine einschließen und umdrehen, drei Stufen" },
  { id: "codeknacken", group: "Spiele", dir: "apps", icon: "codeknacken", title: "Code knacken", desc: "Geheimen Farbcode in zehn Versuchen erraten" },
  { id: "galgen", group: "Spiele", dir: "apps", icon: "galgen", title: "Galgenmännchen", desc: "Wörter raten, auch mit eigenem Wort zu zweit" },
  { id: "mauerbrecher", group: "Spiele", dir: "apps", icon: "mauerbrecher", title: "Mauerbrecher", desc: "Mit Ball und Schläger Steine abräumen" },
  { id: "flattervogel", group: "Spiele", dir: "apps", icon: "flattervogel", title: "Flattervogel", desc: "Antippen zum Flattern, Säulen ausweichen" },
  { id: "farbfolge", group: "Spiele", dir: "apps", icon: "farbfolge", title: "Farbfolge", desc: "Leuchtende Reihenfolge merken und nachtippen" },
  { id: "lichteraus", group: "Spiele", dir: "apps", icon: "lichteraus", title: "Lichter aus", desc: "Knobelrätsel: alle Felder ausschalten" },
  { id: "reaktion", group: "Spiele", dir: "apps", icon: "reaktion", title: "Reaktionstest", desc: "Wie schnell tippst du, wenn es grün wird?" },
  { id: "solitaer", group: "Spiele", dir: "apps", icon: "solitaer", title: "Solitär", desc: "Klassische Patience, 1 oder 3 Karten ziehen" },
  { id: "kopfrechnen", group: "Spiele", dir: "apps", icon: "kopfrechnen", title: "Kopfrechnen-Duell", desc: "Zu zweit am Telefon oder allein gegen die Uhr" },
  { id: "fuenfwuerfel", group: "Spiele", dir: "apps", icon: "fuenfwuerfel", title: "Fünf Würfel", desc: "Würfelspiel mit Wertungsblock, allein oder zu zweit" },
  { id: "pingpong", group: "Spiele", dir: "apps", icon: "pingpong", title: "Ping-Pong", desc: "Gegen den Computer oder zu zweit am Gerät" },
  { id: "zeichnen", group: "Unterhaltung", dir: "apps", icon: "zeichnen", title: "Zeichenblock", desc: "Mit dem Finger malen, als Bild anzeigen" },
  { id: "gluecksrad", group: "Unterhaltung", dir: "apps", icon: "gluecksrad", title: "Glücksrad", desc: "Eigene Einträge, fair per Zufall gedreht" },
  { id: "laufschrift", group: "Unterhaltung", dir: "apps", icon: "laufschrift", title: "Laufschrift", desc: "Großer Lauftext für Konzert, Abholung, Party" },
  { id: "social", group: "Unterhaltung", dir: "apps", icon: "social", title: "Social", desc: "Bluesky und Mastodon lesen, auf Bluesky posten" },
  { id: "notizen", group: "Alltag", dir: "apps", icon: "notizen", title: "Notizen", desc: "Notizen schreiben, anheften und durchsuchen" },
  { id: "todo", group: "Alltag", dir: "apps", icon: "todo", title: "To-do-Liste", desc: "Aufgaben mit Priorität abhaken" },
  { id: "stoppuhr", group: "Alltag", dir: "apps", icon: "stoppuhr", title: "Stoppuhr", desc: "Zeit messen mit Runden" },
  { id: "timer", group: "Alltag", dir: "apps", icon: "timer", title: "Timer & Pomodoro", desc: "Countdown und Fokus-Intervalle" },
  { id: "wuerfel", group: "Alltag", dir: "apps", icon: "wuerfel", title: "Würfel & Münze", desc: "Würfeln, Münzwurf und Zufallszahlen" },
  { id: "passwort", group: "Alltag", dir: "apps", icon: "passwort", title: "Passwortgenerator", desc: "Sichere Passwörter und PINs, mit Prüfung" },
  { id: "einheiten", group: "Alltag", dir: "apps", icon: "einheiten", title: "Einheitenrechner", desc: "Länge, Gewicht, Daten, Temperatur und mehr" },
  { id: "prozent", group: "Alltag", dir: "apps", icon: "prozent", title: "Prozentrechner", desc: "Prozente, Veränderung und Mehrwertsteuer" },
  { id: "trinkgeld", group: "Alltag", dir: "apps", icon: "trinkgeld", title: "Trinkgeldrechner", desc: "Trinkgeld berechnen und Rechnung teilen" },
  { id: "zaehler", group: "Alltag", dir: "apps", icon: "zaehler", title: "Zähler", desc: "Mehrere Strichlisten zum Antippen" },
  { id: "datum", group: "Alltag", dir: "apps", icon: "datum", title: "Datum & Fristen", desc: "Tage zählen, Fristen, Kalenderwoche" },
  { id: "text", group: "Alltag", dir: "apps", icon: "text", title: "Textwerkzeuge", desc: "Zeichen zählen, Base64, URL, SHA-256" },
  { id: "subnetz", group: "Technik & Lernen", dir: "apps", icon: "subnetz", title: "Subnetzrechner", desc: "IPv4-Netze, Masken und Aufteilung" },
  { id: "zahlensysteme", group: "Technik & Lernen", dir: "apps", icon: "zahlensysteme", title: "Zahlensysteme", desc: "Binär, Hex, Dezimal umrechnen und üben" },
  { id: "ports", group: "Technik & Lernen", dir: "apps", icon: "ports", title: "Ports", desc: "Bekannte TCP- und UDP-Ports nachschlagen" },
  { id: "lernkarten", group: "Technik & Lernen", dir: "apps", icon: "lernkarten", title: "Lernkarten Netzwerk", desc: "OSI-Modell, Protokolle, Adressen üben" },
  { id: "befehle", group: "Technik & Lernen", dir: "apps", icon: "befehle", title: "Befehle", desc: "Spickzettel für Windows und Linux" },
  { id: "buchstabieren", group: "Technik & Lernen", dir: "apps", icon: "buchstabieren", title: "Buchstabieren & Morse", desc: "NATO-Alphabet, deutsche Tafel, Morsecode" }
];
const toolHref = (t, root = ROOT) => t.href || root + t.dir + "/" + t.id + "/";
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

/* ---------- Als App installieren (PWA) ---------- */
if ("serviceWorker" in navigator && isSecureContext) {
  addEventListener("load", () => navigator.serviceWorker.register(ROOT + "sw.js").catch(() => {}));
}
// Chrome/Edge/Android: Installationsangebot merken und über installApp() auslösen
const install = {
  prompt: null,
  get standalone() { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; },
  get ios() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); },
  subs: new Set(),
  notify() { this.subs.forEach(fn => { try { fn(); } catch {} }); }
};
addEventListener("beforeinstallprompt", e => { e.preventDefault(); install.prompt = e; install.notify(); });
addEventListener("appinstalled", () => { install.prompt = null; toast("Als App installiert"); install.notify(); });
async function installApp() {
  if (!install.prompt) return false;
  install.prompt.prompt();
  const { outcome } = await install.prompt.userChoice;
  install.prompt = null; install.notify();
  return outcome === "accepted";
}

/* ---------- Helfer für Apps und Spiele ---------- */
// Zufall über crypto.getRandomValues, gleichverteilt (Ablehnungsverfahren gegen Modulo-Verzerrung)
function randU32() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]; }
function rnd(n) { const lim = 2 ** 32 - (2 ** 32 % n); let x; do x = randU32(); while (x >= lim); return x % n; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pad = (n, len = 2) => String(n).padStart(len, "0");
// ms → "1:02:03" bzw. "02:03", mit tenths ",4"
function fmtDur(ms, tenths) {
  ms = Math.max(0, ms);
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  const out = (h ? h + ":" + pad(m) : pad(m)) + ":" + pad(s % 60);
  return tenths ? out + "," + Math.floor(ms % 1000 / 100) : out;
}
// "1.234,5" oder "1234.5" → Zahl, sonst NaN
function parseNum(v) {
  v = String(v ?? "").replace(/[\s ']/g, "");
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  return /^[+\-]?(\d+\.?\d*|\.\d+)(e[+\-]?\d+)?$/i.test(v) ? parseFloat(v) : NaN;
}
// Löst sofort beim Antippen aus; mit repeat (ms) wiederholt beim Halten
function onPress(el, fn, repeat) {
  let t1, t2;
  const stop = () => { clearTimeout(t1); clearInterval(t2); };
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", e => {
    if (e.button > 0) return;
    e.preventDefault(); stop(); fn(e);
    if (repeat) t1 = setTimeout(() => { t2 = setInterval(fn, repeat); }, 280);
  });
  addEventListener("pointerup", stop); addEventListener("pointercancel", stop);
}
// Wischgeste: fn("left" | "right" | "up" | "down")
function onSwipe(el, fn, minDist = 24) {
  let sx = 0, sy = 0, active = false;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", e => { sx = e.clientX; sy = e.clientY; active = true; });
  addEventListener("pointerup", e => {
    if (!active) return; active = false;
    const dx = e.clientX - sx, dy = e.clientY - sy, ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) >= minDist) fn(ax > ay ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  addEventListener("pointercancel", () => { active = false; });
}
// Pfeiltasten und WASD: fn("left" | ...)
function onArrows(fn) {
  const K = { ArrowLeft: "left", ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", a: "left", w: "up", d: "right", s: "down" };
  addEventListener("keydown", e => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = K[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (k) { e.preventDefault(); fn(k, e); }
  });
}
// Signal am Ende eines Timers: Vibration, Ton, Blinken
let audioCtx = null;
function beep(times = 3) {
  try { navigator.vibrate?.([300, 150, 300, 150, 300]); } catch {}
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime + i * .45;
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(.25, t0); g.gain.setValueAtTime(0, t0 + .3);
      o.start(t0); o.stop(t0 + .32);
    }
  } catch {}
  let n = 0;
  const iv = setInterval(() => { document.body.classList.toggle("alarm", n % 2 === 0); if (++n >= times * 2) { clearInterval(iv); document.body.classList.remove("alarm"); } }, 350);
}

/* ---------- Vollbild (App-Seiten unter apps/) ----------
   Ein Knopf in der Kopfzeile blendet Kopfzeile und Hilfetexte (.help) aus; Spiele passen ihr Feld
   mit fitWidth/availHeight an die Fensterhöhe an. Wo möglich zusätzlich echtes Vollbild.
   Die Einstellung gilt für alle Apps (Schlüssel st.fs). */
const isApp = ROOT === "../../" && /\/apps\/[^/]+\/(index\.html)?$/.test(location.pathname);
let fsOn = isApp && !!store.get("fs", false);
const isFs = () => fsOn;
if (isApp) document.documentElement.classList.toggle("fs", fsOn);
// Nutzbare Inhaltsbreite für Spielfelder (Breite von <main> ohne Innenabstand)
function contentWidth() { const m = $("main"); return Math.max(160, (m ? m.clientWidth : Math.min(innerWidth, 760)) - 32); }
// Höhe, die ein Spielfeld bekommen darf: Fensterhöhe minus alles andere auf der Seite (.fsx darf darunter liegen)
function availHeight(board) {
  const vh = innerHeight;
  if (!board || !document.body) return vh;
  let other = document.body.offsetHeight - board.offsetHeight;
  $$(".fsx").forEach(x => { const cs = getComputedStyle(x); other -= x.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0); });
  return Math.max(120, vh - other - 4);
}
// Breite eines Spielfelds mit Seitenverhältnis aspect (Höhe/Breite); im Vollbild zusätzlich höhenbegrenzt
function fitWidth(maxW, aspect, board) {
  const W = Math.min(contentWidth(), maxW || 1e5);
  return fsOn && board ? Math.max(160, Math.min(W, Math.floor(availHeight(board) / aspect))) : W;
}
// Spielfelder mit data-fit="Höhe/Breite" werden im Vollbild in der Breite so begrenzt, dass sie in die Fensterhöhe passen
function fitBoards() {
  $$("[data-fit]").forEach(b => {
    if (!fsOn) { b.style.maxWidth = ""; return; }
    b.style.maxWidth = "";
    b.style.maxWidth = Math.max(160, Math.floor(availHeight(b) / (parseFloat(b.dataset.fit) || 1))) + "px";
  });
}
addEventListener("resize", fitBoards);
const relayout = () => dispatchEvent(new Event("resize"));
function toggleFs() {
  fsOn = !fsOn; store.set("fs", fsOn);
  document.documentElement.classList.toggle("fs", fsOn);
  const el = document.documentElement;
  try {
    if (fsOn) el.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch {}
  scrollTo(0, 0); relayout(); setTimeout(relayout, 350);
}
function initFs() {
  const hd = $("header.top .wrap");
  if (!isApp || !hd) return;
  const b = document.createElement("button");
  b.className = "iconbtn"; b.id = "fsBtn"; b.setAttribute("aria-label", "Vollbild"); b.title = "Vollbild";
  b.innerHTML = I('<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>');
  hd.insertBefore(b, hd.querySelector('a[href$="einstellungen/"]'));
  const x = document.createElement("button");
  x.id = "fsExit"; x.setAttribute("aria-label", "Vollbild beenden"); x.title = "Vollbild beenden";
  x.innerHTML = I('<path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5"/>');
  const m = $("main"); if (m) m.prepend(x); else document.body.append(x);
  b.onclick = x.onclick = toggleFs;
  // Verlässt der Browser das echte Vollbild (z. B. per Zurück-Taste), bleibt der App-Vollbildmodus erhalten
  if (fsOn) { relayout(); setTimeout(relayout, 50); }
}
if (document.body) initFs(); else addEventListener("DOMContentLoaded", initFs);
