import { useState } from "react";
import { useFetcher } from "react-router";
import type { LessonLoaderData } from "~/routes/courses.$slug.lessons.$lessonId";
import { describeNoteDraft, type NoteDraft } from "~/modules/lesson-notes";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { Lock, NotebookPen } from "lucide-react";
import { cn, formatRelativeTime } from "~/lib/utils";

type SavedNote = LessonLoaderData["note"];

// Same header, padding and footer as the Questions & Discussion card, so the
// two read as one design.
export function LessonNote({ note }: { note: SavedNote }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [body, setBody] = useState(note?.body ?? "");
  const isSaving = fetcher.state !== "idle";
  const draft = describeNoteDraft(body, note?.body ?? null);

  return (
    <Card className="mb-8">
      <CardContent>
        <NoteHeader />
        <fetcher.Form method="post" className="space-y-2">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Jot down what you want to remember from this lesson..."
            aria-label="Your notes"
            className="min-h-32 resize-y"
          />
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !draft.canSave}
            >
              {isSaving ? "Saving..." : "Save note"}
            </Button>
            <NoteStatus error={fetcher.data?.error} draft={draft} note={note} />
            <NoteCounter draft={draft} />
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function NoteHeader() {
  return (
    <div className="mb-4 flex items-center gap-2">
      <NotebookPen className="size-5 text-primary" />
      <h2 className="text-xl font-semibold">Your notes</h2>
      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Private to you
      </span>
    </div>
  );
}

function NoteStatus({
  error,
  draft,
  note,
}: {
  error: string | undefined;
  draft: NoteDraft;
  note: SavedNote;
}) {
  if (error) return <span className="text-sm text-destructive">{error}</span>;
  if (draft.dirty && draft.empty) {
    return (
      <span className="text-xs text-muted-foreground">
        Write something before saving your note.
      </span>
    );
  }
  if (draft.dirty) {
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    );
  }
  if (!note) return null;
  return (
    <span suppressHydrationWarning className="text-xs text-muted-foreground">
      Last edited {formatRelativeTime(note.updatedAt)}
    </span>
  );
}

function NoteCounter({ draft }: { draft: NoteDraft }) {
  return (
    <span
      className={cn(
        "ml-auto text-xs",
        draft.tooLong ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {draft.length} / {draft.maxLength}
    </span>
  );
}
