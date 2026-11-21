#!/usr/bin/env node
/**
 * Stream health check — probes every active station's stream URLs and
 * reports channels that are down or whose primary link fails.
 *
 *   node scripts/check_streams.mjs            # probe + write report
 *   node scripts/check_streams.mjs --cached   # reuse last results JSON
 *
 * Writes docs/stream-health-report.md and .stream-check-cache.json.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const TIMEOUT_MS = 9000;
const CONCURRENCY = 24;

const stations = JSON.parse(readFileSync("data/stations.json", "utf8")).filter(
  (s) => s.is_active !== false
);

const urlSet = new Set();
for (const s of stations) for (const v of s.streams) urlSet.add(v.url);
const urls = [...urlSet];

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "*/*" },
    });
    try {
      await res.body?.cancel();
    } catch {
      /* body already closed */
    }
    const ok = res.status >= 200 && res.status < 400;
    const kind = ok
      ? "ok"
      : res.status === 401 || res.status === 403
        ? "blocked"
        : "http";
    return { status: res.status, ok, kind };
  } catch (e) {
    const kind = e.name === "AbortError" ? "timeout" : "error";
    return { status: 0, ok: false, kind, err: String(e?.message ?? e).slice(0, 100) };
  } finally {
    clearTimeout(timer);
  }
}

async function pool(items, worker, n) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await worker(items[idx], idx);
      }
    })
  );
  return results;
}

const useCache = process.argv.includes("--cached");
let map;
if (useCache && existsSync(".stream-check-cache.json")) {
  map = new Map(Object.entries(JSON.parse(readFileSync(".stream-check-cache.json", "utf8"))));
  console.log(`reusing cached results for ${map.size} urls`);
} else {
  console.log(`probing ${urls.length} unique stream urls (${stations.length} stations)...`);
  const results = await pool(urls, probe, CONCURRENCY);
  map = new Map(urls.map((u, i) => [u, results[i]]));
  writeFileSync(".stream-check-cache.json", JSON.stringify(Object.fromEntries(map), null, 1));
}

const label = (r) =>
  r.ok ? `ok ${r.status}` : r.kind === "http" ? `HTTP ${r.status}` : r.kind;

// Per-station classification
const down = []; // every stream failed
const degraded = []; // primary failed but an alternate works
let okCount = 0;
const langCount = {};

for (const s of stations) {
  if (!s.streams?.length) continue;
  const seen = [...new Set(s.streams.map((v) => v.url))];
  const evals = seen.map((u) => ({ url: u, r: map.get(u) ?? { ok: false, kind: "error", status: 0 } }));
  const primary = evals.find((e) => e.url === s.streams[0].url) ?? evals[0];
  const anyOk = evals.some((e) => e.r.ok);
  const lang = (s.languages?.[0] ?? "other");
  langCount[lang] = (langCount[lang] ?? 0) + 1;

  if (!anyOk) {
    down.push({ name: s.name, url: s.streams[0].url, lang, evals });
  } else if (!primary.r.ok) {
    degraded.push({ name: s.name, url: s.streams[0].url, lang, evals });
  } else {
    okCount++;
  }
}

const byLang = (list) => {
  const g = {};
  for (const it of list) (g[it.lang] ??= []).push(it);
  return Object.entries(g).sort((a, b) => b[1].length - a[1].length);
};

const esc = (u) => u.replace(/\|/g, "%7C");
const row = (it) =>
  `| ${it.name.replace(/\|/g, "\\|")} | ${esc(it.url)} | ${it.evals.map((e) => `${e.url === it.url ? "*" : ""}${label(e.r)}`).join("; ")} |`;

let md = `# Stream health check — ${new Date().toISOString().slice(0, 10)}\n\n`;
md += `Checked ${urls.length} unique stream URLs across ${stations.length} active stations.\n\n`;
md += `- **Working**: ${okCount}\n- **Down** (all streams fail): ${down.length}\n- **Primary link down** (alternate works): ${degraded.length}\n\n`;
md += `Result legend: ok = HTTP 2xx/3xx, blocked = 401/403, timeout/error = unreachable.\n`;
md += `\`*\` marks the primary stream (\`streams[0]\`) the app plays first.\n\n`;

md += `## Down channels (no working stream)\n\n`;
for (const [lang, items] of byLang(down)) {
  md += `### ${lang[0].toUpperCase() + lang.slice(1)} — ${items.length}\n\n`;
  md += `| Channel | Primary stream URL | All streams status |\n|---|---|---|\n`;
  for (const it of items.sort((a, b) => a.name.localeCompare(b.name))) md += row(it) + "\n";
  md += "\n";
}
if (!down.length) md += "_None._\n\n";

md += `## Primary link down (backup stream works)\n\n`;
for (const [lang, items] of byLang(degraded)) {
  md += `### ${lang[0].toUpperCase() + lang.slice(1)} — ${items.length}\n\n`;
  md += `| Channel | Primary stream URL | All streams status |\n|---|---|---|\n`;
  for (const it of items.sort((a, b) => a.name.localeCompare(b.name))) md += row(it) + "\n";
  md += "\n";
}
if (!degraded.length) md += "_None._\n\n";

writeFileSync("docs/stream-health-report.md", md);

console.log(`\nworking: ${okCount} | down: ${down.length} | primary-down: ${degraded.length}`);
console.log(`report: docs/stream-health-report.md`);
for (const [lang, items] of byLang(down)) console.log(`  down/${lang}: ${items.length}`);
