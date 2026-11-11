/**
 * Local reference repository — dev-server only.
 *
 * Reads the Social Value reference folder that lives on this computer (set SV_LOCAL_REPOSITORY in
 * .env.local) and answers the Initiative Generator from it. Nothing here is bundled into the
 * production build, copied into the repo or sent to the backend: the documents stay where they are.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import readXlsx from 'read-excel-file/node';
import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';

type Cell = string | number | boolean | Date | null;
type Sheet = { sheet: string; data: Cell[][] };

const ROUTE = '/__local';
const SKIP_DIRS = new Set(['node_modules', '.git', '.venv', 'venv', '__pycache__', 'dist']);
const TEXT_EXT = new Set(['.pdf', '.docx', '.txt', '.md']);
const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
// A-03 of the Monk Spaces workbook: only these three measures are localised.
const LOCALISED = new Set(['NT1', 'NT18', 'NT19']);

interface FileEntry {
  abs: string;
  rel: string;
  ext: string;
  size: number;
  mtimeMs: number;
}

const str = (v: Cell | undefined): string => (v == null ? '' : String(v).replace(/\r\n/g, '\n').trim());
const num = (v: Cell | undefined): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v ?? '').replace(/[£,\s]/g, ''));
  return v != null && v !== '' && Number.isFinite(n) ? n : null;
};

/** Every file under the folder, skipping nested code checkouts and Office lock files. */
function walk(root: string): FileEntry[] {
  const out: FileEntry[] = [];
  const visit = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (dir !== root && entries.some((e) => e.name === '.git')) return; // a cloned repo, not reference material
    for (const e of entries) {
      if (e.name.startsWith('~$') || e.name.startsWith('.')) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) visit(abs);
      } else if (e.isFile()) {
        const st = fs.statSync(abs);
        out.push({ abs, rel: path.relative(root, abs).split(path.sep).join('/'), ext: path.extname(e.name).toLowerCase(), size: st.size, mtimeMs: st.mtimeMs });
      }
    }
  };
  visit(root);
  return out;
}

/** Rows of a sheet as objects keyed by the header row (the first row containing `anchor`). */
function table(sheet: Sheet | undefined, anchor: string): Record<string, Cell>[] {
  if (!sheet) return [];
  const headerIdx = sheet.data.findIndex((r) => r.some((c) => str(c).toLowerCase() === anchor.toLowerCase()));
  if (headerIdx < 0) return [];
  const header = sheet.data[headerIdx].map((c) => str(c));
  return sheet.data
    .slice(headerIdx + 1)
    .filter((r) => r.some((c) => c != null && str(c) !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? null]).filter(([h]) => h !== '')));
}

/** First value whose column title starts with one of the given prefixes. */
function pick(row: Record<string, Cell>, ...prefixes: string[]): Cell {
  for (const p of prefixes) {
    const key = Object.keys(row).find((k) => k.toLowerCase().startsWith(p.toLowerCase()));
    if (key && row[key] != null && str(row[key]) !== '') return row[key];
  }
  return null;
}

function classify(rel: string): string {
  const p = rel.toLowerCase();
  const name = p.split('/').pop() ?? p;
  if (/feedback|outcome/.test(name)) return 'feedback';
  if (p.includes('previous responses') || p.includes('past responses')) return 'past-response';
  if (p.includes('new requests')) return /policy/.test(name) ? 'policy' : 'request';
  if (/policy|strategy|statement/.test(name)) return 'policy';
  if (/schedule|ccn\d|annex/.test(name)) return 'contract';
  if (p.includes('ppn') || /social-value-model/.test(name)) return 'framework';
  if (p.includes('tom system guides')) return 'guide';
  return 'other';
}

async function fileText(entry: FileEntry): Promise<string> {
  if (entry.ext === '.docx') return (await mammoth.extractRawText({ path: entry.abs })).value;
  if (entry.ext === '.pdf') return bufferText(fs.readFileSync(entry.abs), '.pdf');
  return fs.readFileSync(entry.abs, 'utf8');
}

