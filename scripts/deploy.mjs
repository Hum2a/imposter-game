#!/usr/bin/env node
/**
 * Deploy orchestration: Cloudflare Worker (Discord token), Partykit, Cloudflare Pages.
 *
 * Reads `.env.deploy` from the repo root (override with `DEPLOY_ENV_FILE`, e.g. `.env.deploy.staging`).
 * Requires: `wrangler login`, `partykit login` (first time).
 *
 * Usage: node scripts/deploy.mjs <command>
 *   all       — worker → partykit → pages (recommended order)
 *   worker    — push Discord secrets + wrangler deploy -c wrangler.worker.toml
 *   partykit  — partykit deploy with JOIN_VERIFY from env
 *   pages     — Vite build with VITE_* from file + wrangler pages deploy
 *   sync      — only push Worker secrets (no deploys)
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const serverDir = resolve(root, 'server')

/** Avoid `npx` on Windows (spawn ENOENT); run local CLIs with `node` + entry file. */
const wranglerCli = resolve(root, 'node_modules/wrangler/bin/wrangler.js')
const partykitCli = resolve(serverDir, 'node_modules/partykit/dist/bin.mjs')

/** Worker config is split out so root `wrangler.toml` can be Pages-only (Wrangler 4+). */
const wranglerWorkerConfig = ['-c', 'wrangler.worker.toml']

function assertCli(path, hint) {
  if (!existsSync(path)) {
    console.error(`[deploy] Missing CLI: ${path}`)
    console.error(`[deploy] ${hint}`)
    process.exit(1)
  }
}

/** @param {string} content */
function parseEnvFile(content) {
  /** @type {Record<string, string>} */
  const out = {}
  for (let line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"')
    }
    out[key] = val
  }
  return out
}

function loadDeployEnv() {
  const file = process.env.DEPLOY_ENV_FILE || resolve(root, '.env.deploy')
  if (!existsSync(file)) {
    console.error(`[deploy] Missing ${file}`)
    console.error('[deploy] Copy .env.deploy.example → .env.deploy and fill in values.')
    process.exit(1)
  }
  const vars = parseEnvFile(readFileSync(file, 'utf8'))
  return { file, vars }
}

/** Merge deploy vars into process.env for child builds. */
function withDeployEnv(vars) {
  return { ...process.env, ...vars }
}

/**
 * Run local wrangler (stdin for `secret put`).
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, stdin?: string }} [opts]
 */
function runWrangler(args, opts = {}) {
  assertCli(wranglerCli, 'Run: npm install (repo root)')
  const cwd = opts.cwd ?? root
  const env = opts.env ?? process.env
  const r = spawnSync(process.execPath, [wranglerCli, ...args], {
    cwd,
    env,
    stdio: opts.stdin != null ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    input: opts.stdin != null ? Buffer.from(opts.stdin, 'utf-8') : undefined,
  })
  if (r.error) throw r.error
  if (r.status !== 0 && r.status !== null) process.exit(r.status)
}

/**
 * Run local partykit CLI from server deps.
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, stdin?: string }} [opts]
 */
function runPartykit(args, opts = {}) {
  assertCli(partykitCli, 'Run: cd server && npm install')
  const cwd = opts.cwd ?? serverDir
  const env = opts.env ?? process.env
  const r = spawnSync(process.execPath, [partykitCli, ...args], {
    cwd,
    env,
    stdio: opts.stdin != null ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    input: opts.stdin != null ? Buffer.from(opts.stdin, 'utf-8') : undefined,
  })
  if (r.error) throw r.error
  if (r.status !== 0 && r.status !== null) process.exit(r.status)
}

function wranglerSecretPut(name, value, cwd = root) {
  if (value === undefined || value === null || value === '') {
    console.warn(`[deploy] Skipping empty Worker secret: ${name}`)
    return
  }
  console.log(`[deploy] wrangler secret put ${name}`)
  runWrangler([...wranglerWorkerConfig, 'secret', 'put', name], { cwd, stdin: value })
}

function cmdSync(vars) {
  console.log('[deploy] Sync Worker secrets only')
  wranglerSecretPut('DISCORD_CLIENT_ID', vars.DISCORD_CLIENT_ID ?? vars.VITE_DISCORD_CLIENT_ID)
  wranglerSecretPut('DISCORD_CLIENT_SECRET', vars.DISCORD_CLIENT_SECRET)
  wranglerSecretPut('PARTYKIT_JWT_SECRET', vars.PARTYKIT_JWT_SECRET)
  console.log('[deploy] sync done')
}

