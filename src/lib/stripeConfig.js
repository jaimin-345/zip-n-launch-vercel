// Maps internal tier names to Stripe Price IDs

export const STRIPE_PRICES = {
  // Memberships (yearly recurring)
  membership_founding_insider: {
    priceId: 'price_1TAlzv1uq10j2UsKxjIofvJy',
    productId: 'prod_U948emSK1oQJuP',
    name: 'Founding Insider',
    description: 'First 50 members — price locked at $79.99/year forever, 3 free pattern books/year',
    amount: 7999,
    interval: 'year',
    tier: 'founding_insider',
    limit: 50,
  },
  membership_founding_member: {
    priceId: 'price_1TAm0Z1uq10j2UsKTRUsEH4g',
    productId: 'prod_U948etNRa1qgPL',
    name: 'Founding Member',
    description: 'Next 950 members — price locked at $79.99/year',
    amount: 7999,
    interval: 'year',
    tier: 'founding_member',
    limit: 950,
  },
  membership_standard: {
    priceId: 'price_1TAm111uq10j2UsKkNUE2QLy',
    productId: 'prod_U949KRgUzvApM2',
    name: 'Standard Member',
    description: 'After first 1,000 members',
    amount: 9999,
    interval: 'year',
    tier: 'standard',
    limit: null,
  },

  // Pattern Books
  pattern_book_basic: {
    priceId: 'price_1TAm1y1uq10j2UsKktMEVqY2',
    productId: 'prod_U94AlgEQuR528r',
    name: 'Pattern Book — Basic (4H/Open/Single Judge)',
    amount: 3999,
    interval: null,
  },
  pattern_book_discounted: {
    priceId: 'price_1TAm1y1uq10j2UsKktMEVqY2',
    productId: 'prod_U94AlgEQuR528r',
    name: 'Pattern Book Builder — Discounted',
    amount: 3999,
    interval: null,
  },
horse_show_manager_full: {
    priceId: 'price_1TAm2O1uq10j2UsKxWZoKCbo',
    productId: 'prod_U94ADXsrtY06zm',
    name: 'Horse Show Manager — Full Access',
    amount: 9999,
    interval: 'month',
  },

  // Pattern Upload Submission
  pattern_upload_submission: {
    priceId: 'price_PLACEHOLDER_pattern_upload', // TODO: Replace with real Stripe Price ID
    productId: 'prod_PLACEHOLDER_pattern_upload', // TODO: Replace with real Stripe Product ID
    name: 'Pattern Upload — Submission Fee',
    description: 'One-time fee for submitting a custom pattern set',
    amount: 1999,
    interval: null,
  },
};

// Returns the checkout mode for Stripe ('payment' for one-time, 'subscription' for recurring)
export function getCheckoutMode(priceKey) {
  const config = STRIPE_PRICES[priceKey];
  if (!config) return null;
  return config.interval ? 'subscription' : 'payment';
}
