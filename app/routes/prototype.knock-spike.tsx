// PROTOTYPE — throwaway. Answers "Does Knock hold up against Cadence?" (issue #34).
// Four panels, one per check. Every browser-side call uses ONLY the public key +
// the signed user token, so a pass here proves enhanced security works per DevUI user.
// Lives on branch prototype/knock-spike; never merge.
import { useEffect, useState } from "react";
import { Form, data } from "react-router";
import { Knock, signUserToken } from "@knocklabs/node";
import { eq, ne } from "drizzle-orm";
import type { Route } from "./+types/prototype.knock-spike";
import { getCurrentUserId } from "~/lib/session";
import { db } from "~/db";
import { users } from "~/db/schema";

const knock = new Knock({ apiKey: process.env.KNOCK_API_KEY });

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) throw data("Select a user from the DevUI panel.", { status: 401 });
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw data("User not found.", { status: 404 });
  const otherUser = db.select().from(users).where(ne(users.id, userId)).get();

  // Identify on every load (the real build would do this on signup / role change).
  await knock.users.update(String(user.id), { name: user.name, email: user.email });

  const userToken = await signUserToken(String(user.id), {
    signingKey: process.env.KNOCK_SIGNING_KEY,
    expiresInSeconds: 60 * 60,
  });

  return {
    user: { id: user.id, name: user.name, role: user.role },
    otherUserId: otherUser ? String(otherUser.id) : null,
    userToken,
    publicKey: process.env.KNOCK_PUBLIC_API_KEY!,
    feedChannelId: process.env.KNOCK_FEED_CHANNEL_ID!,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) throw data("Select a user from the DevUI panel.", { status: 401 });
  const form = await request.formData();
  const workflow = String(form.get("workflow"));
  const actor = db.select().from(users).where(ne(users.id, userId)).get()!;
  await knock.users.update(String(actor.id), { name: actor.name, email: actor.email });

  const payload =
    workflow === "discussion-reply"
      ? { courseTitle: "Spike Course", questionTitle: "How do loaders work?", replyExcerpt: "They run on the server before render." }
      : { courseTitle: "Spike Course", studentName: actor.name };

  try {
    const res = await knock.workflows.trigger(workflow, {
      recipients: [String(userId)],
      actor: String(actor.id),
      data: payload,
    });
    return { ok: true, workflow, result: res };
  } catch (e) {
    return { ok: false, workflow, result: String(e) };
  }
}

type Log = { label: string; status: number | string; body: unknown };

