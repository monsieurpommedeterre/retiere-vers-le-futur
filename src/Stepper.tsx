import { ActionIcon, Group, Text } from '@mantine/core';

interface StepperProps {
  label: string;
  value: number;
  onChange: (delta: number) => void;
}

/** Compteur entier avec boutons − / + de part et d'autre (tours, séries). */
export function Stepper({ label, value, onChange }: StepperProps) {
  return (
    <div className="stepper">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} ta="center" lts="0.08em">
        {label}
      </Text>
      <Group justify="center" gap="xs" wrap="nowrap">
        <ActionIcon variant="light" size="lg" aria-label={`${label} : moins un`} onClick={() => onChange(-1)}>
          <span className="glyph">−</span>
        </ActionIcon>
        <Text className="stepper-value" ta="center" aria-live="polite">
          {value}
        </Text>
        <ActionIcon variant="light" size="lg" aria-label={`${label} : plus un`} onClick={() => onChange(1)}>
          <span className="glyph">+</span>
        </ActionIcon>
      </Group>
    </div>
  );
}