function cmdWorker(vars) {
  cmdSync(vars)
  const deployArgs = ['deploy']
  if (vars.DISCORD_REDIRECT_URI && vars.DISCORD_REDIRECT_URI.trim() !== '') {
    deployArgs.push('--var', `DISCORD_REDIRECT_URI=${vars.DISCORD_REDIRECT_URI}`)
  }
  console.log('[deploy] wrangler deploy (token worker)')
  runWrangler([...wranglerWorkerConfig, ...deployArgs], { cwd: root })
  console.log('[deploy] worker done')
}

function cmdPartykit(vars) {
  const joinVerify = vars.JOIN_VERIFY ?? 'false'
  const wordProfanity = vars.WORD_PROFANITY_FILTER ?? 'false'
  const joinJwtRequired = vars.JOIN_JWT_REQUIRED ?? 'false'
  const joinJwtSecret = vars.JOIN_JWT_SECRET ?? ''
  const allowedWebOrigins = vars.ALLOWED_WEB_ORIGINS ?? ''
  const allowDiscordActivityOrigins = vars.ALLOW_DISCORD_ACTIVITY_ORIGINS ?? 'true'
  const args = [
    'deploy',
    '-c',
    'partykit.json',
    '--var',
    `JOIN_VERIFY=${joinVerify}`,
    '--var',
    `WORD_PROFANITY_FILTER=${wordProfanity}`,
    '--var',
    `JOIN_JWT_REQUIRED=${joinJwtRequired}`,
    '--var',
    `JOIN_JWT_SECRET=${joinJwtSecret}`,
    '--var',
    `ALLOWED_WEB_ORIGINS=${allowedWebOrigins}`,
    '--var',
    `ALLOW_DISCORD_ACTIVITY_ORIGINS=${allowDiscordActivityOrigins}`,
  ]
  if (vars.PARTYKIT_DEPLOY_NAME?.trim()) {
    args.push('-n', vars.PARTYKIT_DEPLOY_NAME.trim())
  }
  console.log(
    `[deploy] partykit deploy (JOIN_VERIFY=${joinVerify}, WORD_PROFANITY_FILTER=${wordProfanity}, JOIN_JWT_REQUIRED=${joinJwtRequired}, ALLOWED_WEB_ORIGINS=${allowedWebOrigins ? '[set]' : '[empty]'})`
  )
  runPartykit(args)
  console.log('[deploy] partykit done')
}

function cmdPages(vars) {
  const project = vars.CF_PAGES_PROJECT_NAME?.trim()
  if (!project) {
    console.error('[deploy] CF_PAGES_PROJECT_NAME is required in .env.deploy for Pages deploy.')
    process.exit(1)
  }
  const env = withDeployEnv(vars)
  console.log('[deploy] npm run build (VITE_* from .env.deploy)')
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (build.error) throw build.error
  if (build.status !== 0 && build.status !== null) process.exit(build.status)

  const branch = vars.CF_PAGES_BRANCH?.trim()
  const pagesArgs = ['pages', 'deploy', 'dist', '--project-name', project]
  if (branch) {
    pagesArgs.push('--branch', branch)
    console.log(`[deploy] wrangler pages deploy dist → ${project} (branch=${branch})`)
  } else {
    console.log(`[deploy] wrangler pages deploy dist → ${project}`)
  }
  runWrangler(pagesArgs, { cwd: root, env })
  console.log('[deploy] pages done')
}

function cmdAll(vars) {
  cmdWorker(vars)
  cmdPartykit(vars)
  cmdPages(vars)
  console.log('[deploy] all targets finished.')
}

const commands = { sync: cmdSync, worker: cmdWorker, partykit: cmdPartykit, pages: cmdPages, all: cmdAll }

const cmd = process.argv[2] || 'all'
if (!commands[cmd]) {
  console.error(`[deploy] Unknown command: ${cmd}`)
  console.error(`[deploy] Use: ${Object.keys(commands).join(', ')}`)
  process.exit(1)
}

const { vars } = loadDeployEnv()
commands[cmd](vars)
