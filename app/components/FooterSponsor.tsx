"use client";
import { usePathname } from "next/navigation";
import SponsorBlock from "./SponsorBlock";

// The compact sponsor rides the site-wide footer on every page except the
// homepage, which carries the full sponsor block in its own body — one
// sponsor placement per page, never two.
export default function FooterSponsor() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <SponsorBlock variant="compact" />;
}
