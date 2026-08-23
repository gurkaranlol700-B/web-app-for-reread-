import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";

import { HandoverPanel } from "@/components/orders/handover-panel";
import { ReviewForm } from "@/components/orders/review-form";
import { abandonOrder } from "@/app/actions/order";
import { getCurrentUser } from "@/lib/auth";
import { getOrder } from "@/lib/orders";
import { rupees } from "@/lib/pricing";
import { hasReviewed } from "@/lib/reviews";

export const metadata = { title: "Order" };
export const dynamic = "force-dynamic";

const STATUS_COPY = {
  pending: { icon: Clock, label: "Awaiting payment", tone: "text-amber-600 dark:text-amber-400" },
  paid: { icon: ShieldCheck, label: "Paid — held in escrow", tone: "text-brand" },
  completed: { icon: CheckCircle2, label: "Completed", tone: "text-brand" },
  cancelled: { icon: XCircle, label: "Cancelled", tone: "text-muted-foreground" },
} as const;

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/orders/${id}`);

  const order = await getOrder(id);
  if (!order) notFound();

  const isBuyer = order.buyerId === user.id;
  const isSeller = order.sellerId === user.id;
  // Anyone else gets a 404, not a permission error — a stranger shouldn't
  // even learn that this order exists.
  if (!isBuyer && !isSeller) notFound();

  const alreadyReviewed = order.status === "completed" && (await hasReviewed(order.id, user.id));
  const status = STATUS_COPY[order.status];
  const StatusIcon = status.icon;
  const otherName = (isBuyer ? order.sellerName : order.buyerName) ?? "them";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10 sm:py-16">
      <Link
        href="/orders"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        All orders
      </Link>

      {/* ------------------------------------------------------------- Summary */}
      <div className="border-border bg-card mt-6 flex items-center gap-4 rounded-2xl border p-5">
        <div className="bg-accent/30 relative size-20 shrink-0 overflow-hidden rounded-xl">
          {order.listing?.coverImage ? (
            <Image
              src={order.listing.coverImage}
              alt=""
              fill
              sizes="80px"
              className="object-contain p-2"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`flex items-center gap-1.5 text-xs font-semibold ${status.tone}`}>
            <StatusIcon className="size-3.5" />
            {status.label}
          </p>
          <h1 className="mt-1 truncate font-serif text-xl font-medium">
            {order.listing?.title ?? "Book"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isBuyer ? `From ${order.sellerName}` : `To ${order.buyerName}`}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------- Transparent money split
          The seller sees exactly what ReRead takes and exactly what they get.
          Hidden fees are the single fastest way to lose a marketplace's
          supply side, so the split is stated plainly rather than buried. */}
      <div className="border-border bg-card mt-5 rounded-2xl border p-5">
        <p className="mono-label text-brand">The numbers</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Buyer pays</dt>
            <dd className="font-medium">{rupees(order.amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{`ReRead fee (${order.feePercent}%)`}</dt>
            <dd className="font-medium">{`− ${rupees(order.platformFee)}`}</dd>
          </div>
          <div className="border-border flex justify-between border-t pt-2">
            <dt className="font-semibold">Seller receives</dt>
            <dd className="text-brand font-serif text-lg font-semibold">
              {rupees(order.sellerPayout)}
            </dd>
          </div>
        </dl>
        {order.paymentMode === "simulated" ? (
          <p className="text-muted-foreground/80 mt-3 text-xs">
            Recorded in offline mode — no live charge was made for this order.
          </p>
        ) : null}
      </div>

      {/* ------------------------------------------------------------- Handover */}
      {order.status === "paid" && isBuyer ? (
        <div className="border-brand/40 bg-brand/5 mt-5 rounded-2xl border p-6 text-center">
          <p className="mono-label text-brand">Your handover code</p>
          <p className="text-brand mt-3 font-mono text-5xl font-semibold tracking-[0.2em]">
            {order.handoverCode}
          </p>
          <p className="text-muted-foreground mx-auto mt-4 max-w-sm text-sm leading-relaxed">
            {`Meet ${otherName}, check the book is what you expected, and only then read this code out. The moment they enter it, ${rupees(order.sellerPayout)} is released to them — so don't share it before you have the book in your hands.`}
          </p>
        </div>
      ) : null}

      {order.status === "paid" && isSeller ? (
        <div className="mt-5">
          <HandoverPanel orderId={order.id} payout={rupees(order.sellerPayout)} />
        </div>
      ) : null}

      {order.status === "pending" ? (
        <div className="border-border bg-card mt-5 rounded-2xl border p-5">
          <p className="text-muted-foreground text-sm leading-relaxed">
            This order hasn&apos;t been paid for yet. The book is reserved until
            it&apos;s completed or cancelled.
          </p>
          <form action={abandonOrder} className="mt-4">
            <input type="hidden" name="orderId" value={order.id} />
            <button
              type="submit"
              className="border-border hover:border-foreground inline-flex h-10 items-center rounded-full border px-5 text-sm font-medium transition-colors"
            >
              Cancel this order
            </button>
          </form>
        </div>
      ) : null}

      {/* --------------------------------------------------------------- Review */}
      {order.status === "completed" ? (
        <div className="mt-5">
          {alreadyReviewed ? (
            <div className="border-border bg-card rounded-2xl border p-6 text-center">
              <CheckCircle2 className="text-brand mx-auto size-6" />
              <p className="mt-3 font-serif text-lg italic">All done.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {`You've already rated ${otherName} for this order.`}
              </p>
            </div>
          ) : (
            <ReviewForm orderId={order.id} revieweeName={otherName} />
          )}
        </div>
      ) : null}
    </div>
  );
}
