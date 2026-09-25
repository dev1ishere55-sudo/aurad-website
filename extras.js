/* $AURAD v4 extras: aura meter, cursor, stickers, sound, easter eggs */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var ss = function (k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };

  function toast(t) {
    var old = document.querySelector(".toast"); if (old) old.remove();
    var d = document.createElement("div"); d.className = "toast"; d.setAttribute("role", "status"); d.textContent = t;
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600);
  }

  /* ---------- sound (off by default, WebAudio, no files) ---------- */
  var ac = null, soundOn = false, snd = $("snd");
  function blip(f, dur, type) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || "square"; o.frequency.setValueAtTime(f, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, f / 3), ac.currentTime + (dur || .12));
      g.gain.setValueAtTime(.06, ac.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + (dur || .12));
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (dur || .12));
    } catch (e) {}
  }
  if (snd) snd.addEventListener("click", function () {
    soundOn = !soundOn; snd.setAttribute("aria-pressed", String(soundOn)); snd.textContent = "Sound: " + (soundOn ? "on" : "off");
    blip(660, .15);
  });

  var t2 = $("ticker2"); if (t2) t2.innerHTML += t2.innerHTML;

  /* ---------- randomized hero ---------- */
  var TAGS = ["we fumble. together.", "your Ls are safe here.", "certified aura bankrupt.", "-1000 aura and counting.", "no aura? no problem.", "confess. laugh. repeat."];
  var SUBS = [
    "For everyone who's ever fumbled so hard they lost aura points. Not at you. <strong>With you.</strong>",
    "You waved back at someone who wasn't waving at you. <strong>Welcome home.</strong>",
    "You said \u201cyou too\u201d to \u201chappy birthday.\u201d We saw. <strong>We get it.</strong>",
    "Pushed a PULL door today? <strong>You're one of us.</strong>"
  ];
  var tag = $("hero-tag"), sub = $("hero-sub");
  if (tag) tag.textContent = TAGS[Math.floor(Math.random() * TAGS.length)];
  if (sub) sub.innerHTML = SUBS[Math.floor(Math.random() * SUBS.length)];

  /* ---------- aura meter: drains as you scroll ---------- */
  var fill = $("aura-fill"), read = $("aura-read"), meter = $("aura-meter"), collectorShown = !!ss("aurad_col");
  var LINES = [[100, "AURA: FULL"], [80, "AURA: SLIPPING"], [60, "AURA: LEAKING"], [40, "AURA: IN DEBT"], [20, "AURA: CRITICAL"], [5, "AURA: BANKRUPT"]];
  var raf = 0;
  function meterUpdate() {
    raf = 0;
    var h = document.documentElement.scrollHeight - innerHeight;
    var pct = Math.max(0, Math.round(100 - (h > 0 ? scrollY / h * 100 : 0)));
    fill.style.transform = "scaleX(" + pct / 100 + ")";
    meter.setAttribute("aria-valuenow", pct);
    var label = LINES[0][1]; LINES.forEach(function (l) { if (pct <= l[0]) label = l[1]; });
    read.textContent = label + " " + pct + "%";
    read.classList.toggle("low", pct <= 20);
    if (pct <= 2 && !collectorShown) { collectorShown = true; ss("aurad_col", "1"); setTimeout(openCollector, 400); }
  }
  addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(meterUpdate); }, { passive: true });
  meterUpdate();

  /* ---------- debt collector modal ---------- */
  var col = $("collector"), lastFocus = null;
  function openCollector() {
    var n = Number(localStorage.getItem("aurad_score")) || Math.floor(2000 + Math.random() * 9000);
    var ref = "AD-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    $("col-dl").innerHTML = "<dt>Case</dt><dd>" + ref + "</dd><dt>Debtor</dt><dd>You (we checked)</dd><dt>Balance</dt><dd>-" + n.toLocaleString("en-US") + " aura</dd><dt>Status</dt><dd>Scrolled to the very bottom</dd>";
    lastFocus = document.activeElement; col.hidden = false; $("col-x").focus(); blip(180, .4, "sawtooth");
  }
  function closeCollector() { col.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $("col-x").addEventListener("click", closeCollector);
  $("col-run").addEventListener("click", function () { closeCollector(); toast("You can run. The debt stays. \u{1F480}"); });
  $("col-pay").addEventListener("click", function () { col.hidden = true; setTimeout(function () { var t = $("conf-body"); if (t) t.focus(); }, 500); });
  col.addEventListener("click", function (e) { if (e.target === col) closeCollector(); });
  document.addEventListener("keydown", function (e) {
    if (col.hidden) return;
    if (e.key === "Escape") closeCollector();
    if (e.key === "Tab") { var f = col.querySelectorAll("button,a"), a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  });

  /* ---------- custom cursor + click aura pops ---------- */
  var cur = $("cur");
  if (FINE && !RM && cur) {
    var cx = 0, cy = 0, pend = false;
    addEventListener("mousemove", function (e) { cx = e.clientX; cy = e.clientY; if (!pend) { pend = true; requestAnimationFrame(function () { cur.style.left = cx + "px"; cur.style.top = cy + "px"; pend = false; }); } }, { passive: true });
    document.addEventListener("mouseover", function (e) { cur.classList.toggle("big", !!e.target.closest("a,button,.sticker,.q-opt,.conf")); });
  }
  var lastPop = 0;
  document.addEventListener("click", function (e) {
    if (e.target.closest("input,textarea,select,.collector")) return;
    blip(e.target.closest("a,button") ? 520 : 300, .08);
    if (RM || Date.now() - lastPop < 250) return; lastPop = Date.now();
    var p = document.createElement("span"); p.className = "aura-pop"; p.setAttribute("aria-hidden", "true");
    var v = ["-100 aura", "-250 aura", "-50 aura", "+10 aura?", "-500 aura", "L"]; p.textContent = v[Math.floor(Math.random() * v.length)];
    p.style.left = e.clientX + "px"; p.style.top = e.clientY + "px"; p.style.transform = "translate(-50%,-50%)";
    document.body.appendChild(p); setTimeout(function () { p.remove(); }, 1000);
  });

  /* ---------- draggable stickers ---------- */
  document.querySelectorAll(".sticker").forEach(function (s) {
    var sx, sy, ox = 0, oy = 0, base = getComputedStyle(s).transform; if (base === "none") base = "";
    s.addEventListener("pointerdown", function (e) {
      sx = e.clientX - ox; sy = e.clientY - oy; s.setPointerCapture(e.pointerId); s.style.zIndex = 20; blip(440, .06);
      function mv(ev) { ox = ev.clientX - sx; oy = ev.clientY - sy; s.style.transform = "translate(" + ox + "px," + oy + "px) " + base; }
      function up() { s.removeEventListener("pointermove", mv); s.removeEventListener("pointerup", up); }
      s.addEventListener("pointermove", mv); s.addEventListener("pointerup", up);
    });
  });

  /* ---------- easter eggs ---------- */
  // 1) Konami code -> Bankrupt Mode (inverted site)
  var K = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"], ki = 0;
  // 2) type "aura" anywhere -> Chaos Mode
  var typed = "";
  document.addEventListener("keydown", function (e) {
    if (e.target.closest && e.target.closest("input,textarea,select")) return;
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    ki = (k === K[ki]) ? ki + 1 : (k === K[0] ? 1 : 0);
    if (ki === K.length) { ki = 0; var on = document.body.classList.toggle("bankrupt"); toast(on ? "Bankrupt mode unlocked. Aura: -\u221E" : "Aura restored. For now."); blip(120, .6, "sawtooth"); }
    if (e.key.length === 1) { typed = (typed + k).slice(-4); if (typed === "aura") chaos(); }
  });
  function chaos() {
    if (RM) { toast("Chaos mode skipped: reduced motion is on."); return; }
    var on = document.body.classList.toggle("chaos"); toast(on ? "Chaos mode: everything is fumbling" : "Chaos mode off. Composure restored."); blip(880, .3);
  }
  // 3) Tap the logo 7 times (works on phones) -> Chaos Mode
  var taps = 0, tapT = 0, brand = document.querySelector(".brand");
  if (brand) brand.addEventListener("click", function (e) {
    var now = Date.now(); taps = now - tapT < 600 ? taps + 1 : 1; tapT = now;
    if (taps >= 3) e.preventDefault();
    if (taps === 7) { taps = 0; chaos(); }
  });
  // 4) Leave the tab -> title begs you back
  var T0 = document.title;
  document.addEventListener("visibilitychange", function () { document.title = document.hidden ? "\u{1F480} come back, your aura is leaking" : T0; });
  // 5) Console note for the devs
  try { console.log("%c$AURAD", "font:40px Impact;color:#c6ff00;background:#0a0a0a;padding:4px 10px", "\nYou opened devtools. -500 aura. Devs wanted in the Telegram: https://t.me/auradebtchatofficial"); } catch (e) {}
})();
