import { getHunts } from "@/lib/data";
import { HuntBookProvider, ScrapbookBadges } from "@/components/HuntProgress";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const hunts = getHunts().map(({ slug, name, badge, finds }) => ({
    slug, name, badge, finds: finds.map(({ id, entrySlug, legacyLabels }) => ({ id, entrySlug, legacyLabels }))
  }));
  return <>{children}<HuntBookProvider><ScrapbookBadges hunts={hunts} /></HuntBookProvider></>;
}
