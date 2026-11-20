import { Suspense } from "react";
import { getIndex, getStates, getThemes } from "@/lib/data";
import CatalogBrowser from "./browser";

export const metadata = { title: "Catalog — On Old Ground" };

export default function CatalogPage() {
  const rows = getIndex();
  return (
    <>
      <h1>Catalog</h1>
      <p className="lede">
        Every researched entry, open to read end to end. Reflection stops are labelled and carry
        no game elements; entries are published research, with their gaps printed.
      </p>
      <Suspense fallback={<p>Loading the catalog…</p>}>
        <CatalogBrowser rows={rows} states={getStates()} themes={getThemes()} />
      </Suspense>
    </>
  );
}
