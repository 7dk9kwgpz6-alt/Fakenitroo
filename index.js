(function () {
  "use strict";

  /*
   * ProfileForge
   * Client-side cosmetic profile customization.
   * Version: 0.5.0
   */

  var VERSION = "0.5.0";
  var V = vendetta;
  var metro = V.metro;
  var React = metro.common.React;
  var RN = metro.common.ReactNative;
  var patcher = V.patcher;
  var storage = V.plugin.storage;

  var unpatches = [];
  var backups = new WeakMap();
  var UserStore = null;
  var UserProfileStore = null;
  var myId = null;
  var errors = [];

  var DEFAULTS = {
    enabled: true,

    /* HUD */
    hudEnabled: true,
    hudAnimated: true,
    hudTheme: "lime-glass",
    hudAccent: "#9cff57",
    hudOpacity: 0.90,
    hudRadius: 16,
    hudCompact: false,

    /* Profile cosmetics */
    primaryColor: "",
    accentColor: "",
    effectId: "",
    effectSkuId: "",
    decoAsset: "",
    decoSkuId: "",
    plateAsset: "",
    plateSkuId: "",
    plateLabel: "",
    platePalette: "",
    profileFrameAsset: "",
    profileFrameSkuId: "",

    /* Badges */
    badgeIds: "",
    customBadges: "[]",
    customBadgeIcon: "",
    customBadgeDesc: "",

    /* Cosmetic typing animation */
    typingIndicator: false,
    typingAnimation: true,

    /* Presets */
    activePreset: "Default",
    presets: JSON.stringify({
      Default: {}
    }),

    /* Update preferences */
    autoUpdate: true,
    updateChannel: "stable",

    /* Optional ProfileForge sharing */
    sharedCosmetics: false,
    anonymousUsageStats: false
  };

  /*
   * Cosmetic badge IDs.
   * These are only added to the local client representation.
   */
  var BADGES = [
    ["Nitro", "premium"],
    ["Nitro Bronze", "premium_tenure_1_month_v2"],
    ["Nitro Silver", "premium_tenure_3_month_v2"],
    ["Nitro Gold", "premium_tenure_6_month_v2"],
    ["Nitro Platinum", "premium_tenure_12_month_v2"],
    ["Nitro Diamond", "premium_tenure_24_month_v2"],
    ["Nitro Emerald", "premium_tenure_36_month_v2"],
    ["Nitro Ruby", "premium_tenure_60_month_v2"],
    ["Nitro Opal", "premium_tenure_72_month_v2"],

    ["Booster 1M", "guild_booster_lvl1"],
    ["Booster 2M", "guild_booster_lvl2"],
    ["Booster 3M", "guild_booster_lvl3"],
    ["Booster 6M", "guild_booster_lvl4"],
    ["Booster 9M", "guild_booster_lvl5"],
    ["Booster 12M", "guild_booster_lvl6"],
    ["Booster 15M", "guild_booster_lvl7"],
    ["Booster 18M", "guild_booster_lvl8"],
    ["Booster 24M", "guild_booster_lvl9"],

    ["Quest", "quest_completed"],
    ["Orb", "orb_profile_badge"],
    ["Legacy Username", "legacy_username"],
    ["Level 100", "april_fools_2026"],

    ["HypeSquad", "hypesquad"],
    ["Bravery", "hypesquad_house_1"],
    ["Brilliance", "hypesquad_house_2"],
    ["Balance", "hypesquad_house_3"],

    ["Early Supporter", "premium_early_supporter"],
    ["Bug Hunter I", "bug_hunter_level_1"],
    ["Bug Hunter II", "bug_hunter_level_2"],
    ["Verified Developer", "verified_developer"],
    ["Active Developer", "active_developer"]
  ];

  function toast(text) {
    try {
      V.ui.toasts.showToast(String(text));
    } catch (_) {}
  }

  function logError(where, error) {
    var message =
      where +
      ": " +
      (error && error.message ? error.message : String(error));

    errors.push(message);

    if (errors.length > 30)
      errors.shift();

    try {
      V.logger.error("[ProfileForge] " + message);
    } catch (_) {}
  }

  function initializeDefaults() {
    Object.keys(DEFAULTS).forEach(function (key) {
      if (storage[key] === undefined)
        storage[key] = DEFAULTS[key];
    });
  }

  function hexToInt(value) {
    var valueString = String(value || "")
      .replace("#", "")
      .trim();

    if (!/^[0-9a-fA-F]{6}$/.test(valueString))
      return null;

    return parseInt(valueString, 16);
  }

  /*
   * Object patching helpers.
   */

  function remember(object, key) {
    var map = backups.get(object);

    if (!map) {
      map = {};
      backups.set(object, map);
    }

    if (!Object.prototype.hasOwnProperty.call(map, key)) {
      map[key] = {
        value: object[key],
        existed: key in object
      };
    }
  }

  function setField(object, key, value, enabled) {
    if (!object)
      return;

    try {
      if (enabled) {
        remember(object, key);
        object[key] = value;
      } else {
        var map = backups.get(object);

        if (!map || !map[key])
          return;

        if (map[key].existed)
          object[key] = map[key].value;
        else
          delete object[key];

        delete map[key];
      }
    } catch (error) {
      logError("set " + key, error);
    }
  }

  function restore(object) {
    var map = backups.get(object);

    if (!map)
      return;

    Object.keys(map).forEach(function (key) {
      try {
        if (map[key].existed)
          object[key] = map[key].value;
        else
          delete object[key];
      } catch (_) {}
    });

    backups.delete(object);
  }

  /*
   * Custom badges.
   */

  function getCustomBadges() {
    try {
      var badges = JSON.parse(storage.customBadges || "[]");

      return Array.isArray(badges)
        ? badges
        : [];
    } catch (_) {
      return [];
    }
  }

  function getBadges() {
    var result = [];

    var selected = String(storage.badgeIds || "")
      .split(",")
      .map(function (x) {
        return x.trim();
      });

    BADGES.forEach(function (badge) {
      if (selected.indexOf(badge[1]) !== -1) {
        result.push({
          id: badge[1],
          description: badge[0] + " cosmetic"
        });
      }
    });

    getCustomBadges()
      .slice(0, 20)
      .forEach(function (badge, index) {
        if (!badge || !badge.icon)
          return;

        result.push({
          id: "profileforge_custom_" + index,
          description:
            badge.name ||
            "Custom ProfileForge cosmetic badge",
          icon: badge.icon
        });
      });

    if (
      /^[0-9a-f]{32}$/i.test(
        String(storage.customBadgeIcon || "")
      )
    ) {
      result.push({
        id: "profileforge_custom",
        description:
          storage.customBadgeDesc ||
          "Custom ProfileForge cosmetic badge",
        icon: storage.customBadgeIcon
      });
    }

    return result;
  }

  /*
   * User/profile decoration.
   */

  function decorateUser(user) {
    if (!user || !myId || user.id !== myId)
      return user;

    var enabled = !!storage.enabled;
    var primary = hexToInt(storage.primaryColor);

    setField(
      user,
      "accentColor",
      primary,
      enabled && primary !== null
    );

    if (enabled && storage.decoAsset) {
      setField(
        user,
        "avatarDecorationData",
        {
          asset: storage.decoAsset,
          skuId: storage.decoSkuId || undefined,
          expiresAt: null
        },
        true
      );
    } else {
      setField(
        user,
        "avatarDecorationData",
        null,
        false
      );
    }

    return user;
  }

  function decorateProfile(profile) {
    if (!profile)
      return profile;

    var enabled = !!storage.enabled;

    var primary = hexToInt(storage.primaryColor);
    var accent = hexToInt(storage.accentColor);

    if (accent === null)
      accent = primary;

    /*
     * Profile colors.
     */
    setField(
      profile,
      "themeColors",
      [primary, accent],
      enabled && primary !== null
    );

    /*
     * Profile effect.
     */
    setField(
      profile,
      "profileEffectID",
      storage.effectId,
      enabled && !!storage.effectId
    );

    setField(
      profile,
      "profileEffectId",
      storage.effectId,
      enabled && !!storage.effectId
    );

    if (enabled && storage.effectId) {
      setField(
        profile,
        "profileEffect",
        {
          id: storage.effectId,
          skuId:
            storage.effectSkuId ||
            storage.effectId,
          expiresAt: null
        },
        true
      );
    } else {
      setField(
        profile,
        "profileEffect",
        null,
        false
      );
    }

    /*
     * Badges.
     */
    var badges = getBadges();

    setField(
      profile,
      "badges",
      badges,
      enabled && badges.length > 0
    );

    /*
     * Profile frame.
     */
    if (
      enabled &&
      storage.profileFrameAsset
    ) {
      setField(
        profile,
        "profileFrame",
        {
          asset: storage.profileFrameAsset,
          skuId:
            storage.profileFrameSkuId ||
            undefined,
          expiresAt: null
        },
        true
      );
    } else {
      setField(
        profile,
        "profileFrame",
        null,
        false
      );
    }

    /*
     * Nameplate.
     */
    if (
      enabled &&
      storage.plateAsset
    ) {
      setField(
        profile,
        "collectibles",
        {
          nameplate: {
            asset: storage.plateAsset,
            skuId:
              storage.plateSkuId ||
              undefined,
            label:
              storage.plateLabel ||
              "",
            palette:
              storage.platePalette ||
              ""
          }
        },
        true
      );
    } else {
      setField(
        profile,
        "collectibles",
        null,
        false
      );
    }

    return profile;
  }

  function refresh() {
    try {
      if (
        UserStore &&
        UserStore.emitChange
      )
        UserStore.emitChange();
    } catch (_) {}

    try {
      if (
        UserProfileStore &&
        UserProfileStore.emitChange
      )
        UserProfileStore.emitChange();
    } catch (_) {}
  }

  /*
   * Install patches.
   */

  function install() {
    initializeDefaults();

    try {
      UserStore =
        metro.findByStoreName(
          "UserStore"
        );
    } catch (error) {
      logError(
        "UserStore lookup",
        error
      );
    }

    try {
      UserProfileStore =
        metro.findByStoreName(
          "UserProfileStore"
        );
    } catch (error) {
      logError(
        "UserProfileStore lookup",
        error
      );
    }

    try {
      var current =
        UserStore &&
        UserStore.getCurrentUser &&
        UserStore.getCurrentUser();

      if (current)
        myId = current.id;
    } catch (error) {
      logError(
        "current user",
        error
      );
    }

    function patch(
      method,
      object,
      callback
    ) {
      if (
        !object ||
        typeof object[method] !== "function"
      )
        return;

      try {
        unpatches.push(
          patcher.after(
            method,
            object,
            callback
          )
        );
      } catch (error) {
        logError(
          "patch " + method,
          error
        );
      }
    }

    patch(
      "getCurrentUser",
      UserStore,
      function (_, result) {
        if (result)
          myId = result.id;

        return decorateUser(result);
      }
    );

    patch(
      "getUser",
      UserStore,
      function (_, result) {
        return decorateUser(result);
      }
    );

    patch(
      "getUserProfile",
      UserProfileStore,
      function (args, result) {
        if (
          myId &&
          args[0] === myId
        )
          return decorateProfile(result);

        return result;
      }
    );

    refresh();
  }

  function uninstall() {
    unpatches.forEach(function (unpatch) {
      try {
        unpatch();
      } catch (_) {}
    });

    unpatches = [];

    try {
      if (
        UserStore &&
        UserStore.getCurrentUser
      )
        restore(
          UserStore.getCurrentUser()
        );
    } catch (_) {}

    try {
      if (
        UserProfileStore &&
        myId &&
        UserProfileStore.getUserProfile
      )
        restore(
          UserProfileStore.getUserProfile(
            myId
          )
        );
    } catch (_) {}

    refresh();
  }

  /*
   * Presets.
   */

  function getPresets() {
    try {
      var presets =
        JSON.parse(
          storage.presets || "{}"
        );

      return presets &&
        typeof presets === "object"
        ? presets
        : {};
    } catch (_) {
      return {};
    }
  }

  function savePreset(name) {
    name =
      String(name || "").trim();

    if (!name)
      return false;

    var presets =
      getPresets();

    presets[name] = {
      primaryColor:
        storage.primaryColor,

      accentColor:
        storage.accentColor,

      effectId:
        storage.effectId,

      effectSkuId:
        storage.effectSkuId,

      decoAsset:
        storage.decoAsset,

      decoSkuId:
        storage.decoSkuId,

      plateAsset:
        storage.plateAsset,

      plateSkuId:
        storage.plateSkuId,

      plateLabel:
        storage.plateLabel,

      profileFrameAsset:
        storage.profileFrameAsset,

      profileFrameSkuId:
        storage.profileFrameSkuId,

      badgeIds:
        storage.badgeIds,

      customBadges:
        storage.customBadges
    };

    storage.presets =
      JSON.stringify(presets);

    storage.activePreset =
      name;

    toast(
      "Saved preset: " + name
    );

    return true;
  }

  function loadPreset(name) {
    var preset =
      getPresets()[name];

    if (!preset)
      return false;

    Object.keys(preset).forEach(
      function (key) {
        storage[key] =
          preset[key];
      }
    );

    storage.activePreset =
      name;

    refresh();

    toast(
      "Loaded preset: " + name
    );

    return true;
  }

  function deletePreset(name) {
    if (name === "Default")
      return false;

    var presets =
      getPresets();

    if (!presets[name])
      return false;

    delete presets[name];

    storage.presets =
      JSON.stringify(presets);

    if (
      storage.activePreset ===
      name
    )
      storage.activePreset =
        "Default";

    return true;
  }

  /*
   * HUD themes.
   */

  function hudThemeStyle() {
    var theme =
      storage.hudTheme;

    var accent =
      storage.hudAccent ||
      "#9cff57";

    var opacity =
      Number(
        storage.hudOpacity
      ) || 0.9;

    var radius =
      Number(
        storage.hudRadius
      ) || 16;

    if (theme === "linux") {
      return {
        backgroundColor:
          "rgba(18,18,18," +
          opacity +
          ")",

        borderColor:
          accent,

        borderWidth: 1,

        borderRadius: 4
      };
    }

    if (theme === "discord") {
      return {
        backgroundColor:
          "rgba(30,31,34," +
          opacity +
          ")",

        borderColor:
          "#4f545c",

        borderWidth: 1,

        borderRadius: 10
      };
    }

    if (theme === "minimal") {
      return {
        backgroundColor:
          "rgba(0,0,0," +
          opacity +
          ")",

        borderWidth: 0,

        borderRadius: 8
      };
    }

    /*
     * Lime glass.
     */
    return {
      backgroundColor:
        "rgba(20,35,20," +
        opacity +
        ")",

      borderColor:
        accent,

      borderWidth: 1,

      borderRadius:
        radius,

      shadowOpacity:
        0.28,

      shadowRadius:
        12
    };
  }

  /*
   * Animated preset HUD.
   */

  function ProfileForgeHUD() {
    var state =
      React.useState(0);

    var tick =
      state[1];

    var frame =
      React.useRef(0);

    React.useEffect(
      function () {
        if (!storage.hudAnimated)
          return;

        var timer =
          setInterval(
            function () {
              frame.current++;
              tick(frame.current);
            },
            50
          );

        return function () {
          clearInterval(timer);
        };
      },
      [storage.hudAnimated]
    );

    if (!storage.hudEnabled)
      return null;

    var presetNames =
      Object.keys(
        getPresets()
      );

    var current =
      presetNames.indexOf(
        storage.activePreset
      );

    if (current < 0)
      current = 0;

    var pulse =
      storage.hudAnimated
        ? 0.94 +
          Math.sin(
            frame.current / 8
          ) *
          0.06
        : 1;

    function switchPreset(
      direction
    ) {
      if (!presetNames.length)
        return;

      var index =
        (
          current +
          direction +
          presetNames.length
        ) %
        presetNames.length;

      loadPreset(
        presetNames[index]
      );

      tick(
        Date.now()
      );
    }

    return React.createElement(
      RN.View,
      {
        pointerEvents:
          "box-none",

        style: {
          position:
            "absolute",

          top: 12,
          left: 12,
          right: 12,

          zIndex: 99999,

          opacity: pulse
        }
      },

      React.createElement(
        RN.View,
        {
          style: Object.assign(
            {
              padding:
                storage.hudCompact
                  ? 7
                  : 11
            },

            hudThemeStyle()
          )
        },

        React.createElement(
          RN.Text,
          {
            style: {
              color: "#fff",

              fontWeight:
                "800",

              fontSize:
                storage.hudCompact
                  ? 12
                  : 14,

              marginBottom: 5
            }
          },
          "ProfileForge"
        ),

        React.createElement(
          RN.View,
          {
            style: {
              flexDirection:
                "row",

              alignItems:
                "center"
            }
          },

          React.createElement(
            RN.TouchableOpacity,
            {
              onPress:
                function () {
                  switchPreset(
                    -1
                  );
                },

              style: {
                padding: 8
              }
            },

            React.createElement(
              RN.Text,
              {
                style: {
                  color:
                    storage.hudAccent,

                  fontSize: 22
                }
              },
              "‹"
            )
          ),

          React.createElement(
            RN.Text,
            {
              numberOfLines: 1,

              style: {
                flex: 1,

                textAlign:
                  "center",

                color:
                  "#fff",

                fontWeight:
                  "700"
              }
            },

            storage.activePreset ||
              "Default"
          ),

          React.createElement(
            RN.TouchableOpacity,
            {
              onPress:
                function () {
                  switchPreset(
                    1
                  );
                },

              style: {
                padding: 8
              }
            },

            React.createElement(
              RN.Text,
              {
                style: {
                  color:
                    storage.hudAccent,

                  fontSize: 22
                }
              },
              "›"
            )
          )
        ),

        storage.typingIndicator
          ? React.createElement(
              RN.Text,
              {
                style: {
                  color:
                    storage.hudAccent,

                  fontSize: 11,

                  marginTop: 3
                }
              },
              storage.typingAnimation
                ? "● ● ●  cosmetic typing"
                : "Typing indicator"
            )
          : null
      )
    );
  }

  /*
   * Settings screen.
   */

  function Settings() {
    return React.createElement(
      RN.ScrollView,
      {
        style: {
          flex: 1
        }
      },

      React.createElement(
        RN.View,
        {
          style: {
            padding: 16
          }
        },

        React.createElement(
          RN.Text,
          {
            style: {
              color: "#fff",
              fontSize: 22,
              fontWeight: "800",
              marginBottom: 8
            }
          },
          "ProfileForge " +
            VERSION
        ),

        React.createElement(
          RN.Text,
          {
            style: {
              color: "#aaa",
              marginBottom: 16
            }
          },
          "Animated cosmetic profile editor."
        ),

        React.createElement(
          RN.Text,
          {
            style: {
              color: "#bbb",
              marginBottom: 8
            }
          },
          "HUD Theme: " +
            storage.hudTheme
        ),

        React.createElement(
          RN.Text,
          {
            style: {
              color: "#bbb",
              marginBottom: 8
            }
          },
          "HUD Animation: " +
            (
              storage.hudAnimated
                ? "ON"
                : "OFF"
            )
        ),

        React.createElement(
          RN.Text,
          {
            style: {
              color: "#bbb",
              marginBottom: 8
            }
          },
          "Active Preset: " +
            (
              storage.activePreset ||
              "Default"
            )
        ),

        React.createElement(
          RN.Text,
          {
            style: {
              color: "#888",
              marginTop: 12,
              lineHeight: 19
            }
          },
          "Presets, profile effects, decorations, frames, nameplates, badges and HUD options are stored locally. Official Discord staff/Partner credentials are not generated."
        )
      )
    );
  }

  function diagnostics() {
    return {
      version: VERSION,
      patches:
        unpatches.length,

      userStore:
        !!UserStore,

      profileStore:
        !!UserProfileStore,

      currentUser:
        !!myId,

      presets:
        Object.keys(
          getPresets()
        ).length,

      errors:
        errors.slice()
    };
  }

  module.exports = {
    onLoad:
      function () {
        install();
      },

    onUnload:
      function () {
        uninstall();
      },

    settings:
      Settings,

    getSettings:
      function () {
        return storage;
      },

    HUD:
      ProfileForgeHUD,

    savePreset:
      savePreset,

    loadPreset:
      loadPreset,

    deletePreset:
      deletePreset,

    getPresets:
      getPresets,

    diagnostics:
      diagnostics
  };
})();
