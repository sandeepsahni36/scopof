export const STRIPE_PRODUCTS = {
  enterprise: {
    id: 'prod_SDzjYH1yYqyelf',
    priceId: 'price_1RJXjjCDShtAyWWlL0WQc0I8', // This should be updated to a subscription price ID
    name: 'Enterprise',
    description: 'For large property management companies',
    price: 199,
    mode: 'subscription' as const,
    trialDays: 14,
    features: [
      'Unlimited properties',
      'Unlimited storage',
      'Up to 15 users (5 admins + 10 members)',
      'Enterprise-grade AI detection',
      'Team collaboration tools',
      'API access',
      'White-label reports',
    ],
  },
  professional: {
    id: 'prod_SDzibjNuFbr5rA',
    priceId: 'price_1RJXjHCDShtAyWWllZtomnFA', // This should be updated to a subscription price ID
    name: 'Professional',
    description: 'For growing businesses with multiple properties',
    price: 79,
    mode: 'subscription' as const,
    trialDays: 14,
    features: [
      'Up to 45 properties',
      '5 GB Storage',
      'Up to 5 users (2 admins + 3 members)',
      'Advanced AI damage detection',
      'Custom inspection templates',
      'Branded PDF reports',
      'Priority support',
    ],
    popular: true,
  },
  starter: {
    id: 'prod_SDzhlYzTvZRsL1',
    priceId: 'price_1RJXhuCDShtAyWWl8VhTAtNj', // This should be updated to a subscription price ID
    name: 'Starter',
    description: 'Perfect for individuals or small rental businesses',
    price: 29,
    mode: 'subscription' as const,
    trialDays: 14,
    features: [
      'Up to 10 properties',
      '2 GB Storage',
      'Up to 2 users (1 admin + 1 member)',
      'Basic AI damage detection',
      'Standard inspection templates',
      'PDF report generation',
      'Email support',
    ],
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PRODUCTS;
export type StripeProduct = typeof STRIPE_PRODUCTS[StripePlan];

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return Object.values(STRIPE_PRODUCTS).find((product) => product.priceId === priceId);
}

export function getProductById(productId: string): StripeProduct | undefined {
  return Object.values(STRIPE_PRODUCTS).find((product) => product.id === productId);
}