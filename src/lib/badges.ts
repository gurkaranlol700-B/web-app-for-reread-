/**
 * Badges.
 *
 * Deliberately earned by things that help the marketplace work — listing,
 * completing handovers, keeping a good rating — rather than by logging in or
 * clicking around. A badge that rewards busywork trains busywork.
 */

export type Badge = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  earned: boolean;
};

export type BadgeInput = {
  listed: number;
  sold: number;
  purchased: number;
  ratingAvg: number;
  ratingCount: number;
  isPlus: boolean;
  isVerified: boolean;
  referrals: number;
};

export function computeBadges(input: BadgeInput): Badge[] {
  return [
    {
      id: "first-listing",
      label: "First Listing",
      description: "Listed your first book",
      emoji: "📚",
      earned: input.listed >= 1,
    },
    {
      id: "first-sale",
      label: "First Sale",
      description: "Completed your first handover",
      emoji: "🤝",
      earned: input.sold >= 1,
    },
    {
      id: "five-rehomed",
      label: "Five Rehomed",
      description: "Sold five books to other students",
      emoji: "🌱",
      earned: input.sold >= 5,
    },
    {
      id: "eco-warrior",
      label: "Eco Warrior",
      description: "Ten books kept out of the bin",
      emoji: "🌳",
      earned: input.sold + input.purchased >= 10,
    },
    {
      id: "five-star",
      label: "Five Star",
      description: "A 4.8+ rating across at least three reviews",
      emoji: "⭐",
      earned: input.ratingCount >= 3 && input.ratingAvg >= 4.8,
    },
    {
      id: "verified",
      label: "Verified Student",
      description: "School ID confirmed by ReRead",
      emoji: "✅",
      earned: input.isVerified,
    },
    {
      id: "plus",
      label: "Plus Member",
      description: "Supporting ReRead with a membership",
      emoji: "💛",
      earned: input.isPlus,
    },
    {
      id: "connector",
      label: "Connector",
      description: "Brought three students to ReRead",
      emoji: "🔗",
      earned: input.referrals >= 3,
    },
  ];
}
