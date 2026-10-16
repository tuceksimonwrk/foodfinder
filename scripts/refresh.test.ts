import { describe, it, expect } from 'vitest';
// @ts-expect-error plain ESM script without type declarations
import { refresh, DATA_FILE } from './refresh.mjs';

type Call = [string, string[]];
type Result = { code: number; stdout: string };

/** Fake command runner: records calls and answers from a list of [matcher, result] pairs. */
const fakeRun = (answers: Record<string, Partial<Result>> = {}) => {
  const calls: Call[] = [];
  const run = (cmd: string, args: string[]): Result => {
    calls.push([cmd, args]);
    const key = [cmd, ...args].join(' ');
    const hit = Object.entries(answers).find(([k]) => key.startsWith(k));
    return { code: 0, stdout: '', ...(hit?.[1] ?? {}) };
  };
  return { run, calls, names: () => calls.map(([c, a]) => [c, ...a].join(' ')) };
};

describe('refresh', () => {
  it('stops without touching git when the scrape fails or is rejected', () => {
    const f = fakeRun({ 'npm run scrape': { code: 1 } });
    expect(refresh(f.run)).toBe(1);
    expect(f.names()).toEqual(['npm run scrape']);
  });

  it('does not commit when the data file did not change', () => {
    const f = fakeRun();
    expect(refresh(f.run)).toBe(0);
    expect(f.names().some((n: string) => n.startsWith('git commit'))).toBe(false);
    expect(f.names().some((n: string) => n.startsWith('git push'))).toBe(false);
  });

  it('commits only the data file, rebases and pushes when it changed', () => {
    const f = fakeRun({ 'git status': { stdout: ` M ${DATA_FILE}\n` } });
    expect(refresh(f.run)).toBe(0);
    const names = f.names();
    const commit = names.find((n: string) => n.startsWith('git commit'))!;
    expect(commit).toContain(`-- ${DATA_FILE}`);
    expect(names.indexOf(commit)).toBeLessThan(names.indexOf('git pull --rebase --autostash'));
    expect(names.indexOf('git pull --rebase --autostash')).toBeLessThan(names.indexOf('git push'));
  });

  it('reports a failing push instead of pretending success', () => {
    const f = fakeRun({ 'git status': { stdout: ` M ${DATA_FILE}\n` }, 'git push': { code: 1 } });
    expect(refresh(f.run)).toBe(1);
  });

  it('does not push after a failed rebase', () => {
    const f = fakeRun({ 'git status': { stdout: ` M ${DATA_FILE}\n` }, 'git pull': { code: 1 } });
    expect(refresh(f.run)).toBe(1);
    expect(f.names()).not.toContain('git push');
  });
});
