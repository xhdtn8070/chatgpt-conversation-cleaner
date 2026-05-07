import { clearSelection, removeSelected, selectAll, toggleSelection } from "../src/content/selection";

describe("selection state", () => {
  it("toggles ids without mutating the original set", () => {
    const selected = new Set(["a"]);
    const next = toggleSelection(selected, "b");

    expect(Array.from(selected)).toEqual(["a"]);
    expect(Array.from(next).sort()).toEqual(["a", "b"]);
    expect(Array.from(toggleSelection(next, "a")).sort()).toEqual(["b"]);
  });

  it("supports forced select and deselect", () => {
    const selected = new Set(["a"]);

    expect(toggleSelection(selected, "a", true).has("a")).toBe(true);
    expect(toggleSelection(selected, "a", false).has("a")).toBe(false);
  });

  it("selects all and clears", () => {
    expect(Array.from(selectAll(["a", "b"]))).toEqual(["a", "b"]);
    expect(clearSelection().size).toBe(0);
  });

  it("removes successful delete ids", () => {
    const selected = new Set(["a", "b", "c"]);

    expect(Array.from(removeSelected(selected, ["a", "c"]))).toEqual(["b"]);
  });
});
