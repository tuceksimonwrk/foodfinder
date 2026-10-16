import type { Adapter } from './types';
import { kupiAdapter } from './kupi';

export const adapters: Adapter[] = [kupiAdapter];
export type { Adapter } from './types';
