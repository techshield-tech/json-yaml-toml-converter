import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  Button,
  CodeArea,
  CopyButton,
  ErrorBox,
  Panel,
  SegmentedControl,
  StatusPill,
  Switch,
  Toolbar,
  ToolbarDivider,
  type StatusTone,
} from '@mmoall/tool-kit';
import {
  FORMAT_LABELS,
  ParseError,
  convert,
  describeError,
  detectFormat,
  type DataFormat,
  type IndentOption,
} from './formats';
import { SAMPLES } from './samples';

const FORMAT_OPTIONS: { value: DataFormat; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'toml', label: 'TOML' },
];

const INDENT_OPTIONS: { value: IndentOption; label: string }[] = [
  { value: '2', label: '2 sp' },
  { value: '4', label: '4 sp' },
  { value: 'tab', label: 'Tab' },
];

const FILE_EXTENSIONS: Record<DataFormat, string> = { json: 'json', yaml: 'yaml', toml: 'toml' };
const MIME_TYPES: Record<DataFormat, string> = {
  json: 'application/json',
  yaml: 'application/yaml',
  toml: 'application/toml',
};

type Outcome =
  | { kind: 'empty' }
  | { kind: 'ok'; output: string; warnings: string[] }
  | { kind: 'error'; message: string; parse: boolean; suggestion: DataFormat | null };

function byteSize(value: string): number {
  return new TextEncoder().encode(value).length;
}

function downloadText(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function Tool() {
  const [input, setInput] = useState('');
  const [from, setFrom] = useState<DataFormat>('json');
  const [to, setTo] = useState<DataFormat>('yaml');
  const [indent, setIndent] = useState<IndentOption>('2');
  const [sortKeys, setSortKeys] = useState(false);

  const deferredInput = useDeferredValue(input);

  const outcome = useMemo<Outcome>(() => {
    if (deferredInput.trim() === '') return { kind: 'empty' };
    try {
      const result = convert(deferredInput, from, to, { indent, sortKeys });
      return { kind: 'ok', ...result };
    } catch (err) {
      const parse = err instanceof ParseError;
      const detected = parse ? detectFormat(deferredInput) : null;
      return {
        kind: 'error',
        message: describeError(err, parse ? from : null),
        parse,
        suggestion: detected && detected !== from ? detected : null,
      };
    }
  }, [deferredInput, from, to, indent, sortKeys]);

  const output = outcome.kind === 'ok' ? outcome.output : '';
  const [lastOutput, setLastOutput] = useState('');
  if (outcome.kind === 'ok' && output !== lastOutput) setLastOutput(output);
  const shownOutput = outcome.kind === 'empty' ? '' : outcome.kind === 'ok' ? output : lastOutput;

  // YAML has no tab indentation; TOML output is not indented.
  const indentOptions = to === 'yaml' ? INDENT_OPTIONS.filter((o) => o.value !== 'tab') : INDENT_OPTIONS;
  const effectiveIndent: IndentOption = to === 'yaml' && indent === 'tab' ? '2' : indent;

  const handleSwap = useCallback(() => {
    if (outcome.kind === 'ok') setInput(outcome.output);
    setFrom(to);
    setTo(from);
  }, [outcome, from, to]);

  const handleFromChange = useCallback(
    (value: DataFormat) => {
      if (value === to) setTo(from);
      setFrom(value);
    },
    [from, to],
  );

  const handleToChange = useCallback(
    (value: DataFormat) => {
      if (value === from) setFrom(to);
      setTo(value);
    },
    [from, to],
  );

  const status: { tone: StatusTone; label: string } =
    outcome.kind === 'error' && outcome.parse
      ? { tone: 'danger', label: `Invalid ${FORMAT_LABELS[from]}` }
      : outcome.kind === 'empty'
        ? { tone: 'neutral', label: 'Waiting for input' }
        : { tone: 'success', label: `Valid ${FORMAT_LABELS[from]}` };

  return (
    <div className="flex flex-col gap-3">
      <Toolbar>
        <div className="flex items-center gap-2">
          <span className="pl-1 text-xs font-medium text-[var(--color-muted)]">From</span>
          <SegmentedControl aria-label="Source format" value={from} onChange={handleFromChange} options={FORMAT_OPTIONS} />
        </div>
        <Button variant="ghost" onClick={handleSwap} title="Swap formats (uses the output as new input)" aria-label="Swap formats">
          <SwapIcon />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-muted)]">To</span>
          <SegmentedControl aria-label="Target format" value={to} onChange={handleToChange} options={FORMAT_OPTIONS} />
        </div>
        <ToolbarDivider />
        {to !== 'toml' && (
          <SegmentedControl
            aria-label="Indent width"
            value={effectiveIndent}
            onChange={setIndent}
            options={indentOptions}
          />
        )}
        <Switch checked={sortKeys} onChange={setSortKeys} label="Sort keys" className="px-2" />
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" onClick={() => setInput(SAMPLES[from])}>
            Sample
          </Button>
          <Button variant="ghost" onClick={() => setInput('')} disabled={!input}>
            Clear
          </Button>
        </div>
      </Toolbar>

      {outcome.kind === 'error' && (
        <ErrorBox>
          <span>{outcome.message}</span>
          {outcome.suggestion && (
            <span className="mt-1 block font-sans">
              This looks like {FORMAT_LABELS[outcome.suggestion]}.{' '}
              <button
                type="button"
                onClick={() => outcome.suggestion && handleFromChange(outcome.suggestion)}
                className="font-medium underline underline-offset-2 hover:no-underline"
              >
                Switch source to {FORMAT_LABELS[outcome.suggestion]}
              </button>
            </span>
          )}
        </ErrorBox>
      )}

      {outcome.kind === 'ok' && outcome.warnings.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2.5 text-sm text-[var(--color-muted)]">
          {outcome.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel
          flush
          className="h-[360px] lg:h-[600px]"
          title={
            <>
              {FORMAT_LABELS[from]}
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </>
          }
          actions={<Stats text={input} />}
        >
          <CodeArea
            aria-label={`${FORMAT_LABELS[from]} input`}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Paste or type ${FORMAT_LABELS[from]} here…`}
            autoFocus
          />
        </Panel>

        <Panel
          flush
          className="h-[360px] lg:h-[600px]"
          title={FORMAT_LABELS[to]}
          actions={
            <>
              <Stats text={shownOutput} />
              <span className="hidden sm:contents">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={outcome.kind !== 'ok'}
                  onClick={() => downloadText(output, `converted.${FILE_EXTENSIONS[to]}`, MIME_TYPES[to])}
                >
                  Download
                </Button>
              </span>
              <CopyButton getText={() => output} disabled={outcome.kind !== 'ok'} />
            </>
          }
        >
          <CodeArea
            aria-label={`${FORMAT_LABELS[to]} output`}
            value={shownOutput}
            readOnly
            placeholder={`Converted ${FORMAT_LABELS[to]} will appear here…`}
            className={outcome.kind === 'error' ? 'opacity-50' : ''}
          />
        </Panel>
      </div>
    </div>
  );
}

function SwapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="m17 4 4 4-4 4M21 8H3M7 20l-4-4 4-4M3 16h18" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function Stats({ text }: { text: string }) {
  if (!text) return null;
  const bytes = byteSize(text);
  const lines = text.split('\n').length;
  return (
    <span className="hidden text-xs tabular-nums text-[var(--color-muted)] sm:inline" title={`${bytes} bytes`}>
      {lines.toLocaleString()} {lines === 1 ? 'line' : 'lines'} · {formatBytes(bytes)}
    </span>
  );
}
