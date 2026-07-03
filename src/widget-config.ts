type JsonObject = Record<string, unknown>;

interface BindResult<T> {
  config: T;
  changed: number;
}

interface TextBinding {
  name: string;
  presentationType: "number" | "text";
}

const TEXT_PLACEHOLDERS = new Map<string, TextBinding>([
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

export function bindDefaultWidgetPlaceholders<T>(config: T): BindResult<T> {
  const cloned = structuredClone(config);
  const changed = bindNode(cloned);
  return { config: cloned, changed };
}

function bindNode(node: unknown): number {
  if (!node || typeof node !== "object") {
    return 0;
  }

  let changed = 0;
  if (Array.isArray(node)) {
    for (const item of node) {
      changed += bindNode(item);
    }
    return changed;
  }

  const object = node as JsonObject;
  if (isField(object)) {
    changed += bindField(object);
  }

  for (const [key, value] of Object.entries(object)) {
    if (key === "fallback") {
      continue;
    }
    changed += bindNode(value);
  }
  return changed;
}

function isField(object: JsonObject): boolean {
  return (
    typeof object.value_type === "string" &&
    typeof object.presentation_type === "string" &&
    "value" in object
  );
}

function bindField(field: JsonObject): number {
  const value = typeof field.value === "string" ? field.value.trim() : "";
  const binding = TEXT_PLACEHOLDERS.get(value.toLowerCase());
  if (binding && field.value_type !== "data") {
    field.fallback = {
      value_type: field.value_type,
      presentation_type: field.presentation_type,
      value: field.value,
    };
    field.value_type = "data";
    field.presentation_type = binding.presentationType;
    field.value = binding.name;
    return 1;
  }

  if (field.presentation_type === "image" && field.value_type !== "data") {
    field.fallback = {
      value_type: field.value_type,
      presentation_type: field.presentation_type,
      value: field.value,
    };
    field.value_type = "data";
    field.presentation_type = "image";
    field.value = "image";
    return 1;
  }

  return 0;
}
