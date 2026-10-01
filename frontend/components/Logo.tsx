import { cx } from './ui';

/** Inventory logo glyph — inherits the text color (currentColor). */
export const LogoGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.6482 10.1305L15.8785 7.02583L7.02979 22.5499H10.5278L17.6482 10.1305ZM19.8798 14.0457L18.11 17.1983L19.394 19.4511H16.8453L15.1056 22.5499H24.7272L19.8798 14.0457Z"
    />
  </svg>
);

/** Logo tile: glyph on an accent square (inverse = for use on an accent background). */
export const LogoMark = ({ inverse }: { inverse?: boolean }) => (
  <span
    aria-hidden
    className={cx(
      'grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md',
      inverse ? 'bg-on-accent text-accent' : 'bg-accent text-on-accent',
    )}
  >
    <LogoGlyph className="h-[22px] w-[22px]" />
  </span>
);
