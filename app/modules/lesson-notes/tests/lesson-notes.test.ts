import { describe, expect, it } from "vitest";
import { describeNoteDraft } from "~/modules/lesson-notes";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("describeNoteDraft", () => {
  it("cannot save an empty first note", () => {
    const draft = describeNoteDraft("", null);
    expect(draft).toEqual({
      length: 0,
      maxLength: MAX_NOTE_LENGTH,
      tooLong: false,
      empty: true,
      dirty: false,
      canSave: false,
    });
  });

  it("treats whitespace as empty", () => {
    const draft = describeNoteDraft("   \n ", null);
    expect(draft.empty).toBe(true);
    expect(draft.canSave).toBe(false);
  });

  it("can save a new note", () => {
    const draft = describeNoteDraft("Result types beat throwing", null);
    expect(draft).toMatchObject({
      length: 26,
      empty: false,
      dirty: true,
      canSave: true,
    });
  });

  it("cannot save a note that matches the saved one", () => {
    const draft = describeNoteDraft("same", "same");
    expect(draft.dirty).toBe(false);
    expect(draft.canSave).toBe(false);
  });

  it("ignores surrounding whitespace when comparing with the saved note", () => {
    expect(describeNoteDraft("  same\n", "same").dirty).toBe(false);
  });

  it("ignores surrounding whitespace on the saved note too", () => {
    expect(describeNoteDraft("same", " same\n").dirty).toBe(false);
  });

  it("can save an edit to the saved note", () => {
    const draft = describeNoteDraft("same, edited", "same");
    expect(draft.dirty).toBe(true);
    expect(draft.canSave).toBe(true);
  });

  it("allows a note of exactly the maximum length", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH), null);
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });

  it("refuses a note one character over the maximum", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1), null);
    expect(draft.tooLong).toBe(true);
    expect(draft.canSave).toBe(false);
  });

  it("does not count surrounding whitespace against the maximum", () => {
    const draft = describeNoteDraft(` ${"a".repeat(MAX_NOTE_LENGTH)} `, null);
    expect(draft.length).toBe(MAX_NOTE_LENGTH);
    expect(draft.tooLong).toBe(false);
  });
});
