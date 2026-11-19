# Render comment markdown on the server, and send the browser HTML

A comment's body is untrusted markdown written by any signed-in learner. The server turns it into HTML with `renderComment` (`app/lib/comment-markdown.server.ts`), which escapes raw HTML, drops images, allows only safe link protocols and highlights code, and sends that HTML to the browser next to the raw markdown. The browser never renders markdown itself. It shows the HTML, and uses the raw markdown only to fill the edit box. Sanitising in one server-only place means there is one renderer to keep safe, and the syntax highlighter stays out of the client bundle.

## Considered Options

- **Render markdown in the browser**: rejected. Every client renderer would have to be as strict as the server's, and the highlighter would ship to every lesson page.

## Consequences

Each comment travels as both `body` (markdown) and `bodyHtml` (`RenderedComment` in `app/modules/lesson-viewer/rendered-comment.ts`). Editing a comment means rendering it again on the server.
