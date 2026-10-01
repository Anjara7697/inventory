import { cx } from './ui';

/** Inventory logo glyph — inherits the text color (currentColor). */
export const LogoGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="137 106 224 224" fill="currentColor" aria-hidden className={className}>
    <polygon points="323,207 321,209 320,209 312,217 311,217 304,224 303,224 295,232 294,232 287,239 286,239 278,247 277,247 269,255 268,255 263,260 263,324 321,324 322,323 322,322 323,321" />
    <polygon points="175,207 175,322 177,324 234,324 234,259 231,256 230,256 222,248 221,248 213,240 212,240 205,233 204,233 196,225 195,225 188,218 187,218 179,210 178,210" />
    <polygon points="192,194 199,201 200,201 208,209 209,209 217,217 218,217 226,225 227,225 235,233 236,233 244,241 245,241 248,244 250,244 254,240 255,240 263,232 264,232 272,224 273,224 281,216 282,216 290,208 291,208 299,200 300,200 306,194" />
    <polygon points="176,112 176,113 175,114 175,172 176,173 322,173 322,172 323,171 323,114 321,112" />
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
    <LogoGlyph className="h-[20px] w-[20px]" />
  </span>
);
