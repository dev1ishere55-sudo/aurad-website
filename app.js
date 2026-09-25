(function () {
  "use strict";
  var C = window.AURAD_CONFIG;
  var SITE = "dev1ishere55-sudo.github.io/aurad-website";
  var H = { "apikey": C.SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" };
  function $(id) { return document.getElementById(id); }
  function api(path, opts) { opts = opts || {}; opts.headers = Object.assign({}, H, opts.headers || {}); return fetch(C.SUPABASE_URL + "/rest/v1/" + path, opts); }
  function fmt(n) { return Number(n).toLocaleString("en-US"); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ---------- nav ---------- */
  var nav = $("nav"), menuBtn = $("menu-btn"), links = $("nav-links");
  menuBtn.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  links.addEventListener("click", function (e) { if (e.target.tagName === "A") { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", false); } });
  var floatCta = document.querySelector(".float-cta");
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle("scrolled", y > 10);
    floatCta.classList.toggle("show", y > window.innerHeight * 0.9);
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  var awayCount = 0, typing = false;
  function setAway() { floatCta.classList.toggle("away", typing || awayCount > 0); }
  if ("IntersectionObserver" in window) {
    var aio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting !== !!e.target._in) { e.target._in = e.isIntersecting; awayCount += e.isIntersecting ? 1 : -1; } }); setAway(); });
    document.querySelectorAll("form, .footer, #prelaunch, #q-result, #conf-list, #wall, #memes .meme-wrap").forEach(function (el) { aio.observe(el); });
  }
  document.addEventListener("focusin", function (e) { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { typing = true; setAway(); } });
  document.addEventListener("focusout", function () { typing = false; setAway(); });

  /* ---------- reveal ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else { document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); }); }

  /* ---------- ticker (duplicate for seamless loop) ---------- */
  var tk = $("ticker"); tk.innerHTML += tk.innerHTML;

  /* ---------- countdown ---------- */
  var target = new Date(C.LAUNCH_UTC).getTime();
  var cd = { d: $("cd-d"), h: $("cd-h"), m: $("cd-m"), s: $("cd-s") };
  function pad(n) { return String(n).padStart(2, "0"); }
  try {
    $("local-time").textContent = "13:00 UTC · " + new Date(target).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " your time";
  } catch (e) {}
  function tick() {
    var diff = target - Date.now();
    if (diff <= 0) {
      var box = $("countdown"); box.classList.add("live");
      box.innerHTML = '<div><span>LIVE</span><small>verify the contract via official channels only</small></div>';
      return;
    }
    cd.d.textContent = pad(Math.floor(diff / 864e5));
    cd.h.textContent = pad(Math.floor(diff / 36e5) % 24);
    cd.m.textContent = pad(Math.floor(diff / 6e4) % 60);
    cd.s.textContent = pad(Math.floor(diff / 1e3) % 60);
    setTimeout(tick, 1000 - (Date.now() % 1000));
  }
  tick();

  /* ---------- canvas helpers ---------- */
  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = "";
    words.forEach(function (w) { var t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line); return lines;
  }
  function glowText(ctx, text, x, y, color, blur) { ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore(); }
  function download(canvas, name) {
    canvas.toBlob(function (b) { var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }, "image/png");
  }
  var FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';

  /* ---------- quiz ---------- */
  var QS = [
    { q: "Someone waves. You wave back. They were waving at the person behind you. You…", o: [["Keep waving. Commit.", 1500], ["Turn it into a hair fix", 800], ["Never happened to me", 0], ["Leave the country", 2500]] },
    { q: "The waiter says “enjoy your meal.” You say…", o: [["Thank you", 0], ["You too", 1200], ["Love you", 3000], ["Nothing, panic silently", 600]] },
    { q: "Last time you pushed a PULL door?", o: [["Today", 1500], ["This week", 1000], ["I read signs", 0], ["I pulled a PUSH door, then pushed it", 2200]] },
    { q: "You sent a screenshot of a chat to…", o: [["The right person", 0], ["The person in the screenshot", 3000], ["The family group", 2500], ["I don't screenshot", 200]] },
    { q: "You tripped in public. Recovery move?", o: [["Pretend to jog", 1200], ["Look back at the floor angrily", 900], ["Full slow-motion fall", 2000], ["Graceful. Obviously.", 100]] },
    { q: "How often do you laugh at a joke you didn't get?", o: [["Never", 0], ["Sometimes", 700], ["Always, then ask later", 1800], ["I'm laughing right now", 1300]] }
  ];
  var TIERS = [
    [0, "Aura Saint", "Suspiciously clean. We're watching you."],
    [2500, "Minor Debtor", "A few Ls. One good meme clears it."],
    [6000, "Certified Debtor", "Serious aura debt. You're one of us."],
    [10000, "Aura Bankrupt", "Legendary. The Debtors salute you."]
  ];
  var qi = 0, score = 0, hist = [];
  function tierFor(s) { var t = TIERS[0]; TIERS.forEach(function (x) { if (s >= x[0]) t = x; }); return t; }
  function renderQ() {
    var q = QS[qi];
    $("q-step").textContent = "Question " + (qi + 1) + " of " + QS.length;
    $("q-bar").style.width = (qi / QS.length * 100) + "%";
    $("q-back").hidden = qi === 0;
    var t = $("q-text"); t.textContent = q.q; t.classList.remove("fade"); void t.offsetWidth; t.classList.add("fade");
    var box = $("q-opts"); box.innerHTML = ""; box.classList.remove("locked");
    q.o.forEach(function (o) {
      var b = document.createElement("button"); b.type = "button"; b.className = "q-opt fade"; b.textContent = o[0];
      b.addEventListener("click", function () {
        b.classList.add("picked"); box.classList.add("locked");
        hist.push(o[1]); score += o[1];
        setTimeout(function () { qi++; if (qi < QS.length) { renderQ(); t.focus({ preventScroll: true }); } else finish(); }, 260);
      });
      box.appendChild(b);
    });
  }
  $("q-back").addEventListener("click", function () { if (!qi) return; qi--; score -= hist.pop() || 0; renderQ(); $("q-text").focus({ preventScroll: true }); });
  function drawCard(s) {
    var cv = $("score-card"), ctx = cv.getContext("2d"), W = cv.width, Hh = cv.height, t = tierFor(s);
    var D = '"Anton",Impact,"Arial Black",sans-serif', M = '"Space Mono",ui-monospace,Menlo,monospace', HD = '"Permanent Marker","Comic Sans MS",cursive';
    ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, W, Hh);
    ctx.fillStyle = "#c6ff00"; ctx.save(); ctx.translate(0, 40); ctx.rotate(-0.03); ctx.fillRect(-20, 0, W + 40, 52); ctx.fillStyle = "#0a0a0a"; ctx.font = "30px " + D; ctx.textAlign = "left";
    ctx.fillText("AURA DEBT COLLECTION AGENCY  ✶  OFFICIAL NOTICE  ✶  AURA DEBT COLLECTION AGENCY", 20, 38); ctx.restore();
    ctx.save(); ctx.translate(70, 130); ctx.rotate(-0.015); ctx.fillStyle = "#f3ecdc"; ctx.fillRect(0, 0, 690, 440);
    ctx.fillStyle = "#0a0a0a"; ctx.font = "700 24px " + M; ctx.fillText("STATEMENT OF AURA DEBT", 30, 50);
    ctx.fillRect(30, 64, 630, 3);
    ctx.font = "150px " + D; ctx.fillStyle = s ? "#ff2e88" : "#2c6a00"; ctx.fillText(s ? "-" + fmt(s) : "0", 26, 220);
    ctx.fillStyle = "#0a0a0a"; ctx.font = "58px " + D; ctx.fillText(t[1].toUpperCase(), 30, 300);
    ctx.font = "700 24px " + M; wrap(ctx, t[2], 620).slice(0, 2).forEach(function (l, i) { ctx.fillText(l, 30, 344 + i * 32); });
    ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, 400); ctx.lineTo(660, 400); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = "700 20px " + M; ctx.fillText("PAYABLE IN MEMES ONLY", 30, 428); ctx.restore();
    ctx.save(); ctx.translate(850, 480); ctx.rotate(-0.12); ctx.strokeStyle = "#ff2e88"; ctx.lineWidth = 8; ctx.strokeRect(0, 0, 250, 86); ctx.fillStyle = "#ff2e88"; ctx.font = "52px " + D; ctx.textAlign = "center"; ctx.fillText("PAST DUE", 125, 64); ctx.restore();
    ctx.textAlign = "center"; ctx.fillStyle = "#ff2e88"; ctx.fillRect(820, 130, 320, 170);
    ctx.fillStyle = "#0a0a0a"; ctx.font = "96px " + D; ctx.fillText("$AURAD", 980, 250);
    ctx.fillStyle = "#c6ff00"; ctx.font = "44px " + HD; ctx.save(); ctx.translate(980, 380); ctx.rotate(0.06); ctx.fillText("what's yours?", 0, 0); ctx.restore();
    ctx.fillStyle = "#f3ecdc"; ctx.font = "700 22px " + M; ctx.fillText("@auradebttm", 980, 450);
    ctx.fillStyle = "#b3ab9a"; ctx.font = "700 18px " + M; ctx.textAlign = "left"; ctx.fillText("Get yours: " + SITE, 70, 610);
    return t;
  }
  function finish() {
    $("q-bar").style.width = "100%";
    $("quiz").classList.add("hidden"); $("q-result").classList.remove("hidden");
    var t = drawCard(score);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawCard(score); });
    store("aurad_score", score);
    $("result-line").textContent = "You scored " + (score ? "-" + fmt(score) : "0") + " aura: " + t[1] + ". " + t[2];
    var txt = "My Aura Debt Score: " + (score ? "-" + fmt(score) : "0") + " aura (" + t[1] + ") 💀\n\nWhat's yours? Take the quiz 👇\n@auradebttm $AURAD";
    $("share-x").href = "https://x.com/intent/tweet?text=" + encodeURIComponent(txt) + "&url=" + encodeURIComponent("https://" + SITE + "/#score");
    $("q-result").scrollIntoView({ behavior: "smooth", block: "start" });
    $("result-line").focus({ preventScroll: true });
    shareText = txt;
  }
  var shareText = "";
  if (navigator.canShare && navigator.share) {
    try { if (navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] })) $("share-native").hidden = false; } catch (e) {}
  }
  $("share-native").addEventListener("click", function () {
    $("score-card").toBlob(function (b) {
      var f = new File([b], "my-aura-debt-score.png", { type: "image/png" });
      navigator.share({ files: [f], text: shareText + "\nhttps://" + SITE + "/#score" }).catch(function () {});
    }, "image/png");
  });
  $("dl-card").addEventListener("click", function () { download($("score-card"), "my-aura-debt-score.png"); });
  $("retake").addEventListener("click", function () { qi = 0; score = 0; hist = []; $("q-result").classList.add("hidden"); $("quiz").classList.remove("hidden"); renderQ(); });
  renderQ();

  /* ---------- confession wall ---------- */
  var sort = "votes", voted = store("aurad_voted") || [], reported = store("aurad_reported") || [];
  var token = store("aurad_token"); if (!token) { token = Math.random().toString(36).slice(2) + Date.now().toString(36); store("aurad_token", token); }
  function errText(r, fallback) { return r.json().then(function (j) { return (j && j.message) || fallback; }).catch(function () { return fallback; }); }
  var list = $("conf-list");
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function ago(ts) { var s = (Date.now() - new Date(ts)) / 1000; if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; return Math.floor(s / 86400) + "d ago"; }
  function loadConf() {
    api("confessions?select=id,body,votes,created_at&order=" + sort + ".desc,id.desc&limit=30").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (rows) {
      if (!rows.length) { list.innerHTML = '<div class="empty"><strong>The wall is empty. For now.</strong>Be the first Debtor to confess. Stuck? Tap a prompt above.</div>'; return; }
      list.innerHTML = rows.map(function (c) {
        var v = voted.indexOf(c.id) > -1;
        return '<article class="card conf"><p>“' + esc(c.body) + '”</p><div class="conf-foot"><span class="muted small">' + ago(c.created_at) + '</span><span class="conf-actions"><button type="button" class="report" data-id="' + c.id + '"' + (reported.indexOf(c.id) > -1 ? ' disabled>Reported' : ' aria-label="Report confession">Report') + '</button><button type="button" class="vote' + (v ? " voted" : "") + '" data-id="' + c.id + '" aria-label="Upvote confession, ' + c.votes + ' votes"' + (v ? " disabled" : "") + '><span aria-hidden="true">💀</span> <span class="n">' + c.votes + '</span></button></span></div></article>';
      }).join("");
    }).catch(function () { list.innerHTML = '<p class="muted">Couldn\'t load confessions. Refresh in a moment.</p>'; });
  }
  list.addEventListener("click", function (e) {
    var rb = e.target.closest(".report");
    if (rb && !rb.disabled) {
      if (!confirm("Report this confession for breaking the rules?")) return;
      var rid = Number(rb.dataset.id); rb.disabled = true; rb.textContent = "Reported";
      reported.push(rid); store("aurad_reported", reported);
      api("rpc/report_confession", { method: "POST", body: JSON.stringify({ cid: rid }) }).catch(function () {});
      return;
    }
    var b = e.target.closest(".vote"); if (!b || b.disabled) return;
    var id = Number(b.dataset.id); b.disabled = true; b.classList.add("voted", "pop");
    var n = b.querySelector(".n"), before = Number(n.textContent); n.textContent = before + 1;
    voted.push(id); store("aurad_voted", voted);
    api("rpc/upvote_confession", { method: "POST", body: JSON.stringify({ cid: id, token: token }) }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok) n.textContent = j.votes; else if (j && j.error !== "already_voted") { n.textContent = before; b.disabled = false; b.classList.remove("voted"); voted = voted.filter(function (x) { return x !== id; }); store("aurad_voted", voted); }
    }).catch(function () { n.textContent = before; b.disabled = false; b.classList.remove("voted"); });
  });
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("active"); x.setAttribute("aria-pressed", "false"); });
      t.classList.add("active"); t.setAttribute("aria-pressed", "true"); sort = t.dataset.sort; loadConf();
    });
  });
  var cf = $("conf-form"), cb = $("conf-body"), cmsg = $("conf-msg"), loaded = Date.now();
  cb.addEventListener("input", function () { $("conf-left").textContent = 240 - cb.value.length; });
  document.querySelectorAll(".chip").forEach(function (c) { c.addEventListener("click", function () { cb.value = c.textContent.replace(/…$/, " "); cb.focus(); cb.setSelectionRange(cb.value.length, cb.value.length); $("conf-left").textContent = 240 - cb.value.length; }); });
  function csay(t, ok) { cmsg.textContent = t; cmsg.className = "form-msg " + (ok ? "ok" : "err"); }
  cf.addEventListener("submit", function (e) {
    e.preventDefault();
    var body = cb.value.trim().replace(/\s+/g, " ");
    if (cf.website.value || Date.now() - loaded < 3000) { csay("Confession received. Your aura has been noted.", true); cf.reset(); return; }
    if (body.length < 8) return csay("Give us a bit more detail (8+ characters).");
    if (/(https?:\/\/|www\.|t\.me\/|\.com|\.xyz|\.io)/i.test(body)) return csay("No links please. Just the L.");
    if (/[1-9A-HJ-NP-Za-km-z]{32,44}/.test(body)) return csay("No wallet or contract addresses on the wall.");
    var last = store("aurad_last_conf"); if (last && Date.now() - last < 60000) return csay("Easy, one confession a minute.");
    var btn = cf.querySelector("button"); btn.disabled = true;
    api("confessions", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ body: body }) }).then(function (r) {
      if (r.status === 201) { csay("Confessed. -1,000 aura, +1 community.", true); cf.reset(); $("conf-left").textContent = "240"; store("aurad_last_conf", Date.now()); sort = "created_at"; document.querySelector('.tab[data-sort="created_at"]').click(); loadCounts(); }
      else return errText(r, "Couldn't post that. Try again in a minute.").then(function (m) { csay(/permission|policy|violates/i.test(m) ? "That can't be posted. No links or addresses." : m); });
    }).catch(function () { csay("Network error. Try again."); }).finally(function () { btn.disabled = false; });
  });
  loadConf();

  /* ---------- counts + milestones ---------- */
  var MS = [[50, "Weekly meme contest kicks off"], [150, "Discord opens with community roles"], [300, "Launch-day X Space / voice chat"], [500, "Founding Debtors wall on this site"], [1000, "Community-voted meme templates added"]];
  function renderMs(n) {
    $("wl-count").textContent = fmt(n); $("hero-count").textContent = fmt(n);
    var next = MS.find(function (m) { return n < m[0]; }) || MS[MS.length - 1];
    $("ms-bar").style.width = Math.min(100, n / next[0] * 100) + "%";
    $("ms-list").innerHTML = MS.map(function (m) { return '<li class="' + (n >= m[0] ? "unlocked" : "") + '"><b>' + fmt(m[0]) + '</b>' + m[1] + '</li>'; }).join("");
  }
  function loadCounts() {
    api("rpc/waitlist_count", { method: "POST", body: "{}" }).then(function (r) { return r.json(); }).then(function (n) { renderMs(Number(n) || 0); }).catch(function () { renderMs(0); $("hero-count").textContent = "–"; });
    api("confessions?select=id", { method: "HEAD", headers: { "Prefer": "count=exact", "Range": "0-0" } }).then(function (r) {
      var cr = r.headers.get("content-range") || ""; var n = cr.split("/")[1]; var hc = $("hero-conf"); if (!hc) return; var hs = hc.parentNode; if (n === "0") { hs.dataset.empty = "1"; hc.textContent = ""; hs.lastChild.textContent = ""; hs.insertAdjacentHTML("beforeend", hs.querySelector("a") ? "" : '<a href="#wall" class="green">Be the first to confess →</a>'); } else { var la = hs.querySelector("a"); if (la) la.remove(); hs.lastChild.textContent = " confessions"; hc.textContent = n && n !== "*" ? fmt(n) : "–"; }
    }).catch(function () { $("hero-conf").textContent = "–"; });
  }
  loadCounts();

  /* ---------- waitlist ---------- */
  var form = $("waitlist-form"), msg = $("wl-msg"), loadedAt = Date.now();
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/, TG_RE = /^@?[A-Za-z0-9_]{5,32}$/;
  function say(t, ok) { msg.textContent = t; msg.className = "form-msg " + (ok ? "ok" : "err"); }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = form.email.value.trim(), tg = form.telegram.value.trim(), source = form.source.value;
    if (form.website.value || Date.now() - loadedAt < 2500) { say("You're on the list. See you at launch.", true); form.reset(); return; }
    if (!email && !tg) return say("Add an email or a Telegram handle.");
    if (email && (email.length > 254 || !EMAIL_RE.test(email))) return say("That email doesn't look right.");
    if (tg && !TG_RE.test(tg)) return say("Telegram handles are 5–32 letters, numbers or underscores.");
    var body = { source: source }; if (email) body.email = email; if (tg) body.telegram_handle = tg;
    var btn = form.querySelector("button"); btn.disabled = true;
    api("waitlist", { method: "POST", headers: { "Prefer": "return=minimal" }, body: JSON.stringify(body) }).then(function (r) {
      if (r.status === 201) { say("You're on the list. Now join the Telegram for prelaunch details.", true); form.reset(); loadCounts(); }
      else if (r.status === 409) say("You're already on the list.", true);
      else return errText(r, "Something went wrong. Please try again in a minute.").then(function (m) { say(/permission|policy/i.test(m) ? "Something went wrong. Please try again in a minute." : m); });
    }).catch(function () { say("Network error. Please try again."); }).finally(function () { btn.disabled = false; });
  });

  /* ---------- meme generator ---------- */
  var TPL = [
    { bg: ["#1a0008", "#050505"], accent: "#ff2d55", badge: "AURA BANKRUPT", emoji: "💀" },
    { bg: ["#001a0e", "#050505"], accent: "#00ff88", badge: "-1000 AURA", emoji: "📉" },
    { bg: ["#0d0d24", "#050505"], accent: "#7dffc4", badge: "IN DEBT, STILL VIBING", emoji: "😎" },
    { bg: ["#1a1200", "#050505"], accent: "#ffd400", badge: "CONFESSION", emoji: "🕯️" }
  ];
  var mc = $("meme"), mx = mc.getContext("2d");
  function memeLine(text, y, fromBottom) {
    mx.font = "900 86px Impact, 'Arial Black', " + FONT; mx.textAlign = "center";
    var lines = wrap(mx, text.toUpperCase(), 960); if (fromBottom) y -= (lines.length - 1) * 92;
    lines.forEach(function (l, i) { mx.lineWidth = 12; mx.strokeStyle = "#000"; mx.strokeText(l, 540, y + i * 92); mx.fillStyle = "#fff"; mx.fillText(l, 540, y + i * 92); });
  }
  function drawMeme() {
    var t = TPL[Number($("meme-tpl").value)] || TPL[0];
    var g = mx.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, t.bg[0]); g.addColorStop(1, t.bg[1]); mx.fillStyle = g; mx.fillRect(0, 0, 1080, 1080);
    var rg = mx.createRadialGradient(540, 540, 0, 540, 540, 420); rg.addColorStop(0, t.accent + "55"); rg.addColorStop(1, "transparent"); mx.fillStyle = rg; mx.fillRect(0, 0, 1080, 1080);
    mx.textAlign = "center"; mx.font = "260px " + FONT; mx.fillText(t.emoji, 540, 620);
    mx.font = "900 64px " + FONT; glowText(mx, t.badge, 540, 760, t.accent, 24);
    memeLine($("meme-top").value, 150, false);
    memeLine($("meme-bot").value, 1000, true);
    mx.textAlign = "right"; mx.font = "800 30px " + FONT; mx.fillStyle = "rgba(255,255,255,.6)"; mx.fillText("$AURAD · @auradebttm", 1050, 1060);
  }
  ["meme-tpl", "meme-top", "meme-bot"].forEach(function (id) { $(id).addEventListener("input", drawMeme); });
  $("meme-dl").addEventListener("click", function () { drawMeme(); download(mc, "aurad-meme.png"); });
  drawMeme();
})();
