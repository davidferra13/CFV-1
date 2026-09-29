import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOCK_STATE_FILE = process.env.OPENCLAW_COLLECTOR_BLOCK_STATE
  || join(__dirname, '..', 'data', 'collector-blocks.json');
const BLOCK_COOLDOWN_MS = Number(process.env.OPENCLAW_BLOCK_COOLDOWN_MS || 24 * 60 * 60 * 1000);
const DEFAULT_USER_AGENT = 'OpenClawPublicCollector/1.0';
const BLOCK_STATUSES = new Set([401, 403, 407, 429]);
const SENSITIVE_QUERY = /^(access_token|api[_-]?key|auth|authorization|code|credential|key|password|session|sig|signature|token)$/i;
const SENSITIVE_HEADERS = new Set([
  'authorization', 'proxy-authorization', 'referer', 'origin',
  'x-client-identifier', 'x-csrf-token', 'x-page-view-id',
  'x-request-id', 'x-amz-security-token',
]);

export class CollectorBlockedError extends Error {
  constructor(message, { host = null, status = null, until = null } = {}) {
    super(message);
    this.name = 'CollectorBlockedError';
    this.code = 'COLLECTOR_BLOCKED';
    this.host = host;
    this.status = status;
    this.until = until;
  }
}function normalizeHeaderEntries(headers = {}) {
  if (headers instanceof Headers) return [...headers.entries()];
  if (Array.isArray(headers)) return headers;
  return Object.entries(headers);
}

function sanitizeCookieHeader(value, allowedNames) {
  if (!value || allowedNames.size === 0) return null;
  const kept = String(value).split(';').map(v => v.trim()).filter(Boolean).filter(pair => {
    const name = pair.split('=', 1)[0]?.trim().toLowerCase();
    return name && allowedNames.has(name);
  });
  return kept.length ? kept.join('; ') : null;
}

export function collectorUserAgent() {
  return process.env.OPENCLAW_COLLECTOR_USER_AGENT || DEFAULT_USER_AGENT;
}

export function sanitizePublicHeaders(headers = {}, policy = {}) {
  const allowedCookieNames = new Set((policy.allowedCookieNames || []).map(v => String(v).toLowerCase()));
  const out = {};
  for (const [rawName, rawValue] of normalizeHeaderEntries(headers)) {
    const name = String(rawName);
    const lower = name.toLowerCase();
    if (lower === 'cookie') {
      const safeCookie = sanitizeCookieHeader(rawValue, allowedCookieNames);
      if (safeCookie) out[name] = safeCookie;
      continue;
    }
    if (SENSITIVE_HEADERS.has(lower) && !(lower === 'authorization' && policy.allowServiceAuthorization)) continue;
    if (lower === 'user-agent') continue;
    out[name] = rawValue;
  }  out['User-Agent'] = collectorUserAgent();
  out.DNT = '1';
  out['Sec-GPC'] = '1';
  return out;
}

export function buildPublicFetchOptions(options = {}) {
  const { collector = {}, headers = {}, ...rest } = options;
  return {
    ...rest,
    credentials: 'omit',
    headers: sanitizePublicHeaders(headers, collector),
  };
}

export function canonicalizeSourceUrl(input) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Unsupported collector protocol: ${url.protocol}`);
  url.username = '';
  url.password = '';
  for (const key of [...url.searchParams.keys()]) {
    if (SENSITIVE_QUERY.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  url.hash = '';
  return url.toString();
}

export function sourceFingerprint(input) {
  return createHash('sha256').update(canonicalizeSourceUrl(input)).digest('hex').slice(0, 32);
}

export function redactUrlForLog(input) {
  const url = new URL(canonicalizeSourceUrl(input));
  return `${url.origin}${url.pathname}`;
}

export function isBlockStatus(status) {
  return BLOCK_STATUSES.has(Number(status));
}function readBlockState() {
  try {
    if (!existsSync(BLOCK_STATE_FILE)) return {};
    return JSON.parse(readFileSync(BLOCK_STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeBlockState(state) {
  mkdirSync(dirname(BLOCK_STATE_FILE), { recursive: true });
  const temp = `${BLOCK_STATE_FILE}.tmp-${process.pid}`;
  writeFileSync(temp, JSON.stringify(state, null, 2));
  renameSync(temp, BLOCK_STATE_FILE);
}

export function getHostBlock(input) {
  const host = new URL(input).hostname.toLowerCase();
  const state = readBlockState();
  const entry = state[host];
  if (!entry) return null;
  if (!entry.until || Date.parse(entry.until) <= Date.now()) return null;
  return entry;
}

export function assertHostNotBlocked(input) {
  const url = new URL(input);
  const entry = getHostBlock(url);
  if (!entry) return;
  throw new CollectorBlockedError(
    `Collector paused for ${url.hostname} until ${entry.until}`,
    { host: url.hostname, status: entry.status, until: entry.until },
  );
}

export function markHostBlocked(input, status) {
  const url = new URL(input);
  const host = url.hostname.toLowerCase();
  const state = readBlockState();
  const until = new Date(Date.now() + BLOCK_COOLDOWN_MS).toISOString();
  state[host] = { status: Number(status), blockedAt: new Date().toISOString(), until };
  writeBlockState(state);
  return state[host];
}export function assertResponseAllowed(response, input) {
  const rawStatus = typeof response?.status === 'function' ? response.status() : response?.status;
  const status = Number(rawStatus);
  if (!isBlockStatus(status)) return;
  const block = markHostBlocked(input, status);
  const host = new URL(input).hostname;
  throw new CollectorBlockedError(
    `Collector stopped after HTTP ${status} from ${host}`,
    { host, status, until: block.until },
  );
}

export function isIsolatedEgressConfigured() {
  return process.env.OPENCLAW_EGRESS_PROFILE === 'isolated';
}

export function collectorPrivacySummary() {
  return {
    userAgent: collectorUserAgent(),
    credentials: 'omit-by-default',
    isolatedEgress: isIsolatedEgressConfigured(),
    sensitiveHeaders: [...SENSITIVE_HEADERS],
    blockedStatuses: [...BLOCK_STATUSES],
    blockCooldownMs: BLOCK_COOLDOWN_MS,
    blockStateFile: BLOCK_STATE_FILE,
  };
}
