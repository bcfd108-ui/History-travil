"use client";
// Header account chrome: who is signed in, and the way to the scrapbook.
// Deliberately small — the header stays a header. When saving is not
// connected the bar says nothing at all: no dead buttons, no fake account.
import Link from "next/link";
import { useAccount } from "@/lib/account";

export default function AccountBar() {
  const { configured, user, loading, signOut } = useAccount();
  if (!configured) return null;
  if (loading) return <span className="account-bar small">…</span>;
  if (!user) {
    return (
      <span className="account-bar">
        <Link href="/account">Sign in to save</Link>
      </span>
    );
  }
  return (
    <span className="account-bar">
      <Link href="/account">Your scrapbook</Link>{" "}
      <span className="small">({user.email})</span>{" "}
      <button type="button" className="linklike" onClick={() => void signOut()}>
        Sign out
      </button>
    </span>
  );
}
