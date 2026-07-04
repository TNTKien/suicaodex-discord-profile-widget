import { describe, expect, test } from "bun:test";
import { shouldStopAfterWidgetUpdate } from "../src/update-policy";

describe("shouldStopAfterWidgetUpdate", () => {
  test("stops one-shot sources after a successful widget update", () => {
    expect(shouldStopAfterWidgetUpdate(true, true)).toBe(true);
  });

  test("keeps one-shot sources running when Discord rate limits the update", () => {
    expect(shouldStopAfterWidgetUpdate(true, false)).toBe(false);
  });

  test("keeps repeating sources running after successful updates", () => {
    expect(shouldStopAfterWidgetUpdate(false, true)).toBe(false);
  });
});
