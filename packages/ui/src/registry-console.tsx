'use client';

/**
 * RegistryConsole — the signature artifact.
 *
 * A populated view of the registry, floated below the hero and bleeding off the
 * bottom of its section. This is the one custom object the page is built
 * around, and it does the work a paragraph cannot: it shows an address, the
 * facts proven for it, and the three unrelated applications reading those facts
 * to grant three different benefits.
 *
 * It is real interface, not a picture of one. The tabs switch, the rows are
 * laid out by the same primitives the live passport page uses, and the numbers
 * are the ones the contracts actually produce. A faux window drawn from styled
 * divs -- traffic lights, a fake filename, a mock dashboard -- would be the most
 * recognisable machine-made prop there is. The difference between that and this
 * is whether the thing on screen is the product or a drawing of it.
 *
 * Motion is limited to the live indicator and the tab transition. Everything is
 * legible before any of it runs.
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface ConsoleFact {
  label: string;
  detail: string;
  value: string;
  proven: boolean;
}

export interface ConsoleConsumer {
  name: string;
  domain: string;
  before: string;
  after: string;
  reads: string;
}

const TABS = ['Standing', 'Consumers', 'Verification'] as const;
type Tab = (typeof TABS)[number];

export function RegistryConsole({
  address = '0x8f3a…c21b',
  facts,
  consumers,
}: {
  address?: string;
  facts: ConsoleFact[];
  consumers: ConsoleConsumer[];
}) {
  const [tab, setTab] = useState<Tab>('Standing');
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-[1120px]">
      <div className="ambient -top-16" aria-hidden />

      <div className="relative overflow-hidden rounded-[--radius-panel] border border-[--color-line] bg-[--color-surface] shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
        {/* Header. A real toolbar rather than window chrome. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[--color-line] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-1.5">
              {!reduce && (
                <motion.span
                  className="absolute inline-flex size-full rounded-full bg-[--color-accent]"
                  animate={{ opacity: [0.9, 0.2, 0.9] }}
                  transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY }}
                />
              )}
              <span className="relative inline-flex size-1.5 rounded-full bg-[--color-accent]" />
            </span>
            <span className="font-mono text-[12px] text-[--color-ink-muted]">
              CC3 Testnet
            </span>
          </div>

          <span className="font-mono text-[12px] text-[--color-ink-faint]">{address}</span>

          <div className="ml-auto flex items-center gap-1 rounded-full border border-[--color-line] p-1">
            {TABS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTab(option)}
                className={
                  option === tab
                    ? 'rounded-full bg-[--color-accent] px-3.5 py-1.5 text-[12px] text-[--color-accent-ink] transition-colors'
                    : 'rounded-full px-3.5 py-1.5 text-[12px] text-[--color-ink-faint] transition-colors hover:text-[--color-ink-muted]'
                }
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[320px] px-6 py-6">
          {tab === 'Standing' ? <StandingPane facts={facts} /> : null}
          {tab === 'Consumers' ? <ConsumersPane consumers={consumers} /> : null}
          {tab === 'Verification' ? <VerificationPane /> : null}
        </div>
      </div>
    </div>
  );
}

function StandingPane({ facts }: { facts: ConsoleFact[] }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="text-[13px] text-[--color-ink-faint]">Proven standing</div>
          <div className="mt-1.5 font-mono text-[34px] leading-none tracking-tight text-[--color-ink]">
            {facts.filter((f) => f.proven).length}
            <span className="ml-2 text-[13px] text-[--color-ink-faint]">
              of {facts.length} fact types
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[13px] text-[--color-ink-faint]">Cost to read</div>
          <div className="mt-1.5 font-mono text-[20px] tabular-nums text-[--color-ink]">
            1,202 gas
          </div>
        </div>
      </div>

      <div className="mt-8">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="grid grid-cols-[1fr_auto] items-baseline gap-6 border-t border-[--color-line] py-4"
          >
            <div className="min-w-0">
              <div className="text-[13px] text-[--color-ink]">{fact.label}</div>
              <div className="mt-1 font-mono text-[12px] text-[--color-ink-faint]">
                {fact.detail}
              </div>
            </div>

            <div className="flex items-center gap-5">
              <span className="font-mono text-[13px] tabular-nums text-[--color-ink-muted]">
                {fact.value}
              </span>
              <span
                className={
                  fact.proven
                    ? 'font-mono text-[12px] text-[--color-accent]'
                    : 'font-mono text-[12px] text-[--color-ink-faint]'
                }
              >
                {/* Not "none" and not a zero. An address with no proof is
                    unknown, and the console says the true thing. */}
                {fact.proven ? 'proven' : 'unknown'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsumersPane({ consumers }: { consumers: ConsoleConsumer[] }) {
  return (
    <div>
      <p className="max-w-[62ch] text-[13px] leading-relaxed text-[--color-ink-muted]">
        Three contracts reading the same registry. They share no storage, were
        never registered with it, and do not know each other exists.
      </p>

      <div className="mt-7">
        {consumers.map((consumer) => (
          <div
            key={consumer.name}
            className="grid gap-3 border-t border-[--color-line] py-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-8"
          >
            <div>
              <div className="font-mono text-[13px] text-[--color-ink]">{consumer.name}</div>
              <div className="mt-1 text-[12px] text-[--color-ink-faint]">{consumer.domain}</div>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className="font-mono text-[13px] text-[--color-ink-faint] line-through decoration-[--color-line-strong]">
                {consumer.before}
              </span>
              <span className="font-mono text-[13px] text-[--color-accent]">{consumer.after}</span>
              <span className="text-[12px] text-[--color-ink-faint]">
                reads {consumer.reads}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerificationPane() {
  const STEPS = [
    ['Ethereum event', 'Aave V3 Repay, block 20,184,003'],
    ['Attestcoin proof', 'Inclusion verified at 0x…0FD2'],
    ['Receipt status', 'Checked. A reverted transaction still proves.'],
    ['Emitter pinned', 'Matched against the registered Aave Pool.'],
    ['Written', 'One fact. Every application can now read it.'],
  ] as const;

  return (
    <ol>
      {STEPS.map(([title, detail], i) => (
        <li
          key={title}
          className="grid grid-cols-[auto_1fr] items-baseline gap-5 border-t border-[--color-line] py-4"
        >
          <span className="font-mono text-[12px] text-[--color-ink-faint]">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div>
            <div className="text-[13px] text-[--color-ink]">{title}</div>
            <div className="mt-1 text-[12px] text-[--color-ink-faint]">{detail}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
