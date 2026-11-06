/**
 * Curated world discovery voyages ("Tikas Weltreisen im Zuschauer-Modus").
 * Designed for relaxing spectator viewing: Tika swims continuously through changing
 * marine biomes, breathing in sync with the environment, discovering sea life,
 * and speaking dialogues directly taken from the real script.
 */
import type { IslandLandmark } from '../islands';
import { buildTimeline, sampleTimeline } from './core/timeline';
import { findPattern, DEFAULT_PATTERN } from './patterns';
import { computeSeaPatternPoint, resolvePatternStyle } from './seaPattern';
import type { SavedBreathJourney, SavedPearl, SavedTrailSegment } from './breathJournal';

export type OceanBiome =
  | 'sunlit-bay'
  | 'kelp-forest'
  | 'basalt-reef'
  | 'moonlit-lagoon'
  | 'coral-atoll'
  | 'sunrise-cliff';

export type MarineCreature = 'dolphin' | 'seahorse' | 'jellyfish' | 'manta' | 'starfish' | 'school-of-fish';

export interface ScriptDialogLine {
  id: string;
  speaker: 'tika' | 'companion' | 'mentor';
  speakerName: string;
  avatar: string;
  text: string;
}

export interface VoyageChapter {
  id: string;
  title: string;
  islandName: string;
  patternId: string;
  biome: OceanBiome;
  creature: MarineCreature;
  landmark: IslandLandmark;
  storyChronicle: string;
  tikaQuote: string;
  dialogs: ScriptDialogLine[];
  skyColors: { top: string; mid: string; bottom: string };
  waterParticles: string;
  accentColor: string;
  durationSec: number;
}

export interface WorldVoyage {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  soundProfile: 'ocean_master' | 'breath_pure' | 'chimes_bell' | 'synth_webaudio';
  chapters: VoyageChapter[];
}

export const BIOME_LABELS: Record<OceanBiome, { name: string; icon: string; description: string }> = {
  'sunlit-bay': {
    name: 'Sonnendurchflutete Bucht',
    icon: '☀️',
    description: 'Klares, türkisfarbenes Flachwasser mit warmen Sonnenstrahlen und weißen Sanddünen.'
  },
  'kelp-forest': {
    name: 'Smaragdgrüner Tangwald',
    icon: '🌿',
    description: 'Majestätische Kelpbänder wiegen sich im Takt der sanften Meeresströmung.'
  },
  'basalt-reef': {
    name: 'Dunkles Basalt-Riff',
    icon: '🧭',
    description: 'Dunkle vulkanische Säulen ragen aus der Tiefe empor. Ein Ort der Ruhe und Orientierung.'
  },
  'moonlit-lagoon': {
    name: 'Mondschein-Lagune',
    icon: '🌙',
    description: 'Tiefes Nachtblau, silbernes Mondlicht und schimmernde biolumineszente Lichtpunkte.'
  },
  'coral-atoll': {
    name: 'Leuchtendes Korallen-Atoll',
    icon: '🪸',
    description: 'Warme Rosa- und Korallentöne, lebendige Fächer und vollkommener Gleichklang.'
  },
  'sunrise-cliff': {
    name: 'Morgenglanz-Klippe',
    icon: '⭐',
    description: 'Erste goldene Morgenstrahlen erwecken das Riff zu frischer Lebenskraft.'
  }
};

export const CREATURE_LABELS: Record<MarineCreature, { name: string; icon: string; note: string }> = {
  dolphin: {
    name: 'Verspielter Delfin',
    icon: '🐬',
    note: 'Begleitet Tika in weiten, eleganten Schwüngen an der Wasseroberfläche.'
  },
  seahorse: {
    name: 'Goldenes Seepferdchen',
    icon: '🌊',
    note: 'Wiegt sich sanft an einem Tangblatt und atmet ruhig im Takt mit.'
  },
  jellyfish: {
    name: 'Leuchtqualle',
    icon: '🪼',
    note: 'Pulsieren sanft im Tiefseelicht und hinterlassen glimmende Lichtspuren.'
  },
  manta: {
    name: 'Majestätischer Rochen',
    icon: '🪸',
    note: 'Gleitet lautlos mit weiten Flügelschlägen durch das blaue Wasser.'
  },
  starfish: {
    name: 'Bunter Seestern',
    icon: '⭐',
    note: 'Ruht auf den sonnengewärmten Felsen und nimmt neue Kraft auf.'
  },
  'school-of-fish': {
    name: 'Silberner Fischschwarm',
    icon: '🐟',
    note: 'Zieht in perfekter Formation vier gleichmäßige Runden um das Riff.'
  }
};

