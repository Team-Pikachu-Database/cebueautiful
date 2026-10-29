export const DEFAULT_REWARD_CATALOG = [
  {
    id: "gift-cafe",
    category: "coupon",
    title: "Cebu Coffee Treat",
    points: 120,
    description: "₱50 café and snack credit for quick breaks around the city.",
    rewardType: "coupon",
    code: "CB-CAFE-50",
    monetaryValue: 50
  },
  {
    id: "city-market",
    category: "coupon",
    title: "City Market Voucher",
    points: 260,
    description: "₱150 voucher for groceries, essentials, and local finds.",
    rewardType: "coupon",
    code: "CB-MARKET-150",
    monetaryValue: 150
  },
  {
    id: "grocery-bundle",
    category: "freebies",
    title: "Grocery Gift Basket",
    points: 450,
    description: "A curated bundle of pantry essentials and household basics.",
    rewardType: "coupon",
    code: "CB-GROC-250",
    monetaryValue: 250
  },
  {
    id: "dining-pass",
    category: "coupon",
    title: "Cebu Dining Pass",
    points: 600,
    description: "Enjoy a ₱300 dining credit at a participating local restaurant.",
    rewardType: "coupon",
    code: "CB-DINE-300",
    monetaryValue: 300
  },
  {
    id: "spa-voucher",
    category: "freebies",
    title: "Spa & Wellness Mini Pack",
    points: 700,
    description: "A relaxing spa voucher for pampering and rejuvenation.",
    rewardType: "coupon",
    code: "CB-SPA-500",
    monetaryValue: 500
  },
  {
    id: "breakfast-for-two",
    category: "service",
    title: "Breakfast for Two",
    points: 750,
    description: "A breakfast set for two guests at a participating Cebu hotel.",
    rewardType: "coupon",
    code: "CB-BREAKFAST-450",
    monetaryValue: 450
  },
  {
    id: "massage-session",
    category: "service",
    title: "Massage Session",
    points: 900,
    description: "A restorative wellness session for one person.",
    rewardType: "coupon",
    code: "CB-MASSAGE-650",
    monetaryValue: 650
  },
  {
    id: "airport-transfer",
    category: "service",
    title: "Airport Transfer",
    points: 1000,
    description: "A convenient one-way airport transfer credit.",
    rewardType: "coupon",
    code: "CB-TRANSFER-700",
    monetaryValue: 700
  },
  {
    id: "hotel-amenity-pack",
    category: "freebies",
    title: "Hotel Amenity Pack",
    points: 1100,
    description: "A welcome amenity bundle for a more comfortable stay.",
    rewardType: "coupon",
    code: "CB-AMENITY-800",
    monetaryValue: 800
  },
  {
    id: "suite-upgrade",
    category: "package",
    title: "Hotel Room Upgrade",
    points: 1400,
    description: "Request a room upgrade at a participating Cebu property.",
    rewardType: "package",
    code: "CB-SUITE-UPGRADE"
  },
  {
    id: "weekend-getaway",
    category: "package",
    title: "Weekend Cebu Escape",
    points: 1800,
    description: "A two-day local getaway bundle with dining and leisure perks.",
    rewardType: "package",
    code: "CB-WEEKEND-ESCAPE"
  },
  {
    id: "sunset-stay",
    category: "package",
    title: "Sunset Stay Bundle",
    points: 2400,
    description: "A hotel or resort add-on package for a relaxing short stay.",
    rewardType: "package",
    code: "CB-SUNSET-STAY"
  }
];

export const SPIN_WHEEL_REWARDS = [
  { id: "try-again", title: "Try again", weight: 50, color: "#e5e7eb", kind: "tryAgain" },
  {
    id: "voucher-100",
    title: "₱50 café treat",
    weight: 22,
    color: "#fbbf24",
    kind: "reward",
    reward: DEFAULT_REWARD_CATALOG[0]
  },
  {
    id: "market-voucher",
    title: "₱150 market voucher",
    weight: 12,
    color: "#f59e0b",
    kind: "reward",
    reward: DEFAULT_REWARD_CATALOG[1]
  },
  {
    id: "spa-pack",
    title: "Spa & wellness pack",
    weight: 8,
    color: "#14b8a6",
    kind: "reward",
    reward: DEFAULT_REWARD_CATALOG[4]
  },
  {
    id: "weekend-escape",
    title: "Weekend Cebu escape",
    weight: 6,
    color: "#8b5cf6",
    kind: "reward",
    reward: DEFAULT_REWARD_CATALOG[10]
  },
  {
    id: "grand-prize",
    title: "1 whole week free vacation",
    weight: 2,
    color: "#ffc107",
    kind: "reward",
    reward: {
      id: "grand-prize",
      title: "1 whole week free vacation",
      category: "package",
      rewardType: "grand",
      code: "CB-GRAND-1-WEEK",
      description: "Seven nights at a hotel of your choice with all hotel amenities included. Subject to hotel availability and confirmation."
    }
  }
];

export const SPIN_WHEEL_TOTAL_WEIGHT = SPIN_WHEEL_REWARDS.reduce(
  (total, reward) => total + reward.weight,
  0
);

export function selectWheelReward(ticket) {
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= SPIN_WHEEL_TOTAL_WEIGHT) {
    throw new RangeError("The spin ticket is outside the wheel odds.");
  }

  let boundary = 0;
  for (const reward of SPIN_WHEEL_REWARDS) {
    boundary += reward.weight;
    if (ticket < boundary) return reward;
  }

  throw new Error("The spin wheel could not select a reward.");
}

export function buildWheelGradient() {
  let angle = 0;
  const stops = SPIN_WHEEL_REWARDS.map(reward => {
    const start = angle;
    angle += reward.weight / SPIN_WHEEL_TOTAL_WEIGHT * 360;
    return `${reward.color} ${start}deg ${angle}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}
