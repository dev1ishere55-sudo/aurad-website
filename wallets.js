/* $AURAD Aura Wallet: connect an existing wallet, view-only.
   Solana: Phantom, Solflare, Backpack. EVM (EIP-6963 + window.ethereum): MetaMask, Coinbase, Rabby, Phantom EVM.
   Only calls: connect / eth_requestAccounts / wallet_switchEthereumChain / wallet_addEthereumChain.
   Never signs, approves or transfers. No seed-phrase or private-key input exists anywhere on this site. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  var SOL_RPCS = ["https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"];
  var CHAINS = {
    8453: { name: "Base", hex: "0x2105", rpcs: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"], explorer: "https://basescan.org", sym: "ETH" },
    4663: { name: "Robinhood Chain", hex: "0x1237", rpcs: ["https://rpc.mainnet.chain.robinhood.com"], explorer: "https://robinhoodchain.blockscout.com", sym: "ETH" }
  };
  function post(urls, method, params) {
    var i = 0;
    function next() {
      if (i >= urls.length) return Promise.reject(new Error("rpc_unavailable"));
      return fetch(urls[i++], { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j.error || j.result === undefined) throw new Error("rpc_error"); return j.result; })
        .catch(next);
    }
    return next();
  }

  /* ---------- provider discovery ---------- */
  var evm = []; // {info:{name,icon,rdns,uuid}, provider}
  window.addEventListener("eip6963:announceProvider", function (e) {
    var d = e.detail; if (!d || !d.provider || !d.info) return;
    if (!evm.some(function (x) { return x.info.uuid === d.info.uuid; })) evm.push(d);
  });
  try { window.dispatchEvent(new Event("eip6963:requestProvider")); } catch (e) {}
  function solWallets() {
    var out = [];
    if (window.phantom && window.phantom.solana && window.phantom.solana.isPhantom) out.push({ name: "Phantom", p: window.phantom.solana });
    if (window.solflare && window.solflare.isSolflare) out.push({ name: "Solflare", p: window.solflare });
    if (window.backpack && window.backpack.solana) out.push({ name: "Backpack", p: window.backpack.solana });
    else if (window.backpack && window.backpack.connect) out.push({ name: "Backpack", p: window.backpack });
    if (!out.length && window.solana && window.solana.connect) out.push({ name: "Solana wallet", p: window.solana });
    return out;
  }
  function evmWallets() {
    var list = evm.slice();
    if (!list.length && window.ethereum && window.ethereum.request) {
      var e = window.ethereum, n = e.isRabby ? "Rabby" : e.isCoinbaseWallet ? "Coinbase Wallet" : e.isPhantom ? "Phantom (EVM)" : e.isMetaMask ? "MetaMask" : "Browser wallet";
      list.push({ info: { name: n, uuid: "legacy" }, provider: e });
    }
    return list;
  }

  /* ---------- state + UI ---------- */
  var st = { kind: null, addr: null, prov: null, chain: 8453 };
  var dlg = $("wallet-dlg"), cBtn = $("w-connect"), dBtn = $("w-disc");
  if (!cBtn) return;
  function short(a) { return a.slice(0, 5) + "…" + a.slice(-4); }
  function render(bal, sym) {
    var connected = !!st.addr;
    $("w-state").textContent = connected ? "read-only · " + (st.kind === "sol" ? "Solana" : CHAINS[st.chain].name) + " · " + short(st.addr) : "read-only · not connected";
    $("w-bal-lbl").textContent = (sym || (st.kind === "evm" ? "ETH" : "SOL")) + " balance";
    $("w-sol").textContent = bal == null ? "-.----" : bal.toFixed(4);
    var norm = bal == null ? null : (st.kind === "evm" ? Math.min(bal * 20, 1) : Math.min(bal, 1));
    $("w-debt").textContent = norm == null ? "-----" : "-" + Math.max(0, Math.round((1 - norm) * 10000));
    cBtn.classList.toggle("hidden", connected); dBtn.classList.toggle("hidden", !connected);
    $("w-chains").classList.toggle("hidden", st.kind !== "evm");
    document.querySelectorAll("#w-chains [data-chain]").forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.chain) === st.chain)); });
    var ex = $("w-explorer");
    if (connected) {
      ex.href = st.kind === "sol" ? "https://solscan.io/account/" + st.addr : CHAINS[st.chain].explorer + "/address/" + st.addr;
      ex.classList.remove("hidden");
    } else ex.classList.add("hidden");
  }
  function loadBal() {
    $("w-sol").classList.add("loading"); $("w-sol").textContent = "8.8888";
    var p = st.kind === "sol"
      ? post(SOL_RPCS, "getBalance", [st.addr]).then(function (r) { return [(r.value || 0) / 1e9, "SOL"]; })
      : post(CHAINS[st.chain].rpcs, "eth_getBalance", [st.addr, "latest"]).then(function (r) { return [parseInt(r, 16) / 1e18, CHAINS[st.chain].sym]; });
    return p.then(function (x) { $("w-sol").classList.remove("loading"); render(x[0], x[1]); })
      .catch(function () { $("w-sol").classList.remove("loading"); render(null); $("w-state").textContent = "connected · balance unavailable right now"; });
  }
  function fill(id, v, force) { var el = $(id); if (el && (force || !el.value)) el.value = v; }
  function connected(kind, addr, prov) {
    st.kind = kind; st.addr = addr; st.prov = prov;
    if (kind === "sol") fill("rc-addr", addr);
    fill("nft-addr", addr, kind === "evm");
    if (dlg.open) dlg.close();
    return loadBal();
  }
  function msg(t) { $("wd-msg").textContent = t || ""; }

  function connectSol(w) {
    msg("Check your wallet: approve the connection only. No signature is needed.");
    return w.p.connect().then(function (res) {
      var pk = (res && res.publicKey) || w.p.publicKey; if (!pk) throw new Error("no_key");
      try { w.p.on && w.p.on("accountChanged", function (k) { if (k) { st.addr = k.toString(); loadBal(); } else disconnect(); }); } catch (e) {}
      return connected("sol", pk.toString(), w.p);
    }).catch(function () { msg("Connection cancelled."); });
  }
  function connectEvm(w) {
    msg("Check your wallet: approve the connection only. No signature is needed.");
    var p = w.provider;
    return p.request({ method: "eth_requestAccounts" }).then(function (acc) {
      if (!acc || !acc[0]) throw new Error("no_account");
      try {
        p.on && p.on("accountsChanged", function (a) { if (a && a[0]) { st.addr = a[0]; fill("nft-addr", a[0], true); loadBal(); } else disconnect(); });
        p.on && p.on("chainChanged", function (c) { var n = parseInt(c, 16); if (CHAINS[n]) { st.chain = n; loadBal(); } });
      } catch (e) {}
      return p.request({ method: "eth_chainId" }).then(function (c) { var n = parseInt(c, 16); if (CHAINS[n]) st.chain = n; }).catch(function () {})
        .then(function () { return connected("evm", acc[0], p); });
    }).catch(function () { msg("Connection cancelled."); });
  }
  function switchChain(id) {
    var c = CHAINS[id]; if (!c || !st.prov) return;
    st.chain = id; loadBal(); // balances are read from public RPC regardless
    st.prov.request({ method: "wallet_switchEthereumChain", params: [{ chainId: c.hex }] }).catch(function (err) {
      if (err && (err.code === 4902 || (err.data && err.data.originalError && err.data.originalError.code === 4902))) {
        return st.prov.request({ method: "wallet_addEthereumChain", params: [{ chainId: c.hex, chainName: c.name, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: c.rpcs.slice(0, 1), blockExplorerUrls: [c.explorer] }] });
      }
    }).catch(function () {});
  }
  function disconnect() {
    try { st.kind === "sol" && st.prov && st.prov.disconnect && st.prov.disconnect(); } catch (e) {}
    try { st.kind === "evm" && st.prov && st.prov.request && st.prov.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }).catch(function () {}); } catch (e) {}
    st = { kind: null, addr: null, prov: null, chain: 8453 }; render(null);
  }

  function openPicker() {
    try { window.dispatchEvent(new Event("eip6963:requestProvider")); } catch (e) {}
    setTimeout(function () {
      var s = solWallets(), e = evmWallets();
      $("wd-sol").innerHTML = s.length ? s.map(function (w, i) { return '<button class="btn btn-sm wd-opt" type="button" data-sol="' + i + '">' + esc(w.name) + '</button>'; }).join("") :
        '<p class="small">None detected. <a href="https://phantom.com/download" target="_blank" rel="noopener">Phantom</a> · <a href="https://solflare.com/download" target="_blank" rel="noopener">Solflare</a> · <a href="https://backpack.app/download" target="_blank" rel="noopener">Backpack</a></p>';
      $("wd-evm").innerHTML = e.length ? e.map(function (w, i) {
        var ic = w.info.icon && /^data:image\/(svg\+xml|png|webp|jpeg);/.test(w.info.icon) ? '<img src="' + esc(w.info.icon) + '" alt="" width="18" height="18"> ' : "";
        return '<button class="btn btn-sm ghost wd-opt" type="button" data-evm="' + i + '">' + ic + esc(w.info.name) + '</button>';
      }).join("") : '<p class="small">None detected. <a href="https://metamask.io/download/" target="_blank" rel="noopener">MetaMask</a> · <a href="https://www.coinbase.com/wallet/downloads" target="_blank" rel="noopener">Coinbase Wallet</a> · <a href="https://rabby.io" target="_blank" rel="noopener">Rabby</a></p>';
      $("wd-sol").querySelectorAll("[data-sol]").forEach(function (b) { b.addEventListener("click", function () { connectSol(s[Number(b.dataset.sol)]); }); });
      $("wd-evm").querySelectorAll("[data-evm]").forEach(function (b) { b.addEventListener("click", function () { connectEvm(e[Number(b.dataset.evm)]); }); });
      msg("");
      showTab("connect");
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    }, 150);
  }
  function showTab(t) {
    document.querySelectorAll("#wallet-dlg [data-wtab]").forEach(function (b) { var on = b.dataset.wtab === t; b.classList.toggle("active", on); b.setAttribute("aria-selected", String(on)); });
    $("wd-connect").classList.toggle("hidden", t !== "connect"); $("wd-create").classList.toggle("hidden", t !== "create");
  }
  cBtn.addEventListener("click", openPicker);
  var cr = $("w-create"); if (cr) cr.addEventListener("click", function () { openPicker(); setTimeout(function () { showTab("create"); }, 200); });
  dBtn.addEventListener("click", disconnect);
  document.querySelectorAll("#wallet-dlg [data-wtab]").forEach(function (b) { b.addEventListener("click", function () { showTab(b.dataset.wtab); }); });
  $("wd-close").addEventListener("click", function () { dlg.close(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  document.querySelectorAll("#w-chains [data-chain]").forEach(function (b) { b.addEventListener("click", function () { switchChain(Number(b.dataset.chain)); }); });
  render(null);
})();
