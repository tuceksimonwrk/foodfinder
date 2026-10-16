import type { RawOffer } from '@foodfinder/shared';

export interface Adapter {
  id: string;
  fetchOffers(fetchFn?: typeof fetch): Promise<RawOffer[]>;
}
