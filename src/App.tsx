import { ActionIcon, Group, Paper, RingProgress, Stack, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import banner from './assets/banner.jpg';
import { CUE_LEAD_MS } from './audio';
import { DurationPicker } from './DurationPicker';
import { canStart, formatRemaining, phaseDurationMs, type Phase } from './engine';
import { SoundSettingsModal } from './SoundSettingsModal';
import { useSoundSettings } from './useSoundSettings';
import { Stepper } from './Stepper';
import { useTimer } from './useTimer';

const STATUS_LABEL = {
  idle: '',
  running: 'En cours… tenez bon !',
  paused: 'En pause.',
  finished: 'Terminé, bravo !',
} as const;

const PHASE_LABEL: Record<Phase, string> = {
  prep: 'Décompte initial',
  work: 'Série en cours',
  seriesRest: 'Mise en place',
  toursRest: 'Mise en place · tour suivant',
};

const PHASE_COLOR: Record<Phase, string> = {
  prep: 'teal',
  work: 'orange',
  seriesRest: 'blue',
  toursRest: 'violet',
};

export default function App() {
  const [sounds, assignSound] = useSoundSettings();
  const { state, configure, start, pause, resume, reset, restart } = useTimer(sounds);
  const [soundOpened, soundModal] = useDisclosure(false);
  const { config, status, phase } = state;
  const editable = status === 'idle';

  const total = phaseDurationMs(config, phase);
  const progress = total > 0 ? (state.remainingMs / total) * 100 : 0;
  const { minutes, seconds } = formatRemaining(state.remainingMs);
  const lastSeconds = status === 'running' && state.remainingMs <= CUE_LEAD_MS;

  // Numéro du tour et de la série en cours (ou à venir pendant une mise en place), bornés à la fin.
  const tourIndex = Math.min(config.tours, config.tours - state.toursLeft + 1);
  const serieIndex = Math.min(config.series, config.series - state.seriesLeft + 1);

  const primary = {
    idle: { label: 'GO', tone: 'go', action: start },
    running: { label: 'Pause', tone: 'pause', action: pause },
    paused: { label: 'GO', tone: 'go', action: resume },
    finished: { label: 'GO', tone: 'go', action: restart },
  }[status];

  return (
    <main className="app">
      <Stack gap="sm" className="screen">
        <header className="header">
          <img src={banner} alt="" className="banner" />
          <h1 className="sr-only">Retiere vers le futur</h1>
          {STATUS_LABEL[status] && (
            <Text c="dimmed" ta="center" size="sm">
              {STATUS_LABEL[status]}
            </Text>
          )}
        </header>

        {editable ? (
          <>
            <Group grow align="stretch" wrap="nowrap">
              <Paper withBorder radius="xl" p="sm" className="card">
                <Stepper label="Tours" value={config.tours} onChange={(d) => configure({ tours: config.tours + d })} />
                <Text size="xs" c="dimmed" ta="center" className="card-sub">
                  Mise en place (tours)
                </Text>
                <DurationPicker
                  size="sm"
                  seconds={config.toursRestSec}
                  onChange={(v) => configure({ toursRestSec: v })}
                  label="Mise en place entre tours"
                />
              </Paper>

              <Paper withBorder radius="xl" p="sm" className="card">
                <Stepper label="Séries" value={config.series} onChange={(d) => configure({ series: config.series + d })} />
                <Text size="xs" c="dimmed" ta="center" className="card-sub">
                  Mise en place (séries)
                </Text>
                <DurationPicker
                  size="sm"
                  seconds={config.seriesRestSec}
                  onChange={(v) => configure({ seriesRestSec: v })}
                  label="Mise en place entre séries"
                />
              </Paper>
            </Group>

            <Paper withBorder radius="xl" p="sm" className="card interval">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700} ta="center" lts="0.08em">
                Durée d'une série
              </Text>
              <DurationPicker size="md" seconds={config.workSec} onChange={(v) => configure({ workSec: v })} label="Durée d'une série" />
            </Paper>
          </>
        ) : (
          <>
            <Group grow align="stretch" wrap="nowrap">
              <Paper withBorder radius="xl" p="sm" className="card progress-card">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} ta="center" lts="0.08em">
                  Tour
                </Text>
                <Text ta="center" className="progress-value" aria-live="polite">
                  {tourIndex}
                  <span className="progress-of">/{config.tours}</span>
                </Text>
              </Paper>
              <Paper withBorder radius="xl" p="sm" className="card progress-card">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} ta="center" lts="0.08em">
                  Série
                </Text>
                <Text ta="center" className="progress-value" aria-live="polite">
                  {serieIndex}
                  <span className="progress-of">/{config.series}</span>
                </Text>
              </Paper>
            </Group>

            <Paper withBorder radius="xl" p="md" className="card interval">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700} ta="center" lts="0.08em">
                {PHASE_LABEL[phase]}
              </Text>
              <RingProgress
                className="ring"
                size={260}
                thickness={18}
                roundCaps
                sections={[{ value: progress, color: lastSeconds ? 'red' : PHASE_COLOR[phase] }]}
                label={
                  <Text ta="center" className={`digits${lastSeconds ? ' digits-urgent' : ''}`} aria-live="polite">
                    {minutes}:{seconds}
                  </Text>
                }
              />
            </Paper>
          </>
        )}

        <Stack gap="sm">
          {editable && (
            <Paper withBorder radius="xl" p="sm" className="card prep">
              <div className="prep-text">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts="0.08em">
                  Décompte initial
                </Text>
                <Text size="xs" c="dimmed">
                  Une seule fois, au lancement
                </Text>
              </div>
              <DurationPicker size="sm" seconds={config.prepSec} onChange={(v) => configure({ prepSec: v })} label="Décompte initial" />
            </Paper>
          )}

          <Group justify="center" align="center" gap="xl" wrap="nowrap" className="go-row">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xl"
              aria-label="Configuration du son"
              title="Configuration du son"
              disabled={!editable}
              onClick={soundModal.open}
            >
              <span className="glyph">🔔</span>
            </ActionIcon>
            <UnstyledButton
              className={`go go-${primary.tone}`}
              onClick={primary.action}
              disabled={editable && !canStart(config)}
              aria-label={primary.label}
            >
              {primary.label}
            </UnstyledButton>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xl"
              aria-label="Réinitialiser"
              title="Réinitialiser"
              disabled={editable}
              onClick={reset}
            >
              <span className="glyph">↺</span>
            </ActionIcon>
          </Group>
        </Stack>
      </Stack>
      <SoundSettingsModal opened={soundOpened} onClose={soundModal.close} sounds={sounds} onAssign={assignSound} />
    </main>
  );
}