export default function KnockSpike({ loaderData, actionData }: Route.ComponentProps) {
  const { user, otherUserId, userToken, publicKey, feedChannelId } = loaderData;
  const [feed, setFeed] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>(null);
  const [log, setLog] = useState<Log[]>([]);

  async function call(label: string, path: string, init: RequestInit = {}, asUser = String(user.id)) {
    const res = await fetch(`https://api.knock.app/v1${path.replace(":user", asUser)}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${publicKey}`,
        "X-Knock-User-Token": userToken,
        "Content-Type": "application/json",
      },
    });
    const body = await res.json().catch(() => null);
    setLog((l) => [{ label, status: res.status, body }, ...l].slice(0, 12));
    return { status: res.status, body };
  }

  const loadFeed = async () => {
    const r = await call("GET feed", `/users/:user/feeds/${feedChannelId}`);
    if (r.status === 200) setFeed(r.body);
  };
  const loadPrefs = async () => {
    const r = await call("GET preferences", `/users/:user/preferences/default`);
    if (r.status === 200) setPrefs(r.body);
  };

  useEffect(() => {
    setFeed(null);
    setPrefs(null);
    setLog([]);
    loadFeed();
    loadPrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Knock delivers async: refetch the feed shortly after each trigger.
  useEffect(() => {
    if (!actionData) return;
    const t = setTimeout(loadFeed, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionData]);

  const markAll = async (status: "seen" | "read") => {
    const ids = (feed?.entries ?? []).map((e: any) => e.id);
    if (!ids.length) return;
    await call(`mark ${status}`, `/messages/batch/${status}`, {
      method: "POST",
      body: JSON.stringify({ message_ids: ids }),
    });
    loadFeed();
  };
  const markOne = async (id: string, status: "read" | "unread") => {
    await call(`mark ${id} ${status}`, `/messages/${id}/${status}`, {
      method: status === "unread" ? "DELETE" : "PUT",
    });
    loadFeed();
  };
  const setEnrollment = async (on: boolean) => {
    await call(`enrollment → ${on}`, `/users/:user/preferences/default`, {
      method: "PUT",
      body: JSON.stringify({ ...(prefs ?? {}), categories: { ...(prefs?.categories ?? {}), enrollment: on } }),
    });
    loadPrefs();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-sm">
      <div className="rounded border-2 border-dashed border-amber-500 bg-amber-50 p-3 text-gray-900">
        <strong>PROTOTYPE: Knock spike</strong>. Signed in as <b>{user.name}</b> (id {user.id}, {user.role}).
        Switch users in the DevUI panel and the feed must switch too.
      </div>

      <section className="space-y-2 rounded border p-4">
        <h2 className="font-bold">1. Signed user tokens</h2>
        <p className="break-all font-mono text-xs">token: {userToken.slice(0, 60)}…</p>
        <div className="flex gap-2">
          <button className="rounded border px-2 py-1" onClick={loadFeed}>Fetch MY feed (expect 200)</button>
          {otherUserId && (
            <button
              className="rounded border px-2 py-1"
              onClick={() => call(`GET feed of user ${otherUserId} with my token`, `/users/:user/feeds/${feedChannelId}`, {}, otherUserId)}
            >
              Fetch user {otherUserId}'s feed with MY token (expect 401/403)
            </button>
          )}
        </div>
      </section>

      <section className="space-y-2 rounded border p-4">
        <h2 className="font-bold">2. Trigger a catalogue Notification (Node SDK)</h2>
        <div className="flex gap-2">
          {["discussion-reply", "new-enrollment"].map((w) => (
            <Form method="post" key={w}>
              <input type="hidden" name="workflow" value={w} />
              <button className="rounded border px-2 py-1">Trigger {w} → me</button>
            </Form>
          ))}
        </div>
        {actionData && <pre className="overflow-auto bg-gray-100 p-2 text-xs text-gray-900">{JSON.stringify(actionData, null, 2)}</pre>}
      </section>

      <section className="space-y-2 rounded border p-4">
        <h2 className="font-bold">3. Headless feed API</h2>
        <p>
          unread_count: <b>{feed?.meta?.unread_count ?? "?"}</b> · unseen_count: <b>{feed?.meta?.unseen_count ?? "?"}</b> ·
          total: <b>{feed?.meta?.total_count ?? "?"}</b>
        </p>
        <div className="flex gap-2">
          <button className="rounded border px-2 py-1" onClick={loadFeed}>Refresh</button>
          <button className="rounded border px-2 py-1" onClick={() => markAll("seen")}>Mark all seen</button>
          <button className="rounded border px-2 py-1" onClick={() => markAll("read")}>Mark all read</button>
        </div>
        <ul className="divide-y">
          {(feed?.entries ?? []).map((e: any) => (
            <li key={e.id} className="flex items-center justify-between py-1">
              <span>
                {e.read_at ? "○" : "●"} <b>{e.source?.key}</b> · {JSON.stringify(e.data)} · seen:{e.seen_at ? "y" : "n"}
              </span>
              <button className="rounded border px-1" onClick={() => markOne(e.id, e.read_at ? "unread" : "read")}>
                {e.read_at ? "unread" : "read"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded border p-4">
        <h2 className="font-bold">4. Preferences (enrollment off by default, opt-in)</h2>
        <pre className="overflow-auto bg-gray-100 p-2 text-xs text-gray-900">{JSON.stringify(prefs, null, 2)}</pre>
        <div className="flex gap-2">
          <button className="rounded border px-2 py-1" onClick={() => setEnrollment(true)}>Opt in to enrollment</button>
          <button className="rounded border px-2 py-1" onClick={() => setEnrollment(false)}>Opt out of enrollment</button>
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="font-bold">Raw call log (newest first)</h2>
        {log.map((l, i) => (
          <details key={i}>
            <summary className={String(l.status).startsWith("2") ? "text-green-700" : "text-red-700"}>
              {l.status} {l.label}
            </summary>
            <pre className="overflow-auto bg-gray-100 p-2 text-xs text-gray-900">{JSON.stringify(l.body, null, 2)}</pre>
          </details>
        ))}
      </section>
    </div>
  );
}
