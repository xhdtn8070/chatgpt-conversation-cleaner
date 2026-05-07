import { computeActionBarWidth, computeCheckboxLayout } from "../src/content/positioning";
import { rect } from "./test-utils";

describe("overlay positioning", () => {
  it("places a 32px click target centered on the row", () => {
    const layout = computeCheckboxLayout(rect(16, 100, 280, 44), rect(0, 0, 320, 800));

    expect(layout).toEqual({
      left: 2,
      top: 106,
      size: 32,
      visibleSize: 16
    });
  });

  it("keeps action bar width within usable sidebar bounds", () => {
    expect(computeActionBarWidth(rect(0, 0, 320, 800))).toBe(304);
    expect(computeActionBarWidth(rect(0, 0, 800, 800))).toBe(420);
    expect(computeActionBarWidth(rect(0, 0, 180, 800))).toBe(260);
  });
});
