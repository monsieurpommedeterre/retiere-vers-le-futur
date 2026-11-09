import { Badge, Button, Group, Modal, Stack, Text, UnstyledButton } from '@mantine/core';
import { useState } from 'react';
import { INSTRUMENTS, getInstrument, previewCues, previewInstrument, type CueKind, type SoundSettings } from './audio';

interface SoundSettingsModalProps {
  opened: boolean;
  onClose: () => void;
  sounds: SoundSettings;
  onAssign: (kind: CueKind, instrumentKey: string) => void;
}

/**
 * Configuration du son : la liste des instruments. Un appui sur un instrument le fait entendre
 * (bip, bip, coup final) et propose de l'affecter aux séries ou aux mises en place.
 */
export function SoundSettingsModal({ opened, onClose, sounds, onAssign }: SoundSettingsModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const select = (key: string) => {
    setSelected(key);
    previewInstrument(key);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Configuration du son" centered radius="lg">
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          Séries : <b>{getInstrument(sounds.work).name}</b> · Mises en place : <b>{getInstrument(sounds.rest).name}</b>
        </Text>
        <Button color="yellow" variant="light" onClick={() => previewCues(sounds)}>
          ▶ Écouter les signaux actuels
        </Button>
        <Text size="xs" c="dimmed">
          Touche un instrument pour l'entendre, puis choisis à quoi l'affecter.
        </Text>
        {INSTRUMENTS.map((instrument, index) => {
          const isWork = sounds.work === instrument.key;
          const isRest = sounds.rest === instrument.key;
          const isSelected = selected === instrument.key;
          return (
            <div key={instrument.key} className={`lab-row${isSelected ? ' lab-row-selected' : ''}`}>
              <UnstyledButton className="lab-item" onClick={() => select(instrument.key)} aria-expanded={isSelected}>
                <span className="lab-num">{index + 1}</span>
                <span className="lab-text">
                  <Text fw={700} size="sm" component="span" className="lab-name">
                    {instrument.name}
                    {isWork && (
                      <Badge size="xs" variant="filled" color="orange" ml={8}>
                        Séries
                      </Badge>
                    )}
                    {isRest && (
                      <Badge size="xs" variant="filled" color="blue" ml={8}>
                        Mises en place
                      </Badge>
                    )}
                  </Text>
                  <Text size="xs" c="dimmed" component="span">
                    {instrument.description}
                  </Text>
                </span>
              </UnstyledButton>
              {isSelected && (
                <Group grow gap="xs" className="lab-actions">
                  <Button
                    size="xs"
                    color="orange"
                    variant={isWork ? 'filled' : 'light'}
                    onClick={() => onAssign('work', instrument.key)}
                  >
                    {isWork ? '✓ Séries' : 'Pour les séries'}
                  </Button>
                  <Button
                    size="xs"
                    color="blue"
                    variant={isRest ? 'filled' : 'light'}
                    onClick={() => onAssign('rest', instrument.key)}
                  >
                    {isRest ? '✓ Mises en place' : 'Pour les mises en place'}
                  </Button>
                </Group>
              )}
            </div>
          );
        })}
      </Stack>
    </Modal>
  );
}
