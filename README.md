# Retiere vers le futur

Minuteur d'entraînement au format mobile, installable comme application (PWA).

## Fonctionnement

- **Tours** et **Séries** : chaque tour contient le nombre de séries indiqué.
- **Durée d'une série** : réglée à la seconde près avec deux roulettes (minutes / secondes).
- **Mise en place (tours)** et **mise en place (séries)** : temps de préparation entre deux tours
  ou deux séries, réglables aussi à la seconde (0 = pas de mise en place).
- **Décompte initial** : au-dessus du bouton, un temps qui s'écoule une seule fois au lancement (0 = aucun).
- Gros bouton rond vert **GO**, qui devient **Pause**. À côté : 🔔 ouvre la configuration du son, ↺ réinitialise.
- **Configuration du son** : dix instruments (métallophone do grave et do médium, vibraphone, glockenspiel,
  carillon tubulaire, cloche, clochette, bol chantant, carillon éolien, marimba). Un appui fait entendre
  l'instrument (bip, bip, coup final) et propose de l'affecter aux **séries** ou aux **mises en place**.
  Par défaut : vibraphone pour les séries, marimba pour les mises en place.
- **Réglages mémorisés** : compteurs, durées et choix d'instruments sont enregistrés dans le localStorage
  et retrouvés à la réouverture de l'app.
- **Après GO**, les réglages disparaissent : l'écran montre Tour n/N, Série n/N, la phase en cours et l'anneau du temps.
- **Carillon** : dans les 3 dernières secondes de chaque phase, un petit coup par seconde (−3 s, −2 s, −1 s),
  puis un coup final un peu plus appuyé à 0 : bip bip bip biiip. Le timbre diffère selon la phase qui se termine :
  carillon clair pour la fin d'une série, carillon chaud et plus grave pour la fin d'une mise en place
  (c'est le signal « on attaque une série »).

Déroulé : `[décompte initial]` → série → mise en place → série → … → mise en place (tour) → … → terminé.

## Stack

- [Vite](https://vite.dev) + [React](https://react.dev) + TypeScript
- [Mantine](https://mantine.dev) pour l'interface, roulette maison (`WheelPicker`) basée sur le scroll-snap CSS
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) pour le manifeste et le service worker
- Web Audio API pour le carillon (synthèse additive, aucun fichier son), Wake Lock API pour garder l'écran allumé
- [Vitest](https://vitest.dev) pour les tests du moteur

## Commandes

```bash
npm install        # une seule fois
npm run dev        # serveur de développement (accessible aussi depuis le téléphone sur le même Wi-Fi)
npm test           # tests unitaires du moteur
npm run build      # build de production dans dist/
npm run preview    # sert dist/ en local pour tester la PWA
npm run icons      # régénère logo + icônes depuis assets-src/ (macOS : sips)
```

## Structure

```
assets-src/logo.jpg   bannière d'origine (logo affiché dans l'app)
assets-src/icon.jpg   carré d'origine (icônes PWA)
src/
  engine.ts           machine à états pure : config, phases, start/pause/resume/tick/reset
  engine.test.ts      tests du moteur
  useTimer.ts         hook React : horloge, persistance localStorage, programmation du carillon
  audio.ts            dix instruments Web Audio, signal 3 petits + 1 long programmé sur l'horloge audio
  SoundSettingsModal.tsx  configuration du son (écoute + affectation séries / mises en place)
  useSoundSettings.ts     choix d'instruments mémorisé dans le localStorage
  useWakeLock.ts      garde l'écran allumé pendant l'exécution
  WheelPicker.tsx     roulette façon iOS (tactile, molette, clic, clavier)
  DurationPicker.tsx  deux roulettes mm : ss
  Stepper.tsx         compteur − / + (tours, séries)
  App.tsx             écran unique
  theme.ts            thème Mantine (bleu nuit, accent jaune)
  assets/banner.jpg   bannière affichée dans l'app (générée)
```

Pour changer le rythme du carillon, modifier `CUE_SOFT_OFFSETS_MS` dans `src/audio.ts` ;
les instruments sont décrits dans `INSTRUMENTS`, les choix par défaut dans `DEFAULT_SOUNDS`.

## Déployer sur GitHub Pages

1. Crée un dépôt GitHub (par exemple `retiere-vers-le-futur`) et pousse le code sur la branche `main`.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. Le workflow `.github/workflows/deploy.yml` lance tests, build et déploiement à chaque push sur `main`.
   Il règle automatiquement le chemin de base sur `/<nom-du-dépôt>/`.
4. L'app est servie sur `https://<utilisateur>.github.io/<nom-du-dépôt>/`.

Pour un build local destiné à Pages :

```bash
VITE_BASE_PATH=/retiere-vers-le-futur/ npm run build
```

Si le dépôt s'appelle `<utilisateur>.github.io`, remplace `VITE_BASE_PATH` par `/` dans le workflow.

## Installer sur le téléphone

- **iPhone (Safari)** : ouvrir l'URL, bouton Partager, puis « Sur l'écran d'accueil ».
- **Android (Chrome)** : ouvrir l'URL, menu ⋮, puis « Installer l'application ».

## Limites connues

- Sur iPhone, le son suit le bouton silencieux : si le téléphone est en mode silencieux, pas de carillon.
- Le minuteur se recale sur l'heure réelle à chaque retour au premier plan, mais un téléphone verrouillé
  peut couper le son au moment du carillon. Le Wake Lock garde l'écran allumé pour éviter ça tant que l'app est visible.
