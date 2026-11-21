import { Crumbs, ThemeLinks } from "@/components/Browse";
export const metadata = {
  title: "Themes — On Old Ground",
  alternates: { canonical: "/themes" },
};
export default function Themes() {
  return (
    <>
      <Crumbs items={[{ name: "Home", href: "/" }, { name: "Themes" }]} />
      <h1>Themes</h1>
      <ThemeLinks />
    </>
  );
}
