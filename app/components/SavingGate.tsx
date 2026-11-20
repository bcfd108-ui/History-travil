"use client";
// The three honest states every saving feature passes through:
//
//  1. NOT CONNECTED — Supabase keys are absent from the environment. The
//     feature is dormant and says so in plain words. Nothing is persisted
//     anywhere, and no input is silently swallowed: forms are not rendered
//     at all in this state, only the notice.
//  2. SIGNED OUT — saving is connected; the visitor needs the free account
//     (an email link) before the feature opens. Reading never waits on this.
//  3. SIGNED IN — the feature itself renders (the children).
//
// SavingGate renders states 1 and 2 and delegates state 3 to its children.
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useAccount } from "@/lib/account";

export function SavingGate({
  children,
  feature,
}: {
  children: ReactNode;
  /** Short name of the feature, e.g. "Saving to a plan". */
  feature: string;
}) {
  const { configured, user, loading, signIn } = useAccount();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return (
      <div className="dormant" role="note">
        <strong>{feature} — saving is not connected yet.</strong>
        <p>
          Reading is complete without an account. Accounts and saving arrive when this edition
          is deployed with its database keys; until then nothing you enter here would be kept,
          so this feature sits dormant rather than pretend.
        </p>
      </div>
    );
  }
  if (loading) return <p className="small">Checking your sign-in…</p>;
  if (!user) {
    return (
      <div className="dormant" role="note">
        <strong>{feature} — sign in to save.</strong>
        <p>
          The account is free and exists only for saving — plans, tags, your stamp book,
          your notebook. We email you a sign-in link; there is no password. Or open{" "}
          <Link href="/account">your scrapbook</Link> to sign in there.
        </p>
        {sent ? (
          <p>Link sent — check your email and open it on this device.</p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const err = await signIn(email.trim());
              setError(err);
              if (!err) setSent(true);
            }}
          >
            <label>
              Email{" "}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.org"
              />
            </label>{" "}
            <button type="submit" className="btn">Email me a sign-in link</button>
            {error && <p className="form-error">{error}</p>}
          </form>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
