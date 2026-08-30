/**
 * Public surface.
 *
 * Section and Heading exist in both primitives and marketing. The marketing
 * versions are the ones the landing surfaces use -- wider rhythm, centred by
 * default -- so they take the unqualified names and the originals are exported
 * under explicit ones rather than being shadowed silently.
 */

export {
  Action,
  Snippet,
  AddressLabel,
  Panel,
  Empty,
  Skeleton,
  Section as ContentSection,
  Heading as ContentHeading,
} from './primitives';

export * from './standing';
export * from './proof-trace';
export * from './marketing';
export * from './registry-console';
export * from './chain-strip';
