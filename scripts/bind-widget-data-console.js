/*
 * Paste this in the Discord Developer Portal console while opened on
 * https://discord.com/developers/applications
 *
 * It converts the default placeholder widget fields:
 *   "some title here", "text 1 here", "label 1 here", ...
 * into User Data bindings:
 *   title, year, public, stats_chapters_count, ...
 *
 * It also converts non-data image fields to the "image" data field.
 */
(async () => {
  const appId = prompt("Discord application ID?");
  if (!appId) throw new Error("No application ID provided.");

  const webpackChunk = window.webpackChunkdiscord_app || window.webpackChunkdiscordapp;
  if (!webpackChunk) throw new Error("Discord webpack chunk not found. Run this in Discord.");

  let req;
  webpackChunk.push([
    [Math.random()],
    {},
    (r) => {
      req = r;
    },
  ]);

  const api =
    Object.values(req.c)
      .map((module) => module?.exports)
      .find((exports) => exports?.tn?.get && exports?.tn?.patch)?.tn ||
    Object.values(req.c)
      .map((module) => module?.exports)
      .find((exports) => exports?.Z?.get && exports?.Z?.patch)?.Z;

  if (!api) throw new Error("Could not find Discord API client.");

  const configs = (await api.get({ url: `/applications/${appId}/widget-configs` })).body;
  if (!Array.isArray(configs) || configs.length === 0) {
    throw new Error("No widget config found for this application.");
  }

  const config = configs[0];
  const configId = config.config_id || config.id;
  if (!configId) throw new Error("Widget config is missing config_id.");

  const textMap = new Map([
    ["some title here", { name: "title", presentationType: "text" }],
    ["text 1 here", { name: "year", presentationType: "text" }],
    ["text 2 here", { name: "status_text", presentationType: "text" }],
    ["text 3 here", { name: "last_updated_value", presentationType: "text" }],
    ["text 4 here", { name: "stats_chapters_count", presentationType: "number" }],
    ["text 5 here", { name: "stats_follows_count", presentationType: "number" }],
    ["text 6 here", { name: "stats_views_count", presentationType: "number" }],
    ["label 1 here", { name: "public", presentationType: "text" }],
    ["label 2 here", { name: "status_label", presentationType: "text" }],
    ["label 3 here", { name: "last_updated", presentationType: "text" }],
    ["label 4 here", { name: "stats_chapters", presentationType: "text" }],
    ["label 5 here", { name: "stats_follows", presentationType: "text" }],
    ["label 6 here", { name: "stats_views", presentationType: "text" }],
  ]);

  let changed = 0;
  const bindNode = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(bindNode);
      return;
    }

    if (
      typeof node.value_type === "string" &&
      typeof node.presentation_type === "string" &&
      Object.prototype.hasOwnProperty.call(node, "value")
    ) {
      const raw = typeof node.value === "string" ? node.value.trim().toLowerCase() : "";
      const binding = textMap.get(raw);
      if (binding && node.value_type !== "data") {
        node.fallback = {
          value_type: node.value_type,
          presentation_type: node.presentation_type,
          value: node.value,
        };
        node.value_type = "data";
        node.presentation_type = binding.presentationType;
        node.value = binding.name;
        changed++;
      } else if (node.presentation_type === "image" && node.value_type !== "data") {
        node.fallback = {
          value_type: node.value_type,
          presentation_type: node.presentation_type,
          value: node.value,
        };
        node.value_type = "data";
        node.presentation_type = "image";
        node.value = "image";
        changed++;
      }
    }

    Object.values(node).forEach(bindNode);
  };

  bindNode(config.surfaces);
  if (changed === 0) {
    console.warn("[Manga Widget] No placeholder fields were changed. Check the widget editor manually.");
  } else {
    await api.patch({
      url: `/applications/${appId}/widget-configs/${configId}`,
      body: {
        display_name: config.display_name || "SuicaoDex",
        surfaces: config.surfaces,
      },
    });
    await api.post({ url: `/applications/${appId}/widget-configs/${configId}/publish` });
    console.log(`[Manga Widget] Bound and published ${changed} widget field(s).`);
  }
})();
