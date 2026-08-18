import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guards the release metadata that TypeScript cannot see.
 *
 * In the monorepo @samuraizer/cli is symlinked, so the server always compiles
 * against the current CLI source — a dependency range that is too loose only
 * bites after publishing, where npm may resolve an older CLI that silently
 * drops config fields it does not know about (extra keys are stripped by the
 * tools' zod schemas rather than rejected). These assertions fail in CI
 * instead.
 */

const here = path.dirname(fileURLToPath(import.meta.url));

function readPackage(relative: string): { version: string; dependencies?: Record<string, string> } {
  return JSON.parse(readFileSync(path.join(here, relative), 'utf8'));
}

function readChangelog(relative: string): string {
  return readFileSync(path.join(here, relative), 'utf8');
}

/** Compare two x.y.z strings. Returns <0, 0 or >0 like a sort comparator. */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i]! !== pb[i]!) return pa[i]! - pb[i]!;
  }
  return 0;
}

const mcpPkg = readPackage('../package.json');
const cliPkg = readPackage('../../cli/package.json');

describe('semver comparator (used by the assertions below)', () => {
  it('orders versions by each component', () => {
    expect(compareSemver('0.4.3', '0.4.2')).toBeGreaterThan(0);
    expect(compareSemver('0.4.2', '0.4.10')).toBeLessThan(0);
    expect(compareSemver('1.0.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareSemver('0.4.3', '0.4.3')).toBe(0);
  });
});

describe('@samuraizer/cli dependency range', () => {
  const range = mcpPkg.dependencies?.['@samuraizer/cli'];

  it('is declared as a caret range', () => {
    expect(range).toBeDefined();
    expect(range).toMatch(/^\^\d+\.\d+\.\d+$/);
  });

  it('cannot resolve to a CLI older than the one in this repo', () => {
    const floor = range!.slice(1);
    expect(
      compareSemver(floor, cliPkg.version),
      `mcp-server depends on ${range} but the workspace CLI is ${cliPkg.version}; ` +
        'a published install could get a CLI without the config fields the server forwards',
    ).toBeGreaterThanOrEqual(0);
  });

  it('does not float ahead of a CLI version that does not exist yet', () => {
    const floor = range!.slice(1);
    expect(compareSemver(floor, cliPkg.version)).toBe(0);
  });
});

describe('changelogs track the published versions', () => {
  it('documents the current mcp-server version', () => {
    expect(readChangelog('../CHANGELOG.md')).toContain(`## [${mcpPkg.version}]`);
  });

  it('documents the current cli version', () => {
    expect(readChangelog('../../cli/CHANGELOG.md')).toContain(`## [${cliPkg.version}]`);
  });
});
