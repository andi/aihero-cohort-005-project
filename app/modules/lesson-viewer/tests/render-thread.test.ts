import { describe, it, expect } from "vitest";
import { markdown } from "~/lib/text";
import { renderThread, type ThreadComment } from "../comments.server";

function threadComment(
  id: number,
  body: string,
  overrides: Partial<ThreadComment> = {}
): ThreadComment {
  return {
    id,
    body: markdown(body),
    createdAt: "2026-11-01T00:00:00.000Z",
    editedAt: null,
    deleted: false,
    author: {
      id: 1,
      name: "Ada",
      avatarUrl: null,
      isInstructor: false,
      isPlatformAdmin: false,
    },
    replies: [],
    ...overrides,
  };
}

describe("renderThread", () => {
  it("renders each body to HTML and keeps the raw markdown", async () => {
    const [comment] = await renderThread([threadComment(1, "**bold**")]);

    expect(comment.bodyHtml).toContain("<strong>bold</strong>");
    expect(comment.body).toBe("**bold**");
  });

  it("strips raw HTML from untrusted comments", async () => {
    const [comment] = await renderThread([
      threadComment(1, "hi <script>alert(1)</script>"),
    ]);

    expect(comment.bodyHtml).not.toContain("<script");
  });

  it("renders replies under their parent", async () => {
    const [comment] = await renderThread([
      threadComment(1, "question", {
        replies: [threadComment(2, "_answer_")],
      }),
    ]);

    expect(comment.replies).toHaveLength(1);
    expect(comment.replies[0].bodyHtml).toContain("<em>answer</em>");
  });

  it("renders nothing for a deleted comment", async () => {
    const [comment] = await renderThread([
      threadComment(1, "gone", { deleted: true }),
    ]);

    expect(comment.bodyHtml).toBe("");
  });
});
