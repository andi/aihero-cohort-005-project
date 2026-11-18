export type NoteDraft = {
  /** Counted as the server counts it: without surrounding whitespace. */
  length: number;
  maxLength: number;
  tooLong: boolean;
  /** Nothing but whitespace: the server would reject it. */
  empty: boolean;
  /** Differs from the saved note, so leaving the page would lose it. */
  dirty: boolean;
  canSave: boolean;
};

export function describeDraft(
  draft: string,
  savedBody: string,
  maxLength: number
): NoteDraft {
  const trimmed = draft.trim();
  const tooLong = trimmed.length > maxLength;
  const empty = trimmed.length === 0;
  const dirty = trimmed !== savedBody.trim();

  return {
    length: trimmed.length,
    maxLength,
    tooLong,
    empty,
    dirty,
    canSave: dirty && !empty && !tooLong,
  };
}
