"use client";

import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/client";
import { getPositionOnce } from "@/lib/geo";
import { checked, checkGround, readBook, receiptName, type Book, type FindRef } from "@/lib/hunt-checks";
import type { HuntFind } from "@/lib/hunts";

type State = { uid: string; book: Book | null; error: string; add: (key: string, photo: boolean) => void };
const Progress = createContext<State | null>(null);
export function HuntBookProvider({ children }: { children: ReactNode }) {
  const { user } = useAccount();
  return user ? <Player key={user.id} uid={user.id}>{children}</Player> : <>{children}</>;
}
function Player({ children, uid }: { children: ReactNode; uid: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    const db = createClient();
    if (db) readBook(db, uid).then(b => { if (live) setBook(b); }).catch(() => {
      if (live) setError("Your scrapbook could not be loaded.");
    });
    return () => { live = false; };
  }, [uid, retry]);
  function add(key: string, photo: boolean) {
    setBook(old => old && ({ ...old, objects: new Map(old.objects).set(key, photo) }));
  }
  return <Progress.Provider value={{ uid, book, error, add }}>
    {error && <p role="alert">{error} <button type="button" onClick={() => { setError(""); setRetry(i => i+1); }}>Try again</button></p>}
    {children}
  </Progress.Provider>;
}

export function ProgressLine({ hunt, finds }: { hunt: string; finds: FindRef[] }) {
  const player = useContext(Progress);
  if (!player || player.error) return null;
  if (!player.book) return <p className="small" role="status">Loading your progress…</p>;
  const tied = finds.filter(f => f.entrySlug);
  const done = tied.filter(f => checked(player.book!, hunt, f)).length;
  return <p className="hunt-progress" aria-live="polite">
    <strong>{tied.length > 0 && done === tied.length ? "Badge earned" : "Badge progress"}</strong>
    {" · "}{done} of {tied.length} checked
  </p>;
}

function PhotoLink({ uid, name }: { uid: string; name: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  return <span>{url ? <a href={url} target="_blank" rel="noreferrer">View my photo</a> :
    <button type="button" onClick={async () => {
      const result = await createClient()?.storage.from("scrapbook").createSignedUrl(uid + "/hunt-checks/" + name, 300);
      if (result?.data) setUrl(result.data.signedUrl); else setError("Could not open your photo.");
    }}>Open scrapbook photo</button>} {error}</span>;
}
function Check({ hunt, find }: { hunt: string; find: HuntFind }) {
  const player = useContext(Progress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!player?.book || !find.entrySlug) return null;
  const { uid, book, add } = player;
  const name = receiptName(hunt, find);
  if (checked(book!, hunt, find)) return <p role="status"><strong>✓ Checked</strong>{" "}
    {book!.objects.get(name) && <PhotoLink uid={uid} name={name} />}</p>;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const file = new FormData(event.currentTarget).get("photo");
    const db = createClient();
    if (!db) return;
    setBusy(true); setError("");
    try {
      const point = await getPositionOnce({ enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
      if (!point) throw new Error("Allow location and try again from this find. Your check has not been saved.");
      const photo = file instanceof File && file.size ? file : null;
      add(name, await checkGround(db, uid, hunt, find, point, photo));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your check. Try again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}>
    <label>Scrapbook photo (optional) <input name="photo" type="file" accept="image/*" disabled={busy} /></label>
    <button className="btn" disabled={busy}>{busy ? "Checking…" : "I’m here · check with location"}</button>
    {error && <p role="alert" className="form-error">{error}</p>}
  </form>;
}

export function HuntFindList({ hunt, finds }: { hunt: string; finds: HuntFind[] }) {
  return <ol className="hunt-finds">{finds.map(f => <li className="panel" key={f.id} id={f.id}>
    <h2>{f.ground}</h2><p className="small">{f.place}</p>
    {f.entrySlug ? <>
      <p>{f.task}</p>
      <p><Link href={"/sites/" + f.entrySlug}>Read the catalog entry</Link></p>
      <details><summary>Hint</summary><p>{f.hint}</p></details>
      <Check hunt={hunt} find={f} />
    </> : <p className="hunt-pending">catalog entry in preparation</p>}
  </li>)}</ol>;
}

export function ScrapbookBadges({ hunts }: { hunts: { slug: string; name: string; badge: string; finds: FindRef[] }[] }) {
  const player = useContext(Progress);
  if (!player?.book) return null;
  return <section className="panel"><h2>Hunt badges</h2>{hunts.map(h => <div key={h.slug}>
    <Link href={"/hunts/" + h.slug}>{h.badge}</Link>
    <ProgressLine hunt={h.slug} finds={h.finds} />
    {h.finds.filter(f => player.book!.objects.get(receiptName(h.slug, f))).map(f =>
      <p key={f.id}><Link href={"/hunts/" + h.slug + "#" + f.id}>{f.id.replace(/-/g, " ")}</Link>{" · "}
        <PhotoLink uid={player.uid} name={receiptName(h.slug, f)} /></p>)}
  </div>)}</section>;
}
