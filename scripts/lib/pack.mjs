// Packs the package and installs it (plus links to vue and core) into a throwaway project, so
// scripts see exactly what a consumer gets: the `files`, `exports` and types of the real tarball.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Not import.meta.dirname: this script also runs on Node 18, which does not have it.
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const PACKAGE = '@msameim181/iran-map-vue'

export const createConsumer = () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'iran-map-vue-consumer-')))
  const packDir = join(dir, 'pack')
  mkdirSync(packDir)
  // CI packs once and hands the same tarball to every job (set IRAN_MAP_VUE_TARBALL); otherwise
  // pack the freshly built working tree.
  let tarball = process.env.IRAN_MAP_VUE_TARBALL ? resolve(process.env.IRAN_MAP_VUE_TARBALL) : undefined
  if (!tarball) {
    execFileSync('npm', ['pack', '--silent', '--pack-destination', packDir], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    tarball = join(
      packDir,
      readdirSync(packDir).find((name) => name.endsWith('.tgz')),
    )
  }
  const modules = join(dir, 'node_modules')
  const target = join(modules, ...PACKAGE.split('/'))
  mkdirSync(target, { recursive: true })
  execFileSync('tar', ['-xzf', tarball, '-C', target, '--strip-components=1'])
  // Peer and dependency: reuse the repository's installs (one `vue` instance for app and package).
  for (const name of ['vue', '@msameim181/iran-map-core']) {
    const link = join(modules, ...name.split('/'))
    mkdirSync(join(link, '..'), { recursive: true })
    symlinkSync(realpathSync(join(root, 'node_modules', ...name.split('/'))), link, 'dir')
  }
  return { dir, tarball, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}
