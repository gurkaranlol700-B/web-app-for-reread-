/**
 * Every number ReRead makes money from, in one file.
 *
 * This exists so a question like "what happens to your revenue at 5%
 * commission?" is a one-line change, not an archaeology expedition — and so
 * the fee shown to a buyer, the fee charged at checkout, and the fee recorded
 * in the ledger can never drift apart from each other.
 */

/** Commission taken from each completed sale, as a percentage of the price. */
export const COMMISSION_PERCENT = 8;

/** Plus members pay half commission — the main reason to subscribe. */
export const PLUS_COMMISSION_PERCENT = 4;

/** ReRead Plus, one year. */
export const PLUS_PRICE = 99;
export const PLUS_DURATION_DAYS = 365;

/** Free listing boosts a Plus member gets each month. */
export const PLUS_MONTHLY_BOOST_CREDITS = 2;

/** How long new listings are visible to Plus members before everyone else. */
export const PLUS_EARLY_ACCESS_HOURS = 6;

/** Paid "Featured" boost options shown on the boost screen. */
export const BOOST_PLANS = [
  { id: "boost-7", label: "7 days", days: 7, price: 29 },
  { id: "boost-30", label: "30 days", days: 30, price: 79, badge: "Best value" },
] as const;
export type BoostPlanId = (typeof BOOST_PLANS)[number]["id"];

/** Self-serve advertising packages on /advertise. */
export const AD_PLANS = [
  { id: "ad-starter", label: "Starter", price: 499, impressions: "~5,000 views" },
  { id: "ad-growth", label: "Growth", price: 1499, impressions: "~20,000 views", badge: "Popular" },
  { id: "ad-campus", label: "Campus", price: 4999, impressions: "~80,000 views" },
] as const;
export type AdPlanId = (typeof AD_PLANS)[number]["id"];

/** Both sides of a referral get this. */
export const REFERRAL_BOOST_CREDITS = 1;
export const REFERRAL_WALLET_CREDIT = 20;

/**
 * Environmental saving per reused textbook.
 * Source: producing 1 kg of paper emits roughly 1.3 kg CO2e, and a typical
 * school textbook weighs ~0.9 kg once binding and ink are counted, which also
 * consumes about 1/20th of a pulpwood tree. Rounded down deliberately —
 * a number you can defend beats a number that sounds bigger.
 */
export const CO2_KG_PER_BOOK = 2.5;
export const TREES_PER_BOOK = 0.05;

/** Commission rate that applies to a given seller. */
export function commissionPercentFor(sellerIsPlus: boolean): number {
  return sellerIsPlus ? PLUS_COMMISSION_PERCENT : COMMISSION_PERCENT;
}

export type FeeBreakdown = {
  amount: number;
  feePercent: number;
  platformFee: number;
  sellerPayout: number;
};

/**
 * The single source of truth for splitting a sale. Always called on the
 * server with a price read from the database — never with a price posted by
 * the browser, which a buyer could edit to ₹1.
 */
export function splitSale(price: number, sellerIsPlus: boolean): FeeBreakdown {
  const feePercent = commissionPercentFor(sellerIsPlus);
  const platformFee = Math.round((price * feePercent) / 100);
  return {
    amount: price,
    feePercent,
    platformFee,
    sellerPayout: price - platformFee,
  };
}

/** ₹1,234 — Indian digit grouping, used everywhere money is shown. */
export function rupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** ₹1.2L for big dashboard numbers, plain rupees below a lakh. */
export function rupeesCompact(amount: number): string {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  return rupees(amount);
}
