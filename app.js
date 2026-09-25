(function () {
  var C = window.AURAD_CONFIG;

  // Countdown
  var target = new Date(C.LAUNCH_UTC).getTime();
  var el = { d: document.getElementById("cd-d"), h: document.getElementById("cd-h"), m: document.getElementById("cd-m"), s: document.getElementById("cd-s") };
  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var diff = target - Date.now();
    if (diff <= 0) {
      document.getElementById("countdown").innerHTML = '<div style="min-width:auto"><span>LIVE</span><small>verify the contract via official channels only</small></div>';
      return;
    }
    el.d.textContent = pad(Math.floor(diff / 864e5));
    el.h.textContent = pad(Math.floor(diff / 36e5) % 24);
    el.m.textContent = pad(Math.floor(diff / 6e4) % 60);
    el.s.textContent = pad(Math.floor(diff / 1e3) % 60);
    setTimeout(tick, 1000);
  }
  tick();

  // Joke aura debt calculator
  var verdicts = [
    [0, "Clean record. Suspicious."],
    [1, "Minor debt. A good meme pays it off."],
    [2500, "Serious aura debt. You're one of us."],
    [6000, "Aura bankruptcy. Legend status."]
  ];
  var calc = document.getElementById("calc");
  calc.addEventListener("change", function () {
    var total = 0;
    calc.querySelectorAll("input:checked").forEach(function (i) { total += Number(i.value); });
    document.getElementById("calc-total").textContent = total ? "-" + total.toLocaleString() : "0";
    var v = verdicts[0][1];
    verdicts.forEach(function (p) { if (total >= p[0]) v = p[1]; });
    document.getElementById("calc-verdict").textContent = v;
  });

  // Waitlist
  var form = document.getElementById("waitlist-form");
  var msg = document.getElementById("wl-msg");
  var loadedAt = Date.now();
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var TG_RE = /^@?[A-Za-z0-9_]{5,32}$/;
  function say(text, ok) { msg.textContent = text; msg.className = "form-msg " + (ok ? "ok" : "err"); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = form.email.value.trim();
    var tg = form.telegram.value.trim();
    var source = form.source.value;

    // Honeypot and too-fast submissions are silently treated as success.
    if (form.website.value || Date.now() - loadedAt < 2500) { say("You're on the list. See you at launch.", true); form.reset(); return; }
    if (!email && !tg) return say("Add an email or a Telegram handle.");
    if (email && (email.length > 254 || !EMAIL_RE.test(email))) return say("That email doesn't look right.");
    if (tg && !TG_RE.test(tg)) return say("Telegram handles are 5–32 letters, numbers or underscores.");

    var body = { source: source };
    if (email) body.email = email;
    if (tg) body.telegram_handle = tg;

    var btn = form.querySelector("button");
    btn.disabled = true;
    fetch(C.SUPABASE_URL + "/rest/v1/waitlist", {
      method: "POST",
      headers: {
        "apikey": C.SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (r.status === 201) { say("You're on the list. See you at launch.", true); form.reset(); }
      else if (r.status === 409) { say("You're already on the list.", true); }
      else { say("Something went wrong. Please try again in a minute."); }
    }).catch(function () {
      say("Network error. Please try again.");
    }).finally(function () { btn.disabled = false; });
  });
})();