export const WORLD_VOYAGES: WorldVoyage[] = [
  {
    id: 'grand-archipelago',
    title: 'Die Große Archipel-Expedition',
    subtitle: 'Einmal durch die ganze Inselwelt gleiten',
    description:
      'Lehne dich zurück und begleite Tika auf ihrer Reise von den sonnigen Brandungswellen über den Tangwald und das Kompass-Riff bis zur stillen Mondlagune und den Leuchtklippen – mit ihren echten Dialogen aus dem Skript.',
    soundProfile: 'ocean_master',
    chapters: [
      {
        id: 'chap-1-bay',
        title: 'Abschied von der Wellen-Bucht',
        islandName: 'Wellen-Bucht',
        patternId: 'ocean',
        biome: 'sunlit-bay',
        creature: 'dolphin',
        landmark: 'wave',
        storyChronicle:
          'Das Wasser an der Wellen-Bucht ist warm und klar. Tika spürt, wie die Dünung sie sanft hebt und senkt. Im Rhythmus der Wellen nimmt sie ruhige, tiefe Atemzüge.',
        tikaQuote: '„Ich muss die Welle nicht bekämpfen – ich breite die Flossen aus und surfe darauf!“',
        dialogs: [
          {
            id: 'd1-mentor',
            speaker: 'mentor',
            speakerName: 'Alte Meeresschildkröte',
            avatar: '🐢',
            text: 'Gegen eine Welle anzukämpfen kostet alle Kraft, Tika. Aber jede Welle steigt an, hat eine Krone und gleitet wieder aus.'
          },
          {
            id: 'd1-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Statt meinen Panzer eng zusammenzuziehen, breite ich die Flossen weit aus. Ich muss das Gefühl nicht wegdrücken – ich surfe einfach darauf, bis das Wasser wieder ruhig wird.'
          }
        ],
        skyColors: { top: '#0ea5e9', mid: '#0284c7', bottom: '#03436a' },
        waterParticles: '#7dd3fc',
        accentColor: '#2dd4bf',
        durationSec: 28
      },
      {
        id: 'chap-2-kelp',
        title: 'Der wiegende Tangwald',
        islandName: 'Tiefsee-Garten',
        patternId: 'dirga',
        biome: 'kelp-forest',
        creature: 'seahorse',
        landmark: 'kelp',
        storyChronicle:
          'Hohe grüne Kelpbänder ragen vom Meeresboden bis zur Oberfläche. Ein kleines goldenes Seepferdchen wiegt sich im Takt der Dreistufen-Atmung mit Tika durch das smaragdgrüne Licht.',
        tikaQuote: '„Bauch, Flanken, Schultern... Wie das Seegras wachse ich ganz ohne Eile ins Licht.“',
        dialogs: [
          {
            id: 'd2-seahorse',
            speaker: 'companion',
            speakerName: 'Goldenes Seepferdchen',
            avatar: '🌊',
            text: 'Hier unten im Tangwald hat niemand Eile, Tika. Halte dich an einem Halm fest und nimm dir drei Stufen Zeit.'
          },
          {
            id: 'd2-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Drei Stufen: Erst in den Bauch, dann in die Flanken, dann bis zu den Schultern. Wie die großen Seegraspflanzen wachse ich Schritt für Schritt nach oben.'
          }
        ],
        skyColors: { top: '#059669', mid: '#047857', bottom: '#033827' },
        waterParticles: '#a7f3d0',
        accentColor: '#34d399',
        durationSec: 30
      },
      {
        id: 'chap-3-compass',
        title: 'Die Säulen des Kompass-Riffs',
        islandName: 'Kompass-Riff',
        patternId: 'box',
        biome: 'basalt-reef',
        creature: 'school-of-fish',
        landmark: 'compass',
        storyChronicle:
          'Vier dunkle Basaltfelsen bilden ein perfektes Viereck im Wasser. Ein Schwarm silberner Fische zieht in vier gleichmäßigen Bahnen um die Säulen – Fokus und Ruhe kehren ein.',
        tikaQuote: '„Vier Felsen, vier Takte. Eins, zwei, drei, vier... Schon wird es ganz still im Kopf.“',
        dialogs: [
          {
            id: 'd3-fish',
            speaker: 'companion',
            speakerName: 'Silberner Fischschwarm',
            avatar: '🐟',
            text: 'Schau, Tika! Vier gleichmäßige Seiten um das Riff: Nord, Ost, Süd und West. Folge unserem klaren Takt!'
          },
          {
            id: 'd3-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Wenn im Kopf zehn Gedanken gleichzeitig schwimmen, tippe ich einfach die vier Steine an. Eins, zwei, drei, vier – das Zählen nimmt das Tempo aus den Gedanken.'
          }
        ],
        skyColors: { top: '#0284c7', mid: '#0369a1', bottom: '#05293d' },
        waterParticles: '#bae6fd',
        accentColor: '#38bdf8',
        durationSec: 32
      },
      {
        id: 'chap-4-moon',
        title: 'Silberlicht in der Mondschein-Lagune',
        islandName: 'Mondschein-Lagune',
        patternId: 'calm478',
        biome: 'moonlit-lagoon',
        creature: 'jellyfish',
        landmark: 'moon',
        storyChronicle:
          'Die Dämmerung weicht tiefem Nachtblau. Silberne Mondstrahlen spiegeln sich im Wasser, während zarte Leuchtquallen wie kleine Unterwassersterne aufsteigen. Tika lässt jeden Druck langsam ausströmen.',
        tikaQuote: '„Vier Sekunden ein, sieben halten, acht loslassen... Jetzt darf mein Panzer endlich schwer und ruhig werden.“',
        dialogs: [
          {
            id: 'd4-jelly',
            speaker: 'companion',
            speakerName: 'Leuchtqualle',
            avatar: '🪼',
            text: 'Lass deine Lichter sinken, Tika. In der stillen Lagune zieht sich das Wasser beim Ausatmen doppelt so langsam zurück wie beim Einatmen.'
          },
          {
            id: 'd4-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Der Tag war lang, aber jetzt lasse ich meine Flossen schwer werden. Vier Sekunden ein, sieben halten... und acht lange Sekunden alles ausströmen lassen. Für heute darf ich ruhen.'
          }
        ],
        skyColors: { top: '#4338ca', mid: '#312e81', bottom: '#0f172a' },
        waterParticles: '#c7d2fe',
        accentColor: '#818cf8',
        durationSec: 38
      },
      {
        id: 'chap-5-atoll',
        title: 'Gleichklang am Herzschlag-Atoll',
        islandName: 'Herzschlag-Atoll',
        patternId: 'coherence',
        biome: 'coral-atoll',
        creature: 'manta',
        landmark: 'coral',
        storyChronicle:
          'Ein ringförmiges Korallenriff leuchtet in warmen Korallentönen. Ein eleganter Rochen gleitet lautlos mit Tika – Herzschlag und Atembewegung finden zu einem vollkommenen Gleichgewicht.',
        tikaQuote: '„Fünf Sekunden ein, fünf Sekunden aus... Mein Herzschlag schwingt im gleichen Takt wie das weite Meer.“',
        dialogs: [
          {
            id: 'd5-manta',
            speaker: 'companion',
            speakerName: 'Eleganter Rochen',
            avatar: '🪸',
            text: 'Gleite mit mir im gleichen Takt, Tika. Wenn Einatmen und Ausatmen genau gleich lang sind, schlagen Herz und Meer im gleichen Takt.'
          },
          {
            id: 'd5-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Fünf Sekunden einatmen, fünf Sekunden ausatmen. Kein Zögern, keine Eile. Mein Herzschlag wird ganz gleichmäßig und ruhig.'
          }
        ],
        skyColors: { top: '#be185d', mid: '#831843', bottom: '#1f132b' },
        waterParticles: '#fbcfe8',
        accentColor: '#f472b6',
        durationSec: 33
      },
      {
        id: 'chap-6-cliff',
        title: 'Morgenglanz an der Sternen-Klippe',
        islandName: 'Sternen-Klippe',
        patternId: 'star',
        biome: 'sunrise-cliff',
        creature: 'starfish',
        landmark: 'star',
        storyChronicle:
          'Das erste goldene Sonnenlicht durchbricht das Meer. Auf den Klippensteinen strecken bunte Seesterne ihre Spitzen dem Tag entgegen. Tika reckt die Flossen weit nach oben – voller Frische und neuer Zuversicht.',
        tikaQuote: '„Kopf hoch und alle vier Flossen weit ausstrecken! Ich bin wach, mutig und bereit für die Welt.“',
        dialogs: [
          {
            id: 'd6-star',
            speaker: 'companion',
            speakerName: 'Bunter Seestern',
            avatar: '⭐',
            text: 'Komm, Tika! Mach dich groß! Strecke alle vier Flossen weit in das glitzernde Morgenlicht hinein!'
          },
          {
            id: 'd6-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Ich recke den Kopf aus dem Panzer und strecke alle Flossen aus wie ein leuchtender Seestern! Ein warmer Schwung durchströmt mich – ich bin hellwach und voller Mut!'
          }
        ],
        skyColors: { top: '#d97706', mid: '#b45309', bottom: '#26170d' },
        waterParticles: '#fde68a',
        accentColor: '#fbbf24',
        durationSec: 28
      }
    ]
  },
  {
    id: 'twilight-glow',
    title: 'Der Tiefsee-Lichtzauber',
    subtitle: 'Beruhigende Nachtfahrt durch das Meeresleuchten',
    description:
      'Eine besonders sanfte, verlangsamte Nachtfahrt durch glimmende Planktonfelder, sanfte Tiefseeströmungen und lautlos schwebende Leuchtquallen.',
    soundProfile: 'synth_webaudio',
    chapters: [
      {
        id: 'twilight-1',
        title: 'Eintauchen ins Dämmerlicht',
        islandName: 'Kompass-Riff',
        patternId: 'ocean',
        biome: 'basalt-reef',
        creature: 'school-of-fish',
        landmark: 'compass',
        storyChronicle:
          'Der Tag sinkt hinter den Horizont. Das Meer hüllt sich in ein sattes Indigoblau. Tika schwimmt mit langsamen Flossenschlägen in die Stille.',
        tikaQuote: '„Mit ganz langsamen, weiten Flossenschlägen gleite ich in die friedliche Stille des Meeres.“',
        dialogs: [
          {
            id: 'tw1-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Der Tag sinkt hinter den Horizont und das Wasser hüllt sich in ein sattes Indigoblau. Ich tauche langsam in die Stille.'
          },
          {
            id: 'tw1-fish',
            speaker: 'companion',
            speakerName: 'Silberfisch',
            avatar: '🐟',
            text: 'Gute Nacht, weite Welt. Die Nacht gehört den ruhigen Schwimmern.'
          }
        ],
        skyColors: { top: '#1e3a8a', mid: '#172554', bottom: '#090d16' },
        waterParticles: '#93c5fd',
        accentColor: '#60a5fa',
        durationSec: 30
      },
      {
        id: 'twilight-2',
        title: 'Tanz der Leuchtquallen',
        islandName: 'Mondschein-Lagune',
        patternId: 'calm478',
        biome: 'moonlit-lagoon',
        creature: 'jellyfish',
        landmark: 'moon',
        storyChronicle:
          'Rund um Tika erstrahlen hunderte kleine biolumineszente Lichtpunkte. Bei jedem langen Ausatmen steigen schimmernde Perlenbläschen nach oben.',
        tikaQuote: '„Hunderte kleine Lichtpunkte leuchten im Wasser. Bei jedem langen Ausatmen lasse ich alle Gedanken los.“',
        dialogs: [
          {
            id: 'tw2-jelly',
            speaker: 'companion',
            speakerName: 'Leuchtqualle',
            avatar: '🪼',
            text: 'Jeder ruhige Atemzug zündet einen kleinen Stern im Wasser an.'
          },
          {
            id: 'tw2-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Hunderte biolumineszente Lichtfunken tanzen mit mir. Bei jedem langen Ausatmen steigen kleine silberne Perlenblasen auf.'
          }
        ],
        skyColors: { top: '#3730a3', mid: '#1e1b4b', bottom: '#050510' },
        waterParticles: '#c4b5fd',
        accentColor: '#a78bfa',
        durationSec: 40
      },
      {
        id: 'twilight-3',
        title: 'Geborgenheit in der Tiefe',
        islandName: 'Herzschlag-Atoll',
        patternId: 'coherence',
        biome: 'coral-atoll',
        creature: 'manta',
        landmark: 'coral',
        storyChronicle:
          'In der Tiefe des Ozeans existiert kein Lärm und keine Eile. Tika lässt sich von der sanften Wärme der Tiefseequellen wiegen und schöpft Ruhe.',
        tikaQuote: '„Hier unten existiert keine Eile. Ich lasse mich von der Strömung wiegen und schöpfe tiefe Ruhe.“',
        dialogs: [
          {
            id: 'tw3-manta',
            speaker: 'companion',
            speakerName: 'Tiefsee-Rochen',
            avatar: '🪸',
            text: 'In der Tiefe gibt es keinen Lärm und keine Eile. Nur die sanfte Wärme des Meeresgrunds.'
          },
          {
            id: 'tw3-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Ich lasse mich einfach wiegen. Ich bin in Sicherheit, atme gleichmäßig ein und aus, und für heute ist alles gut.'
          }
        ],
        skyColors: { top: '#4c1d95', mid: '#2e1065', bottom: '#080314' },
        waterParticles: '#e9d5ff',
        accentColor: '#c084fc',
        durationSec: 36
      }
    ]
  },
  {
    id: 'sunlit-reef-play',
    title: 'Sonnenschein-Riff & Spielfreude',
    subtitle: 'Wachwerden und frische Lebensenergie spüren',
    description:
      'Gleite durch sonnendurchflutete türkisfarbene Flachwasser-Riffe, beobachte spielende Delfine und genieße die heitere Leichtigkeit des Meeres.',
    soundProfile: 'ocean_master',
    chapters: [
      {
        id: 'sun-1',
        title: 'Die schimmernde Lagune',
        islandName: 'Wellen-Bucht',
        patternId: 'ocean',
        biome: 'sunlit-bay',
        creature: 'dolphin',
        landmark: 'wave',
        storyChronicle:
          'Kristallklares Wasser glitzert im Vormittagslicht. Tika schwimmt mühelos durch weiße Sanddünen unter Wasser. Jeder Flossenzug fühlt sich leicht und frei an.',
        tikaQuote: '„Kristallklares Wasser glitzert in der Sonne. Jeder Flossenschlag fühlt sich frei und federleicht an.“',
        dialogs: [
          {
            id: 'sun1-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Kristallklares Wasser und weißer Sand! Nach dem Aufwachen fühlt sich jeder Schwimmzug federleicht an.'
          },
          {
            id: 'sun1-dolphin',
            speaker: 'companion',
            speakerName: 'Riff-Delfin',
            avatar: '🐬',
            text: 'Komm mit, Tika! Das Wasser ist heute warm und voller frischer Energie!'
          }
        ],
        skyColors: { top: '#06b6d4', mid: '#0891b2', bottom: '#083344' },
        waterParticles: '#a5f3fc',
        accentColor: '#22d3ee',
        durationSec: 28
      },
      {
        id: 'sun-2',
        title: 'Gemeinsam mit den Delfinen',
        islandName: 'Herzschlag-Atoll',
        patternId: 'coherence',
        biome: 'coral-atoll',
        creature: 'dolphin',
        landmark: 'coral',
        storyChronicle:
          'Zwei neugierige Delfine tauchen neben Tika auf, drehen eine elegante Pirouette und ermutigen sie, den weiten Ozean mit offenen Augen zu erkunden.',
        tikaQuote: '„Zusammen mit den Delfinen gleiten: Einatmen, Ausatmen – wir teilen uns den weiten Ozean.“',
        dialogs: [
          {
            id: 'sun2-dolphin',
            speaker: 'companion',
            speakerName: 'Riff-Delfin',
            avatar: '🐬',
            text: 'Schau mal, eine Pirouette im Korallenbogen! Wenn du gleichmäßig atmest, hast du endlosen Schwung!'
          },
          {
            id: 'sun2-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Zusammen schwimmt es sich doppelt so leicht! Einatmen, Ausatmen – wir teilen uns den Rhythmus der Wellen.'
          }
        ],
        skyColors: { top: '#0284c7', mid: '#0369a1', bottom: '#082f49' },
        waterParticles: '#bae6fd',
        accentColor: '#38bdf8',
        durationSec: 30
      },
      {
        id: 'sun-3',
        title: 'Aufstieg zum Sonnenlicht',
        islandName: 'Sternen-Klippe',
        patternId: 'star',
        biome: 'sunrise-cliff',
        creature: 'starfish',
        landmark: 'star',
        storyChronicle:
          'Mit einem kräftigen Schwung taucht Tika kurz an die Oberfläche, blinzelt in die warme Sonne und holt tief Luft: Die Welt ist voller schöner Momente.',
        tikaQuote: '„Ein tiefer, frischer Atemzug in der warmen Sonne: Die Welt ist voller wunderbarer Momente.“',
        dialogs: [
          {
            id: 'sun3-star',
            speaker: 'companion',
            speakerName: 'Sonnen-Seestern',
            avatar: '⭐',
            text: 'Gleich hast du die Oberfläche erreicht, Tika! Hol dir die goldene Wärme des Tages!'
          },
          {
            id: 'sun3-tika',
            speaker: 'tika',
            speakerName: 'Tika',
            avatar: '🐢',
            text: 'Ich tauche kurz auf, blinzle in die warme Sonne und nehme einen tiefen, frischen Atemzug: Die Welt ist voller schöner Momente!'
          }
        ],
        skyColors: { top: '#f59e0b', mid: '#d97706', bottom: '#291404' },
        waterParticles: '#fde68a',
        accentColor: '#fbbf24',
        durationSec: 30
      }
    ]
  }
];

