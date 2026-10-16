import { rohlikSearchUrl } from '../rohlik';

/** Opens a search for the product in the Rohlik web shop (new tab). */
export function RohlikLink({ term, compact = false }: { term: string; compact?: boolean }) {
  const label = `Najít „${term}“ v Rohlíku`;
  return (
    <a
      className={compact ? 'rohlik-link compact' : 'rohlik-link'}
      href={rohlikSearchUrl(term)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
      {!compact && <span>Rohlík</span>}
    </a>
  );
}
