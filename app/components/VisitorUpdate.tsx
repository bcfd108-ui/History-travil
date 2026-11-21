"use client";

import { useState, type FormEvent } from "react";
import { useAccount } from "@/lib/account";
import { submitVisitorUpdate } from "@/lib/saving";
import { createClient } from "@/lib/supabase/client";
import { SavingGate } from "./SavingGate";

type Props = { slug: string; prompt: string; photoSubject?: string };

export default function VisitorUpdate({ slug, prompt, photoSubject }: Props) {
  return (
    <section className="panel" aria-label="Visitor access update">
      <h2>Visited recently?</h2>
      <p>{prompt} A dated note helps the next visitor.</p>
      {photoSubject && <p>Optional photo subject: {photoSubject}. Share your own photo only where photography is permitted.</p>}
      <SavingGate feature="Visitor updates">
        <UpdateForm slug={slug} photoSubject={photoSubject} />
      </SavingGate>
    </section>
  );
}

function UpdateForm({ slug, photoSubject }: Omit<Props, "prompt">) {
  const { user } = useAccount();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const db = createClient();
    if (!db || !user) return;
    const data = new FormData(form);
    const date = String(data.get("observed") || "");
    const note = String(data.get("note") || "").trim();
    const file = data.get("photo");
    const photo = photoSubject && file instanceof File && file.size > 0 ? file : null;
    setMessage("");
    setError("");
    if (!date || (!note && !photo)) {
      setError("Include the visit date and either a note or a photo.");
      return;
    }
    const body = ["Visited " + date, note].filter(Boolean).join("\n");
    setBusy(true);
    try {
      const report = photo
        ? [body, "Photo subject: " + photoSubject, "For editorial review only. Public reuse permission and credit are unconfirmed."].join("\n")
        : body;
      const issue = await submitVisitorUpdate(db, user.id, slug, report, photo);
      if (issue) { setError(issue); return; }
      form.reset();
      setMessage("Received for review. Thank you for recording what you saw.");
    } catch {
      setError("We could not confirm receipt. Your entry is still here.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={send}>
      <label>Date you visited <input type="date" name="observed" required /></label>
      <label>What did you see? <textarea name="note" rows={3} required={!photoSubject} /></label>
      {photoSubject && (
        <label>Your current photo (optional) <input type="file" accept="image/*" name="photo" /></label>
      )}
      <p className="small">An editor reviews submissions. Photos stay private during review. We confirm permission and credit before public use.</p>
      <button className="btn" disabled={busy} type="submit">{busy ? "Sending…" : "Send visitor update"}</button>
      {message && <p role="status" className="form-ok">{message}</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
    </form>
  );
}
