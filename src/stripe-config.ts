export const STRIPE_PRODUCTS = {
  enterprise: {
    id: 'prod_SDzjYH1yYqyelf',
    priceId: 'price_1RJXjjCDShtAyWWlL0WQc0I8',
    name: 'Enterprise',
    description: 'For large property management companies',
    price: 199,
    mode: 'subscription' as const,
    features: [
      'Unlimited properties',
      'Unlimited storage',
      'Unlimited users',
      'Enterprise-grade AI detection',
      'Team collaboration tools',
      'API access',
      'White-label reports',
    ],
  },
  professional: {
    id: 'prod_SDzibjNuFbr5rA',
    priceId: 'price_1RJXjHCDShtAyWWllZtomnFA',
    name: 'Professional',
    description: 'For growing businesses with multiple properties',
    price: 79,
    mode: 'subscription' as const,
    features: [
      'Up to 45 properties',
      '5 GB Storage',
      'Up to 3 users',
      'Advanced AI damage detection',
      'Custom inspection templates',
      'Branded PDF reports',
      'Priority support',
    ],
    popular: true,
  },
  starter: {
    id: 'prod_SDzhlYzTvZRsL1',
    priceId: 'price_1RJXhuCDShtAyWWl8VhTAtNj',
    name: 'Starter',
    description: 'Perfect for individuals or small rental businesses',
    price: 29,
    mode: 'subscription' as const,
    features: [
      'Up to 10 properties',
      '2 GB Storage',
      'Up to 1 user',
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