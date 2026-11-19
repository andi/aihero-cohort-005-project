import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { describeDraft, type NoteDraft } from "./lib/draft";

export type { NoteDraft };

/**
 * What the note editor should show for what the Student has typed, against
 * the note that is saved. Mirrors the server's rules (trimmed, 1 to
 * MAX_NOTE_LENGTH characters) so the Save button is only live when a save
 * would succeed and change something.
 */
export function describeNoteDraft(
  draft: string,
  savedBody: string | null
): NoteDraft {
  return describeDraft(draft, savedBody ?? "", MAX_NOTE_LENGTH);
}
