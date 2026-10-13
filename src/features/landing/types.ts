export interface ProductReview {
  name: string;
  location: string;
  date: string;
  stars: number;
  title: string;
  text: string;
  helpful: number;
  verifiedPurchase: boolean;
  photo?: string;
}

export interface LandingProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  shortPitch: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  currency: string;
  mainImage: string;
  gallery: string[];
  rating: { value: number; count: number } | null;
  stockRemaining: number | null;
  stockTotal: number;
  freeShippingFromCents: number;
  deliveryEstimate: string;
  returnDays: number;
  description: string[];
  shippingReturns: string[];
  highlights: string[];
  specs: [string, string][];
  reviews: ProductReview[];
}
