(function () {
  "use strict";

  var VERSION = "0.7.0";
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
  var imageHooked = false;
  var bannerSwaps = 0;
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

  // ==========================================================================
  // ProfileForge 0.4: presets, libraries, animated badges, HUD themes, updates
  // ==========================================================================

  var UPDATE_URL = "https://7dk9kwgpz6-alt.github.io/Fakenitroo/manifest.json";
  // Set this to your Cloudflare Worker URL (see server/worker.js) to switch the optional user counter on.
  // Empty means the counter does not exist at all: nothing is sent and no toggle is shown.
  var STATS_URL = "";
  var MAX_DATA_URL = 1300000;
  var PRESET_DATA_MAX = 150000;
  var MAX_USER_PRESETS = 30;
  var MAX_LIBRARY = 40;

  var EXTRA_DEFAULTS = {
    presets: [],
    presetIndex: 0,
    undoLook: null,
    theme: "glass",
    hudAnim: true,
    badgeFrames: "",
    badgeFrameMs: 1200,
    library: { banner: [], avatar: [], badge: [] },
    checkUpdates: true,
    telemetry: false,
    installId: "",
    lastPing: "",
    familyIcons: "{}",
    bgOn: false,
    bgUrl: "",
    bgOpacity: 55,
    bgDim: true
  };
  for (var xk in EXTRA_DEFAULTS) {
    if (has.call(EXTRA_DEFAULTS, xk) && !has.call(DEFAULTS, xk)) DEFAULTS[xk] = EXTRA_DEFAULTS[xk];
  }

  // ---- presets: a preset is a full "look"; applying one overwrites every key below ----

  var LOOK_KEYS = [
    "spoofNitro", "primaryColor", "accentColor",
    "effectId", "effectSkuId", "effectName",
    "decoAsset", "decoSkuId", "decoName",
    "plateAsset", "plateSkuId", "plateLabel", "platePalette", "plateName",
    "badgeFlags", "badgeIds", "customBadgeIcon", "customBadgeDesc", "hiddenBadges", "badgeFrames", "badgeFrameMs", "familyIds", "customBadges",
    "frameSku", "frameName", "frameJson",
    "bannerUrl", "avatarUrl", "bannerData", "avatarData",
    "fakeName", "nameStyleOn", "nameEffect", "nameFont",
    "nameColor1", "nameColor2", "nameColor3", "nameColor4", "nameColor5"
  ];

  var HEX32 = /^[0-9a-f]{32}$/;
  var IMPERSONATION_RE = /discord\s*staff|certified\s*moderator|moderator\s*programs?\s*alumni|partnered\s*server\s*owner|discord\s*partner\b|discord\s*mod(?:erator)?\b/i;
  var DATA_KEY_LIST = ["bannerData", "avatarData"];
  var DATA_KEYS = { bannerData: 1, avatarData: 1 };
  var URL_KEYS = { bannerUrl: 1, avatarUrl: 1, bgUrl: 1 };
  var COLOR_KEY = /^(primaryColor|accentColor|nameColor[1-5])$/;

  function cleanFrames(s) {
    return String(s || "").split(",").map(function (x) { return x.trim().toLowerCase(); })
      .filter(function (x) { return HEX32.test(x); }).slice(0, 12).join(",");
  }

  // Everything that comes from a preset, a backup or pasted text goes through here.
  function cleanValue(k, v) {
    var d = DEFAULTS[k];
    if (typeof d === "boolean") return v === true || v === "true";
    if (typeof d === "number") {
      var n = Number(v);
      if (!isFinite(n)) return d;
      return Math.max(0, Math.min(0x7fffffff, Math.floor(n)));
    }
    var s = v === null || v === undefined ? "" : String(v);
    if (DATA_KEYS[k]) {
      return s.length <= MAX_DATA_URL && /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+\/=]+$/i.test(s) ? s : "";
    }
    if (URL_KEYS[k]) return /^https?:\/\/[^\s]{1,1900}$/i.test(s) ? s : "";
    if (COLOR_KEY.test(k)) return hexToInt(s) !== null ? s : "";
    if (k === "customBadgeIcon") { s = s.trim().toLowerCase(); return HEX32.test(s) ? s : ""; }
    if (k === "badgeFrames") return cleanFrames(s);
    if (k === "badgeIds" || k === "hiddenBadges" || k === "familyIds") return s.replace(/[^a-zA-Z0-9_,]/g, "").slice(0, 600);
    if (k === "customBadgeDesc" && IMPERSONATION_RE.test(s)) return "";
    if (k === "customBadges") {
      var arr;
      try { arr = JSON.parse(s || "[]"); } catch (_) { arr = []; }
      if (!Array.isArray(arr)) arr = [];
      var out2 = [];
      arr.slice(0, 8).forEach(function (it) {
        if (!it || typeof it !== "object") return;
        var icon2 = String(it.icon || "").trim().toLowerCase();
        var desc2 = String(it.desc || "").trim().slice(0, 60);
        var tint2 = String(it.tint || "").trim().replace("#", "").toLowerCase();
        if (!HEX32.test(icon2) || !desc2 || IMPERSONATION_RE.test(desc2)) return;
        if (!/^[0-9a-f]{6}$/.test(tint2)) tint2 = "";
        out2.push({ icon: icon2, desc: desc2, tint: tint2 });
      });
      return JSON.stringify(out2);
    }
    if (k === "frameJson") {
      if (!s || s.length > 20000) return "";
      try { JSON.parse(s); return s; } catch (_) { return ""; }
    }
    return s.slice(0, 200);
  }

  function sanitizeLook(look) {
    var src = look && typeof look === "object" ? look : {};
    var out = {};
    LOOK_KEYS.forEach(function (k) {
      out[k] = has.call(src, k) ? cleanValue(k, src[k]) : DEFAULTS[k];
    });
    if (out.badgeFrameMs < 600) out.badgeFrameMs = 600;
    if (out.badgeFrameMs > 10000) out.badgeFrameMs = 10000;
    return out;
  }

  function gradColors(name) {
    for (var i = 0; i < GRADIENTS.length; i++) if (GRADIENTS[i][0] === name) return GRADIENTS[i][1];
    return ["#5865f2", "#eb459e"];
  }

  function mkLook(gradName, extra) {
    var c = gradColors(gradName);
    var look = {};
    LOOK_KEYS.forEach(function (k) { look[k] = DEFAULTS[k]; });
    look.primaryColor = c[0];
    look.accentColor = c[c.length - 1];
    look.nameStyleOn = true;
    for (var i = 0; i < 5; i++) look["nameColor" + (i + 1)] = c[i] || "";
    for (var k in extra) if (has.call(extra, k)) look[k] = extra[k];
    return sanitizeLook(look);
  }

  function iconOf(id) {
    for (var i = 0; i < BADGES.length; i++) if (BADGES[i][2] === id) return BADGES[i][4];
    return "";
  }

  function framesOf(ids) {
    return ids.map(iconOf).filter(function (x) { return !!x; });
  }

  var BUILTIN_PRESETS = [
    { id: "builtin:vaporwave", name: "Vaporwave", look: mkLook("Vaporwave", { nameEffect: 7, badgeIds: "premium,premium_tenure_72_month_v2,guild_booster_lvl9" }) },
    { id: "builtin:terminal", name: "Terminal", look: mkLook("Toxic", { nameEffect: 3, nameFont: 14, badgeFlags: 4194304 }) },
    { id: "builtin:sunset", name: "Sunset Glow", look: mkLook("Sunset", { nameEffect: 6, badgeIds: "premium,premium_tenure_12_month_v2" }) },
    { id: "builtin:ice", name: "Ice Glass", look: mkLook("Ice", { nameEffect: 2, nameFont: 6, badgeIds: "premium,guild_booster_lvl6" }) },
    { id: "builtin:pop", name: "Blurple Pop", look: mkLook("Blurple", { nameEffect: 8, nameFont: 4, badgeIds: "quest_completed,orb_profile_badge" }) },
    { id: "builtin:midnight", name: "Night Shift", look: mkLook("Midnight", { nameEffect: 1, nameFont: 12, badgeIds: "legacy_username" }) }
  ];

  // Animated badges are a flipbook: the badge icon field only takes Discord-hosted icon hashes,
  // so "animation" means cycling through a list of hashes.
  var BUILTIN_BADGE_ANIMS = [
    { id: "builtin:tenure", name: "Nitro tenure cycle", frames: framesOf(["premium_tenure_1_month_v2", "premium_tenure_3_month_v2", "premium_tenure_6_month_v2", "premium_tenure_12_month_v2", "premium_tenure_24_month_v2", "premium_tenure_36_month_v2", "premium_tenure_60_month_v2", "premium_tenure_72_month_v2"]) },
    { id: "builtin:boost", name: "Booster ladder", frames: framesOf(["guild_booster_lvl1", "guild_booster_lvl2", "guild_booster_lvl3", "guild_booster_lvl4", "guild_booster_lvl5", "guild_booster_lvl6", "guild_booster_lvl7", "guild_booster_lvl8", "guild_booster_lvl9"]) },
    { id: "builtin:houses", name: "HypeSquad houses", frames: framesOf(["hypesquad_house_1", "hypesquad_house_2", "hypesquad_house_3"]) },
    { id: "builtin:allnitro", name: "All Nitro tiers", frames: framesOf(["premium", "premium_tenure_1_month_v2", "premium_tenure_3_month_v2", "premium_tenure_6_month_v2", "premium_tenure_12_month_v2", "premium_tenure_24_month_v2", "premium_tenure_36_month_v2", "premium_tenure_60_month_v2", "premium_tenure_72_month_v2"]) },
    { id: "builtin:everything", name: "Everything I've got", frames: framesOf(["quest_completed", "orb_profile_badge", "legacy_username", "hypesquad_house_1", "hypesquad_house_2", "hypesquad_house_3", "active_developer"]) }
  ];


  // New badge families Discord has been rolling out: Gifting, Account Age, Streaming, Game Time
  // and Game Variety. These aren't in the older numeric-flag badge system and I don't have a
  // confirmed Discord CDN icon hash for any of them, so unlike BADGES above, no icon ships built
  // in. Pick a tier below, then paste its icon hash if you have one (see the field under the list).
  var FAMILY_BADGES = [
    ["gift_patron", "Gifting: Patron (1 gift)", "family_gift"],
    ["gift_champion", "Gifting: Champion (2 gifts)", "family_gift"],
    ["gift_luminary", "Gifting: Luminary (3 gifts)", "family_gift"],
    ["gift_icon", "Gifting: Icon (6 gifts)", "family_gift"],
    ["gift_hero", "Gifting: Hero (10 gifts)", "family_gift"],
    ["gift_legend", "Gifting: Legend (20 gifts)", "family_gift"],
    ["age_seed", "Account age: Seed (1 year)", "family_age"],
    ["age_sprout", "Account age: Sprout (2 years)", "family_age"],
    ["age_bud", "Account age: Bud (3 years)", "family_age"],
    ["age_sapling", "Account age: Sapling (4 years)", "family_age"],
    ["age_blossom", "Account age: Blossom (5 years)", "family_age"],
    ["age_redwood", "Account age: Redwood (6 years)", "family_age"],
    ["age_sequoia", "Account age: Sequoia (7 years)", "family_age"],
    ["age_bristlecone", "Account age: Bristlecone (8 years)", "family_age"],
    ["age_stromatolite", "Account age: Stromatolite (9 years)", "family_age"],
    ["age_primordial", "Account age: Primordial (10+ years)", "family_age"],
    ["stream_newcomer", "Streaming: Newcomer (1h)", "family_stream"],
    ["stream_fledgling", "Streaming: Fledgling (5h)", "family_stream"],
    ["stream_breakout", "Streaming: Breakout (20h)", "family_stream"],
    ["stream_standout", "Streaming: Standout (75h)", "family_stream"],
    ["stream_trendsetter", "Streaming: Trendsetter (150h)", "family_stream"],
    ["stream_headliner", "Streaming: Headliner (300h)", "family_stream"],
    ["stream_star", "Streaming: Star (500h)", "family_stream"],
    ["stream_sensation", "Streaming: Sensation (1000h)", "family_stream"],
    ["stream_visionary", "Streaming: Visionary (2000h)", "family_stream"],
    ["stream_phenomenon", "Streaming: Phenomenon (5000h+)", "family_stream"],
    ["gtime_casual", "Game time: Casual (1h)", "family_gtime"],
    ["gtime_recreational", "Game time: Recreational (5h)", "family_gtime"],
    ["gtime_dedicated", "Game time: Dedicated (20h)", "family_gtime"],
    ["gtime_committed", "Game time: Committed (75h)", "family_gtime"],
    ["gtime_serious", "Game time: Serious (150h)", "family_gtime"],
    ["gtime_devoted", "Game time: Devoted (300h)", "family_gtime"],
    ["gtime_seasoned", "Game time: Seasoned (500h)", "family_gtime"],
    ["gtime_ironclad", "Game time: Ironclad (1000h)", "family_gtime"],
    ["gtime_unshakeable", "Game time: Unshakeable (2000h)", "family_gtime"],
    ["gtime_eternal", "Game time: Eternal (5000h+)", "family_gtime"],
    ["gvar_sampler", "Game variety: Sampler (2 games)", "family_gvar"],
    ["gvar_dabbler", "Game variety: Dabbler (5 games)", "family_gvar"],
    ["gvar_enthusiast", "Game variety: Enthusiast (10 games)", "family_gvar"],
    ["gvar_ranger", "Game variety: Ranger (15 games)", "family_gvar"],
    ["gvar_explorer", "Game variety: Explorer (20 games)", "family_gvar"],
    ["gvar_adventurer", "Game variety: Adventurer (30 games)", "family_gvar"],
    ["gvar_voyager", "Game variety: Voyager (40 games)", "family_gvar"],
    ["gvar_maverick", "Game variety: Maverick (60 games)", "family_gvar"],
    ["gvar_polymath", "Game variety: Polymath (80 games)", "family_gvar"],
    ["gvar_universalist", "Game variety: Universalist (100+ games)", "family_gvar"]
  ];
  var FAMILY_GROUPS = [
    ["family_gift", "Gifting"], ["family_age", "Account age"], ["family_stream", "Streaming"],
    ["family_gtime", "Game time"], ["family_gvar", "Game variety"]
  ];
  var FAMILY_ID_SET = {};
  FAMILY_BADGES.forEach(function (f) { FAMILY_ID_SET[f[0]] = f; });

  function familyIdSet() {
    var m = {};
    String(storage.familyIds || "").split(",").forEach(function (x) { if (x) m[x] = true; });
    return m;
  }

  function familyIconMap() {
    try {
      var o = JSON.parse(storage.familyIcons || "{}");
      return o && typeof o === "object" ? o : {};
    } catch (_) { return {}; }
  }

  // "id=hash,id=hash" pasted by the user. Unknown ids and bad hashes are dropped silently.
  function mergeFamilyIcons(text) {
    var map = familyIconMap();
    var added = 0;
    String(text || "").split(",").forEach(function (pair) {
      var eq = pair.indexOf("=");
      if (eq < 0) return;
      var id = pair.slice(0, eq).trim();
      var hash = pair.slice(eq + 1).trim().toLowerCase();
      if (FAMILY_ID_SET[id] && HEX32.test(hash)) { map[id] = hash; added++; }
    });
    storage.familyIcons = JSON.stringify(map);
    return added;
  }

  // Ready-to-use named badges built from icons already confirmed elsewhere in this file --
  // no hash-hunting required. "ProfileForge " prefix keeps every name clearly the plugin's own.
  var CUSTOM_BADGE_PRESETS = [
    ["ProfileForge Dev", "active_developer", ""],
    ["ProfileForge Bug Squasher", "bug_hunter_level_2", ""],
    ["ProfileForge Explorer", "quest_completed", ""],
    ["ProfileForge Founder", "premium_early_supporter", ""],
    ["ProfileForge Veteran", "premium_tenure_72_month_v2", ""],
    ["ProfileForge Booster", "guild_booster_lvl9", ""],
    ["ProfileForge Icon", "orb_profile_badge", ""],
    ["ProfileForge Legend", "hypesquad_house_2", ""]
  ].map(function (p) { return [p[0], iconOf(p[1]), p[2]]; }).filter(function (p) { return !!p[1]; });

  function customBadgeSlots() {
    try {
      var arr = JSON.parse(storage.customBadges || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }

  // Returns "ok", "full", "bad-icon", "bad-name" or "blocked" (reads as an official Discord badge).
  function addCustomBadgeSlot(icon, desc, tint) {
    var list = customBadgeSlots();
    if (list.length >= 8) return "full";
    var i = String(icon || "").trim().toLowerCase();
    var d = String(desc || "").trim().slice(0, 60);
    if (!HEX32.test(i)) return "bad-icon";
    if (!d) return "bad-name";
    if (IMPERSONATION_RE.test(d)) return "blocked";
    var t = String(tint || "").trim().replace("#", "").toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(t)) t = "";
    storage.customBadges = JSON.stringify(list.concat([{ icon: i, desc: d, tint: t }]));
    return "ok";
  }

  function removeCustomBadgeSlot(i) {
    var list = customBadgeSlots().slice();
    if (i < 0 || i >= list.length) return false;
    list.splice(i, 1);
    storage.customBadges = JSON.stringify(list);
    return true;
  }

  function findAnim(id) {
    for (var i = 0; i < BUILTIN_BADGE_ANIMS.length; i++) if (BUILTIN_BADGE_ANIMS[i].id === id) return BUILTIN_BADGE_ANIMS[i];
    return null;
  }

  function currentAnimId() {
    var cur = cleanFrames(storage.badgeFrames);
    for (var i = 0; i < BUILTIN_BADGE_ANIMS.length; i++) if (BUILTIN_BADGE_ANIMS[i].frames.join(",") === cur) return BUILTIN_BADGE_ANIMS[i].id;
    return "";
  }

  function userPresets() {
    return Array.isArray(storage.presets) ? storage.presets : [];
  }

  function allPresets() {
    return BUILTIN_PRESETS.concat(userPresets());
  }

  function currentPresetIndex() {
    var n = allPresets().length;
    var i = Math.floor(Number(storage.presetIndex) || 0);
    return n ? Math.max(0, Math.min(n - 1, i)) : 0;
  }

  // Saved-on-phone images bigger than PRESET_DATA_MAX are left out of presets (the link is kept).
  function snapshotLook() {
    var look = {};
    LOOK_KEYS.forEach(function (k) { look[k] = storage[k]; });
    DATA_KEY_LIST.forEach(function (k) { if (String(look[k] || "").length > PRESET_DATA_MAX) look[k] = ""; });
    return sanitizeLook(look);
  }

  function applyLook(look) {
    var clean = sanitizeLook(look);
    LOOK_KEYS.forEach(function (k) { storage[k] = clean[k]; });
    startBadgeAnim();
    refresh();
  }

  // dir: +1 next, -1 previous. Wraps at both ends. Remembers the previous look so it can be undone.
  function presetStep(dir) {
    var list = allPresets();
    if (!list.length) return null;
    var i = (currentPresetIndex() + (dir < 0 ? -1 : 1) + list.length) % list.length;
    storage.undoLook = snapshotLook();
    storage.presetIndex = i;
    applyLook(list[i].look);
    return list[i];
  }

  function undoPreset() {
    var prev = storage.undoLook;
    if (!prev || typeof prev !== "object") return false;
    var now = snapshotLook();
    applyLook(prev);
    storage.undoLook = now;
    return true;
  }

  function addUserPreset(name, look) {
    var arr = userPresets();
    if (arr.length >= MAX_USER_PRESETS) return null;
    var p = { id: "user:" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), name: String(name || "My preset").slice(0, 40), look: look };
    storage.presets = arr.concat([p]);
    return p;
  }

  function savePreset(name) {
    var p = addUserPreset(name, snapshotLook());
    if (!p) { toast("Preset limit reached (" + MAX_USER_PRESETS + ")"); return null; }
    storage.presetIndex = BUILTIN_PRESETS.length + userPresets().length - 1;
    return p;
  }

  function renamePreset(id, name) {
    var nm = String(name || "").trim().slice(0, 40);
    if (!nm || String(id).indexOf("user:") !== 0) return false;
    var hit = false;
    storage.presets = userPresets().map(function (p) {
      if (p.id !== id) return p;
      hit = true;
      return { id: p.id, name: nm, look: p.look };
    });
    return hit;
  }

  function deletePreset(id) {
    if (String(id).indexOf("user:") !== 0) return false;
    var before = userPresets();
    var after = before.filter(function (p) { return p.id !== id; });
    if (after.length === before.length) return false;
    storage.presets = after;
    storage.presetIndex = Math.min(currentPresetIndex(), allPresets().length - 1);
    return true;
  }

  function exportPreset(p) {
    return JSON.stringify({ profileforge: 1, name: p.name, look: p.look });
  }

  function importPreset(text) {
    try {
      if (typeof text !== "string" || text.length > 2600000) return { ok: false, error: "Too large" };
      var o = JSON.parse(text);
      if (!o || o.profileforge !== 1 || !o.look || typeof o.look !== "object") return { ok: false, error: "Not a ProfileForge preset" };
      var p = addUserPreset(String(o.name || "Imported"), sanitizeLook(o.look));
      return p ? { ok: true, name: p.name } : { ok: false, error: "Preset limit reached" };
    } catch (_) {
      return { ok: false, error: "Invalid JSON" };
    }
  }

  // ---- libraries: saved banners, avatars and custom badges ----

  function libList(kind) {
    var l = storage.library;
    return l && Array.isArray(l[kind]) ? l[kind] : [];
  }

  function libWrite(kind, list) {
    storage.library = {
      banner: kind === "banner" ? list : libList("banner"),
      avatar: kind === "avatar" ? list : libList("avatar"),
      badge: kind === "badge" ? list : libList("badge")
    };
  }

  // value: image link or data URL for banner/avatar; { icon, frames, desc } for a badge
  function libSave(kind, name, value) {
    var list = libList(kind);
    if (list.length >= MAX_LIBRARY) { toast("Library is full"); return false; }
    var item = { name: String(name || "Untitled").slice(0, 40) };
    if (kind === "badge") {
      var frames = cleanFrames(value && value.frames);
      var icon = cleanValue("customBadgeIcon", value && value.icon) || frames.split(",")[0] || "";
      if (!icon) return false;
      item.icon = icon; item.frames = frames; item.desc = String((value && value.desc) || name || "Custom badge").slice(0, 100);
    } else {
      var url = cleanValue(kind + "Url", value);
      var data = cleanValue(kind + "Data", value);
      if (data.length > PRESET_DATA_MAX) data = "";
      if (!url && !data) return false;
      item.value = url || data;
    }
    libWrite(kind, list.concat([item]));
    return true;
  }

  function libApply(kind, i) {
    var it = libList(kind)[i];
    if (!it) return false;
    if (kind === "badge") {
      storage.customBadgeIcon = it.icon;
      storage.badgeFrames = it.frames || "";
      storage.customBadgeDesc = it.desc || it.name;
      startBadgeAnim();
    } else if (/^data:image\//i.test(it.value)) {
      storage[kind + "Data"] = it.value;
      storage[kind + "Url"] = "";
    } else {
      storage[kind + "Url"] = it.value;
      storage[kind + "Data"] = "";
    }
    refresh();
    return true;
  }

  function libRemove(kind, i) {
    var list = libList(kind).slice();
    if (i < 0 || i >= list.length) return false;
    list.splice(i, 1);
    libWrite(kind, list);
    return true;
  }

  function applyBadgeAnim(a) {
    if (!a || !a.frames || !a.frames.length) return;
    storage.customBadgeIcon = a.frames[0];
    storage.badgeFrames = a.frames.join(",");
    storage.customBadgeDesc = a.name;
    startBadgeAnim();
    refreshProfile();
  }

  // ---- animated badges (flipbook) and the badge builders that replace the old ones ----

  var badgeTimer = null;
  var badgeTick = 0;

  function badgeFrameList() {
    var s = cleanFrames(storage.badgeFrames);
    return s ? s.split(",") : [];
  }

  function refreshProfile() {
    try { if (UserProfileStore && UserProfileStore.emitChange) UserProfileStore.emitChange(); } catch (_) {}
  }

  function stopBadgeAnim() {
    if (badgeTimer) { clearInterval(badgeTimer); badgeTimer = null; }
  }

  // The timer only exists while the plugin is on and 2+ frames are set.
  function startBadgeAnim() {
    stopBadgeAnim();
    if (!active || !storage.enabled || badgeFrameList().length < 2) return;
    var ms = Math.max(600, Math.min(10000, Number(storage.badgeFrameMs) || 1200));
    badgeTimer = setInterval(function () {
      badgeTick++;
      refreshProfile();
    }, ms);
  }

  function wantedBadges() {
    var bits = Number(storage.badgeFlags) || 0;
    var ids = idSet();
    var out = [];
    BADGES.forEach(function (b) {
      if (b[1] ? (bits & b[1]) !== 0 : !!ids[b[2]]) out.push({ id: b[2], description: b[3], icon: b[4] });
    });
    var frames = badgeFrameList();
    var icon = frames.length ? frames[badgeTick % frames.length] : String(storage.customBadgeIcon || "").trim().toLowerCase();
    if (HEX32.test(icon)) out.push({ id: "profileforge_custom", description: String(storage.customBadgeDesc || "Custom badge"), icon: icon });
    var fids = familyIdSet(), fmap = familyIconMap();
    Object.keys(fids).forEach(function (id) {
      var meta = FAMILY_ID_SET[id];
      var hash = fmap[id];
      if (meta && HEX32.test(hash || "")) out.push({ id: "profileforge_family_" + id, description: meta[1], icon: hash });
    });
    customBadgeSlots().forEach(function (slot, i) {
      if (HEX32.test(slot.icon || "")) out.push({ id: "profileforge_custom_" + i, description: slot.desc, icon: slot.icon, tint: slot.tint || undefined });
    });
    return out;
  }

  function badgesFor(orig) {
    var animated = badgeFrameList().length > 1;
    var sig = [storage.badgeFlags, storage.badgeIds, storage.customBadgeIcon, storage.customBadgeDesc, storage.hiddenBadges, storage.badgeFrames, storage.familyIds, storage.familyIcons, storage.customBadges, animated ? badgeTick : 0].join("|");
    return memo("badges", sig, orig, function () {
      var hidden = hiddenSet();
      var out = (Array.isArray(orig) ? orig : []).filter(function (b) { return !(b && hidden[b.id]); });
      var seen = {};
      out.forEach(function (b) { if (b && b.id) seen[b.id] = true; });
      wantedBadges().forEach(function (b) { if (!seen[b.id]) out.push(b); });
      return out;
    });
  }

  // ---- HUD themes ----
  // Real background blur needs a native module Discord may not ship, so "glass" is built from
  // translucent layers, a brighter top edge, soft borders and slowly drifting colored glows.

  var MONO = (RN && RN.Platform && RN.Platform.select) ? RN.Platform.select({ ios: "Menlo", default: "monospace" }) : "monospace";

  var HUD_THEMES = {
    glass:    { name: "Glass",      bg: "#0b0d17", card: "rgba(255,255,255,0.08)", ring: "#171a2b", input: "rgba(255,255,255,0.10)", grey: "rgba(255,255,255,0.14)", border: "rgba(255,255,255,0.16)", borderTop: "rgba(255,255,255,0.34)", text: "#f5f7ff", sub: "rgba(245,247,255,0.68)", accent: "#8b9bff", accent2: "#ff8bd4", onAccent: "#0b0d17", radius: 22, mono: false, prompt: false, blobs: true },
    terminal: { name: "Terminal",   bg: "#070b07", card: "#0c150e",                ring: "#0c150e", input: "#040804",                grey: "#12301f",                border: "#1f7a4a",                borderTop: "#2fbf75",                text: "#b8ffcf", sub: "#67b587",                accent: "#00ff87", accent2: "#60efff", onAccent: "#03130a", radius: 3,  mono: true,  prompt: true,  blobs: false },
    nord:     { name: "Nord",       bg: "#2e3440", card: "#3b4252",                ring: "#3b4252", input: "#2b303b",                grey: "#4c566a",                border: "#4c566a",                borderTop: "#5e6a82",                text: "#eceff4", sub: "#d8dee9",                accent: "#88c0d0", accent2: "#a3be8c", onAccent: "#2e3440", radius: 8,  mono: true,  prompt: true,  blobs: false },
    dracula:  { name: "Dracula",    bg: "#282a36", card: "#343746",                ring: "#343746", input: "#21222c",                grey: "#44475a",                border: "#6272a4",                borderTop: "#7b8bc4",                text: "#f8f8f2", sub: "#bfc3d9",                accent: "#bd93f9", accent2: "#ff79c6", onAccent: "#282a36", radius: 8,  mono: true,  prompt: true,  blobs: false },
    gruvbox:  { name: "Gruvbox",    bg: "#282828", card: "#32302f",                ring: "#32302f", input: "#1d2021",                grey: "#504945",                border: "#504945",                borderTop: "#665c54",                text: "#ebdbb2", sub: "#a89984",                accent: "#fabd2f", accent2: "#b8bb26", onAccent: "#282828", radius: 6,  mono: true,  prompt: true,  blobs: false },
    mocha:    { name: "Catppuccin", bg: "#1e1e2e", card: "#313244",                ring: "#313244", input: "#181825",                grey: "#45475a",                border: "#45475a",                borderTop: "#585b70",                text: "#cdd6f4", sub: "#a6adc8",                accent: "#cba6f7", accent2: "#f5c2e7", onAccent: "#1e1e2e", radius: 14, mono: false, prompt: false, blobs: false },
    classic:  { name: "Classic",    bg: "#313338", card: "#2b2d31",                ring: "#2b2d31", input: "#1e1f22",                grey: "#4e5058",                border: "#2b2d31",                borderTop: "#2b2d31",                text: "#f2f3f5", sub: "#b5bac1",                accent: "#5865f2", accent2: "#eb459e", onAccent: "#ffffff", radius: 12, mono: false, prompt: false, blobs: false },
    tokyo:    { name: "Tokyo Night", bg: "#1a1b26", card: "#1f2335",                ring: "#1f2335", input: "#16161e",                grey: "#292e42",                border: "#292e42",                borderTop: "#3b4261",                text: "#c0caf5", sub: "#9aa5ce",                accent: "#7aa2f7", accent2: "#bb9af7", onAccent: "#1a1b26", radius: 14, mono: false, prompt: false, blobs: false },
    solar:    { name: "Solarized",   bg: "#002b36", card: "#073642",                ring: "#073642", input: "#00252e",                grey: "#0d4552",                border: "#0d4552",                borderTop: "#586e75",                text: "#eee8d5", sub: "#93a1a1",                accent: "#b58900", accent2: "#2aa198", onAccent: "#002b36", radius: 6,  mono: true,  prompt: true,  blobs: false },
    synth:    { name: "Synthwave",   bg: "#150e28", card: "#241b3d",                ring: "#241b3d", input: "#0f0a1e",                grey: "#3a2a5c",                border: "#ff2ec4",                borderTop: "#ff71ce",                text: "#f7f3ff", sub: "#c9a6ff",                accent: "#ff2ec4", accent2: "#05ffa1", onAccent: "#150e28", radius: 4,  mono: true,  prompt: true,  blobs: true },
    rosepine: { name: "Rose Pine",   bg: "#191724", card: "#1f1d2e",                ring: "#1f1d2e", input: "#141220",                grey: "#26233a",                border: "#403d52",                borderTop: "#6e6a86",                text: "#e0def4", sub: "#908caa",                accent: "#eb6f92", accent2: "#c4a7e7", onAccent: "#191724", radius: 16, mono: false, prompt: false, blobs: false },
    forest:   { name: "Forest",      bg: "#141d15", card: "#1c2a1e",                ring: "#1c2a1e", input: "#0f170f",                grey: "#28402b",                border: "#2c4a30",                borderTop: "#3f6b45",                text: "#e3f3e1", sub: "#a3c4a6",                accent: "#6fbf73", accent2: "#c9a86a", onAccent: "#141d15", radius: 10, mono: false, prompt: false, blobs: false },
    contrast: { name: "High Contrast", bg: "#000000", card: "#000000",              ring: "#000000", input: "#000000",                grey: "#1a1a1a",                border: "#ffffff",                borderTop: "#ffffff",                text: "#ffffff", sub: "#e0e0e0",                accent: "#ffff00", accent2: "#00ffff", onAccent: "#000000", radius: 2,  mono: false, prompt: false, blobs: false }
  };

  var HUD_THEME_LIST = Object.keys(HUD_THEMES).map(function (k) { return [k, HUD_THEMES[k].name]; });

  function hudTheme() {
    return HUD_THEMES[storage.theme] || HUD_THEMES.glass;
  }

  // ---- update check: notify only, never downloads or runs code ----

  function cmpVer(a, b) {
    var x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
    for (var i = 0; i < 3; i++) {
      var d = (x[i] || 0) - (y[i] || 0);
      if (d) return d > 0 ? 1 : -1;
    }
    return 0;
  }

  // cb(newVersionOrNull, error)
  function checkUpdate(cb) {
    try {
      fetch(UPDATE_URL + "?t=" + Date.now()).then(function (r) { return r.json(); }).then(function (m) {
        var v = m && typeof m.version === "string" ? m.version : "";
        var newer = v && cmpVer(v, VERSION) > 0;
        if (newer) toast("ProfileForge " + v + " is available. Update it from the Plugins page.");
        if (cb) cb(newer ? v : null, null);
      }).catch(function (e) { fail("update check", e); if (cb) cb(null, e || new Error("failed")); });
    } catch (e) { fail("update check", e); if (cb) cb(null, e); }
  }

  // ---- optional usage counter: off by default, random install id + version only, once a day ----

  function newInstallId() {
    var s = "";
    for (var i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }

  function statsBase() {
    return String(STATS_URL || "").replace(/\/+$/, "");
  }

  function pingStats() {
    if (!STATS_URL || !storage.telemetry) return;
    var today = new Date().toISOString().slice(0, 10);
    if (storage.lastPing === today) return;
    if (!HEX32.test(storage.installId || "")) storage.installId = newInstallId();
    try {
      fetch(statsBase() + "/ping", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: storage.installId, v: VERSION }) })
        .then(function (r) { if (r && r.ok) storage.lastPing = today; })
        .catch(function () {});
    } catch (_) {}
  }

  // Turning it off forgets the install id (the server entry expires by itself after 30 days).
  function setTelemetry(on) {
    storage.telemetry = !!on;
    if (!on) { storage.installId = ""; storage.lastPing = ""; } else pingStats();
  }

  function fetchCount(cb) {
    if (!STATS_URL) return cb(null);
    try {
      fetch(statsBase() + "/count").then(function (r) { return r.json(); })
        .then(function (j) { cb(j && typeof j.count === "number" ? j.count : null); })
        .catch(function () { cb(null); });
    } catch (_) { cb(null); }
  }

  // ---- typing indicator: discovery helper ----
  // Every Discord build (web, desktop, mobile) exposes a Flux store with a getTypingUsers method
  // -- that part is safe to rely on. Which *component* renders the "x is typing" text differs by
  // build and isn't guessable, so this scans every loaded module's source for the store call
  // instead of guessing component names, and reports real candidates instead of just "not found".

  function discoverTyping() {
    var storeLine = "not found";
    try {
      var ts = (metro.findByProps && metro.findByProps("getTypingUsers")) ||
        metro.findByStoreName("UserTypingStore") || metro.findByStoreName("TypingStore");
      if (ts) storeLine = "found: " + Object.keys(ts).filter(function (k) { return typeof ts[k] === "function"; }).slice(0, 12).join(", ");
    } catch (e) { fail("typing store lookup", e); }
    note("Typing store: " + storeLine);

    var found = [];
    try {
      eachModule(function (id, ex) {
        if (found.length >= 15) return;
        var checks = [];
        if (typeof ex === "function") checks.push(["exports", ex]);
        if (ex && typeof ex === "object") {
          Object.keys(ex).forEach(function (k) {
            if (found.length >= 15) return;
            var v = ex[k];
            if (typeof v === "function") checks.push([k, v]);
          });
        }
        checks.forEach(function (pair) {
          if (found.length >= 15) return;
          var holder = pair[1];
          var src = "";
          try { src = Function.prototype.toString.call(holder); } catch (_) { return; }
          if (!/getTypingUsers|isTyping|typingUsers/.test(src)) return;
          var nm = "";
          try { nm = String(holder.displayName || holder.name || ""); } catch (_) {}
          found.push(id + ":" + pair[0] + (nm ? " (" + nm + ")" : " (anonymous)"));
        });
      });
    } catch (e) { fail("discoverTyping", e); }
    found.slice(0, 15).forEach(function (c) { note("typing render candidate: " + c); });
    toast(found.length ? found.length + " possible typing component(s) found -- check Diagnostics" : "No typing components found");
    return found;
  }

  function startExtras() {
    startBadgeAnim();
    unpatches.push(stopBadgeAnim);
    if (storage.checkUpdates) checkUpdate();
    pingStats();
  }

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

  function hiddenSet() {
    var m = {};
    String(storage.hiddenBadges || "").split(",").forEach(function (x) { if (x) m[x] = true; });
    return m;
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

  function bannerReady() { return hooks.banner.length > 0 || imageHooked; }

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
    setField(u, "banner", "a_profileforge", on && bannerReady() && !!customUrl("banner"));
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
    setField(p, "banner", "a_profileforge", on && bannerReady() && !!customUrl("banner"));
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
    hookedFns = [];
    imageHooked = false;
    bannerSwaps = 0;
    active = true;
    hookUrls();
    hookImage();
    startExtras();
    refresh();
  }

  var URL_MOD_RE = /^get(?:User|GuildMember)(?:Avatar|Banner)(?:URL|Source)$/;
  var URL_PROTO_RE = /^get(?:Avatar|Banner)(?:URL|Source)$/;
  var BANNER_FN_RE = /^get\w*Banner\w*(?:URL|Source|Uri|Src)$/;
  var BANNER_SKIP_RE = /Guild(?!Member)|Event|Store|Shop|Category|Collectible|Application|Sticker|Sound/;

  var hookedFns = [];
  function alreadyHooked(holder, name) {
    for (var i = 0; i < hookedFns.length; i++) { if (hookedFns[i][0] === holder && hookedFns[i][1] === name) return true; }
    return false;
  }

  // Last resort for banners: whatever builds the URL, the picture still reaches an <Image>, so swap it there.
  function swapImageProps(props) {
    if (!active || !storage.enabled || !props) return null;
    var src = props.source;
    var uri = src && typeof src === "object" && !Array.isArray(src) ? src.uri : null;
    if (typeof uri !== "string" || uri.indexOf("a_profileforge") === -1) return null;
    var url = customUrl("banner");
    if (!url) return null;
    bannerSwaps++;
    var next = Object.assign({}, props);
    next.source = Object.assign({}, src, { uri: url });
    return next;
  }

  function hookImage() {
    var Img = RN && RN.Image;
    if (!Img || typeof Img !== "object" || typeof Img.render !== "function") return;
    try {
      unpatches.push(patcher.before("render", Img, function (args) {
        var next = swapImageProps(args[0]);
        return next ? [next].concat(Array.prototype.slice.call(args, 1)) : undefined;
      }));
      imageHooked = true;
    } catch (e) { fail("hook image", e); }
  }

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
          if (alreadyHooked(mod, name)) return;
          unpatches.push(patcher.after(name, mod, function (args, ret) { return urlOverride(kindOf(name), name, null, args, ret); }));
          hookedFns.push([mod, name]);
          hooks[kindOf(name)].push(name);
        } catch (e) { fail("hook " + name, e); }
      });
    });

    // Banner getters can live in a different module than the avatar ones, so look through everything already loaded.
    try {
      eachModule(function (id, ex) {
        [ex, ex.default].forEach(function (holder) {
          if (!holder || (typeof holder !== "object" && typeof holder !== "function")) return;
          var keys = [];
          try { keys = Object.keys(holder); } catch (_) {}
          keys.forEach(function (name) {
            if (!BANNER_FN_RE.test(name) || BANNER_SKIP_RE.test(name)) return;
            var isFn = false;
            try { isFn = typeof holder[name] === "function"; } catch (_) {}
            if (!isFn || alreadyHooked(holder, name)) return;
            try {
              unpatches.push(patcher.after(name, holder, function (args, ret) { return urlOverride("banner", name, null, args, ret); }));
              hookedFns.push([holder, name]);
              hooks.banner.push(name);
            } catch (e) { fail("hook " + name, e); }
          });
        });
      });
    } catch (e) { fail("scan banner modules", e); }

    // Instance methods on the User class (profile screens and member lists use these, not the module functions).
    try {
      var cu = UserStore && UserStore.getCurrentUser && UserStore.getCurrentUser();
      var proto = cu ? Object.getPrototypeOf(cu) : null;
      if (proto && proto !== Object.prototype) {
        Object.getOwnPropertyNames(proto).forEach(function (name) {
          if (!URL_PROTO_RE.test(name) && !(BANNER_FN_RE.test(name) && !BANNER_SKIP_RE.test(name))) return;
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

  // Calls fn(id, exports) for every module that is already loaded. Returns false when the module list isn't reachable.
  function eachModule(fn) {
    var mods = metro.modules || (typeof globalThis !== "undefined" ? globalThis.modules : null);
    if (!mods) return false;
    var visit = function (id, m) {
      var ex = null;
      try { ex = m && m.isInitialized && m.publicModule && m.publicModule.exports; } catch (_) {}
      if (ex && (typeof ex === "object" || typeof ex === "function")) fn(String(id), ex);
    };
    if (typeof Map !== "undefined" && mods instanceof Map) mods.forEach(function (m, id) { visit(id, m); });
    else Object.keys(mods).forEach(function (id) { visit(id, mods[id]); });
    return true;
  }

  function scanExports(re, cap) {
    var out = [];
    try {
      var ok = eachModule(function (id, ex) {
        if (out.length >= cap) return;
        var keys = [];
        try { keys = Object.keys(ex); } catch (_) {}
        var hit = keys.filter(function (k) { return re.test(k); });
        if (hit.length) out.push(id + ": " + hit.slice(0, 6).join(","));
      });
      if (!ok) return "module list unavailable";
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
    add("banner getters in loaded modules", "\n  " + scanExports(/^get\w*Banner\w*(URL|Source|Uri|Src)$/, 12));
    add("image fallback", imageHooked ? "on, banner swaps so far: " + bannerSwaps : "off (Image is not a plain forwardRef here)");
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

  var C = {};
  var st = {};
  var cardSeq = 0;

  // Rebuilds every style from the active HUD theme. Called at the top of each Settings render.
  function buildStyles() {
    var t = hudTheme();
    var ff = t.mono ? { fontFamily: MONO } : {};
    var r = Math.min(t.radius, 12);
    C.card = t.card; C.input = t.input; C.text = t.text; C.sub = t.sub; C.accent = t.accent; C.grey = t.grey;
    var s = {
      root: { padding: 12, paddingBottom: 56 },
      card: { backgroundColor: t.card, borderColor: t.border, borderTopColor: t.borderTop, borderWidth: 1, borderRadius: t.radius, padding: 16, marginBottom: 12 },
      title: Object.assign({ color: t.text, fontSize: 17, fontWeight: "700", letterSpacing: t.mono ? 0 : 0.2, marginBottom: 4 }, ff),
      sub: Object.assign({ color: t.sub, fontSize: 13, lineHeight: 18, marginBottom: 6 }, ff),
      label: Object.assign({ color: t.sub, fontSize: 12, fontWeight: "600", marginTop: 10, marginBottom: 4 }, ff),
      input: Object.assign({ backgroundColor: t.input, color: t.text, borderColor: t.border, borderWidth: 1, borderRadius: r, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 }, ff),
      row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 7 },
      rowText: Object.assign({ color: t.text, fontSize: 14, lineHeight: 20, flexShrink: 1, paddingRight: 8 }, ff),
      btn: { backgroundColor: t.accent, borderRadius: r, paddingVertical: 11, paddingHorizontal: 14, alignItems: "center", marginTop: 8 },
      btn2: { backgroundColor: t.grey, borderRadius: r, paddingVertical: 11, paddingHorizontal: 14, alignItems: "center", marginTop: 8 },
      btnText: Object.assign({ color: t.onAccent, fontWeight: "700", fontSize: 14 }, ff),
      btn2Text: Object.assign({ color: t.text, fontWeight: "600", fontSize: 14 }, ff),
      chipText: Object.assign({ color: t.text, fontWeight: "600", fontSize: 13 }, ff),
      chipOnText: Object.assign({ color: t.onAccent, fontWeight: "700", fontSize: 13 }, ff),
      pick: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
      thumb: { width: 36, height: 36, marginRight: 10, borderRadius: 6 },
      mono: { color: t.text, fontSize: 11, marginTop: 8, fontFamily: MONO },
      pv: { backgroundColor: t.card, borderColor: t.border, borderTopColor: t.borderTop, borderWidth: 1, borderRadius: t.radius, overflow: "hidden", marginBottom: 12 },
      pvBanner: { height: 76, overflow: "hidden" },
      pvBannerImg: { width: "100%", height: 76 },
      pvStripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: 5 },
      pvBody: { paddingHorizontal: 14, paddingBottom: 14 },
      pvAvatarRow: { flexDirection: "row", alignItems: "flex-end", marginTop: -30 },
      pvAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: t.ring, backgroundColor: t.grey },
      pvName: Object.assign({ fontSize: 19, fontWeight: "700", marginTop: 8 }, ff),
      pvDots: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
      pvDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 3 },
      pvBadges: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, padding: 8, borderRadius: Math.min(t.radius, 14), backgroundColor: t.input, borderColor: t.border, borderWidth: 1 },
      pvBadgeChip: { width: 30, height: 30, borderRadius: 8, marginRight: 6, marginBottom: 6, backgroundColor: t.card, borderColor: t.border, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
      pvBadge: { width: 20, height: 20 },
      pvBadgeCount: Object.assign({ color: t.sub, fontSize: 11, marginTop: 6 }, ff),
      pvNote: Object.assign({ color: t.sub, fontSize: 12, lineHeight: 16, marginTop: 2 }, ff),
      swatchRow: { flexDirection: "row", marginBottom: 4, borderRadius: 4, overflow: "hidden" },
      swatch: { width: 14, height: 10 },
      chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
      chip: { backgroundColor: t.grey, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12, marginRight: 6, marginBottom: 6 },
      chipOn: { backgroundColor: t.accent, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12, marginRight: 6, marginBottom: 6 }
    };
    for (var k in s) { if (has.call(s, k)) st[k] = s[k]; }
  }

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
    Object.keys(DEFAULTS).forEach(function (k) {
      if (/Data$/.test(k) || k === "installId" || k === "lastPing" || k === "undoLook") return;
      o[k] = storage[k];
    });
    return JSON.stringify(o);
  }

  // Everything imported is checked value by value; the usage counter setting and install id are never imported.
  function importSettings(text) {
    var o = JSON.parse(text);
    if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("not an object");
    var n = 0;
    LOOK_KEYS.forEach(function (k) {
      if (/Data$/.test(k) || !has.call(o, k)) return;
      storage[k] = cleanValue(k, o[k]);
      n++;
    });
    if (typeof o.theme === "string" && has.call(HUD_THEMES, o.theme)) { storage.theme = o.theme; n++; }
    ["enabled", "hudAnim", "checkUpdates"].forEach(function (k) {
      if (typeof o[k] === "boolean") { storage[k] = o[k]; n++; }
    });
    if (Array.isArray(o.presets)) {
      o.presets.slice(0, MAX_USER_PRESETS).forEach(function (p) {
        if (p && typeof p === "object" && p.look && typeof p.look === "object" && addUserPreset(String(p.name || "Imported"), sanitizeLook(p.look))) n++;
      });
    }
    startBadgeAnim();
    extVer++;
    return n;
  }

  function resetAll() {
    Object.keys(DEFAULTS).forEach(function (k) { storage[k] = DEFAULTS[k]; });
    stopBadgeAnim();
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
    var banner = h.apply(null, [RN.View, { style: [st.pvBanner, { backgroundColor: C.grey, flexDirection: "row" }] }].concat(bannerKids));

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

    // Each badge sits in its own chip so it reads clearly against any theme, and tapping one
    // shows its name -- useful once there are a dozen-plus badges stacked together.
    var badgeImgs = badgeList.map(function (b, i) {
      return h(RN.TouchableOpacity, { key: "b" + i, style: st.pvBadgeChip, onPress: function () { toast(b.description || b.id); } },
        h(RN.Image, { source: { uri: "https://cdn.discordapp.com/badge-icons/" + b.icon + ".png" }, style: b.tint ? [st.pvBadge, { tintColor: "#" + b.tint }] : st.pvBadge }));
    });
    var badgeTray = badgeList.length
      ? h(RN.View, null,
          h.apply(null, [RN.View, { style: st.pvBadges }].concat(badgeImgs)),
          h(RN.Text, { style: st.pvBadgeCount }, badgeList.length + " badge" + (badgeList.length === 1 ? "" : "s") + " -- tap one to see its name"))
      : null;

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
        badgeTray,
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
    var t = hudTheme();
    var head = [h(RN.Text, { style: st.title }, t.prompt ? "$ " + String(title).toLowerCase() : title)];
    if (sub) head.push(h(RN.Text, { style: st.sub }, sub));
    return h(FadeIn, { key: "card:" + title, style: st.card, delay: Math.min(cardSeq++, 6) * 45, kids: head.concat(kids) });
  }

  function Btn(label, onPress, secondary) {
    return h(RN.TouchableOpacity, { onPress: onPress, style: secondary ? st.btn2 : st.btn }, h(RN.Text, { style: secondary ? st.btn2Text : st.btnText }, label));
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
        h(RN.Text, { style: st.chipText }, g[0])
      );
    });
    return h.apply(null, [RN.View, { style: st.chips }].concat(kids));
  }

  function Choices(props) {
    var kids = props.options.map(function (o) {
      var on = String(props.value) === String(o[0]);
      return h(RN.TouchableOpacity, { key: "c" + o[0], onPress: function () { props.onPick(o[0]); }, style: on ? st.chipOn : st.chip },
        h(RN.Text, { style: on ? st.chipOnText : st.chipText }, o[1]));
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

  // ---- themed HUD pieces (0.4) ----

  function timing(v, to, ms) {
    return RN.Animated.timing(v, { toValue: to, duration: ms, useNativeDriver: true });
  }

  // Card body that fades and slides up when it first appears. Cards get a key from their title, so switching tabs replays it.
  function FadeIn(props) {
    var ref = React.useRef(null);
    if (!ref.current) ref.current = new RN.Animated.Value(storage.hudAnim ? 0 : 1);
    var v = ref.current;
    React.useEffect(function () {
      if (!storage.hudAnim) return undefined;
      var a = RN.Animated.timing(v, { toValue: 1, duration: 320, delay: props.delay || 0, useNativeDriver: true });
      a.start();
      return function () { try { a.stop(); } catch (_) {} };
    }, []);
    var style = [props.style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }];
    return h.apply(null, [RN.Animated.View, { style: style }].concat(props.kids || []));
  }

  // Two big soft colored circles behind the settings screen; they drift slowly. This is what the glass cards sit on.
  function Blobs() {
    var t = hudTheme();
    var ref = React.useRef(null);
    if (!ref.current) ref.current = new RN.Animated.Value(0);
    var v = ref.current;
    var animate = !!(t.blobs && storage.hudAnim);
    React.useEffect(function () {
      if (!animate) return undefined;
      var loop = RN.Animated.loop(RN.Animated.sequence([timing(v, 1, 7000), timing(v, 0, 7000)]));
      loop.start();
      return function () { try { loop.stop(); } catch (_) {} };
    }, [animate]);
    if (!t.blobs) return null;
    return h(RN.View, { pointerEvents: "none", style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" } },
      h(RN.Animated.View, { style: { position: "absolute", top: -90, right: -110, width: 320, height: 320, borderRadius: 160, backgroundColor: t.accent, opacity: 0.22, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 44] }) }] } }),
      h(RN.Animated.View, { style: { position: "absolute", bottom: -120, left: -120, width: 340, height: 340, borderRadius: 170, backgroundColor: t.accent2, opacity: 0.18, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -44] }) }] } }));
  }

  // Test feature: an arbitrary image/GIF behind the whole settings screen, picked by the user.
  function CustomBg() {
    if (!storage.bgOn || !storage.bgUrl) return null;
    var op = Math.max(10, Math.min(100, Number(storage.bgOpacity) || 55)) / 100;
    return h(RN.View, { pointerEvents: "none", style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" } },
      h(RN.Image, { source: { uri: storage.bgUrl }, resizeMode: "cover", style: { width: "100%", height: "100%", opacity: op } }),
      storage.bgDim ? h(RN.View, { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000", opacity: 0.35 } }) : null);
  }

  // The live preview with arrows on both sides. Tapping an arrow slides the card out, applies the next preset, slides the new one in.
  function PresetStage(props) {
    var t = hudTheme();
    var list = allPresets();
    var idx = currentPresetIndex();
    var cur = list[idx];
    var slideRef = React.useRef(null);
    var fadeRef = React.useRef(null);
    var busy = React.useRef(false);
    if (!slideRef.current) slideRef.current = new RN.Animated.Value(0);
    if (!fadeRef.current) fadeRef.current = new RN.Animated.Value(1);
    var slide = slideRef.current;
    var fade = fadeRef.current;

    function step(dir) {
      var p = presetStep(dir);
      extVer++;
      if (p) toast(p.name);
      props.onChange();
    }

    function go(dir) {
      if (busy.current) return;
      if (!storage.hudAnim) { step(dir); return; }
      busy.current = true;
      var out = -dir * 30;
      RN.Animated.parallel([timing(fade, 0, 110), timing(slide, out, 110)]).start(function () {
        step(dir);
        slide.setValue(-out);
        RN.Animated.parallel([timing(fade, 1, 200), timing(slide, 0, 200)]).start(function () { busy.current = false; });
      });
    }

    function arrow(dir, glyph) {
      return h(RN.TouchableOpacity, { key: "arrow" + dir, onPress: function () { go(dir); }, hitSlop: { top: 14, bottom: 14, left: 8, right: 8 }, style: { paddingHorizontal: 10, justifyContent: "center" } },
        h(RN.Text, { style: { color: t.accent, fontSize: 38, fontWeight: "300" } }, glyph));
    }

    var dots = list.map(function (p, i) {
      return h(RN.View, { key: p.id, style: { width: i === idx ? 18 : 6, height: 6, borderRadius: 3, marginHorizontal: 2, marginBottom: 2, backgroundColor: i === idx ? t.accent : t.grey } });
    });
    var isUser = !!cur && cur.id.indexOf("user:") === 0;

    var tools = [
      Btn("Save current look as a preset", function () {
        var p = savePreset("Preset " + (userPresets().length + 1));
        if (p) { extVer++; toast("Saved " + p.name); props.onChange(); }
      })
    ];
    if (storage.undoLook) tools.push(Btn("Undo last switch", function () { if (undoPreset()) { extVer++; props.onChange(); toast("Restored"); } }, true));
    if (cur) tools.push(Btn("Copy this preset to share", function () {
      try { metro.common.clipboard.setString(exportPreset(cur)); toast("Preset copied"); } catch (e) { toast("Could not copy"); }
    }, true));
    if (isUser) {
      tools.push(h(Field, { key: "pname:" + cur.id + ":" + extVer, label: "Preset name", value: cur.name, onSave: function (v) { if (renamePreset(cur.id, v)) { extVer++; props.onChange(); } } }));
      tools.push(Btn("Delete this preset", function () { if (deletePreset(cur.id)) { extVer++; toast("Deleted"); props.onChange(); } }, true));
    }
    tools.push(h(Field, { key: "pimp:" + extVer, label: "Paste a shared preset to import it", placeholder: "{\"profileforge\":1,...}", value: "", onSave: function (v) {
      if (!v) return;
      var r = importPreset(v);
      if (r.ok) { extVer++; toast("Imported " + r.name); props.onChange(); } else toast(r.error);
    } }));

    return h.apply(null, [RN.View, null,
      h(RN.View, { style: { flexDirection: "row", alignItems: "stretch" } },
        arrow(-1, "\u2039"),
        h(RN.Animated.View, { style: { flex: 1, opacity: fade, transform: [{ translateX: slide }] } }, h(Preview, { real: props.real })),
        arrow(1, "\u203A")),
      h(RN.Text, { style: [st.title, { textAlign: "center" }] }, cur ? cur.name : ""),
      h.apply(null, [RN.View, { style: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginBottom: 10 } }].concat(dots)),
      Card("Presets", "Each preset replaces your current setup, so save yours first. Undo brings the last one back.", tools)
    ]);
  }

  // Saved banners / avatars / custom badges: tap Use to apply, Remove to delete.
  function LibraryCard(kind, title, sub, rerender) {
    var list = libList(kind);
    var kids = [Btn("Save current " + kind, function () {
      var ok;
      if (kind === "badge") ok = libSave("badge", "Badge " + (libList("badge").length + 1), { icon: storage.customBadgeIcon, frames: storage.badgeFrames, desc: storage.customBadgeDesc });
      else {
        var url = kind === "banner" ? storage.bannerUrl : storage.avatarUrl;
        var data = kind === "banner" ? storage.bannerData : storage.avatarData;
        ok = libSave(kind, (kind === "banner" ? "Banner " : "Avatar ") + (libList(kind).length + 1), url || data);
      }
      toast(ok ? "Saved" : "Nothing to save yet (paste a link first)");
      rerender();
    }, true)];
    list.forEach(function (it, i) {
      kids.push(h(RN.View, { key: kind + i, style: st.row },
        h(RN.Text, { style: st.rowText, numberOfLines: 1 }, it.name),
        h(RN.View, { style: { flexDirection: "row" } },
          h(RN.TouchableOpacity, { onPress: function () { libApply(kind, i); extVer++; rerender(); }, style: st.chipOn }, h(RN.Text, { style: st.chipOnText }, "Use")),
          h(RN.TouchableOpacity, { onPress: function () { libRemove(kind, i); rerender(); }, style: st.chip }, h(RN.Text, { style: st.chipText }, "Remove")))));
    });
    if (!list.length) kids.push(h(RN.Text, { key: kind + "-empty", style: st.sub }, "Nothing saved yet."));
    return Card(title, sub, kids);
  }

  function StatsLine() {
    var s = React.useState(null);
    React.useEffect(function () { fetchCount(function (n) { s[1](n); }); }, []);
    if (!STATS_URL || s[0] === null) return null;
    return h(RN.Text, { style: st.sub }, s[0] + " people use ProfileForge");
  }

  function Settings() {
    buildStyles();
    cardSeq = 0;
    var t = React.useState(0);
    var bump = t[1];
    var d = React.useState("");
    var diag = d[0];
    var setDiag = d[1];
    var tt = React.useState("profile");
    var tab = tt[0];
    var setTab = tt[1];
    var rs = React.useState(false);
    var qs = React.useState("");
    var badgeQuery = qs[0];
    var setBadgeQuery = qs[1];
    function matchesQuery(label) { return !badgeQuery || String(label).toLowerCase().indexOf(badgeQuery.toLowerCase()) >= 0; }
    var resetArmed = rs[0];
    var setResetArmed = rs[1];

    function rerender() { bump(function (n) { return n + 1; }); }
    function hookSummary() {
      return "avatar " + (hooks.avatar.length ? hooks.avatar.join(", ") : "none found") + " | banner " + (hooks.banner.length ? hooks.banner.join(", ") : "none found") + " | image fallback " + (imageHooked ? "on" : "off");
    }
    function set(k, v) { storage[k] = v; if (k === "enabled" || k === "badgeFrames" || k === "badgeFrameMs") startBadgeAnim(); refresh(); rerender(); }
    function setMany(o) { for (var k in o) { if (has.call(o, k)) storage[k] = o[k]; } startBadgeAnim(); extVer++; refresh(); rerender(); }
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
    var tabs = { profile: [], badges: [], name: [], media: [], hud: [], tools: [] };
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

    cards.push(LibraryCard("banner", "Saved banners", "Keep banners you like and switch between them in one tap.", rerender));
    cards.push(LibraryCard("avatar", "Saved avatars", "Same for avatars.", rerender));

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
    cards.push(h(Field, { key: "badge-search", label: "Search badges", placeholder: "nitro, boost, streaming...", value: badgeQuery, onLive: function (v) { setBadgeQuery(v); }, onSave: function (v) { setBadgeQuery(v); } }));
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
      var full = BADGES.filter(function (b) { return b[5] === g[0]; });
      var list = full.filter(function (b) { return matchesQuery(b[0]); });
      if (badgeQuery && !list.length) return;
      var rows = list.map(function (b) {
        return ToggleRow(b[0], badgeOn(b), function (v) { setBadges([b], v); });
      });
      if (!badgeQuery) {
        rows.push(Btn("Turn all on", function () { setBadges(full, true); }, true));
        rows.push(Btn("Turn all off", function () { setBadges(full, false); }, true));
      }
      cards.push(Card(g[1], g[2], rows));
    });

    cards.push(Card("Custom badge", "Any badge icon hash (32 characters), for badges not listed above.", [
      h(Field, { key: "cbi:" + extVer, label: "Icon hash", placeholder: "32 hex characters", value: storage.customBadgeIcon, onSave: function (v) { set("customBadgeIcon", v); } }),
      h(Field, { key: "cbd:" + extVer, label: "Description", placeholder: "Custom badge", value: storage.customBadgeDesc, onSave: function (v) {
        if (IMPERSONATION_RE.test(v)) { toast("That name reads as an official Discord badge, so I can't set it. Try something that's clearly your own, like \"ProfileForge Staff\"."); return; }
        set("customBadgeDesc", v);
      } })
    ]));

    cards.push(Card("Animated badge", "Cycles your custom badge through several icons. While frames are set they replace the single icon above. Only Discord's own badge icons can be used.", [
      h(Choices, { options: BUILTIN_BADGE_ANIMS.map(function (a) { return [a.id, a.name]; }), value: currentAnimId(), onPick: function (id) { var a = findAnim(id); if (a) { applyBadgeAnim(a); extVer++; rerender(); } } }),
      Btn("Stop animation", function () { setMany({ badgeFrames: "" }); }, true),
      h(Field, { key: "bf:" + extVer, label: "Frame icon hashes (comma separated, 2 to 12)", placeholder: "hash1,hash2,...", value: storage.badgeFrames, onSave: function (v) { setMany({ badgeFrames: cleanFrames(v) }); } }),
      h(Field, { key: "bm:" + extVer, label: "Speed (milliseconds per frame, 600 to 10000)", placeholder: "1200", value: storage.badgeFrameMs, onSave: function (v) { setMany({ badgeFrameMs: cleanValue("badgeFrameMs", v) || 1200 }); } })
    ]));
    cards.push(LibraryCard("badge", "Saved custom badges", "Save your custom badge or animation and bring it back later.", rerender));

    var slotsNow = customBadgeSlots();
    var slotRows = slotsNow.map(function (slot, i) {
      return h(RN.View, { key: "slot" + i, style: st.row },
        h(RN.Text, { style: st.rowText, numberOfLines: 1 }, slot.desc + (slot.tint ? "  (#" + slot.tint + ")" : "")),
        h(RN.TouchableOpacity, { onPress: function () { removeCustomBadgeSlot(i); extVer++; rerender(); }, style: st.chip }, h(RN.Text, { style: st.chipText }, "Remove")));
    });
    if (!slotRows.length) slotRows.push(h(RN.Text, { key: "slot-empty", style: st.sub }, "None yet."));
    var haveSlotIcons = {};
    slotsNow.forEach(function (s) { haveSlotIcons[s.icon] = true; });
    var quickChips = CUSTOM_BADGE_PRESETS.map(function (p) {
      var already = !!haveSlotIcons[p[1]];
      return h(RN.TouchableOpacity, { key: "quick:" + p[0], disabled: already, style: already ? st.chipOn : st.chip, onPress: function () {
        var r = addCustomBadgeSlot(p[1], p[0], p[2]);
        if (r === "ok") { extVer++; rerender(); toast("Added"); }
        else if (r === "full") toast("You can have up to 8 of these");
      } }, h(RN.Text, { style: already ? st.chipOnText : st.chipText }, (already ? "✓ " : "+ ") + p[0]));
    });
    slotRows.push(h(RN.Text, { key: "quick-label", style: st.label }, "Quick add (uses icons already confirmed on this screen)"));
    slotRows.push(h.apply(null, [RN.View, { key: "quick-row", style: st.chips }].concat(quickChips)));
    slotRows.push(h(RN.Text, { key: "slot-ideas", style: st.sub }, "Or make your own below. More name ideas: ProfileForge Verified, ProfileForge OG, ProfileForge Elite."));
    slotRows.push(h(Field, {
      key: "slot-add:" + extVer, label: "icon hash|name|color (optional, 6 hex digits)", placeholder: "6bdc42827a38498929a4920da12695d9|ProfileForge Staff|ffcc00",
      value: "", onSave: function (v) {
        if (!v) return;
        var parts = v.split("|");
        var r = addCustomBadgeSlot(parts[0], parts[1], parts[2]);
        if (r === "ok") { extVer++; rerender(); toast("Added"); }
        else if (r === "full") toast("You can have up to 8 of these");
        else if (r === "bad-icon") toast("That's not a 32-character icon hash");
        else if (r === "bad-name") toast("Give it a name");
        else toast("That name reads as an official Discord badge, so I can't add it. Try something that's clearly your own, like \"ProfileForge Staff\".");
      }
    }));
    cards.push(Card("ProfileForge badges", "Your own named badges, using any Discord icon hash you like (see the Custom badge and Animated badge cards above for hashes already on this screen). The color only tints the preview above -- Discord's own badge tray always shows the icon's real colors.", slotRows));

    var fidsNow = familyIdSet();
    var fmapNow = familyIconMap();
    function familyOn(id) { return !!fidsNow[id]; }
    function toggleFamily(id, on) {
      var m = familyIdSet();
      if (on) m[id] = true; else delete m[id];
      set("familyIds", Object.keys(m).join(","));
    }
    FAMILY_GROUPS.forEach(function (g) {
      var full = FAMILY_BADGES.filter(function (f) { return f[2] === g[0]; });
      var list = full.filter(function (f) { return matchesQuery(f[1]); });
      if (badgeQuery && !list.length) return;
      var rows = list.map(function (f) {
        var has_ = !!fmapNow[f[0]];
        return ToggleRow(f[1] + (has_ ? "" : "  (no icon hash yet)"), familyOn(f[0]), function (v) { toggleFamily(f[0], v); });
      });
      cards.push(Card(g[1], "Tier names and order are cross-checked against community badge trackers, but Discord hasn't published CDN icon hashes for this family anywhere I could find. Pick a tier, then paste its hash below once you have one -- without a hash the badge stays off your profile rather than showing broken.", rows));
    });
    cards.push(Card("Badge family icon hashes", "Paste one or more as id=hash, comma separated. Example: gift_patron=2ba85e8026a8614b640c2837bcdfe21b", [
      h(Field, { key: "fim:" + extVer, label: "id=hash,id=hash,...", placeholder: "gift_patron=...", value: "", onSave: function (v) {
        if (!v) return;
        var n = mergeFamilyIcons(v);
        extVer++; rerender();
        toast(n ? "Saved " + n + " icon" + (n === 1 ? "" : "s") : "No valid id=hash pairs found");
      } })
    ]));

    cards = tabs.hud;
    cards.push(Card("HUD theme", "Colors, corners and text style for this screen.", [
      h(Choices, { options: HUD_THEME_LIST, value: storage.theme, onPick: function (v) { storage.theme = v; rerender(); } }),
      ToggleRow("Animations (fade-ins, drifting glow, smooth preset switching)", storage.hudAnim, function (v) { storage.hudAnim = v; rerender(); })
    ]));

    cards.push(Card("Custom animated background (test feature)", "Puts your own GIF or image behind this settings screen. Experimental: it can be slow on some devices and can make text harder to read, which is what the dim option below is for.", [
      ToggleRow("Use a custom background here", storage.bgOn, function (v) { set("bgOn", v); }),
      h(Field, { key: "bgu:" + extVer, label: "Image or GIF link", placeholder: "https://...", value: storage.bgUrl, onSave: function (v) { set("bgUrl", /^https?:\/\/[^\s]{1,1900}$/i.test(v) ? v : ""); } }),
      h(Choices, { options: [["25", "25%"], ["55", "55%"], ["80", "80%"], ["100", "100%"]], value: String(storage.bgOpacity), onPick: function (v) { set("bgOpacity", Number(v)); } }),
      ToggleRow("Dim background for readability", storage.bgDim, function (v) { set("bgDim", v); })
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

    cards.push(Card("Updates" + (STATS_URL ? " and stats" : ""), "New versions are announced here. Nothing is downloaded or run until you update from the Plugins page.", [
      ToggleRow("Tell me when a new version is out", storage.checkUpdates, function (v) { set("checkUpdates", v); }),
      Btn("Check for updates now", function () {
        checkUpdate(function (v, err) { toast(err ? "Could not check for updates" : v ? "Version " + v + " is available" : "You're on the latest version"); });
      }, true),
      STATS_URL ? ToggleRow("Count me in the public user total (random anonymous ID and version only, off by default)", storage.telemetry, function (v) { setTelemetry(v); rerender(); }) : null,
      STATS_URL ? h(StatsLine, { key: "stats" }) : null
    ]));

    cards.push(Card("Typing indicator", "Restyling the \"is typing\" row needs to know which component your Discord version uses. Scan, then send me the output shown under Diagnostics.", [
      Btn("Scan for typing components", function () { discoverTyping(); setDiag(runDiagnostics()); }, true)
    ]));

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

    var tabBar = h(Choices, { options: [["profile", "Profile"], ["badges", "Badges"], ["name", "Name"], ["media", "Media"], ["hud", "HUD"], ["tools", "Tools"]], value: tab, onPick: function (v) { setTab(v); } });

    var th = hudTheme();
    var content = box(st.root, [h(PresetStage, { key: "stage", real: realBadges, onChange: rerender })].concat(head).concat([tabBar]).concat(tabs[tab] || tabs.profile));
    return h(RN.View, { style: { flex: 1, backgroundColor: th.bg } },
      h(Blobs, null),
      h(CustomBg, null),
      h(RN.ScrollView, { keyboardShouldPersistTaps: "handled", nestedScrollEnabled: true }, content));
  }

  return {
    onLoad: function () {
      try { ensureDefaults(); install(); } catch (e) { fail("onLoad", e); }
    },
    onUnload: function () {
      try { uninstall(); } catch (e) { fail("onUnload", e); }
    },
    settings: Settings
  };
})()
