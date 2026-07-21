import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

/**
 * Shell for the public marketing pages.
 *
 * The (marketing) folder is a "route group" -- the brackets mean the name is
 * NOT part of the URL, so this layout serves "/" not "/marketing". Grouping
 * lets us give logged-out pages one shell and, later, give the logged-in app
 * in (app)/ a completely different one, without either knowing about the other.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