export function findVoyage(id: string): WorldVoyage | undefined {
  return WORLD_VOYAGES.find(v => v.id === id);
}

export function getVoyageTotalDuration(voyage: WorldVoyage): number {
  return voyage.chapters.reduce((sum, ch) => sum + ch.durationSec, 0);
}

/**
 * Creates an authentic SavedBreathJourney entry snapshot from a Voyage chapter,
 * computing real parametric trail segments and hold pearls matching the chapter's rhythm.
 */
export function generateVoyageJournalEntry(
  voyage: WorldVoyage,
  chapter: VoyageChapter,
  completedCyclesOverride?: number
): SavedBreathJourney {
  const pattern = findPattern(chapter.patternId) ?? DEFAULT_PATTERN;
  const timeline = buildTimeline(pattern);
  const cycleSec = timeline.cycleMs / 1000;
  const completedCycles = completedCyclesOverride ?? Math.max(2, Math.round(chapter.durationSec / cycleSec));
  const style = resolvePatternStyle(pattern.id, 'auto');

  const segments: SavedTrailSegment[] = [];
  const pearls: SavedPearl[] = [];

  let currentSegment: SavedTrailSegment | null = null;
  const samplesPerCycle = 36;
  const totalSteps = completedCycles * samplesPerCycle;

  for (let step = 0; step <= totalSteps; step++) {
    const elapsedMs = (step / samplesPerCycle) * timeline.cycleMs;
    const cycle = Math.floor(step / samplesPerCycle);
    const sample = sampleTimeline(timeline, elapsedMs);
    const pt = computeSeaPatternPoint(sample, style);

    if (!currentSegment || currentSegment.cue !== pt.cue) {
      currentSegment = { cue: pt.cue, points: [{ x: pt.x, y: pt.y }] };
      segments.push(currentSegment);
    } else {
      currentSegment.points.push({ x: pt.x, y: pt.y });
    }

    // Drop pearls on hold transitions
    if (pt.cue === 'holdIn' && step % 12 === 0) {
      pearls.push({ x: pt.x, y: pt.y, cycle });
    }
  }

  const now = new Date().toISOString();
  return {
    id: `voyage-${chapter.id}-${Date.now()}`,
    createdAt: now,
    title: `Entdeckung: ${chapter.title}`,
    islandId: chapter.islandName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    islandName: chapter.islandName,
    patternId: pattern.id,
    patternName: pattern.name,
    patternStyle: style,
    completedCycles,
    durationSec: chapter.durationSec,
    reflection: `${chapter.tikaQuote} — ${chapter.storyChronicle} (Beobachtet auf Tikas Weltreise: „${voyage.title}“)`,
    segments,
    pearls
  };
}