async function bufferText(buf: Buffer, ext: string): Promise<string> {
  if (ext === '.docx') return (await mammoth.extractRawText({ buffer: buf })).value;
  if (ext === '.pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
  return buf.toString('utf8');
}

function createRepository(root: string) {
  const textCache = new Map<string, { mtimeMs: number; text: string }>();
  let knowledgeCache: { stamp: string; value: unknown } | null = null;

  async function textOf(entry: FileEntry): Promise<string> {
    const hit = textCache.get(entry.abs);
    if (hit && hit.mtimeMs === entry.mtimeMs) return hit.text;
    let text = '';
    try {
      text = (await fileText(entry)).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
    } catch {
      text = '';
    }
    textCache.set(entry.abs, { mtimeMs: entry.mtimeMs, text });
    return text;
  }

  async function knowledge(refresh: boolean) {
    const files = walk(root);
    const stamp = files.map((f) => `${f.rel}:${f.mtimeMs}:${f.size}`).join('|');
    if (!refresh && knowledgeCache?.stamp === stamp) return knowledgeCache.value;

    const warnings: string[] = [];
    const workbooks: { file: FileEntry; sheets: Sheet[] }[] = [];
    for (const f of files.filter((x) => (x.ext === '.xlsx' || x.ext === '.xlsm') && x.size < MAX_FILE_BYTES)) {
      try {
        workbooks.push({ file: f, sheets: (await readXlsx(f.abs)) as Sheet[] });
      } catch {
        warnings.push(`Could not read ${f.rel}.`);
      }
    }
    // Newest copy wins when the same workbook is saved in more than one place.
    const newest = (has: string[]) =>
      workbooks.filter((w) => has.every((s) => w.sheets.some((x) => x.sheet === s))).sort((a, b) => b.file.mtimeMs - a.file.mtimeMs)[0];
    const sheetOf = (w: { sheets: Sheet[] } | undefined, name: string) => w?.sheets.find((s) => s.sheet === name);

    const library = newest(['Patterns', 'Pattern-measures']);
    const oats = newest(['Social Value targets', '2024 Location']);
    const sources: { file: string; modified: string; used_for: string }[] = [];
    const source = (w: { file: FileEntry } | undefined, used_for: string) =>
      w && sources.push({ file: w.file.rel, modified: new Date(w.file.mtimeMs).toISOString(), used_for });

    // Measures: proxy values from the library's Measures tab (its yearly clock), wording from the OATS workbook.
    const measures = new Map<string, Record<string, unknown>>();
    for (const r of table(sheetOf(oats, 'Social Value targets'), 'New Ref')) {
      const code = str(pick(r, 'New Ref'));
      if (!/^NT\d+[a-z]?$/i.test(code)) continue;
      measures.set(code, {
        code,
        theme: str(pick(r, 'Theme')),
        outcome: str(pick(r, 'Outcome')),
        name: str(pick(r, 'Measure')),
        unit: str(pick(r, 'Units')),
        proxy_gbp: num(pick(r, 'Proxy Value')),
        proxy_year: null,
        source: 'Open Access TOM System workbook',
        definition: str(pick(r, 'Definition')),
        unit_guidance: str(pick(r, 'Unit Guidance')),
        target_guidance: str(pick(r, 'Target Guidance')),
        evidence_required: '',
        localised: LOCALISED.has(code)
      });
    }
    for (const r of table(sheetOf(oats, 'Social Value delivered'), 'New Ref')) {
      const m = measures.get(str(pick(r, 'New Ref')));
      if (m) m.evidence_required = str(pick(r, 'Evidence Requirements'));
    }
    for (const r of table(sheetOf(library, 'Measures'), 'Code')) {
      const code = str(pick(r, 'Code'));
      if (!/^NT\d+[a-z]?$/i.test(code)) continue;
      const base = measures.get(code) ?? { code, definition: '', unit_guidance: '', target_guidance: '', evidence_required: '', localised: LOCALISED.has(code) };
      measures.set(code, {
        ...base,
        theme: str(pick(r, 'Theme')) || base.theme,
        outcome: str(pick(r, 'Outcome')) || base.outcome,
        name: str(pick(r, 'Measure')) || base.name,
        unit: str(pick(r, 'Unit')) || base.unit,
        proxy_gbp: num(pick(r, 'Proxy value')) ?? base.proxy_gbp ?? null,
        proxy_year: num(pick(r, 'Proxy year')),
        source: str(pick(r, 'Source')) || base.source
      });
    }

    const regions = table(sheetOf(oats, '2024 Location'), 'Region')
      .map((r) => ({ region: str(pick(r, 'Region')), median_wage_gbp: num(pick(r, 'MedianWage')), regional_gva: num(pick(r, 'RegionalGVA')) }))
      .filter((r) => r.region && r.median_wage_gbp != null);
    const industries = table(sheetOf(oats, '2024 Industry'), 'GVA Multiplier')
      .map((r) => ({ industry: str(pick(r, 'Industry')), gva_multiplier: num(pick(r, 'GVA Multiplier')) }))
      .filter((r) => r.industry && r.gva_multiplier != null);

    // Patterns and the measures each one generates (pattern ID is only written on a pattern's first row).
    const links = new Map<string, { code: string; primary: boolean; basis: string }[]>();
    let current = '';
    for (const r of table(sheetOf(library, 'Pattern-measures'), 'Measure code')) {
      current = str(pick(r, 'Pattern ID')) || current;
      const code = str(pick(r, 'Measure code'));
      if (!current || !code) continue;
      links.set(current, [...(links.get(current) ?? []), { code, primary: /^y/i.test(str(pick(r, 'Primary'))), basis: str(pick(r, 'Unit driver')) }]);
    }
    const patterns = table(sheetOf(library, 'Patterns'), 'Pattern ID')
      .map((r) => {
        const id = str(pick(r, 'Pattern ID'));
        return {
          id,
          name: str(pick(r, 'Name')),
          family: str(pick(r, 'Family')),
          theme_concepts: str(pick(r, 'Theme concepts')).split(/[;,]/).map((s) => s.trim()).filter(Boolean),
          what: str(pick(r, 'What it is')),
          who_benefits: str(pick(r, 'Who benefits')),
          delivered_by: str(pick(r, 'Delivered by')),
          unit_driver: str(pick(r, 'Unit driver')),
          typical_scale: str(pick(r, 'Typical scale')),
          needs: str(pick(r, 'Needs to deliver')),
          where_fits: str(pick(r, 'Where it fits')),
          additionality: str(pick(r, 'Additionality')),
          status: str(pick(r, 'Status')) || 'Active',
          measures: links.get(id) ?? [],
          origin: 'library'
        };
      })
      .filter((p) => /^[A-Z]+-\d+/i.test(p.id) && p.name);

    const measure_mac = table(sheetOf(library, 'Measure-MAC map'), 'Measure code')
      .map((r) => ({
        code: str(pick(r, 'Measure code')),
        framework_version: str(pick(r, 'Framework version')),
        mac: str(pick(r, 'MAC')),
        serves: str(pick(r, 'Theme / outcome')),
        note: str(pick(r, 'Note'))
      }))
      .filter((r) => /^NT\d+[a-z]?$/i.test(r.code) && r.framework_version);

    source(library, 'Patterns, pattern-measure links, proxy values, Measure-MAC map');
    source(oats, 'Measure definitions, unit guidance, evidence requirements, regions and industries');
    if (!library) warnings.push('No pattern library found (a workbook with "Patterns" and "Pattern-measures" sheets).');
    if (!oats) warnings.push('No Open Access TOM System workbook found (sheets "Social Value targets" and "2024 Location").');

    const documents = files
      .filter((f) => TEXT_EXT.has(f.ext) && f.size < MAX_FILE_BYTES)
      .map((f) => ({ path: f.rel, name: path.basename(f.rel), kind: classify(f.rel), modified: new Date(f.mtimeMs).toISOString(), size: f.size }));

    const value = {
      connected: true,
      folder: path.basename(root),
      loaded_at: new Date().toISOString(),
      sources,
      measures: [...measures.values()],
      regions,
      industries,
      patterns,
      measure_mac,
      documents,
      warnings
    };
    knowledgeCache = { stamp, value };
    return value;
  }

  /** Where each set of terms appears in past responses and contract schedules. Only snippets leave this process. */
  async function evidence(queries: { id: string; terms: string[] }[], kinds: string[]) {
    const docs = walk(root).filter((f) => TEXT_EXT.has(f.ext) && f.size < MAX_FILE_BYTES && kinds.includes(classify(f.rel)));
    const results: Record<string, { file: string; name: string; kind: string; hits: number; snippet: string }[]> = {};
    const texts = await Promise.all(docs.map(async (d) => ({ d, text: await textOf(d) })));
    for (const q of queries) {
      const terms = q.terms.filter((t) => t.trim().length > 2).slice(0, 12);
      if (!terms.length) continue;
      const re = new RegExp(terms.map((t) => t.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')).join('|'), 'gi');
      const found = [];
      for (const { d, text } of texts) {
        const matches = [...text.matchAll(re)];
        if (!matches.length) continue;
        const at = matches[0].index ?? 0;
        const start = Math.max(0, text.lastIndexOf('.', at - 1) + 1, at - 220);
        const end = Math.min(text.length, at + 260);
        found.push({ file: d.rel, name: path.basename(d.rel), kind: classify(d.rel), hits: matches.length, snippet: text.slice(start, end).replace(/\s+/g, ' ').trim() });
      }
      results[q.id] = found.sort((a, b) => b.hits - a.hits).slice(0, 6);
    }
    return { results };
  }

  async function text(rel: string) {
    const abs = path.resolve(root, rel);
    if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error('Path is outside the reference folder.');
    const st = fs.statSync(abs);
    const entry: FileEntry = { abs, rel, ext: path.extname(abs).toLowerCase(), size: st.size, mtimeMs: st.mtimeMs };
    if (!TEXT_EXT.has(entry.ext)) throw new Error('Only PDF, Word and text files can be read.');
    return { name: path.basename(abs), text: await textOf(entry) };
  }

  return { knowledge, evidence, text };
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('File is too large.'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Loopback only: the reference folder is never offered to other machines on the network. */
function isLoopback(req: IncomingMessage): boolean {
  const addr = req.socket.remoteAddress ?? '';
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

export function localRepository(folder: string | undefined): Plugin {
  const root = folder ? path.resolve(folder.trim().replace(/^["']|["']$/g, '')) : '';
  const usable = root !== '' && fs.existsSync(root) && fs.statSync(root).isDirectory();
  const repo = usable ? createRepository(root) : null;

  return {
    name: 'sv-local-repository',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(ROUTE, async (req, res) => {
        if (!isLoopback(req)) return send(res, 403, { detail: 'The local reference folder is only available on this computer.' });
        const url = new URL(req.url ?? '/', 'http://localhost');
        try {
          if (!repo) {
            return send(res, 200, {
              connected: false,
              reason: root ? `Folder not found: ${root}` : 'SV_LOCAL_REPOSITORY is not set in .env.local.'
            });
          }
          if (url.pathname === '/knowledge') return send(res, 200, await repo.knowledge(url.searchParams.has('refresh')));
          if (url.pathname === '/text') return send(res, 200, await repo.text(url.searchParams.get('path') ?? ''));
          if (url.pathname === '/evidence' && req.method === 'POST') {
            const body = JSON.parse((await readBody(req, 1024 * 1024)).toString('utf8'));
            return send(res, 200, await repo.evidence(body.queries ?? [], body.kinds ?? ['past-response', 'contract']));
          }
          if (url.pathname === '/extract' && req.method === 'POST') {
            const name = url.searchParams.get('name') ?? 'file.txt';
            const ext = path.extname(name).toLowerCase();
            if (!TEXT_EXT.has(ext)) return send(res, 415, { detail: 'Use a PDF, Word (.docx) or text file.' });
            const text = await bufferText(await readBody(req, MAX_UPLOAD_BYTES), ext);
            return send(res, 200, { name, text: text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') });
          }
          return send(res, 404, { detail: 'Unknown local repository route.' });
        } catch (e) {
          return send(res, 500, { detail: (e as Error).message });
        }
      });
    }
  };
}
