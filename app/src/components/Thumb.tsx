import { useEffect, useState } from 'react';
import { PlateIcon } from './Icons';

/**
 * Product photo (hot-linked from the source, lazy-loaded). Without an address, or when the image
 * cannot be loaded (offline, removed), a neutral tile keeps the layout identical.
 */
export function Thumb({ src, className = '' }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  // A different address (e.g. after a data refresh) deserves a new attempt.
  useEffect(() => setFailed(false), [src]);

  return (
    <div className={`thumb ${className}`.trim()}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width={104}
          height={104}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="thumb-fallback" aria-hidden="true">
          <PlateIcon />
        </span>
      )}
    </div>
  );
}
