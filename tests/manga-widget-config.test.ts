import { describe, expect, test } from "bun:test";

describe("manga_widget_config.json", () => {
  test("does not show the status and year line in the top hero", async () => {
    const config = await Bun.file("manga_widget_config.json").json();
    const components = config.surfaces.widget_top.components;

    expect(components.subtitle_2.fields.text.value).toBe("manga_description");
    expect(components.subtitle_3).toBeUndefined();
  });

  test("binds mini profile hero image and stat to manga fields", async () => {
    const config = await Bun.file("manga_widget_config.json").json();
    const miniProfile = config.surfaces.mini_profile;

    expect(miniProfile.layout).toBe("mini_profile_hero_stat");
    expect(miniProfile.components.hero_image.fields.image).toEqual({
      value_type: "data",
      presentation_type: "image",
      value: "hero_manga_cover",
      fallback: {
        value_type: "application_asset",
        presentation_type: "image",
        value: "ezgif-119b2199990a265b",
      },
    });
    expect(miniProfile.components.stat.fields.value).toBeUndefined();
    expect(miniProfile.components.stat.fields.text).toMatchObject({
      value_type: "data",
      presentation_type: "text",
      value: "manga_title",
      fallback: {
        value_type: "custom_string",
        presentation_type: "text",
      },
    });
  });
});
