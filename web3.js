/* $AURAD v5: read-only wallet, launchpad clock, trending feed, radar, rent scan.
   No signing, no approvals, no transactions anywhere in this file. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var C = window.AURAD_CONFIG || {};
  var LAUNCH = new Date(C.LAUNCH_UTC || "2026-09-30T13:00:00Z").getTime();
  var RPCS = ["https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"];
    var RENT = 0.00203928;
  var B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function pad(n) { return String(n).padStart(2, "0"); }

  /* ---------- launchpad clock ---------- */
  var START = new Date("2026-09-24T00:00:00Z").getTime();
  function lpTick() {
    var el = $("lp-cd"); if (!el) return;
    var ms = Math.max(0, LAUNCH - Date.now()), s = Math.floor(ms / 1000);
    el.textContent = pad(Math.floor(s / 86400)) + ":" + pad(Math.floor(s / 3600) % 24) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60);
    var bar = $("lp-bar"); if (bar) bar.style.width = Math.min(100, Math.max(2, (Date.now() - START) / (LAUNCH - START) * 100)) + "%";
    if (!ms) { var st = document.querySelector(".lp-card .lp-status"); if (st) st.textContent = "Live soon: check @auradebttm"; }
  }
  lpTick(); setInterval(lpTick, 1000);

  /* ---------- RPC helper (read-only methods only) ---------- */
  function rpc(method, params) {
    var i = 0;
    function next() {
      if (i >= RPCS.length) return Promise.reject(new Error("rpc_unavailable"));
      var url = RPCS[i++];
      return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j.error || j.result === undefined) throw new Error("rpc_error"); return j.result; })
        .catch(next);
    }
    return next();
  }

  /* ---------- wallet (connect on click only, view-only) ---------- */
  var wBtn = $("w-connect"), wDisc = $("w-disc"), provider = null;
  function getProvider() {
    if (window.phantom && window.phantom.solana && window.phantom.solana.isPhantom) return window.phantom.solana;
    if (window.solflare && window.solflare.isSolflare) return window.solflare;
    if (window.solana && window.solana.connect) return window.solana;
    return null;
  }
  function setWallet(addr, sol) {
    $("w-state").textContent = addr ? "read-only · " + addr.slice(0, 4) + "…" + addr.slice(-4) : "read-only · not connected";
    $("w-sol").textContent = sol == null ? "-.----" : sol.toFixed(4);
    $("w-debt").textContent = sol == null ? "-----" : "-" + Math.max(0, Math.round((1 - Math.min(sol, 1)) * 10000));
    wBtn.classList.toggle("hidden", !!addr); wDisc.classList.toggle("hidden", !addr);
  }
  function loadBalance(addr) {
    $("w-sol").textContent = "8.8888"; $("w-sol").classList.add("loading");
    return rpc("getBalance", [addr]).then(function (r) { $("w-sol").classList.remove("loading"); setWallet(addr, (r.value || 0) / 1e9); })
      .catch(function () { $("w-sol").classList.remove("loading"); setWallet(addr, null); $("w-state").textContent = "connected · balance unavailable right now"; });
  }
  if (wBtn) wBtn.addEventListener("click", function () {
    provider = getProvider();
    if (!provider) {
      $("w-state").innerHTML = 'No wallet found. Get <a href="https://phantom.app" target="_blank" rel="noopener">Phantom</a> or <a href="https://solflare.com" target="_blank" rel="noopener">Solflare</a>';
      return;
    }
    wBtn.disabled = true;
    provider.connect().then(function (res) {
      var pk = (res && res.publicKey) || provider.publicKey; var addr = pk.toString();
      var rc = $("rc-addr"); if (rc && !rc.value) rc.value = addr;
      if (provider.on) { try { provider.on("disconnect", function () { setWallet(null, null); }); provider.on("accountChanged", function (p) { if (p) loadBalance(p.toString()); else setWallet(null, null); }); } catch (e) {} }
      return loadBalance(addr);
    }).catch(function () { $("w-state").textContent = "connection cancelled"; })
      .then(function () { wBtn.disabled = false; });
  });
  if (wDisc) wDisc.addEventListener("click", function () { try { provider && provider.disconnect && provider.disconnect(); } catch (e) {} setWallet(null, null); });

  /* ---------- trending feed ---------- */
  var feedEl = $("feed"), noteEl = $("feed-note"), updEl = $("feed-upd"), current = "trending";
  var NOTES = {
    trending: "Live from GeckoTerminal. Not financial advice, not endorsements. Most memecoins go to zero. Do your own research.",
    boosted: "Live from DexScreener. \u201cBoosted\u201d means someone paid for promotion. That's advertising, not quality. Not financial advice.",
    radar: "Community picks. Opinion only, not advice, no promises. If the team holds a coin it is marked. We never get paid to list coins."
  };
  function cacheGet(k) { try { var v = JSON.parse(sessionStorage.getItem(k)); if (v && Date.now() - v.t < 90000) return v.d; } catch (e) {} return null; }
  function cacheSet(k, d) { try { sessionStorage.setItem(k, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} }
  function fmtUsd(n) {
    n = Number(n); if (!isFinite(n)) return "-";
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B"; if (n >= 1e6) return (n / 1e6).toFixed(2) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    if (n >= 1) return n.toFixed(2); if (n === 0) return "0";
    return n.toPrecision(3);
  }
  function row(i, name, sym, price, chg, vol, url) {
    var c = Number(chg), cls = c >= 0 ? "up" : "down";
    return '<a class="feed-row" href="' + esc(url) + '" target="_blank" rel="noopener nofollow">' +
      '<span class="f-rank seg">' + pad(i + 1) + '</span>' +
      '<span class="f-name"><b>' + esc(sym) + '</b><small>' + esc(name) + '</small></span>' +
      '<span class="f-num"><small>Price</small><b class="seg">' + fmtUsd(price) + '</b></span>' +
      '<span class="f-num ' + cls + '"><small>24h</small><b class="seg">' + (isFinite(c) ? (c >= 0 ? "+" : "") + c.toFixed(1) : "-") + '%</b></span>' +
      '<span class="f-num"><small>Vol 24h</small><b class="seg">' + fmtUsd(vol) + '</b></span></a>';
  }
  function fetchTrending() {
    return fetch("https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1").then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) {
        return (j.data || []).slice(0, 12).map(function (p) {
          var a = p.attributes || {}, nm = String(a.name || "?");
          return { name: nm, sym: nm.split(" / ")[0], price: a.base_token_price_usd, chg: (a.price_change_percentage || {}).h24, vol: (a.volume_usd || {}).h24, url: "https://www.geckoterminal.com/solana/pools/" + a.address };
        });
      });
  }
  function fetchBoosted() {
    return fetch("https://api.dexscreener.com/token-boosts/top/v1").then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (list) {
        var addrs = list.filter(function (x) { return x.chainId === "solana"; }).slice(0, 12).map(function (x) { return x.tokenAddress; });
        if (!addrs.length) return [];
        return fetch("https://api.dexscreener.com/tokens/v1/solana/" + addrs.join(",")).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (pairs) {
          var best = {};
          pairs.forEach(function (p) { var k = p.baseToken && p.baseToken.address; if (!k) return; if (!best[k] || ((p.volume || {}).h24 || 0) > ((best[k].volume || {}).h24 || 0)) best[k] = p; });
          return addrs.filter(function (a) { return best[a]; }).map(function (a) {
            var p = best[a]; return { name: p.baseToken.name, sym: p.baseToken.symbol, price: p.priceUsd, chg: (p.priceChange || {}).h24, vol: (p.volume || {}).h24, url: p.url };
          });
        });
      });
  }
  function fetchRadar() {
    return fetch(C.SUPABASE_URL + "/rest/v1/rpc/list_callouts", { method: "POST", headers: { apikey: C.SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); });
  }
  function renderRadar(list) {
    if (!list.length) { feedEl.innerHTML = '<div class="empty"><strong>Radar is quiet</strong>No community picks yet. When there are, they show up here with a clear disclosure if the team holds them.</div>'; return; }
    feedEl.innerHTML = list.map(function (c) {
      return '<article class="card radar"><div class="radar-top"><b>$' + esc(c.symbol) + '</b><span>' + esc(c.name) + '</span>' + (c.team_holds ? '<span class="hold">Team holds · disclosed</span>' : '') + '</div>' +
        (c.note ? '<p>' + esc(c.note) + '</p>' : '') +
        (c.address ? '<p class="small"><a href="https://solscan.io/token/' + esc(c.address) + '" target="_blank" rel="noopener nofollow">Check on Solscan</a> · <a href="https://dexscreener.com/solana/' + esc(c.address) + '" target="_blank" rel="noopener nofollow">Chart</a></p>' : '') +
        '<p class="small muted">Opinion, not advice · added <span class="seg">' + new Date(c.created_at).toISOString().slice(0, 10) + '</span></p></article>';
    }).join("");
  }
  function load(feed) {
    current = feed; noteEl.textContent = NOTES[feed];
    var cached = cacheGet("aurad_feed_" + feed);
    var src = cached ? Promise.resolve(cached) : (feed === "trending" ? fetchTrending() : feed === "boosted" ? fetchBoosted() : fetchRadar());
    if (!cached) feedEl.innerHTML = '<p class="muted">Loading the feed…</p>';
    src.then(function (d) {
      if (current !== feed) return; if (!cached) cacheSet("aurad_feed_" + feed, d);
      if (feed === "radar") renderRadar(d);
      else feedEl.innerHTML = d.length ? d.map(function (x, i) { return row(i, x.name, x.sym, x.price, x.chg, x.vol, x.url); }).join("") : '<p class="muted">Nothing trending right now.</p>';
      updEl.textContent = "Updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · refreshes every 90s";
    }).catch(function () {
      if (current !== feed) return;
      feedEl.innerHTML = '<div class="empty"><strong>Feed fumbled</strong>Couldn\u2019t reach the data source. <button class="link-btn" type="button" id="feed-retry">Try again</button></div>';
      var rb = $("feed-retry"); if (rb) rb.addEventListener("click", function () { load(feed); });
    });
  }
  if (feedEl) {
    document.querySelectorAll("#trending .tab").forEach(function (t) {
      t.addEventListener("click", function () {
        document.querySelectorAll("#trending .tab").forEach(function (x) { x.classList.remove("active"); x.setAttribute("aria-selected", "false"); });
        t.classList.add("active"); t.setAttribute("aria-selected", "true"); load(t.dataset.feed);
      });
    });
    var started = false;
    var start = function () { if (started) return; started = true; load("trending"); setInterval(function () { if (!document.hidden) { try { sessionStorage.removeItem("aurad_feed_" + current); } catch (e) {} load(current); } }, 90000); };
    if ("IntersectionObserver" in window) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { start(); io.disconnect(); } }, { rootMargin: "400px" }); io.observe($("trending")); } else start();
  }

  /* ---------- reclaim rent: read-only scan ---------- */
  var scanBtn = $("rc-scan"), out = $("rc-out");
  function scan() {
    var a = $("rc-addr").value.trim();
    if (!B58.test(a)) { out.innerHTML = '<p class="form-msg err">That doesn\u2019t look like a Solana address.</p>'; return; }
    out.innerHTML = '<p class="small">Step 1: open your wallet on <a href="https://solscan.io/account/' + esc(a) + '#portfolio" target="_blank" rel="noopener">Solscan</a> (read-only) and count token accounts showing a <b>0</b> balance.</p>' +
      '<label for="rc-n" class="small">Step 2: how many empty accounts?</label><div class="rc-row"><input id="rc-n" type="number" min="0" max="5000" inputmode="numeric" value="0"></div>' +
      '<div class="rc-result"><div><small>Empty accounts</small><b class="seg" id="rc-c">0</b></div><div><small>SOL per account</small><b class="seg">' + RENT.toFixed(5) + '</b></div><div><small>Reclaimable SOL</small><b class="seg green" id="rc-s">0.00000</b></div></div>' +
      '<p class="small">Estimate only. This site never sends transactions. To close them, use your wallet\u2019s own clean-up feature or a well-known tool, and check the preview only contains "Close Account".</p>';
    var n = $("rc-n"); n.addEventListener("input", function () { var v = Math.max(0, Math.min(5000, parseInt(n.value, 10) || 0)); $("rc-c").textContent = v; $("rc-s").textContent = (v * RENT).toFixed(5); }); n.focus();
  }
  if (scanBtn) { scanBtn.addEventListener("click", scan); $("rc-addr").addEventListener("keydown", function (e) { if (e.key === "Enter") scan(); }); }
})();
