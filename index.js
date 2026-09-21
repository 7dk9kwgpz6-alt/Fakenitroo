(function () {
  "use strict";

  var VERSION = "0.2.0";
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
    badgeFlags: 0,
    badgeIds: "",
    customBadgeIcon: "",
    customBadgeDesc: ""
  };

  // Staff, Partner and Certified Moderator are left out on purpose: those get used to fool people in screenshots.
  // [label, flag bit (0 = not flag based), badge id, description, icon hash, group]
  // Icon hashes come from a community table of Discord's own badge icons. Quest, Orb and Brilliance were confirmed against a real profile.
  var BADGES = [
    ["Discord Nitro", 0, "premium", "Discord Nitro subscriber", "2ba85e8026a8614b640c2837bcdfe21b", "nitro"],
    ["Nitro Bronze (1 month)", 0, "premium_tenure_1_month_v2", "Nitro for 1 month: Bronze", "4f33c4a9c64ce221936bd256c356f91f", "nitro"],
    ["Nitro Silver (3 months)", 0, "premium_tenure_3_month_v2", "Nitro for 3 months: Silver", "4514fab914bdbfb4ad2fa23df76121a6", "nitro"],
    ["Nitro Gold (6 months)", 0, "premium_tenure_6_month_v2", "Nitro for 6 months: Gold", "2895086c18d5531d499862e41d1155a6", "nitro"],
    ["Nitro Platinum (1 year)", 0, "premium_tenure_12_month_v2", "Nitro for 1 year: Platinum", "0334688279c8359120922938dcb1d6f8", "nitro"],
    ["Nitro Diamond (2 years)", 0, "premium_tenure_24_month_v2", "Nitro for 2 years: Diamond", "0d61871f72bb9a33a7ae568c1fb4f20a", "nitro"],
    ["Nitro Emerald (3 years)", 0, "premium_tenure_36_month_v2", "Nitro for 3 years: Emerald", "11e2d339068b55d3a506cff34d3780f3", "nitro"],
    ["Nitro Ruby (5 years)", 0, "premium_tenure_60_month_v2", "Nitro for 5 years: Ruby", "cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4", "nitro"],
    ["Nitro Opal (6+ years)", 0, "premium_tenure_72_month_v2", "Nitro for 6+ years: Opal", "5b154df19c53dce2af92c9b61e6be5e2", "nitro"],
    ["Server Booster (1 month)", 0, "guild_booster_lvl1", "Server boosting for 1 month", "51040c70d4f20a921ad6674ff86fc95c", "boost"],
    ["Server Booster (2 months)", 0, "guild_booster_lvl2", "Server boosting for 2 months", "0e4080d1d333bc7ad29ef6528b6f2fb7", "boost"],
    ["Server Booster (3 months)", 0, "guild_booster_lvl3", "Server boosting for 3 months", "72bed924410c304dbe3d00a6e593ff59", "boost"],
    ["Server Booster (6 months)", 0, "guild_booster_lvl4", "Server boosting for 6 months", "df199d2050d3ed4ebf84d64ae83989f8", "boost"],
    ["Server Booster (9 months)", 0, "guild_booster_lvl5", "Server boosting for 9 months", "996b3e870e8a22ce519b3a50e6bdd52f", "boost"],
    ["Server Booster (12 months)", 0, "guild_booster_lvl6", "Server boosting for 12 months", "991c9f39ee33d7537d9f408c3e53141e", "boost"],
    ["Server Booster (15 months)", 0, "guild_booster_lvl7", "Server boosting for 15 months", "cb3ae83c15e970e8f3d410bc62cb8b99", "boost"],
    ["Server Booster (18 months)", 0, "guild_booster_lvl8", "Server boosting for 18 months", "7142225d31238f6387d9f09efaa02759", "boost"],
    ["Server Booster (24 months)", 0, "guild_booster_lvl9", "Server boosting for 24 months", "ec92202290b48d0879b7413d2dde3bab", "boost"],
    ["Completed a Quest", 0, "quest_completed", "Completed a Quest", "7d9ae358c8c5e118768335dbe68b4fb8", "other"],
    ["Orb Profile Badge", 0, "orb_profile_badge", "Collected the Orb Profile Badge", "83d8a1eb09a8d64e59233eec5d4d5c2d", "other"],
    ["Originally known as", 0, "legacy_username", "Originally known as a previous username", "6de6d34650760ba5551a79732e98ed60", "other"],
    ["Level 100 Reached", 0, "april_fools_2026", "Level 100 Reached", "ca105ad9cfc8580c765101d17bbb2323", "other"],
    ["HypeSquad Events", 4, "hypesquad", "HypeSquad Events", "bf01d1073931f921909045f3a39fd264", "discord"],
    ["Bug Hunter Level 1", 8, "bug_hunter_level_1", "Discord Bug Hunter", "2717692c7dca7289b35297368a940dd0", "discord"],
    ["HypeSquad Bravery", 64, "hypesquad_house_1", "HypeSquad Bravery", "8a88d63823d8a71cd5e390baa45efa02", "discord"],
    ["HypeSquad Brilliance", 128, "hypesquad_house_2", "HypeSquad Brilliance", "011940fd013da3f7fb926e4a1cd2e618", "discord"],
    ["HypeSquad Balance", 256, "hypesquad_house_3", "HypeSquad Balance", "3aa41de486fa12454c3761e8e223442e", "discord"],
    ["Early Supporter", 512, "premium_early_supporter", "Early Supporter", "7060786766c9c840eb3019e725d2b358", "discord"],
    ["Bug Hunter Level 2", 16384, "bug_hunter_level_2", "Discord Bug Hunter", "848f79194d4be5ff5f81505cbd0ce1e6", "discord"],
    ["Early Verified Bot Developer", 131072, "verified_developer", "Early Verified Bot Developer", "6df5892e0f35b051f8b61eace34f4967", "discord"],
    ["Active Developer", 4194304, "active_developer", "Active Developer", "6bdc42827a38498929a4920da12695d9", "discord"]
  ];

  var BADGE_GROUPS = [
    ["nitro", "Nitro badges", "The Nitro badge plus every tenure tier up to Opal."],
    ["boost", "Server booster badges", "Boost levels from 1 to 24 months."],
    ["other", "Quest and other badges", "Quest, Orb, legacy username and Level 100."],
    ["discord", "Discord badges", "HypeSquad, bug hunter, early supporter and developer badges."]
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

  function idSet() {
    var m = {};
    String(storage.badgeIds || "").split(",").forEach(function (x) { if (x) m[x] = true; });
    return m;
  }

  function wantedBadges() {
    var bits = Number(storage.badgeFlags) || 0;
    var ids = idSet();
    var out = [];
    BADGES.forEach(function (b) {
      if (b[1] ? (bits & b[1]) !== 0 : !!ids[b[2]]) out.push({ id: b[2], description: b[3], icon: b[4] });
    });
    var icon = String(storage.customBadgeIcon || "").trim().toLowerCase();
    if (/^[0-9a-f]{32}$/.test(icon)) out.push({ id: "profileforge_custom", description: String(storage.customBadgeDesc || "Custom badge"), icon: icon });
    return out;
  }

  function badgesFor(orig) {
    var sig = [storage.badgeFlags, storage.badgeIds, storage.customBadgeIcon, storage.customBadgeDesc].join("|");
    return memo("badges", sig, orig, function () {
      var out = Array.isArray(orig) ? orig.slice() : [];
      var seen = {};
      out.forEach(function (b) { if (b && b.id) seen[b.id] = true; });
      wantedBadges().forEach(function (b) { if (!seen[b.id]) out.push(b); });
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
    var hasBadges = on && wantedBadges().length > 0;
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
    setField(p, "badges", badgesFor(origOf(p, "badges")), hasBadges);
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
        var effects = [];
        var seen = {};
        var typeCounts = {};
        var sample = null;

        function addItem(it, name, prodSku) {
          if (!it) return;
          var t = String(it.type);
          typeCounts[t] = (typeCounts[t] || 0) + 1;
          var sku = String(it.sku_id || prodSku || "");
          var thumbFx = it.thumbnailPreviewSrc || it.thumbnail_preview_src;
          if (it.asset && (it.palette || /nameplate/i.test(String(it.asset)))) {
            if (seen["p:" + it.asset]) return;
            seen["p:" + it.asset] = true;
            plates.push({
              name: name, asset: it.asset, skuId: sku, label: it.label || name, palette: it.palette || "",
              thumb: "https://cdn.discordapp.com/assets/collectibles/" + it.asset + "static.png"
            });
          } else if (it.asset) {
            if (seen["d:" + it.asset]) return;
            seen["d:" + it.asset] = true;
            decos.push({
              name: name, asset: it.asset, skuId: sku,
              thumb: "https://cdn.discordapp.com/avatar-decoration-presets/" + it.asset + ".png?size=96&passthrough=false"
            });
          } else if ((it.type === 1 || it.title || thumbFx) && (it.sku_id || it.id)) {
            var id = String(it.sku_id || it.id);
            if (seen["e:" + id]) return;
            seen["e:" + id] = true;
            if (!sample) sample = it;
            effects.push({ name: it.title || name, id: id, skuId: id, thumb: thumbFx });
          }
        }

        function addProduct(p, catName, depth) {
          if (!p || depth > 3) return;
          var name = p.name || catName || "item";
          (p.items || []).forEach(function (it) { addItem(it, name, p.sku_id); });
          (p.bundled_products || []).forEach(function (bp) { addProduct(bp, name, depth + 1); });
        }

        cats.forEach(function (c) {
          (c.products || []).forEach(function (p) { addProduct(p, c.name, 0); });
        });

        catalogInfo = "categories=" + cats.length + " decos=" + decos.length + " plates=" + plates.length +
          " effects=" + effects.length + " itemTypes=" + json(typeCounts) +
          " sampleEffectKeys=" + (sample ? Object.keys(sample).join(",") : "none");
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

  function probeStores() {
    var names = ["ProfileEffectStore", "ProfileEffectsStore", "CollectiblesShopStore", "CollectiblesCategoryStore", "CollectiblesStore", "AvatarDecorationStore", "NameplateStore"];
    var lines = [];
    names.forEach(function (n) {
      var st_ = null;
      try { st_ = metro.findByStoreName(n); } catch (_) {}
      if (!st_) { lines.push(n + ": missing"); return; }
      var proto = Object.getPrototypeOf(st_) || {};
      var fns = Object.getOwnPropertyNames(proto).filter(function (k) {
        var isFn = false;
        try { isFn = typeof st_[k] === "function"; } catch (_) {}
        return k !== "constructor" && isFn;
      });
      var line = n + ": found (" + fns.slice(0, 20).join(",") + ")";
      var id = storage.effectId;
      if (id) {
        fns.forEach(function (k) {
          if (/^get/.test(k) && /effect/i.test(k)) {
            var r;
            try { r = st_[k](id); } catch (e) { r = "threw"; }
            line += "\n    " + k + "(effect) -> " + (r === undefined ? "undefined" : r === null ? "null" : typeof r);
          }
        });
      }
      lines.push(line);
    });
    return lines.join("\n  ");
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
    add("effect stores", "\n  " + probeStores());
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
    var idsNow = idSet();
    function badgeOn(b) { return b[1] ? (flags & b[1]) !== 0 : !!idsNow[b[2]]; }
    function setBadges(list, on) {
      var f = Number(storage.badgeFlags) || 0;
      var m = idSet();
      list.forEach(function (b) {
        if (b[1]) { f = on ? (f | b[1]) : (f & ~b[1]); }
        else if (on) { m[b[2]] = true; }
        else { delete m[b[2]]; }
      });
      setMany({ badgeFlags: f, badgeIds: Object.keys(m).join(",") });
    }

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

    cards.push(Card("Profile effect", "Selected: " + (storage.effectName || storage.effectId || "none") + ". If it doesn't animate, open Discord's own Shop once (Settings), then reopen your profile.", [
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

    BADGE_GROUPS.forEach(function (g) {
      var list = BADGES.filter(function (b) { return b[5] === g[0]; });
      var rows = list.map(function (b) {
        return ToggleRow(b[0], badgeOn(b), function (v) { setBadges([b], v); });
      });
      rows.push(Btn("Turn all on", function () { setBadges(list, true); }, true));
      rows.push(Btn("Turn all off", function () { setBadges(list, false); }, true));
      cards.push(Card(g[1], g[2], rows));
    });

    cards.push(Card("Custom badge", "Any badge icon hash (32 characters), for badges not listed above.", [
      h(Field, { key: "cbi:" + storage.customBadgeIcon, label: "Icon hash", placeholder: "32 hex characters", value: storage.customBadgeIcon, onSave: function (v) { set("customBadgeIcon", v); } }),
      h(Field, { key: "cbd:" + storage.customBadgeDesc, label: "Description", placeholder: "Custom badge", value: storage.customBadgeDesc, onSave: function (v) { set("customBadgeDesc", v); } })
    ]));

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
