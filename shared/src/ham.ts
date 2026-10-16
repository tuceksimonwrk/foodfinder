import { normalizeText } from './text';

// "šunka" as a whole word (šunka, šunky, šunku), not šunkový salám, Sunkist or šunkofleky
const HAM = /(^|[^a-z])sunk[a-z]?([^a-z]|$)/;

export function isHam(name: string): boolean {
  return HAM.test(normalizeText(name));
}

export interface HamGrade {
  grade: 'nejvyssi' | 'vyberova' | 'standardni';
  /** Legal minimum of pure muscle protein in percent (vyhláška 69/2016 Sb.). */
  minProteinPct: number;
  label: string;
}

const GRADES: { pattern: RegExp; grade: HamGrade['grade']; minProteinPct: number; name: string }[] = [
  { pattern: /nejvyssi jakost/, grade: 'nejvyssi', minProteinPct: 16, name: 'nejvyšší jakost' },
  { pattern: /vyberov/, grade: 'vyberova', minProteinPct: 13, name: 'výběrová jakost' },
  { pattern: /standardni/, grade: 'standardni', minProteinPct: 10, name: 'standardní jakost' },
];

/**
 * Quality class of a ham as stated in its name. The class is defined by the share of pure muscle protein,
 * not by the meat share, so only that legal minimum is reported. Dry-cured ham follows other rules.
 */
export function hamGrade(name: string): HamGrade | null {
  const text = normalizeText(name);
  if (!HAM.test(text) || /susen/.test(text)) return null;
  const hit = GRADES.find((g) => g.pattern.test(text));
  if (!hit) return null;
  return { grade: hit.grade, minProteinPct: hit.minProteinPct, label: `${hit.name}, min. ${hit.minProteinPct} % svalových bílkovin` };
}
