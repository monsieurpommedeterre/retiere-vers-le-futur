import { WheelPicker } from './WheelPicker';

interface DurationPickerProps {
  /** Durée en secondes (0 à 59 min 59 s). */
  seconds: number;
  onChange: (seconds: number) => void;
  label: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

const pad2 = (v: number) => String(v).padStart(2, '0');

/** Deux roulettes minutes : secondes, réglables à la seconde près. */
export function DurationPicker({ seconds, onChange, label, size = 'md', disabled = false }: DurationPickerProps) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const itemHeight = size === 'md' ? 36 : 28;
  const visible = 3;

  return (
    <div className={`duration duration-${size}`} role="group" aria-label={label}>
      <div className="duration-col">
        <WheelPicker
          value={minutes}
          min={0}
          max={59}
          format={pad2}
          onChange={(m) => onChange(m * 60 + secs)}
          label={`${label} : minutes`}
          itemHeight={itemHeight}
          visible={visible}
          disabled={disabled}
        />
        <span className="duration-unit">min</span>
      </div>
      <span className="duration-colon" aria-hidden>
        :
      </span>
      <div className="duration-col">
        <WheelPicker
          value={secs}
          min={0}
          max={59}
          format={pad2}
          onChange={(s) => onChange(minutes * 60 + s)}
          label={`${label} : secondes`}
          itemHeight={itemHeight}
          visible={visible}
          disabled={disabled}
        />
        <span className="duration-unit">sec</span>
      </div>
    </div>
  );
}
