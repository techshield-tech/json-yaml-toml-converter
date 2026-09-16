// Pure, framework-free parse/serialize logic for JSON, YAML, and TOML.

import { parseAllDocuments, stringify as stringifyYaml } from 'yaml';
import { parse as parseToml, stringify as stringifyToml, TomlDate } from 'smol-toml';

export type DataFormat = 'json' | 'yaml' | 'toml';
export type IndentOption = '2' | '4' | 'tab';

export const FORMAT_LABELS: Record<DataFormat, string> = {
  json: 'JSON',
  yaml: 'YAML',
  toml: 'TOML',
};

export interface ConvertOptions {
  indent: IndentOption;
  sortKeys: boolean;
}

export interface ConvertResult {
  output: string;
  warnings: string[];
}

/** Error carrying a 1-based position in the source document. */
export class ParseError extends Error {
  line: number | null;
  column: number | null;

  constructor(message: string, line: number | null = null, column: number | null = null) {
    super(message);
    this.name = 'ParseError';
    this.line = line;
    this.column = column;
  }
}

function lineColumnAtOffset(input: string, offset: number): { line: number; column: number } {
  const end = Math.max(0, Math.min(offset, input.length));
  let line = 1;
  let column = 1;
  for (let i = 0; i < end; i++) {
    if (input[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const lineColumn = message.match(/line (\d+) column (\d+)/i);
    if (lineColumn) {
      const clean = message.replace(/\s*\(line \d+ column \d+\)/i, '');
      throw new ParseError(clean, Number(lineColumn[1]), Number(lineColumn[2]));
    }
    const position = message.match(/position (\d+)/i);
    if (position) {
      const { line, column } = lineColumnAtOffset(input, Number(position[1]));
      throw new ParseError(message.replace(/\s*at position \d+/i, ''), line, column);
    }
    throw new ParseError(message);
  }
}

function parseYaml(input: string): unknown {
  const docs = parseAllDocuments(input, { merge: true });
  // parseAllDocuments returns an EmptyStream (array-like with no docs) for blank input.
  const list = Array.isArray(docs) ? docs : [];
  for (const doc of list) {
    const error = doc.errors[0];
    if (error) {
      const firstLine = error.message.split('\n')[0].replace(/ at line \d+, column \d+:?$/, '');
      const pos = error.linePos?.[0];
      throw new ParseError(firstLine, pos?.line ?? null, pos?.col ?? null);
    }
  }
  const values = list.map((doc) => doc.toJS({ maxAliasCount: 10000 }) as unknown);
  if (values.length === 0) return null;
  return values.length === 1 ? values[0] : values;
}

function parseTomlDocument(input: string): unknown {
  try {
    return parseToml(input);
  } catch (err) {
    if (err instanceof Error && 'line' in err && 'column' in err) {
      const message = err.message.split('\n')[0].replace(/^Invalid TOML document:\s*/, '');
      throw new ParseError(message, Number(err.line) || null, Number(err.column) || null);
    }
    throw new ParseError(err instanceof Error ? err.message : String(err));
  }
}

/** Parses `input` in the given format. Throws ParseError on invalid input. */
export function parseDocument(input: string, format: DataFormat): unknown {
  if (format === 'json') return parseJson(input);
  if (format === 'yaml') return parseYaml(input);
  return parseTomlDocument(input);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

/** Deep-copies `value`, turning TOML dates into strings and optionally sorting keys. */
function normalize(value: unknown, sortKeys: boolean, keepDates: boolean): unknown {
  if (value instanceof TomlDate) return keepDates ? value : value.toISOString();
  if (value instanceof Date) return keepDates ? value : value.toISOString();
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map((item) => normalize(item, sortKeys, keepDates));
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (sortKeys) entries.sort(([a], [b]) => a.localeCompare(b));
    const result: Record<string, unknown> = {};
    for (const [key, entry] of entries) result[key] = normalize(entry, sortKeys, keepDates);
    return result;
  }
  return value;
}

/** Removes null/undefined values (TOML has no null). Returns the number removed. */
function stripNulls(value: unknown): { value: unknown; removed: number } {
  let removed = 0;
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      const out: unknown[] = [];
      for (const item of node) {
        if (item === null || item === undefined) removed++;
        else out.push(walk(item));
      }
      return out;
    }
    if (isPlainObject(node)) {
      const out: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(node)) {
        if (entry === null || entry === undefined) removed++;
        else out[key] = walk(entry);
      }
      return out;
    }
    return node;
  };
  return { value: walk(value), removed };
}

function containsNonFinite(value: unknown): boolean {
  if (typeof value === 'number') return !Number.isFinite(value);
  if (Array.isArray(value)) return value.some(containsNonFinite);
  if (isPlainObject(value)) return Object.values(value).some(containsNonFinite);
  return false;
}

/** Serializes `value` to the target format. Throws Error when it cannot be represented. */
export function serializeDocument(
  value: unknown,
  format: DataFormat,
  options: ConvertOptions,
): ConvertResult {
  const warnings: string[] = [];
  const data = normalize(value, options.sortKeys, format === 'toml');

  if (format === 'json') {
    if (containsNonFinite(data)) {
      warnings.push('Infinity/NaN values have no JSON equivalent and were written as null.');
    }
    const indent = options.indent === 'tab' ? '\t' : Number(options.indent);
    return { output: JSON.stringify(data, null, indent) ?? 'null', warnings };
  }

  if (format === 'yaml') {
    const output = stringifyYaml(data, {
      indent: options.indent === '4' ? 4 : 2,
      lineWidth: 0,
      aliasDuplicateObjects: false,
    });
    return { output, warnings };
  }

  if (!isPlainObject(data)) {
    const kind = Array.isArray(data) ? 'an array' : data === null ? 'null' : `a ${typeof data}`;
    throw new Error(
      `TOML documents must be a table (key/value object) at the root, but the input is ${kind}.`,
    );
  }
  const { value: cleaned, removed } = stripNulls(data);
  if (removed > 0) {
    warnings.push(
      `${removed} null ${removed === 1 ? 'value was' : 'values were'} omitted — TOML has no null type.`,
    );
  }
  try {
    return { output: stringifyToml(cleaned), warnings };
  } catch (err) {
    throw new Error(`Cannot convert to TOML: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Parses `input` as `from` and serializes it as `to`. */
export function convert(
  input: string,
  from: DataFormat,
  to: DataFormat,
  options: ConvertOptions,
): ConvertResult {
  return serializeDocument(parseDocument(input, from), to, options);
}

/** Best-effort guess of the format of `input`, or null if none parses. */
export function detectFormat(input: string): DataFormat | null {
  const text = input.trim();
  if (text === '') return null;
  const order: DataFormat[] = ['json', 'toml', 'yaml'];
  for (const format of order) {
    try {
      const value = parseDocument(text, format);
      // Almost any plain text is a valid YAML scalar; only accept structured YAML.
      if (format === 'yaml' && (value === null || typeof value !== 'object')) continue;
      return format;
    } catch {
      // try next
    }
  }
  return null;
}

/** Formats a ParseError (or any error) into a single display string. */
export function describeError(error: unknown, format: DataFormat | null): string {
  const prefix = format ? `Invalid ${FORMAT_LABELS[format]}: ` : '';
  if (error instanceof ParseError) {
    const position =
      error.line !== null
        ? ` (line ${error.line}${error.column !== null ? `, column ${error.column}` : ''})`
        : '';
    return `${prefix}${error.message}${position}`;
  }
  return error instanceof Error ? error.message : String(error);
}
