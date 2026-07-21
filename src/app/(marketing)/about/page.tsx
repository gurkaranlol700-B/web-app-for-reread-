export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="mx-auto w-full max-w-2xl px-6 py-20 sm:px-10 sm:py-28">
      <span className="mono-label text-brand">About</span>
      <h1 className="mt-4 text-[clamp(2.4rem,6vw,4rem)] leading-[1.02]">
        Built by students, for students.
      </h1>
      <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
        Every year, shelves of perfectly good textbooks get boxed up, sold
        for scrap, or thrown away — while a junior one grade below pays full
        price for the exact same edition. ReRead exists to close that gap:
        a school-exclusive marketplace where seniors sell what they&rsquo;ve
        outgrown and juniors buy it for a fraction of the price.
      </p>
      <p className="text-muted-foreground mt-4 leading-relaxed">
        We&rsquo;re early. Real accounts, messaging, and payments are still on
        the roadmap — but the goal from day one has been the same: cheaper
        books, less waste, and a marketplace that actually feels like it
        belongs at school, not a generic classifieds site.
      </p>
    </article>
  );
}
