(function () {
  "use strict";

  var VERSION = "0.3.2";
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
  var GuildMemberStore = null;
  var extVer = 0;
  var hooks = { avatar: [], banner: [] };
  var active = false;
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
    customBadgeDesc: "",
    hiddenBadges: "",
    frameSku: "",
    frameName: "",
    frameJson: "",
    bannerUrl: "",
    avatarUrl: "",
    bannerData: "",
    avatarData: "",
    fakeName: "",
    nameStyleOn: false,
    nameEffect: 2,
    nameFont: 11,
    nameColor1: "",
    nameColor2: "",
    nameColor3: "",
    nameColor4: "",
    nameColor5: ""
  };

  var GRADIENTS = [
    ["Sunset", ["#ff512f", "#f09819"]],
    ["Ocean", ["#2193b0", "#6dd5ed"]],
    ["Neon", ["#ff00cc", "#3333ff"]],
    ["Aurora", ["#00c6ff", "#7f00ff"]],
    ["Lava", ["#f12711", "#f5af19"]],
    ["Toxic", ["#00ff87", "#60efff"]],
    ["Cotton Candy", ["#ff9a9e", "#a1c4fd"]],
    ["Midnight", ["#0f2027", "#2c5364"]],
    ["Gold", ["#f7971e", "#ffd200"]],
    ["Ice", ["#e0eafc", "#7fb2ff"]],
    ["Blurple", ["#5865f2", "#eb459e"]],
    ["Grape", ["#8e2de2", "#4a00e0"]],
    ["Rose", ["#ee9ca7", "#ffdde1"]],
    ["Ember", ["#ff416c", "#ff4b2b"]],
    ["Mint", ["#11998e", "#38ef7d"]],
    ["Vaporwave", ["#ff71ce", "#01cdfe", "#05ffa1", "#b967ff", "#fffb96"]],
    ["Rainbow", ["#ff0000", "#ffa500", "#ffff00", "#00c853", "#2979ff"]],
    ["Candy Pop", ["#ff6ec7", "#ffb86c", "#f1fa8c", "#50fa7b", "#8be9fd"]]
  ];

  // Display name styles: effect and font ids as documented for Discord's display name style object.
  var NAME_EFFECTS = [[2, "Gradient"], [7, "Prism"], [6, "Glow"], [8, "Gummy"], [1, "Solid"], [3, "Neon"], [4, "Toon"], [5, "Pop"]];
  var NAME_FONTS = [[11, "Default"], [3, "Sakura"], [4, "Jellybean"], [6, "Modern"], [7, "Medieval"], [8, "8Bit"], [10, "Vampyre"], [12, "Tempo"], [13, "Monkey Bars"], [14, "Mainframe"], [15, "Headbang"], [16, "Journal"]];

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

  function hiddenSet() {
    var m = {};
    String(storage.hiddenBadges || "").split(",").forEach(function (x) { if (x) m[x] = true; });
    return m;
  }

  function badgesFor(orig) {
    var sig = [storage.badgeFlags, storage.badgeIds, storage.customBadgeIcon, storage.customBadgeDesc, storage.hiddenBadges].join("|");
    return memo("badges", sig, orig, function () {
      var hidden = hiddenSet();
      var out = (Array.isArray(orig) ? orig : []).filter(function (b) { return !(b && hidden[b.id]); });
      var seen = {};
      out.forEach(function (b) { if (b && b.id) seen[b.id] = true; });
      wantedBadges().forEach(function (b) { if (!seen[b.id]) out.push(b); });
      return out;
    });
  }

  function nameStyleObj() {
    var cols = [];
    for (var i = 1; i <= 5; i++) {
      var c = hexToInt(storage["nameColor" + i]);
      if (c !== null) cols.push(c);
    }
    if (!cols.length) cols = [0x5865f2];
    var eff = Number(storage.nameEffect) || 2;
    var font = Number(storage.nameFont) || 11;
    var single = eff === 1 || eff === 3 || eff === 4 || eff === 5;
    return memo("nameStyle", [eff, font, cols.join(",")].join("|"), null, function () {
      var use = single ? cols.slice(0, 1) : cols.slice(0, 5);
      return { fontId: font, font_id: font, effectId: eff, effect_id: eff, colors: use };
    });
  }

  function frameObj() {
    var sku = String(storage.frameSku || "");
    if (!sku) return null;
    return memo("frame", sku + "|" + storage.frameJson, null, function () {
      var it = {};
      try { it = JSON.parse(storage.frameJson || "{}") || {}; } catch (_) {}
      var o = { id: sku, skuId: sku, sku_id: sku, expiresAt: null, expires_at: null };
      if (it.layers) o.layers = it.layers;
      if (it.label) o.label = it.label;
      var map = { inner_width: "innerWidth", overflow_top: "overflowTop", overflow_bottom: "overflowBottom", overflow_horizontal: "overflowHorizontal" };
      Object.keys(map).forEach(function (k) { if (it[k] !== undefined) { o[k] = it[k]; o[map[k]] = it[k]; } });
      return o;
    });
  }

  function customUrl(kind) {
    var saved = String((kind === "avatar" ? storage.avatarData : storage.bannerData) || "");
    if (/^data:image\//i.test(saved)) return saved;
    var url = String((kind === "avatar" ? storage.avatarUrl : storage.bannerUrl) || "").trim();
    return /^https?:\/\//i.test(url) ? url : "";
  }

  function mentionsMe(args) {
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (a === myId) return true;
      if (a && typeof a === "object" && (a.id === myId || a.userId === myId)) return true;
    }
    return false;
  }

  function kindOf(name) { return /Banner/.test(name) ? "banner" : "avatar"; }

  // name: the Discord function being hooked; self: the User instance for instance methods
  function urlOverride(kind, name, self, args, ret) {
    if (!active || !storage.enabled || !myId) return ret;
    var url = customUrl(kind);
    if (!url) return ret;
    if (!(self && self.id === myId) && !mentionsMe(args)) return ret;
    if (/Source$/.test(name)) return Object.assign({}, ret && typeof ret === "object" ? ret : {}, { uri: url });
    return url;
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
    var ns = on && storage.nameStyleOn ? nameStyleObj() : null;
    setField(u, "displayNameStyles", ns, !!ns);
    setField(u, "display_name_styles", ns, !!ns);
    setField(u, "globalName", String(storage.fakeName || ""), on && !!storage.fakeName);
    setField(u, "banner", "a_profileforge", on && hooks.banner.length > 0 && !!customUrl("banner"));
    return u;
  }

  function decorateProfile(p) {
    if (!p) return p;
    var on = !!storage.enabled;
    var primary = hexToInt(storage.primaryColor);
    var accent = hexToInt(storage.accentColor);
    if (accent === null) accent = primary;
    var hasBadges = on && (wantedBadges().length > 0 || Object.keys(hiddenSet()).length > 0);
    var frame = on ? frameObj() : null;
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
    setField(p, "profileFrame", frame, !!frame);
    setField(p, "banner", "a_profileforge", on && hooks.banner.length > 0 && !!customUrl("banner"));
    setField(p, "premiumType", 2, on && (theme || effect || deco || !!frame || !!storage.spoofNitro));
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

    GuildMemberStore = metro.findByStoreName("GuildMemberStore");
    safePatch("getNick", GuildMemberStore, function (args, ret) {
      return myId && args[1] === myId && storage.enabled && storage.fakeName ? String(storage.fakeName) : ret;
    });
    // Return a copy instead of editing the shared member object, so nothing leaks after the name is cleared.
    safePatch("getMember", GuildMemberStore, function (args, ret) {
      if (!ret || !myId || args[1] !== myId || !storage.enabled) return ret;
      var nm = storage.fakeName ? String(storage.fakeName) : "";
      var ns = storage.nameStyleOn ? nameStyleObj() : null;
      if (!nm && !ns) return ret;
      return memo("member:" + args[0], nm + "|" + (ns ? JSON.stringify(ns) : ""), ret, function () {
        var c = Object.create(Object.getPrototypeOf(ret));
        Object.keys(ret).forEach(function (k) { c[k] = ret[k]; });
        if (nm) c.nick = nm;
        if (ns) { c.displayNameStyles = ns; c.display_name_styles = ns; }
        return c;
      });
    });

    hooks = { avatar: [], banner: [] };
    active = true;
    hookUrls();
    refresh();
  }

  var URL_MOD_RE = /^get(?:User|GuildMember)(?:Avatar|Banner)(?:URL|Source)$/;
  var URL_PROTO_RE = /^get(?:Avatar|Banner)(?:URL|Source)$/;

  function hookUrls() {
    var mods = [];
    ["getUserAvatarURL", "getUserAvatarSource", "getGuildMemberAvatarURL", "getGuildMemberAvatarSource", "getUserBannerURL", "getUserBannerSource", "getGuildMemberBannerURL"].forEach(function (probe) {
      var m = null;
      try { m = metro.findByProps(probe); } catch (_) {}
      if (m && mods.indexOf(m) === -1) mods.push(m);
    });
    mods.forEach(function (mod) {
      Object.keys(mod).forEach(function (name) {
        if (!URL_MOD_RE.test(name) || typeof mod[name] !== "function") return;
        try {
          unpatches.push(patcher.after(name, mod, function (args, ret) { return urlOverride(kindOf(name), name, null, args, ret); }));
          hooks[kindOf(name)].push(name);
        } catch (e) { fail("hook " + name, e); }
      });
    });

    // Instance methods on the User class (profile screens and member lists use these, not the module functions).
    try {
      var cu = UserStore && UserStore.getCurrentUser && UserStore.getCurrentUser();
      var proto = cu ? Object.getPrototypeOf(cu) : null;
      if (proto && proto !== Object.prototype) {
        Object.getOwnPropertyNames(proto).forEach(function (name) {
          if (!URL_PROTO_RE.test(name)) return;
          var orig = proto[name];
          if (typeof orig !== "function") return;
          var wrapped = function () {
            var ret = orig.apply(this, arguments);
            return urlOverride(kindOf(name), name, this, arguments, ret);
          };
          proto[name] = wrapped;
          unpatches.push(function () { if (proto[name] === wrapped) proto[name] = orig; });
          hooks[kindOf(name)].push("User#" + name);
        });
      }
    } catch (e) { fail("hook user methods", e); }
  }

  function uninstall() {
    active = false;
    unpatches.forEach(function (u) { try { u(); } catch (_) {} });
    unpatches = [];
    try { if (UserStore) restoreAll(UserStore.getCurrentUser()); } catch (_) {}
    try { if (UserProfileStore && myId) restoreAll(UserProfileStore.getUserProfile(myId)); } catch (_) {}
    refresh();
  }

  // ---- catalogs, fetched through Discord's own REST client (no token handling here) ----

  function api(url, query) {
    if (!restApi) restApi = metro.findByProps("getAPIBaseURL", "get");
    if (!restApi || typeof restApi.get !== "function") return Promise.reject(new Error("Discord REST module not found"));
    var req = { url: url };
    if (query) req.query = query;
    return restApi.get(req).then(function (res) { return res ? res.body : null; });
  }

  function cached(name, fn) {
    if (cache[name]) return Promise.resolve(cache[name]);
    return fn().then(function (v) { cache[name] = v; return v; });
  }

  function loadCollectibles() {
    return cached("collectibles", function () {
      var main = api("/collectibles-categories", { include_bundles: true }).then(null, function () { return api("/collectibles-categories"); });
      var frameTab = api("/collectibles-shop", { tab: "profile-frames", include_bundles: true }).then(null, function () { return null; });
      return Promise.all([main, frameTab]).then(function (bodies) {
        var cats = [];
        bodies.forEach(function (body) {
          if (!body) return;
          cats = cats.concat(Array.isArray(body) ? body : (body.categories || []));
        });
        var decos = [];
        var plates = [];
        var effects = [];
        var frames = [];
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
          } else if (it.type === 3 || it.layers) {
            if (!it.sku_id && !prodSku) return;
            if (seen["f:" + sku]) return;
            seen["f:" + sku] = true;
            frames.push({
              name: name, id: sku, skuId: sku,
              item: {
                label: it.label, layers: it.layers, inner_width: it.inner_width,
                overflow_top: it.overflow_top, overflow_bottom: it.overflow_bottom, overflow_horizontal: it.overflow_horizontal
              }
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
          " effects=" + effects.length + " frames=" + frames.length + " itemTypes=" + json(typeCounts) +
          " sampleEffectKeys=" + (sample ? Object.keys(sample).join(",") : "none");
        return { decos: decos, plates: plates, effects: effects, frames: frames };
      });
    });
  }

  function loadEffects() { return loadCollectibles().then(function (r) { return r.effects; }); }
  function loadFrames() { return loadCollectibles().then(function (r) { return r.frames; }); }
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

  function harvestSamples() {
    var found = {};
    var out = [];
    try {
      var users = UserStore && UserStore.getUsers ? UserStore.getUsers() : null;
      var ids = users ? Object.keys(users).slice(0, 400) : [];
      ids.forEach(function (id) {
        if (id === myId) return;
        var p = null;
        try { p = UserProfileStore && UserProfileStore.getUserProfile(id); } catch (_) {}
        if (p) {
          if (!found.profileFrame && p.profileFrame) found.profileFrame = p.profileFrame;
          if (!found.profileEffect && p.profileEffect && p.profileEffect.id) found.profileEffect = p.profileEffect;
        }
        var u = users[id];
        if (u && !found.displayNameStyles && u.displayNameStyles) found.displayNameStyles = u.displayNameStyles;
        if (u && !found.nameplate && u.collectibles && u.collectibles.nameplate) found.nameplate = u.collectibles.nameplate;
      });
    } catch (e) { out.push("harvest error: " + (e && e.message)); }
    Object.keys(found).forEach(function (k) { out.push(k + ": " + json(found[k])); });
    if (!Object.keys(found).length) out.push("none found in cached profiles (open a few profiles first)");
    return out.join("\n  ");
  }

  function probeFlux() {
    var fd = null;
    try { fd = (metro.common && metro.common.FluxDispatcher) || metro.findByProps("dispatch", "subscribe"); } catch (_) {}
    if (!fd) return "dispatcher missing";
    var table = null;
    try { table = fd._actionHandlers && (fd._actionHandlers._orderedActionHandlers || fd._actionHandlers); } catch (_) {}
    if (!table) return "no handler table";
    var names = Object.keys(table).filter(function (k) { return /COLLECTIBLE|PROFILE_EFFECT|PROFILE_FRAME|USER_PROFILE|SHOP/.test(k); }).slice(0, 30);
    return names.join(",") || "none matching";
  }

  function scanExports(re, cap) {
    var out = [];
    try {
      var mods = metro.modules || (typeof globalThis !== "undefined" ? globalThis.modules : null);
      if (!mods) return "module list unavailable";
      var ids = Object.keys(mods);
      for (var i = 0; i < ids.length && out.length < cap; i++) {
        var m = mods[ids[i]];
        var ex = m && m.isInitialized && m.publicModule && m.publicModule.exports;
        if (!ex) continue;
        var keys = [];
        try { keys = Object.keys(ex); } catch (_) {}
        var hit = keys.filter(function (k) { return re.test(k); });
        if (hit.length) out.push(ids[i] + ": " + hit.slice(0, 6).join(","));
      }
    } catch (e) { return "scan failed: " + (e && e.message); }
    return out.length ? out.join("\n  ") : "none";
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
        add("user.displayNameStyles", json(u.displayNameStyles));
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
    add("name style we apply", storage.enabled && storage.nameStyleOn ? json(nameStyleObj()) : "off");
    add("name style helpers in loaded modules", "\n  " + scanExports(/displayNameStyle|DisplayNameStyle|nameStyle|NameStyle/, 12));
    try {
      var cu2 = UserStore && UserStore.getCurrentUser && UserStore.getCurrentUser();
      var pr = cu2 ? Object.getPrototypeOf(cu2) : null;
      add("user class avatar/banner methods", pr ? Object.getOwnPropertyNames(pr).filter(function (k) { return /avatar|banner/i.test(k); }).join(",") || "none" : "unknown");
    } catch (e3) { add("user class methods", e3 && e3.message); }
    add("avatar/banner helpers in loaded modules", "\n  " + scanExports(/^get(User|GuildMember)?(Avatar|Banner)(URL|Source)$/, 10));
    add("url hooks", "avatar=[" + hooks.avatar.join(",") + "] banner=[" + hooks.banner.join(",") + "]");
    add("real samples from other cached profiles", "\n  " + harvestSamples());
    add("flux actions", "\n  " + probeFlux());
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
    mono: { color: C.text, fontSize: 11, marginTop: 8 },
    pv: { backgroundColor: C.card, borderRadius: 14, overflow: "hidden", marginBottom: 12 },
    pvBanner: { height: 76, overflow: "hidden" },
    pvBannerImg: { width: "100%", height: 76 },
    pvStripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: 5 },
    pvBody: { paddingHorizontal: 14, paddingBottom: 14 },
    pvAvatarRow: { flexDirection: "row", alignItems: "flex-end", marginTop: -30 },
    pvAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: C.card, backgroundColor: C.grey },
    pvName: { fontSize: 18, fontWeight: "700", marginTop: 8 },
    pvDots: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
    pvDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 3 },
    pvBadges: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
    pvBadge: { width: 22, height: 22, marginRight: 5, marginBottom: 4 },
    pvNote: { color: C.sub, fontSize: 11, marginTop: 2 },
    swatchRow: { flexDirection: "row", marginBottom: 4, borderRadius: 4, overflow: "hidden" },
    swatch: { width: 14, height: 10 },
    chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
    chip: { backgroundColor: C.grey, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 6, marginBottom: 6 },
    chipOn: { backgroundColor: C.accent, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 6, marginBottom: 6 }
  };

  function toHex(n) { return "#" + ("000000" + Number(n).toString(16)).slice(-6); }

  // Saves a copy of the linked image on the phone, so it keeps working after the link expires (Discord attachment links do).
  function importImage(kind) {
    var url = String((kind === "avatar" ? storage.avatarUrl : storage.bannerUrl) || "").trim();
    if (!/^https?:\/\//i.test(url)) return Promise.reject(new Error("paste a link first"));
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.blob();
    }).then(function (blob) {
      if (blob.size > 900 * 1024) throw new Error("the image is over 900 KB");
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onload = function () { resolve(String(fr.result)); };
        fr.onerror = function () { reject(new Error("could not read the image")); };
        fr.readAsDataURL(blob);
      });
    }).then(function (data) {
      var ext = (url.split("?")[0].match(/\.(gif|png|jpe?g|webp)$/i) || [0, "png"])[1].toLowerCase().replace("jpg", "jpeg");
      if (!/^data:image\//i.test(data)) data = data.replace(/^data:[^,]*,/, "data:image/" + ext + ";base64,");
      storage[kind === "avatar" ? "avatarData" : "bannerData"] = data;
      return data.length;
    });
  }

  function exportSettings() {
    var o = {};
    Object.keys(DEFAULTS).forEach(function (k) { if (!/Data$/.test(k)) o[k] = storage[k]; });
    return JSON.stringify(o);
  }

  function importSettings(text) {
    var o = JSON.parse(text);
    if (!o || typeof o !== "object") throw new Error("not an object");
    var n = 0;
    Object.keys(DEFAULTS).forEach(function (k) { if (!/Data$/.test(k) && has.call(o, k)) { storage[k] = o[k]; n++; } });
    extVer++;
    return n;
  }

  function resetAll() {
    Object.keys(DEFAULTS).forEach(function (k) { storage[k] = DEFAULTS[k]; });
    extVer++;
  }

  // Live preview of the profile you have built, drawn from your settings and your real badges.
  function Preview(props) {
    var on = !!storage.enabled;
    var primary = hexToInt(storage.primaryColor);
    var accent = hexToInt(storage.accentColor);
    var bannerUrl = on ? customUrl("banner") : "";
    var avatarUrl = on ? customUrl("avatar") : "";
    var ns = on && storage.nameStyleOn ? nameStyleObj() : null;
    var name = on && storage.fakeName ? String(storage.fakeName) : "Your name";
    var hidden = hiddenSet();
    var seen = {};
    var badgeList = (props.real || []).filter(function (b) { return b && !hidden[b.id]; }).concat(on ? wantedBadges() : []).filter(function (b) {
      if (!b || seen[b.id]) return false;
      seen[b.id] = true;
      return !!b.icon;
    });

    var bannerKids = [];
    if (bannerUrl) bannerKids.push(h(RN.Image, { key: "bi", source: { uri: bannerUrl }, style: st.pvBannerImg, resizeMode: "cover" }));
    else if (on && primary !== null) {
      gradientColors([primary, accent !== null ? accent : primary], 16).forEach(function (c, i) {
        bannerKids.push(h(RN.View, { key: "g" + i, style: { flex: 1, backgroundColor: c } }));
      });
    }
    var banner = h.apply(null, [RN.View, { style: [st.pvBanner, { backgroundColor: "#3a3c43", flexDirection: "row" }] }].concat(bannerKids));

    var dots = [];
    if (ns) ns.colors.forEach(function (c, i) { dots.push(h(RN.View, { key: "d" + i, style: [st.pvDot, { backgroundColor: toHex(c) }] })); });

    var bar = [];
    if (ns) gradientColors(ns.colors, 24).forEach(function (c, i) { bar.push(h(RN.View, { key: "n" + i, style: { flex: 1, backgroundColor: c } })); });
    var nameRow = h.apply(null, [RN.View, null,
      h.apply(null, [RN.View, { style: { flexDirection: "row", alignItems: "center" } },
        h(RN.Text, { style: [st.pvName, { color: ns ? toHex(ns.colors[0]) : C.text }] }, name),
        h.apply(null, [RN.View, { style: st.pvDots }].concat(dots))
      ]),
      h.apply(null, [RN.View, { style: { flexDirection: "row", height: 4, borderRadius: 2, overflow: "hidden", marginTop: 3 } }].concat(bar))
    ]);

    var avatar = avatarUrl
      ? h(RN.Image, { source: { uri: avatarUrl }, style: st.pvAvatar })
      : h(RN.View, { style: st.pvAvatar });

    var badgeImgs = badgeList.map(function (b, i) {
      return h(RN.Image, { key: "b" + i, source: { uri: "https://cdn.discordapp.com/badge-icons/" + b.icon + ".png" }, style: st.pvBadge });
    });

    var styleLine = ns ? (labelOf(NAME_EFFECTS, ns.effectId) + " name, " + labelOf(NAME_FONTS, ns.fontId) + " font") : "Normal display name";
    var lineA = "Effect: " + (on && storage.effectId ? (storage.effectName || storage.effectId) : "none") +
      "  |  Decoration: " + (on && storage.decoAsset ? (storage.decoName || "custom") : "none");
    var lineB = "Nameplate: " + (on && storage.plateAsset ? (storage.plateName || "custom") : "none") +
      "  |  Frame: " + (on && storage.frameSku ? (storage.frameName || storage.frameSku) : "none");

    return h.apply(null, [RN.View, { style: st.pv },
      banner,
      h.apply(null, [RN.View, { style: st.pvBody },
        h(RN.View, { style: st.pvAvatarRow }, avatar),
        nameRow,
        h(RN.Text, { style: st.pvNote }, styleLine),
        h.apply(null, [RN.View, { style: st.pvBadges }].concat(badgeImgs)),
        h(RN.Text, { style: st.pvNote }, lineA),
        h(RN.Text, { style: st.pvNote }, lineB),
        h(RN.Text, { style: st.pvNote }, on ? "Preview of what you see on this phone." : "Everything is switched off.")
      ])
    ]);
  }

  function lerpHex(a, b, t) {
    var r = Math.round(((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t));
    var g = Math.round(((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t));
    var bl = Math.round((a & 255) + (((b & 255) - (a & 255)) * t));
    return toHex((r << 16) | (g << 8) | bl);
  }

  function gradientColors(cols, n) {
    var out = [];
    if (!cols.length) return out;
    for (var j = 0; j < n; j++) {
      if (cols.length === 1) { out.push(toHex(cols[0])); continue; }
      var pos = (j / (n - 1)) * (cols.length - 1);
      var lo = Math.floor(pos);
      var hi = Math.min(cols.length - 1, lo + 1);
      out.push(lerpHex(cols[lo], cols[hi], pos - lo));
    }
    return out;
  }

  function labelOf(list, value) {
    for (var i = 0; i < list.length; i++) { if (String(list[i][0]) === String(value)) return list[i][1]; }
    return String(value);
  }

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
        onChangeText: props.onLive ? function (t) { props.onLive(String(t || "").trim()); } : undefined,
        onEndEditing: function (e) { props.onSave(String((e && e.nativeEvent && e.nativeEvent.text) || "").trim()); }
      })
    );
  }

  function Presets(props) {
    var kids = props.list.map(function (g, i) {
      var sw = g[1].map(function (c, j) { return h(RN.View, { key: "s" + j, style: [st.swatch, { backgroundColor: c }] }); });
      return h(RN.TouchableOpacity, { key: "p" + i, onPress: function () { props.onPick(g); }, style: [st.chip, { alignItems: "center" }] },
        h.apply(null, [RN.View, { style: st.swatchRow }].concat(sw)),
        h(RN.Text, { style: st.btnText }, g[0])
      );
    });
    return h.apply(null, [RN.View, { style: st.chips }].concat(kids));
  }

  function Choices(props) {
    var kids = props.options.map(function (o) {
      var on = String(props.value) === String(o[0]);
      return h(RN.TouchableOpacity, { key: "c" + o[0], onPress: function () { props.onPick(o[0]); }, style: on ? st.chipOn : st.chip },
        h(RN.Text, { style: st.btnText }, o[1]));
    });
    return h.apply(null, [RN.View, { style: st.chips }].concat(kids));
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
    var tt = React.useState("profile");
    var tab = tt[0];
    var setTab = tt[1];
    var rs = React.useState(false);
    var resetArmed = rs[0];
    var setResetArmed = rs[1];

    function rerender() { bump(function (n) { return n + 1; }); }
    function hookSummary() {
      return "avatar " + (hooks.avatar.length ? hooks.avatar.join(", ") : "none found") + " | banner " + (hooks.banner.length ? hooks.banner.join(", ") : "none found");
    }
    function set(k, v) { storage[k] = v; refresh(); rerender(); }
    function setMany(o) { for (var k in o) { if (has.call(o, k)) storage[k] = o[k]; } extVer++; refresh(); rerender(); }
    function validHex(v) { return v === "" || hexToInt(v) !== null; }
    function applyNamePreset(g) {
      var eff = Number(storage.nameEffect) || 2;
      if ([2, 6, 7, 8].indexOf(eff) < 0) eff = 2;
      var o = { nameStyleOn: true, nameEffect: eff };
      for (var i = 1; i <= 5; i++) o["nameColor" + i] = g[1][i - 1] || "";
      setMany(o);
    }

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

    var rawProfile = null;
    try { rawProfile = UserProfileStore && myId ? UserProfileStore.getUserProfile(myId) : null; } catch (_) {}
    var realBadges = rawProfile ? (origOf(rawProfile, "badges") || []) : [];

    var head = [];
    var tabs = { profile: [], badges: [], name: [], media: [], tools: [] };
    var cards = head;

    cards.push(Card("ProfileForge HUD " + VERSION, "Local only: you see these changes on this phone, other people don't.", [
      ToggleRow("Enable everything", storage.enabled, function (v) { set("enabled", v); }),
      ToggleRow("Nitro spoof (unlocks Nitro-only screens on this device)", storage.spoofNitro, function (v) { set("spoofNitro", v); }),
      Btn("Apply / refresh now", function () { refresh(); rerender(); toast("Refreshed. Open your profile card to check."); })
    ]));

    cards = tabs.profile;
    cards.push(Card("Theme gradients", "Tap one to set both theme colors at once.", [
      h(Presets, { key: "tp", list: GRADIENTS, onPick: function (g) { setMany({ primaryColor: g[1][0], accentColor: g[1][1] || g[1][0] }); } })
    ]));
    cards.push(Card("Theme colors", "Hex like #5865f2. Accent is optional.", [
      h(Field, { key: "pc:" + extVer, label: "Primary color", placeholder: "#5865f2", value: storage.primaryColor, onLive: function (v) { if (validHex(v)) set("primaryColor", v); }, onSave: function (v) { set("primaryColor", v); } }),
      h(Field, { key: "ac:" + extVer, label: "Accent color", placeholder: "#eb459e", value: storage.accentColor, onLive: function (v) { if (validHex(v)) set("accentColor", v); }, onSave: function (v) { set("accentColor", v); } })
    ]));

    cards.push(Card("Profile effect", "Selected: " + (storage.effectName || storage.effectId || "none") + ". If it doesn't animate, open Discord's own Shop once (Settings), then reopen your profile.", [
      h(CatalogPicker, { key: "pe", title: "effects", load: loadEffects, onPick: function (it) { setMany({ effectId: it.id, effectSkuId: it.skuId, effectName: it.name }); } }),
      Btn("Clear effect", function () { setMany({ effectId: "", effectSkuId: "", effectName: "" }); }, true),
      h(Field, { key: "ei:" + extVer, label: "Effect ID (manual)", value: storage.effectId, onSave: function (v) { setMany({ effectId: v, effectName: "" }); } })
    ]));

    cards.push(Card("Avatar decoration", "Selected: " + (storage.decoName || storage.decoAsset || "none"), [
      h(CatalogPicker, { key: "ad", title: "decorations", load: loadDecos, onPick: function (it) { setMany({ decoAsset: it.asset, decoSkuId: it.skuId, decoName: it.name }); } }),
      Btn("Clear decoration", function () { setMany({ decoAsset: "", decoSkuId: "", decoName: "" }); }, true),
      h(Field, { key: "da:" + extVer, label: "Decoration asset (manual)", placeholder: "a_...", value: storage.decoAsset, onSave: function (v) { setMany({ decoAsset: v, decoName: "" }); } })
    ]));

    cards.push(Card("Nameplate", "Selected: " + (storage.plateName || storage.plateAsset || "none"), [
      h(CatalogPicker, { key: "np", title: "nameplates", load: loadPlates, onPick: function (it) { setMany({ plateAsset: it.asset, plateSkuId: it.skuId, plateLabel: it.label, platePalette: it.palette, plateName: it.name }); } }),
      Btn("Clear nameplate", function () { setMany({ plateAsset: "", plateSkuId: "", plateLabel: "", platePalette: "", plateName: "" }); }, true),
      h(Field, { key: "pa:" + extVer, label: "Nameplate asset (manual)", placeholder: "nameplates/nameplates/bloom/", value: storage.plateAsset, onSave: function (v) { setMany({ plateAsset: v, plateName: "" }); } }),
      h(Field, { key: "pp:" + extVer, label: "Nameplate palette (manual)", placeholder: "cobalt", value: storage.platePalette, onSave: function (v) { set("platePalette", v); } })
    ]));

    cards.push(Card("Profile frame", "Selected: " + (storage.frameName || storage.frameSku || "none") + ". The decorative border around your profile card.", [
      h(CatalogPicker, { key: "pf", title: "frames", load: loadFrames, onPick: function (it) { setMany({ frameSku: it.id, frameName: it.name, frameJson: JSON.stringify(it.item || {}) }); } }),
      Btn("Clear frame", function () { setMany({ frameSku: "", frameName: "", frameJson: "" }); }, true),
      h(Field, { key: "fs:" + extVer, label: "Frame SKU ID (manual)", value: storage.frameSku, onSave: function (v) { setMany({ frameSku: v, frameName: "", frameJson: "" }); } })
    ]));

    cards = tabs.media;
    function saveImage(kind) {
      toast("Saving...");
      importImage(kind).then(function (len) {
        extVer++; refresh(); rerender();
        toast("Saved on this phone (" + Math.max(1, Math.round(len / 1024)) + " KB)");
      }, function (e) {
        toast("Could not save the image: " + (e && e.message ? e.message : e));
      });
    }
    function source(kind) {
      var saved = kind === "avatar" ? storage.avatarData : storage.bannerData;
      return saved ? "saved on this phone" : (customUrl(kind) ? "loads from the link" : "none");
    }
    cards.push(Card("Banner and avatar (GIFs)", "Paste direct links ending in .gif, .png or .jpg. Imgur links work, Tenor page links don't. Discord attachment links expire, so save a copy on the phone.", [
      h(Field, { key: "bu:" + extVer, label: "Banner URL", placeholder: "https://.../banner.gif", value: storage.bannerUrl, onSave: function (v) { setMany({ bannerUrl: v, bannerData: "" }); } }),
      Btn("Save banner on this phone", function () { saveImage("banner"); }, true),
      storage.bannerData ? Btn("Remove saved banner", function () { setMany({ bannerData: "" }); }, true) : null,
      h(Field, { key: "au:" + extVer, label: "Avatar URL", placeholder: "https://.../avatar.gif", value: storage.avatarUrl, onSave: function (v) { setMany({ avatarUrl: v, avatarData: "" }); } }),
      Btn("Save avatar on this phone", function () { saveImage("avatar"); }, true),
      storage.avatarData ? Btn("Remove saved avatar", function () { setMany({ avatarData: "" }); }, true) : null,
      h(RN.Text, { style: st.sub }, "Banner: " + source("banner") + "  |  Avatar: " + source("avatar")),
      h(RN.Text, { style: st.sub }, "Hooks found on this build: " + hookSummary())
    ]));

    cards = tabs.name;
    cards.push(Card("Name gradients", "Tap one to color your display name. Three to five colors need Gradient, Prism, Glow or Gummy.", [
      h(Presets, { key: "np2", list: GRADIENTS, onPick: applyNamePreset })
    ]));
    var nameKids = [
      h(Field, { key: "fn:" + extVer, label: "Display name (only you see it)", placeholder: "Any name you want", value: storage.fakeName, onLive: function (v) { set("fakeName", v); }, onSave: function (v) { set("fakeName", v); } }),
      ToggleRow("Colored display name", storage.nameStyleOn, function (v) { set("nameStyleOn", v); }),
      h(RN.Text, { style: st.label }, "Effect (Gradient, Prism, Glow and Gummy take up to 5 colors)"),
      h(Choices, { options: NAME_EFFECTS, value: storage.nameEffect, onPick: function (v) { set("nameEffect", v); } }),
      h(RN.Text, { style: st.label }, "Font"),
      h(Choices, { options: NAME_FONTS, value: storage.nameFont, onPick: function (v) { set("nameFont", v); } })
    ];
    for (var ci = 1; ci <= 5; ci++) {
      (function (n) {
        nameKids.push(h(Field, { key: "nc" + n + ":" + extVer, label: "Color " + n, placeholder: "#ff66cc", value: storage["nameColor" + n], onLive: function (v) { if (validHex(v)) set("nameColor" + n, v); }, onSave: function (v) { set("nameColor" + n, v); } }));
      })(ci);
    }
    cards.push(Card("Display name", "Your name and colors on this phone only.", nameKids));

    cards = tabs.badges;
    var hiddenNow = hiddenSet();
    function setHidden(id, on) {
      var m = hiddenSet();
      if (on) m[id] = true; else delete m[id];
      set("hiddenBadges", Object.keys(m).join(","));
    }
    var hideRows = realBadges.map(function (b) {
      return ToggleRow("Hide: " + (b.description || b.id), !!hiddenNow[b.id], function (v) { setHidden(b.id, v); });
    });
    if (!hideRows.length) hideRows.push(h(RN.Text, { style: st.sub }, "Open your own profile once and your real badges will be listed here."));
    cards.push(Card("Hide your real badges", "Switch a badge on to hide it and keep your profile clean.", hideRows));

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
      h(Field, { key: "cbi:" + extVer, label: "Icon hash", placeholder: "32 hex characters", value: storage.customBadgeIcon, onSave: function (v) { set("customBadgeIcon", v); } }),
      h(Field, { key: "cbd:" + extVer, label: "Description", placeholder: "Custom badge", value: storage.customBadgeDesc, onSave: function (v) { set("customBadgeDesc", v); } })
    ]));

    cards = tabs.tools;
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

    cards.push(Card("Backup", "Copy your settings, or paste a copy to restore them.", [
      Btn("Copy my settings", function () {
        try { metro.common.clipboard.setString(exportSettings()); toast("Settings copied"); } catch (e) { toast("Could not copy"); }
      }, true),
      h(Field, { key: "imp", label: "Paste settings here to import", placeholder: "{ ... }", value: "", onSave: function (v) {
        if (!v) return;
        try { var n = importSettings(v); refresh(); rerender(); toast("Imported " + n + " settings"); } catch (e) { toast("That isn't a valid settings copy"); }
      } }),
      Btn(resetArmed ? "Tap again to reset everything" : "Reset everything", function () {
        if (!resetArmed) { setResetArmed(true); toast("Tap again to confirm"); return; }
        resetAll(); setResetArmed(false); refresh(); rerender(); toast("Everything reset");
      }, true)
    ]));

    cards.push(Card("Other Nitro features", "Emojis and stickers are separate plugins: Freemoji and FreeStickers. Upload size, HD streaming and server boosts are server-side, so no plugin can change them.", []));

    var tabBar = h(Choices, { options: [["profile", "Profile"], ["badges", "Badges"], ["name", "Name"], ["media", "Media"], ["tools", "Tools"]], value: tab, onPick: function (v) { setTab(v); } });

    return box(st.root, [h(Preview, { real: realBadges })].concat(head).concat([tabBar]).concat(tabs[tab] || tabs.profile));
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
