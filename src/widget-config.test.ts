import { describe, expect, test } from "bun:test";
import { bindDefaultWidgetPlaceholders } from "./widget-config";

describe("bindDefaultWidgetPlaceholders", () => {
  test("converts default placeholder strings to dynamic data fields", () => {
    const widgetConfig = {
      surfaces: {
        widget_top: {
          components: {
            title: {
              fields: {
                text: {
                  value_type: "custom_string",
                  presentation_type: "text",
                  value: "some title here",
                },
              },
            },
            hero_image: {
              fields: {
                image: {
                  value_type: "application_asset",
                  presentation_type: "image",
                  value: "default-cover",
                },
              },
            },
          },
        },
        widget_bottom: {
          components: {
            stat_1: {
              fields: {
                value: {
                  value_type: "custom_string",
                  presentation_type: "text",
                  value: "text 1 here",
                },
                label: {
                  value_type: "custom_string",
                  presentation_type: "text",
                  value: "label 1 here",
                },
              },
            },
          },
        },
      },
    };

    const result = bindDefaultWidgetPlaceholders(widgetConfig) as {
      changed: number;
      config: any;
    };

    expect(result.changed).toBe(4);
    expect(result.config.surfaces.widget_top.components.title.fields.text).toEqual({
      value_type: "data",
      presentation_type: "text",
      value: "title",
      fallback: {
        value_type: "custom_string",
        presentation_type: "text",
        value: "some title here",
      },
    });
    expect(result.config.surfaces.widget_top.components.hero_image.fields.image).toEqual({
      value_type: "data",
      presentation_type: "image",
      value: "image",
      fallback: {
        value_type: "application_asset",
        presentation_type: "image",
        value: "default-cover",
      },
    });
    expect(result.config.surfaces.widget_bottom.components.stat_1.fields.value.value).toBe(
      "year",
    );
    expect(result.config.surfaces.widget_bottom.components.stat_1.fields.label.value).toBe(
      "public",
    );
  });

  test("binds default stat placeholders to stats grid fields", () => {
    const widgetConfig = {
      surfaces: {
        widget_bottom: {
          components: {
            stat_4: {
              fields: {
                value: {
                  value_type: "custom_string",
                  presentation_type: "text",
                  value: "text 4 here",
                },
                label: {
                  value_type: "custom_string",
                  presentation_type: "text",
                  value: "label 4 here",
                },
              },
            },
          },
        },
      },
    };

    const result = bindDefaultWidgetPlaceholders(widgetConfig) as {
      changed: number;
      config: any;
    };

    expect(result.changed).toBe(2);
    expect(result.config.surfaces.widget_bottom.components.stat_4.fields.value).toMatchObject({
      value_type: "data",
      presentation_type: "number",
      value: "stats_chapters_count",
    });
    expect(result.config.surfaces.widget_bottom.components.stat_4.fields.label).toMatchObject({
      value_type: "data",
      presentation_type: "text",
      value: "stats_chapters",
    });
  });
});
