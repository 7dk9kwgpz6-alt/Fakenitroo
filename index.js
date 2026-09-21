(function () {
  "use strict";

  var VERSION = "0.1.1";
  var V = vendetta;
  var patcher = V.patcher;
  var metro = V.metro;
  var storage = V.plugin.storage;
  var React = metro.common.React;
  var RN = metro.common.ReactNative;
  var h = React.createElement;

  var unpatches = [];
  var backups = new WeakMap();
  var errors = [];
  var memos = {};
  var cache = {};
  var myId = null;
  var UserStore = null;
  var UserProfileStore = null;
  var restApi = null;
  var notes = [];
  var catalogInfo = "";

  var DEFAULTS = {
    enabled: true,
    spoofNitro: false,
    primaryColor: "",
    accentColor: "",
    effectId: "",
    effectSkuId: "",
    effectName: "",
    decoAsset: "",
    decoSkuId: "",
    decoName: "",
    plateAsset: "",
    plateSkuId: "",
    plateLabel: "",
    platePalette: "",
    plateName: "",
    badgeFlags: 0
  };

  // Staff, Partner and Certified Moderator are left out on purpose: those get used to fool people in screenshots.
  // [label, flag bit, badge id, description, icon hash]. The Brilliance hash was read from a real profile; the rest are from memory.
  var BADGES = [
    ["HypeSquad Events", 4, "hypesquad", "HypeSquad Events", "bf01d1073931f921909045f3a39fd264"],
    ["Bug Hunter Level 1", 8, "bug_hunter_level_1", "Discord Bug Hunter", "2717692c7dca7289b35297368a940dd0"],
    ["HypeSquad Bravery", 64, "hypesquad_house_1", "HypeSquad Bravery", "8a88d63823d8a71cd5e390baa45efa02"],
    ["HypeSquad Brilliance", 128, "hypesquad_house_2", "HypeSquad Brilliance", "011940fd013da3f7fb926e4a1cd2e618"],
    ["HypeSquad Balance", 256, "hypesquad_house_3", "HypeSquad Balance", "3aa41de486fa12454c3761e8e223442e"],
    ["Early Supporter", 512, "premium_early_supporter", "Early Supporter", "7060786766c9c840eb3019e725d2b358"],
    ["Bug Hunter Level 2", 16384, "bug_hunter_level_2", "Discord Bug Hunter", "848f79194d4be5ff5f81505cbd0ce1e6"],
    ["Early Verified Bot Developer", 131072, "verified_developer", "Early Verified Bot Developer", "6df5892e37d4bad8cb1e2bd6acc0b4cb"],
    ["Active Developer", 4194304, "active_developer", "Active Developer", "6bdc42827a38498929a4920da12695d9"]
  ];

  var has = Object.prototype.hasOwnProperty;

  function fail(where, e) {
    var msg = where + ": " + (e && e.message ? e.message : String(e));
    errors.push(msg);
    if (errors.length > 25) errors.shift();
    try { V.logger.error("[ProfileForge] " + msg); } catch (_) {}
  }

  function toast(msg) {
    try { V.ui.toasts.showToast(msg); } catch (_) {}
  }

  function note(msg) {
    if (notes.indexOf(msg) === -1) notes.push(msg);
    if (notes.length > 25) notes.shift();
  }

  function ensureDefaults() {
    for (var k in DEFAULTS) {
      if (has.call(DEFAULTS, k) && storage[k] === undefined) storage[k] = DEFAULTS[k];
    }
  }

  function hexToInt(s) {
    if (!s) return null;
    var t = String(s).replace("#", "").replace(/\s/g, "");
    return /^[0-9a-fA-F]{6}$/.test(t) ? parseInt(t, 16) : null;
  }

  function memo(name, sig, dep, build) {
    var m = memos[name];
    if (m && m.sig === sig && m.dep === dep) return m.val;
    var val = build();
    memos[name] = { sig: sig, dep: dep, val: val };
    return val;
  }

  // ---- field patching with backups so everything can be undone ----

  function backupFor(obj) {
    var bk = backups.get(obj);
    if (!bk) { bk = {}; backups.set(obj, bk); }
    return bk;
  }

  function origOf(obj, key) {
    var bk = backups.get(obj);
    return bk && has.call(bk, key) ? bk[key].v : obj[key];
  }

  // Some profile fields have setters that silently ignore writes, so verify and redefine if needed.
  function forceSet(obj, key, value) {
    obj[key] = value;
    if (obj[key] !== value) {
      Object.defineProperty(obj, key, { value: value, writable: true, configurable: true, enumerable: true });
      note("redefined " + key);
    }
  }

  function setField(obj, key, value, active) {
    try {
      if (active) {
        var bk = backupFor(obj);
        if (!has.call(bk, key)) bk[key] = { v: obj[key], had: key in obj };
        forceSet(obj, key, value);
      } else {
        var b = backups.get(obj);
        if (b && has.call(b, key)) {
          if (b[key].had) obj[key] = b[key].v; else delete obj[key];
          delete b[key];
        }
      }
    } catch (e) {
      fail("set " + key, e);
    }
  }

  function restoreAll(obj) {
    if (!obj) return;
    var bk = backups.get(obj);
    if (!bk) return;
    Object.keys(bk).forEach(function (k) { setField(obj, k, null, false); });
    backups.delete(obj);
  }

  function withPlate(orig, slot) {
    var sig = [storage.plateAsset, storage.plateSkuId, storage.plateLabel, storage.plateName, storage.platePalette].join("|");
    return memo(slot, sig, orig, function () {
      var base = {};
      if (orig && typeof orig === "object") { for (var k in orig) base[k] = orig[k]; }
      base.nameplate = {
        asset: storage.plateAsset,
        skuId: storage.plateSkuId || undefined,
        sku_id: storage.plateSkuId || undefined,
        label: storage.plateLabel || storage.plateName || "",
        palette: storage.platePalette || ""
      };
      return base;
    });
  }

  function badgesFor(orig) {
    var bits = Number(storage.badgeFlags) || 0;
    return memo("badges", String(bits), orig, function () {
      var out = Array.isArray(orig) ? orig.slice() : [];
      var seen = {};
      out.forEach(function (b) { if (b && b.id) seen[b.id] = true; });
      BADGES.forEach(function (b) {
        if ((bits & b[1]) !== 0 && !seen[b[2]]) out.push({ id: b[2], description: b[3], icon: b[4] });
      });
      return out;
    });
  }

  function decorateUser(u) {
    if (!u || !myId || u.id !== myId) return u;
    var on = !!storage.enabled;
    var bits = on ? (Number(storage.badgeFlags) || 0) : 0;
    var primary = hexToInt(storage.primaryColor);

    setField(u, "premiumType", 2, on && !!storage.spoofNitro);
    setField(u, "publicFlags", (Number(origOf(u, "publicFlags")) || 0) | bits, bits !== 0);
    setField(u, "flags", (Number(origOf(u, "flags")) || 0) | bits, bits !== 0);
    setField(u, "avatarDecorationData", memo("deco", storage.decoAsset + "|" + storage.decoSkuId, null, function () {
      return { asset: storage.decoAsset, skuId: storage.decoSkuId || undefined, expiresAt: null };
    }), on && !!storage.decoAsset);
    setField(u, "collectibles", withPlate(origOf(u, "collectibles"), "userPlate"), on && !!storage.plateAsset);
    setField(u, "accentColor", primary, on && primary !== null);
    return u;
  }

  function decorateProfile(p) {
    if (!p) return p;
    var on = !!storage.enabled;
    var primary = hexToInt(storage.primaryColor);
    var accent = hexToInt(storage.accentColor);
    if (accent === null) accent = primary;
    var bits = on ? (Number(storage.badgeFlags) || 0) : 0;
    var theme = on && primary !== null;
    var effect = on && !!storage.effectId;
    var deco = on && !!storage.decoAsset;
    var plate = on && !!storage.plateAsset;

    setField(p, "themeColors", memo("theme", primary + "|" + accent, null, function () { return [primary, accent]; }), theme);
    setField(p, "profileEffectID", storage.effectId, effect);
    setField(p, "profileEffectId", storage.effectId, effect);
    setField(p, "profileEffect", memo("effect", storage.effectId + "|" + storage.effectSkuId, null, function () {
      return { id: storage.effectId, skuId: storage.effectSkuId || storage.effectId, expiresAt: null };
    }), effect);
    setField(p, "collectibles", withPlate(origOf(p, "collectibles"), "profilePlate"), plate);
    setField(p, "badges", badgesFor(origOf(p, "badges")), bits !== 0);
    setField(p, "premiumType", 2, on && (theme || effect || deco || !!storage.spoofNitro));
    return p;
  }

  function refresh() {
    try { if (UserStore && UserStore.emitChange) UserStore.emitChange(); } catch (_) {}
    try { if (UserProfileStore && UserProfileStore.emitChange) UserProfileStore.emitChange(); } catch (_) {}
  }

  function safePatch(name, obj, cb) {
    try {
      if (obj && typeof obj[name] === "function") unpatches.push(patcher.after(name, obj, cb));
      else fail("install", name + " missing");
    } catch (e) {
      fail("patch " + name, e);
    }
  }

  function install() {
    UserStore = metro.findByStoreName("UserStore");
    UserProfileStore = metro.findByStoreName("UserProfileStore");
    try {
      var cu = UserStore && UserStore.getCurrentUser && UserStore.getCurrentUser();
      if (cu && cu.id) myId = cu.id;
    } catch (e) { fail("getCurrentUser", e); }

    safePatch("getCurrentUser", UserStore, function (args, ret) {
      if (ret && ret.id) myId = ret.id;
      return decorateUser(ret);
    });
    safePatch("getUser", UserStore, function (args, ret) {
      return decorateUser(ret);
    });
    safePatch("getUserProfile", UserProfileStore, function (args, ret) {
      return myId && args[0] === myId ? decorateProfile(ret) : ret;
    });
    refresh();
  }

  function uninstall() {
    unpatches.forEach(function (u) { try { u(); } catch (_) {} });
    unpatches = [];
    try { if (UserStore) restoreAll(UserStore.getCurrentUser()); } catch (_) {}
    try { if (UserProfileStore && myId) restoreAll(UserProfileStore.getUserProfile(myId)); } catch (_) {}
    refresh();
  }

  // ---- catalogs, fetched through Discord's own REST client (no token handling here) ----

  function api(url) {
    if (!restApi) restApi = metro.findByProps("getAPIBaseURL", "get");
    if (!restApi || typeof restApi.get !== "function") return Promise.reject(new Error("Discord REST module not found"));
    return restApi.get({ url: url }).then(function (res) { return res ? res.body : null; });
  }

  function cached(name, fn) {
    if (cache[name]) return Promise.resolve(cache[name]);
    return fn().then(function (v) { cache[name] = v; return v; });
  }

  function loadCollectibles() {
    return cached("collectibles", function () {
      return api("/collectibles-categories").then(function (body) {
        var cats = Array.isArray(body) ? body : ((body && body.categories) || []);
        var decos = [];
        var plates = [];
        var noAsset = [];
        var typeCounts = {};
        var sample = null;
        cats.forEach(function (c) {
          (c.products || []).forEach(function (p) {
            (p.items || []).forEach(function (it) {
              if (!it) return;
              var t = String(it.type);
              typeCounts[t] = (typeCounts[t] || 0) + 1;
              var name = p.name || c.name || String(it.asset || it.id || "item");
              var sku = String(it.sku_id || p.sku_id || "");
              if (it.asset && (it.palette || /nameplate/i.test(String(it.asset)))) {
                plates.push({
                  name: name, asset: it.asset, skuId: sku, label: it.label || name, palette: it.palette || "",
                  thumb: "https://cdn.discordapp.com/assets/collectibles/" + it.asset + "static.png"
                });
              } else if (it.asset) {
                decos.push({
                  name: name, asset: it.asset, skuId: sku,
                  thumb: "https://cdn.discordapp.com/avatar-decoration-presets/" + it.asset + ".png?size=96&passthrough=false"
                });
              } else if (it.id) {
                if (!sample) sample = it;
                noAsset.push({ type: it.type, item: { name: name, id: String(it.id), skuId: sku } });
              }
            });
          });
        });
        var effects = noAsset.filter(function (x) { return x.type === 1; });
        if (!effects.length) effects = noAsset;
        var seen = {};
        effects = effects.map(function (x) { return x.item; }).filter(function (e) {
          if (seen[e.id]) return false;
          seen[e.id] = true;
          return true;
        });
        catalogInfo = "categories=" + cats.length + " decos=" + decos.length + " plates=" + plates.length +
          " effects=" + effects.length + " itemTypes=" + json(typeCounts) +
          " sampleNoAssetItemKeys=" + (sample ? Object.keys(sample).join(",") : "none");
        return { decos: decos, plates: plates, effects: effects };
      });
    });
  }

  function loadEffects() { return loadCollectibles().then(function (r) { return r.effects; }); }
  function loadDecos() { return loadCollectibles().then(function (r) { return r.decos; }); }
  function loadPlates() { return loadCollectibles().then(function (r) { return r.plates; }); }

  // ---- diagnostics (never prints tokens, email, phone, bio or your ID) ----

  function json(x) {
    try {
      var s = JSON.stringify(x);
      if (s === undefined) return "undefined";
      return s.length > 700 ? s.slice(0, 700) + "..." : s;
    } catch (_) {
      return "unserializable";
    }
  }

  function runDiagnostics() {
    var out = [];
    function add(k, v) { out.push(k + ": " + v); }
    add("plugin", "ProfileForge " + VERSION);
    add("UserStore", UserStore ? "found" : "MISSING");
    add("UserProfileStore", UserProfileStore ? "found" : "MISSING");
    add("REST module", metro.findByProps("getAPIBaseURL", "get") ? "found" : "MISSING");
    add("own id known", myId ? "yes" : "no");
    add("patches active", unpatches.length);
    try {
      var u = UserStore && UserStore.getCurrentUser && UserStore.getCurrentUser();
      if (u) {
        add("user.premiumType", u.premiumType);
        add("user.flags", u.flags);
        add("user.publicFlags", u.publicFlags);
        add("user.accentColor", u.accentColor);
        add("user.avatarDecorationData", json(u.avatarDecorationData));
        add("user.collectibles", json(u.collectibles));
      } else add("user", "not readable");
    } catch (e) { add("user read", e && e.message); }
    try {
      var p = UserProfileStore && myId && UserProfileStore.getUserProfile(myId);
      if (p) {
        add("profile keys", Object.keys(p).join(","));
        add("profile.premiumType", p.premiumType);
        add("profile.themeColors", json(p.themeColors));
        add("profile.profileEffectID", json(p.profileEffectID));
        add("profile.profileEffect", json(p.profileEffect));
        add("profile.collectibles", json(p.collectibles));
        add("profile.profileFrame", json(p.profileFrame));
        add("profile.badges", json(p.badges));
      } else add("profile", "not loaded yet (open your own profile once, then run this again)");
    } catch (e2) { add("profile read", e2 && e2.message); }
    add("notes", notes.length ? "\n  " + notes.join("\n  ") : "none");
    add("catalog", catalogInfo || "not loaded (tap a Browse button first, then run this again)");
    add("errors", errors.length ? "\n  " + errors.join("\n  ") : "none");
    return out.join("\n");
  }

  // ---- settings UI (plain React Native, no dependency on Discord's form components) ----

  var C = { card: "#2b2d31", input: "#1e1f22", text: "#f2f3f5", sub: "#b5bac1", accent: "#5865f2", grey: "#4e5058" };
  var st = {
    root: { padding: 12, paddingBottom: 48 },
    card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 12 },
    title: { color: C.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
    sub: { color: C.sub, fontSize: 12, marginBottom: 6 },
    label: { color: C.sub, fontSize: 12, marginTop: 8, marginBottom: 4 },
    input: { backgroundColor: C.input, color: C.text, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
    rowText: { color: C.text, fontSize: 14, flexShrink: 1, paddingRight: 8 },
    btn: { backgroundColor: C.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", marginTop: 8 },
    btn2: { backgroundColor: C.grey, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", marginTop: 8 },
    btnText: { color: "#ffffff", fontWeight: "600" },
    pick: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
    thumb: { width: 36, height: 36, marginRight: 10, borderRadius: 6 },
    mono: { color: C.text, fontSize: 11, marginTop: 8 }
  };

  function box(style, kids) {
    return h.apply(null, [RN.View, { style: style }].concat(kids));
  }

  function Card(title, sub, kids) {
    var head = [h(RN.Text, { style: st.title }, title)];
    if (sub) head.push(h(RN.Text, { style: st.sub }, sub));
    return box(st.card, head.concat(kids));
  }

  function Btn(label, onPress, secondary) {
    return h(RN.TouchableOpacity, { onPress: onPress, style: secondary ? st.btn2 : st.btn }, h(RN.Text, { style: st.btnText }, label));
  }

  function ToggleRow(label, value, onChange) {
    return h(RN.View, { style: st.row },
      h(RN.Text, { style: st.rowText }, label),
      h(RN.Switch, { value: !!value, onValueChange: onChange })
    );
  }

  function Field(props) {
    return h(RN.View, null,
      h(RN.Text, { style: st.label }, props.label),
      h(RN.TextInput, {
        style: st.input,
        defaultValue: String(props.value || ""),
        placeholder: props.placeholder || "",
        placeholderTextColor: C.sub,
        autoCapitalize: "none",
        autoCorrect: false,
        onEndEditing: function (e) { props.onSave(String((e && e.nativeEvent && e.nativeEvent.text) || "").trim()); }
      })
    );
  }

  function CatalogPicker(props) {
    var a = React.useState({ status: "idle", items: [], error: "" });
    var s = a[0];
    var setS = a[1];
    var b = React.useState("");
    var q = b[0];
    var setQ = b[1];

    function load() {
      setS({ status: "loading", items: [], error: "" });
      props.load().then(function (items) {
        setS({ status: "ready", items: items, error: "" });
      }, function (e) {
        var msg = (e && e.body && e.body.message) || (e && e.message) || (e && e.status) || String(e);
        fail(props.title + " list", msg);
        setS({ status: "error", items: [], error: String(msg) });
      });
    }

    var kids = [];
    if (s.status === "idle") kids.push(Btn("Browse " + props.title, load, true));
    if (s.status === "loading") kids.push(h(RN.Text, { key: "l", style: st.sub }, "Loading..."));
    if (s.status === "error") {
      kids.push(h(RN.Text, { key: "e", style: st.sub }, "Could not load the list (" + s.error + "). Use the manual fields below."));
      kids.push(Btn("Retry", load, true));
    }
    if (s.status === "ready") {
      var needle = q.toLowerCase();
      var shown = s.items.filter(function (it) {
        return !needle || String(it.name).toLowerCase().indexOf(needle) !== -1;
      }).slice(0, 30);
      kids.push(h(RN.TextInput, {
        key: "q", style: st.input, placeholder: "Search " + s.items.length + " items",
        placeholderTextColor: C.sub, autoCapitalize: "none", value: q, onChangeText: setQ
      }));
      shown.forEach(function (it, i) {
        kids.push(h(RN.TouchableOpacity, { key: "i" + i, style: st.pick, onPress: function () { props.onPick(it); } },
          it.thumb ? h(RN.Image, { source: { uri: it.thumb }, style: st.thumb }) : null,
          h(RN.Text, { style: st.rowText }, it.name)
        ));
      });
      if (!shown.length) kids.push(h(RN.Text, { key: "n", style: st.sub }, "No matches."));
    }
    return h.apply(null, [RN.View, null].concat(kids));
  }

  function Settings() {
    var t = React.useState(0);
    var bump = t[1];
    var d = React.useState("");
    var diag = d[0];
    var setDiag = d[1];

    function rerender() { bump(function (n) { return n + 1; }); }
    function set(k, v) { storage[k] = v; refresh(); rerender(); }
    function setMany(o) { for (var k in o) { if (has.call(o, k)) storage[k] = o[k]; } refresh(); rerender(); }

    var flags = Number(storage.badgeFlags) || 0;
    function toggleBadge(bit, on) { set("badgeFlags", on ? (flags | bit) : (flags & ~bit)); }

    var cards = [];

    cards.push(Card("ProfileForge " + VERSION, "Local only: you see these changes on this phone, other people don't.", [
      ToggleRow("Enable everything", storage.enabled, function (v) { set("enabled", v); }),
      ToggleRow("Nitro spoof (unlocks Nitro-only screens on this device)", storage.spoofNitro, function (v) { set("spoofNitro", v); }),
      Btn("Apply / refresh now", function () { refresh(); rerender(); toast("Refreshed. Open your profile card to check."); })
    ]));

    cards.push(Card("Theme colors", "Hex like #5865f2. Accent is optional.", [
      h(Field, { key: "pc:" + storage.primaryColor, label: "Primary color", placeholder: "#5865f2", value: storage.primaryColor, onSave: function (v) { set("primaryColor", v); } }),
      h(Field, { key: "ac:" + storage.accentColor, label: "Accent color", placeholder: "#eb459e", value: storage.accentColor, onSave: function (v) { set("accentColor", v); } })
    ]));

    cards.push(Card("Profile effect", "Selected: " + (storage.effectName || storage.effectId || "none"), [
      h(CatalogPicker, { key: "pe", title: "effects", load: loadEffects, onPick: function (it) { setMany({ effectId: it.id, effectSkuId: it.skuId, effectName: it.name }); } }),
      Btn("Clear effect", function () { setMany({ effectId: "", effectSkuId: "", effectName: "" }); }, true),
      h(Field, { key: "ei:" + storage.effectId, label: "Effect ID (manual)", value: storage.effectId, onSave: function (v) { setMany({ effectId: v, effectName: "" }); } })
    ]));

    cards.push(Card("Avatar decoration", "Selected: " + (storage.decoName || storage.decoAsset || "none"), [
      h(CatalogPicker, { key: "ad", title: "decorations", load: loadDecos, onPick: function (it) { setMany({ decoAsset: it.asset, decoSkuId: it.skuId, decoName: it.name }); } }),
      Btn("Clear decoration", function () { setMany({ decoAsset: "", decoSkuId: "", decoName: "" }); }, true),
      h(Field, { key: "da:" + storage.decoAsset, label: "Decoration asset (manual)", placeholder: "a_...", value: storage.decoAsset, onSave: function (v) { setMany({ decoAsset: v, decoName: "" }); } })
    ]));

    cards.push(Card("Nameplate", "Selected: " + (storage.plateName || storage.plateAsset || "none"), [
      h(CatalogPicker, { key: "np", title: "nameplates", load: loadPlates, onPick: function (it) { setMany({ plateAsset: it.asset, plateSkuId: it.skuId, plateLabel: it.label, platePalette: it.palette, plateName: it.name }); } }),
      Btn("Clear nameplate", function () { setMany({ plateAsset: "", plateSkuId: "", plateLabel: "", platePalette: "", plateName: "" }); }, true),
      h(Field, { key: "pa:" + storage.plateAsset, label: "Nameplate asset (manual)", placeholder: "nameplates/nameplates/bloom/", value: storage.plateAsset, onSave: function (v) { setMany({ plateAsset: v, plateName: "" }); } }),
      h(Field, { key: "pp:" + storage.platePalette, label: "Nameplate palette (manual)", placeholder: "cobalt", value: storage.platePalette, onSave: function (v) { set("platePalette", v); } })
    ]));

    cards.push(Card("Badges", "Flag-based Discord badges shown on your own profile.", BADGES.map(function (b) {
      return ToggleRow(b[0], (flags & b[1]) !== 0, function (v) { toggleBadge(b[1], v); });
    })));

    var diagKids = [
      Btn("Run diagnostics", function () { setDiag(runDiagnostics()); }, true)
    ];
    if (diag) {
      diagKids.push(h(RN.Text, { style: st.mono, selectable: true }, diag));
      diagKids.push(Btn("Copy diagnostics", function () {
        try { metro.common.clipboard.setString(diag); toast("Copied"); } catch (e) { toast("Press and hold the text to copy it"); }
      }));
    }
    cards.push(Card("Diagnostics", "If something doesn't show, run this and send me the output.", diagKids));

    return box(st.root, cards);
  }

  function withScroll(Inner) {
    return function Root() {
      return h(RN.ScrollView, { keyboardShouldPersistTaps: "handled", nestedScrollEnabled: true }, h(Inner, null));
    };
  }

  return {
    onLoad: function () {
      try { ensureDefaults(); install(); } catch (e) { fail("onLoad", e); }
    },
    onUnload: function () {
      try { uninstall(); } catch (e) { fail("onUnload", e); }
    },
    settings: withScroll(Settings)
  };
})()
