// Scrapes fresh offers on this machine and publishes them: commit + push of offers.json,
// which triggers the deploy workflow on GitHub. (GitHub's own servers are blocked by Kupi.cz.)
// Run: npm run refresh
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DATA_FILE = 'app/public/data/offers.json';

/** Real command runner; npm needs a shell on Windows (npm.cmd). */
function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: cmd === 'npm' && process.platform === 'win32',
  });
  if (result.stdout) process.stdout.write(result.stdout);
  return { code: result.status ?? 1, stdout: result.stdout ?? '' };
}

/** Returns a process exit code. `exec` is injectable for tests. */
export function refresh(exec = run) {
  const step = (cmd, args) => exec(cmd, args);

  // A rejected or failed scrape leaves offers.json untouched, so there is nothing to publish.
  if (step('npm', ['run', 'scrape']).code !== 0) {
    console.error('Stahování selhalo nebo bylo zamítnuto bezpečnostními kontrolami; nic se nepublikuje.');
    return 1;
  }

  const status = step('git', ['status', '--porcelain', '--', DATA_FILE]);
  if (status.code !== 0) return status.code;
  if (status.stdout.trim() === '') {
    console.log('Data se nezměnila, není co publikovat.');
    return 0;
  }

  for (const args of [
    ['add', '--', DATA_FILE],
    ['commit', '-m', 'data: refresh offers', '--', DATA_FILE],
    ['pull', '--rebase', '--autostash'],
    ['push'],
  ]) {
    const { code } = step('git', args);
    if (code !== 0) {
      console.error(`git ${args[0]} selhal (kód ${code}).`);
      return code;
    }
  }
  console.log('Hotovo: nová data jsou na GitHubu, nasazení se spustí automaticky.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  process.exit(refresh());
}
