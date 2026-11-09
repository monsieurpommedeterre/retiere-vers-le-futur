import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Libellé accessible (lu par les lecteurs d'écran). */
  label: string;
  format?: (value: number) => string;
  /** Hauteur d'une ligne en px. */
  itemHeight?: number;
  /** Nombre de lignes visibles (impair). */
  visible?: number;
  disabled?: boolean;
}

/**
 * Roulette façon iOS : une liste défilante avec accrochage (scroll-snap) sur la ligne centrale.
 * Fonctionne au doigt, à la molette, au clic sur une ligne et aux flèches du clavier.
 */
export function WheelPicker({
  value,
  min,
  max,
  onChange,
  label,
  format = String,
  itemHeight = 36,
  visible = 5,
  disabled = false,
}: WheelPickerProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  const userScrolling = useRef(false);

  const count = max - min + 1;
  const pad = ((visible - 1) / 2) * itemHeight;
  const indexOf = useCallback((v: number) => Math.min(count - 1, Math.max(0, v - min)), [count, min]);

  // Positionne la roulette sur la valeur (au montage et quand la valeur change de l'extérieur).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || userScrolling.current) return;
    const index = indexOf(value);
    if (Math.round(el.scrollTop / itemHeight) !== index) el.scrollTop = index * itemHeight;
  }, [value, indexOf, itemHeight]);

  const settle = useCallback(() => {
    const el = scroller.current;
    userScrolling.current = false;
    if (!el) return;
    const next = min + Math.min(count - 1, Math.max(0, Math.round(el.scrollTop / itemHeight)));
    if (next !== value) onChange(next);
  }, [count, itemHeight, min, onChange, value]);

  const onScroll = () => {
    userScrolling.current = true;
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(settle, 120);
  };

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const select = (v: number) => {
    const clamped = Math.min(max, Math.max(min, v));
    const el = scroller.current;
    if (el) {
      userScrolling.current = true;
      el.scrollTo({ top: indexOf(clamped) * itemHeight, behavior: 'smooth' });
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(settle, 400);
    }
    if (clamped !== value) onChange(clamped);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      select(value - 1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      select(value + 1);
    }
  };

  const style = {
    height: visible * itemHeight,
    '--wheel-item-h': `${itemHeight}px`,
    '--wheel-pad': `${pad}px`,
  } as CSSProperties;

  return (
    <div className={`wheel${disabled ? ' wheel-disabled' : ''}`} style={style}>
      <div
        ref={scroller}
        className="wheel-scroller"
        role="listbox"
        aria-label={label}
        tabIndex={disabled ? -1 : 0}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
      >
        <div style={{ height: pad }} aria-hidden />
        {Array.from({ length: count }, (_, i) => {
          const v = min + i;
          const selected = v === value;
          return (
            <div
              key={v}
              role="option"
              aria-selected={selected}
              className={`wheel-item${selected ? ' wheel-item-selected' : ''}`}
              onClick={() => select(v)}
            >
              {format(v)}
            </div>
          );
        })}
        <div style={{ height: pad }} aria-hidden />
      </div>
      <div className="wheel-highlight" aria-hidden />
    </div>
  );
}
