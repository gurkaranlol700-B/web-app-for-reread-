import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, Receipt, ShieldCheck, XCircle } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { rupees } from "@/lib/pricing";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const STATUS = {
  pending: { icon: Clock, label: "Awaiting payment", tone: "text-amber-600 dark:text-amber-400" },
  paid: { icon: ShieldCheck, label: "Held in escrow", tone: "text-brand" },
  completed: { icon: CheckCircle2, label: "Completed", tone: "text-brand" },
  cancelled: { icon: XCircle, label: "Cancelled", tone: "text-muted-foreground" },
} as const;

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/orders");

  const orders = await getOrdersForUser(user.id);
  const bought = orders.filter((o) => o.buyerId === user.id);
  const sold = orders.filter((o) => o.sellerId === user.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">Orders</span>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">Everything you traded.</h1>
      <p className="text-muted-foreground mt-3 max-w-lg leading-relaxed">
        Money you pay is held by ReRead until you confirm the handover in
        person. Nobody has to trust a stranger — they only have to trust the code.
      </p>

      {orders.length === 0 ? (
        <div className="border-border bg-card mt-10 rounded-2xl border px-8 py-16 text-center">
          <Receipt className="text-brand mx-auto size-8" />
          <p className="mt-4 font-serif text-xl italic">No orders yet.</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
            When you buy a book — or someone buys one of yours — it shows up here.
          </p>
          <Link
            href="/browse"
            className="bg-brand text-brand-foreground mt-6 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Browse books
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          <OrderSection title="Books you bought" orders={bought} viewerIsBuyer />
          <OrderSection title="Books you sold" orders={sold} viewerIsBuyer={false} />
        </div>
      )}
    </div>
  );
}

function OrderSection({
  title,
  orders,
  viewerIsBuyer,
}: {
  title: string;
  orders: Awaited<ReturnType<typeof getOrdersForUser>>;
  viewerIsBuyer: boolean;
}) {
  if (orders.length === 0) return null;

  return (
    <section>
      <h2 className="mono-label text-muted-foreground">{title}</h2>
      <ul className="mt-4 space-y-3">
        {orders.map((order) => {
          const status = STATUS[order.status];
          const StatusIcon = status.icon;
          return (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="border-border bg-card hover:border-brand/50 focus-visible:ring-ring flex items-center gap-4 rounded-2xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="bg-accent/30 relative size-14 shrink-0 overflow-hidden rounded-xl">
                  {order.listing?.coverImage ? (
                    <Image
                      src={order.listing.coverImage}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain p-1.5"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{order.listing?.title ?? "Book"}</p>
                  <p className="text-muted-foreground text-sm">
                    {viewerIsBuyer ? order.sellerName : order.buyerName}
                  </p>
                  <p className={`mt-0.5 flex items-center gap-1.5 text-xs font-semibold ${status.tone}`}>
                    <StatusIcon className="size-3.5" />
                    {status.label}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-brand font-serif text-lg font-semibold">
                    {rupees(viewerIsBuyer ? order.amount : order.sellerPayout)}
                  </p>
                  {!viewerIsBuyer ? (
                    <p className="text-muted-foreground text-[0.65rem]">
                      {`after ${order.feePercent}% fee`}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
