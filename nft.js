/* $AURAD NFT tab: read-only gallery. No signing, no approvals, no mint. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var EVM = /^0x[a-fA-F0-9]{40}$/, SOL = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function safeImg(u) {
    if (!u || typeof u !== "string") return "";
    if (u.indexOf("ipfs://") === 0) u = "https://ipfs.io/ipfs/" + u.slice(7).replace(/^ipfs\//, "");
    if (/^https:\/\//i.test(u) || /^data:image\/(png|jpeg|gif|webp|svg\+xml);/i.test(u)) return u;
    return "";
  }
  var btn = $("nft-go"), out = $("nft-out"), inp = $("nft-addr");
  if (!btn) return;
  function go() {
    var a = inp.value.trim();
    if (SOL.test(a) && !EVM.test(a)) {
      out.innerHTML = '<div class="empty"><strong>Solana wallet detected</strong>Solana NFT lookups need a paid data key, so for now view it on ' +
        '<a href="https://magiceden.io/u/' + esc(a) + '" target="_blank" rel="noopener nofollow">Magic Eden</a> or ' +
        '<a href="https://www.tensor.trade/portfolio?wallet=' + esc(a) + '" target="_blank" rel="noopener nofollow">Tensor</a>.</div>';
      return;
    }
    if (!EVM.test(a)) { out.innerHTML = '<p class="form-msg err">Paste a Base (0x…) or Solana address.</p>'; return; }
    btn.disabled = true; out.innerHTML = '<p class="muted">Pulling NFTs from Base (read-only)…</p>';
    fetch("https://base.blockscout.com/api/v2/addresses/" + a + "/nft?type=ERC-721,ERC-1155")
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) {
        var it = (j.items || []).slice(0, 24);
        if (!it.length) { out.innerHTML = '<div class="empty"><strong>No NFTs on Base</strong>This wallet holds none, or they\u2019re on another chain.</div>'; return; }
        out.innerHTML = '<p class="small"><span class="seg">' + it.length + '</span> shown. Unknown NFTs you never bought are usually spam. Never open links inside them.</p><div class="nft-grid">' +
          it.map(function (x) {
            var t = x.token || {}, img = safeImg(x.image_url || (x.metadata && x.metadata.image));
            return '<figure class="nft">' + (img ? '<img loading="lazy" referrerpolicy="no-referrer" src="' + esc(img) + '" alt="' + esc(t.name || "NFT") + '">' : '<div class="nft-ph" aria-hidden="true">?</div>') +
              '<figcaption><b>' + esc(t.name || "Unknown") + '</b><span>#<span class="seg">' + esc(String(x.id || "").slice(0, 10)) + '</span></span></figcaption></figure>';
          }).join("") + '</div>';
      })
      .catch(function () { out.innerHTML = '<p class="small">Couldn\u2019t reach the Base data source. Try again in a minute.</p>'; })
      .then(function () { btn.disabled = false; });
  }
  btn.addEventListener("click", go);
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
})();
