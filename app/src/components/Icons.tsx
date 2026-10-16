import type { ReactNode } from 'react';

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

/** Price tag: the weekly flyer. */
export const TagIcon = () => (
  <Svg>
    <path d="M3 12.5V4a1 1 0 0 1 1-1h8.5a1 1 0 0 1 .7.3l7.5 7.5a1 1 0 0 1 0 1.4l-8.5 8.5a1 1 0 0 1-1.4 0L3.3 13.2a1 1 0 0 1-.3-.7Z" />
    <circle cx="8" cy="8" r="1.5" />
  </Svg>
);

/** Plate with cutlery: the meal plan. */
export const PlateIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M3 4v6M5 4v6M4 10v10M21 4c-1.5 1-2 3-2 5s.7 3 2 3v8" />
  </Svg>
);

/** Checklist: the shopping list. */
export const ListIcon = () => (
  <Svg>
    <path d="m4 6 1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M12 6h8M12 12h8M12 18h8" />
  </Svg>
);

/** Sliders: settings. */
export const SlidersIcon = () => (
  <Svg>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Svg>
);

export const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
