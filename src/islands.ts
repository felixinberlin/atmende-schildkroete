import { findPattern } from './breathing';
import { parseGraph, storyNode, validate, type Graph } from './graph';

export type IslandLandmark = 'wave' | 'compass' | 'moon' | 'kelp' | 'coral' | 'star' | 'shell';
export type SeaMood = 'calm-current' | 'deep-trench' | 'glowing-reef' | 'starlight-drift' | 'warm-gulf';
export type ContentStatus = 'example' | 'template';

export interface Island {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  /** ID of the breathing pattern in BUILTIN_PATTERNS (e.g. 'ocean', 'box', 'calm478', 'dirga', 'coherence', 'star', 'custom'). */
  patternId: string;
  /** Coordinates in the 1000x600 archipelago map SVG. */
  position: { x: number; y: number };
  landmark: IslandLandmark;
  accentColor: string;
  status: ContentStatus;
  story: Graph;
}

export interface SeaJourney {
  id: string;
  from: string;
  to: string;
  title: string;
  summary: string;
  seaMood: SeaMood;
  status: ContentStatus;
  story: Graph;
}

export interface Archipelago {
  version: 1;
  title: string;
  currentIslandId: string;
  visitedIslandIds: string[];
  completedJourneyIds: string[];
  islands: Island[];
  journeys: SeaJourney[];
}

export const LANDMARK_LABELS: Record<IslandLandmark, string> = {
  wave: '🌊 Brandungsbucht',
  compass: '🧭 Kompassfelsen',
  moon: '🌙 Mondlagune',
  kelp: '🌿 Tangwald',
  coral: '🪸 Korallenatoll',
  star: '⭐ Leuchtklippe',
  shell: '🐚 Muschelbank'
};

export const SEA_MOOD_LABELS: Record<SeaMood, string> = {
  'calm-current': 'Glitzernde Küstenströmung',
  'deep-trench': 'Ruhiger Tiefseegraben',
  'glowing-reef': 'Leuchtendes Planktonriff',
  'starlight-drift': 'Morgenröte-Passage',
  'warm-gulf': 'Warmer Golfstrom'
};

/** Creates a valid starter story graph for a newly created or template island. */
export function createIslandStoryTemplate(name: string, patternId: string, subtitle?: string): Graph {
  const pattern = findPattern(patternId);
  const patternName = pattern?.shortName ?? pattern?.name ?? 'Atemübung';
  return {
    version: 1,
    nodes: [
      storyNode(
        'start',
        'start',
        `Ankunft auf ${name}`,
        `Tika gleitet in das ruhige Wasser vor ${name}. ${subtitle ? `${subtitle} wartet hier.` : 'Hier beginnt ein neuer Entwurf.'}`,
        40,
        180
      ),
      storyNode(
        'scene-1',
        'scene',
        'Umschauen & Ankommen',
        `Entwurf: Beschreibe hier, was Tika auf ${name} entdeckt und welches Gefühl sie mitbringt.`,
        370,
        180
      ),
      storyNode(
        'choice-1',
        'question',
        'Wie möchte Tika beginnen?',
        'Ergänze hier eine kleine Entscheidung für die Lesenden.',
        700,
        180
      ),
      storyNode(
        'breathe-1',
        'exercise',
        patternName,
        pattern?.description ?? 'Atme gemeinsam mit Tika in diesem Rhythmus.',
        1040,
        40,
        patternId
      ),
      storyNode(
        'explore-1',
        'scene',
        'Ein stiller Ort am Ufer',
        'Entwurf: Ein alternativer Moment zum Durchatmen oder Beobachten, bevor die Atemübung beginnt.',
        1040,
        340
      ),
      storyNode(
        'end',
        'ending',
        `Gestärkt auf ${name}`,
        `Tika spürt, wie der Rhythmus von ${name} nachwirkt. Von hier aus kann die Reise weitergehen.`,
        1390,
        180
      )
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'scene-1', label: 'An Land schauen' },
      { id: 'e2', source: 'scene-1', target: 'choice-1', label: 'Weiter' },
      { id: 'e3', source: 'choice-1', target: 'breathe-1', label: 'Direkt mit Tika atmen' },
      { id: 'e4', source: 'choice-1', target: 'explore-1', label: 'Erst kurz verweilen' },
      { id: 'e5', source: 'explore-1', target: 'breathe-1', label: 'Jetzt gemeinsam atmen' },
      { id: 'e6', source: 'breathe-1', target: 'end', label: 'Atempause abschließen' }
    ]
  };
}

/** Creates a valid starter story graph for a sea journey between two islands. */
export function createJourneyStoryTemplate(
  title: string,
  fromName: string,
  toName: string,
  patternId = 'ocean'
): Graph {
  return {
    version: 1,
    nodes: [
      storyNode(
        'j-start',
        'start',
        title,
        `Tika stößt sich sanft vom Ufer von ${fromName} ab und nimmt Kurs auf ${toName}.`,
        40,
        180
      ),
      storyNode(
        'j-question',
        'question',
        'Unterwegs im offenen Meer',
        'Entwurf: Was begegnet Tika auf dieser Strecke zwischen den Inseln? Wähle eine Spur durch die Strömung.',
        390,
        180
      ),
      storyNode(
        'j-surface',
        'scene',
        'Nahe der Wasseroberfläche',
        'Oben glitzert das Licht auf den Wellen. Tika schwimmt mit ruhigen, gleichmäßigen Zügen.',
        740,
        60
      ),
      storyNode(
        'j-deep',
        'exercise',
        'Einen Atemzug mit der Strömung teilen',
        'Bevor die neue Insel in Sicht kommt, nimmt Tika drei ruhige Atemzüge im Takt des Meeres.',
        740,
        310,
        patternId
      ),
      storyNode(
        'j-end',
        'ending',
        `${toName} in Sicht`,
        `Am Horizont taucht die Silhouette von ${toName} auf. Tika hat die Überfahrt ruhig gemeistert.`,
        1100,
        180
      )
    ],
    edges: [
      { id: 'je1', source: 'j-start', target: 'j-question', label: 'Hinausschwimmen' },
      { id: 'je2', source: 'j-question', target: 'j-surface', label: 'Im Sonnenlicht gleiten' },
      { id: 'je3', source: 'j-question', target: 'j-deep', label: 'Ruhig abtauchen & atmen' },
      { id: 'je4', source: 'j-surface', target: 'j-end', label: 'Ufer ansteuern' },
      { id: 'je5', source: 'j-deep', target: 'j-end', label: 'Auftauchen am Ziel' }
    ]
  };
}

// --- Rich Example Island Stories ---

const wellenBuchtStory: Graph = {
  version: 1,
  nodes: [
    storyNode(
      'start',
      'start',
      'Wellen-Bucht: Wenn die Brandung rollt',
      'An der Wellen-Bucht rollen heute kräftige Wogen ans Ufer. Tika spürt ein unruhiges Ziehen im Bauch – wie eine Welle, die plötzlich höher wird.',
      40,
      180
    ),
    storyNode(
      'scene-wave',
      'scene',
      'Die Kunst des Wellenreitens',
      'Eine alte Meeresschildkröte neben ihr blinzelt ruhig: „Gegen eine Welle anzukämpfen kostet alle Kraft, Tika. Aber jede Welle steigt an, hat eine Krone und gleitet wieder aus.“',
      370,
      180
    ),
    storyNode(
      'choice',
      'question',
      'Wie begegnet Tika der nächsten großen Welle?',
      'Das Kribbeln ist noch da. Tika entscheidet, wie sie den nächsten Moment annimmt.',
      700,
      180
    ),
    storyNode(
      'breathe',
      'exercise',
      'Ozean-Wellenatmung (4-1-4-1)',
      'Atme 4 Sekunden lang ein wie eine Welle, die sich hebt. Halte 1 Sekunde auf der Wellenkrone. Atme 4 Sekunden lang sanft aus wie das Wasser am Sandstrand.',
      1040,
      30,
      'ocean'
    ),
    storyNode(
      'floating',
      'scene',
      'Auf dem Rücken der Woge',
      'Tika breitet ihre Vorderflossen weit aus. Statt den Panzer eng zusammenzuziehen, lässt sie sich vom Wasser tragen, bevor sie ruhig mit der Wellenatmung einsetzt.',
      1040,
      340
    ),
    storyNode(
      'end',
      'ending',
      'Die Welle ist vorbeigezogen',
      'Das Wasser in der Bucht glättet sich wieder. Tika merkt: Sie musste das Gefühl nicht wegdrücken – sie konnte darauf surfen, bis es von selbst flacher wurde.',
      1390,
      180
    )
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'scene-wave', label: 'Der alten Schildkröte zuhören' },
    { id: 'e2', source: 'scene-wave', target: 'choice', label: 'Auf die Brandung schauen' },
    { id: 'e3', source: 'choice', target: 'breathe', label: 'Mit der Ozean-Atmung surfen' },
    { id: 'e4', source: 'choice', target: 'floating', label: 'Sich erst vom Wasser tragen lassen' },
    { id: 'e5', source: 'floating', target: 'breathe', label: 'Jetzt in den Wellen-Atem finden' },
    { id: 'e6', source: 'breathe', target: 'end', label: 'Ruhig am Strand ankommen' }
  ]
};

const kompassRiffStory: Graph = {
  version: 1,
  nodes: [
    storyNode(
      'start',
      'start',
      'Am Kompass-Riff',
      'Vier dunkle Basaltfelsen bilden im türkisfarbenen Wasser ein perfektes Viereck. Tika kommt hierher, wenn im Kopf zehn Gedanken gleichzeitig durcheinanderschwimmen.',
      40,
      180
    ),
    storyNode(
      'scene-square',
      'scene',
      'Vier klare Kanten',
      'Zwischen den vier Felsen ist die Strömung erstaunlich geordnet. Jede Seite des Riffs ist genau gleich lang: Nord, Ost, Süd und West.',
      370,
      180
    ),
    storyNode(
      'choice',
      'question',
      'Welchen Anker wählt Tika?',
      'Um den Kopf wieder klarzubekommen, sucht Tika einen festen Takt.',
      700,
      180
    ),
    storyNode(
      'breathe-box',
      'exercise',
      'Box Breathing am Viereck-Riff (4-4-4-4)',
      'Folge mit Tika den vier Seiten des Riffs: 4 Sekunden einatmen, 4 Sekunden ruhig halten, 4 Sekunden ausatmen, 4 Sekunden still ruhen.',
      1040,
      30,
      'box'
    ),
    storyNode(
      'count-stones',
      'scene',
      'Von Fels zu Fels blicken',
      'Tika tippt mit der Flosse nacheinander die vier Ecksteine an. Schon das langsame Zählen bis vier nimmt das Tempo aus den kreisenden Gedanken.',
      1040,
      340
    ),
    storyNode(
      'end',
      'ending',
      'Klarer Kurs',
      'Das Gedankenwirrwarr hat sich geordnet. Mit dem Viereck-Takt im Gepäck weiß Tika wieder genau, welchen kleinen Schritt sie als Nächstes tun möchte.',
      1390,
      180
    )
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'scene-square', label: 'Zwischen die Felsen schwimmen' },
    { id: 'e2', source: 'scene-square', target: 'choice', label: 'Innehalten' },
    { id: 'e3', source: 'choice', target: 'breathe-box', label: 'Vier-Viereck-Atmung starten' },
    { id: 'e4', source: 'choice', target: 'count-stones', label: 'Erst die vier Felsen betrachten' },
    { id: 'e5', source: 'count-stones', target: 'breathe-box', label: 'Jetzt im Viereck-Takt atmen' },
    { id: 'e6', source: 'breathe-box', target: 'end', label: 'Mit klarem Kopf auftauchen' }
  ]
};

const mondscheinLaguneStory: Graph = {
  version: 1,
  nodes: [
    storyNode(
      'start',
      'start',
      'Stille in der Mondschein-Lagune',
      'Über der geschützten Lagune spiegelt sich der silberne Mond. Der Tag war lang, aber Tikas Panzer fühlt sich noch schwer und angespannt an.',
      40,
      180
    ),
    storyNode(
      'scene-lagoon',
      'scene',
      'Das lange Ausatmen des Meeres',
      'In der Lagune zieht sich das Wasser beim Ausströmen ganz langsam über den feinen Korallensand zurück – viel länger, als es beim Einströmen gebraucht hat.',
      370,
      180
    ),
    storyNode(
      'choice',
      'question',
      'Was hilft Tika beim Loslassen?',
      'Manchmal hält der Körper die Anspannung fest, obwohl die Gefahr längst vorbei ist.',
      700,
      180
    ),
    storyNode(
      'breathe-478',
      'exercise',
      '4-7-8 Tiefenentspannung',
      'Atme 4 Sekunden durch die Nase ein, halte den Atem 7 Sekunden sanft und lass ihn 8 Sekunden lang langsam ausströmen. Bei Schwindel jederzeit normal weiteratmen.',
      1040,
      30,
      'calm478'
    ),
    storyNode(
      'shoulder-drop',
      'scene',
      'Die Flossen sinken lassen',
      'Tika lässt ihre Schultern und Flossen bewusst schwer werden. Sie merkt, wie ihr Nacken weicher wird, noch bevor der tiefe Ruhe-Atem beginnt.',
      1040,
      340
    ),
    storyNode(
      'end',
      'ending',
      'Geborgen in der Nacht',
      'Tikas Herzschlag ist ruhig geworden. Unter dem warmen Mondlicht darf der Tag jetzt wirklich Pause machen.',
      1390,
      180
    )
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'scene-lagoon', label: 'Dem Wasser lauschen' },
    { id: 'e2', source: 'scene-lagoon', target: 'choice', label: 'Weiter' },
    { id: 'e3', source: 'choice', target: 'breathe-478', label: '4-7-8 Ruhe-Atmung üben' },
    { id: 'e4', source: 'choice', target: 'shoulder-drop', label: 'Erst Flossen & Schultern lockern' },
    { id: 'e5', source: 'shoulder-drop', target: 'breathe-478', label: 'In die 4-7-8 Atmung gleiten' },
    { id: 'e6', source: 'breathe-478', target: 'end', label: 'Sanft ausruhen' }
  ]
};

const sternenKlippeStory: Graph = {
  version: 1,
  nodes: [
    storyNode(
      'start',
      'start',
      'Morgenlicht an der Sternen-Klippe',
      'Am östlichen Rand des Archipels leuchtet die Sternen-Klippe in der Morgensonne. Tika fühlt sich heute noch müde und ein bisschen klein.',
      40,
      180
    ),
    storyNode(
      'choice',
      'question',
      'Wie weckt Tika ihre Lebensgeister?',
      'Auf den warmen Steinen räkeln sich bunte Seesterne und strecken alle Spitzen weit in das glitzernde Licht.',
      420,
      180
    ),
    storyNode(
      'breathe-star',
      'exercise',
      'Sternen-Atmung (Arme weit nach oben)',
      'Strecke beim Einatmen (3s) die Arme weit nach oben wie ein leuchtender Stern! Kurz strahlen (1s) und beim Ausatmen (4s) die Arme sanft wieder senken.',
      820,
      40,
      'star'
    ),
    storyNode(
      'sun-stretch',
      'scene',
      'Sich groß machen',
      'Tika reckt den Kopf aus dem Panzer und streckt alle vier Flossen weit von sich. Sofort strömt mehr Platz in Brust und Bauch.',
      820,
      330
    ),
    storyNode(
      'end',
      'ending',
      'Wach und voller Schwung',
      'Mit einem warmen Kribbeln in den Flossen ist Tika hellwach und bereit für neue Abenteuer zwischen den Inseln.',
      1210,
      180
    )
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'choice', label: 'Zu den Seesternen hinaufschauen' },
    { id: 'e2', source: 'choice', target: 'breathe-star', label: 'Direkt die Sternen-Atmung machen' },
    { id: 'e3', source: 'choice', target: 'sun-stretch', label: 'Erst genüsslich recken & strecken' },
    { id: 'e4', source: 'sun-stretch', target: 'breathe-star', label: 'Jetzt wie ein Stern atmen' },
    { id: 'e5', source: 'breathe-star', target: 'end', label: 'Frisch in den Tag starten' }
  ]
};

// --- Rich Example Sea Journey Stories (Island to Island) ---

const journeyWellenKompassStory: Graph = {
  version: 1,
  nodes: [
    storyNode(
      'j-start',
      'start',
      'Aufbruch in die glitzernde Nordströmung',
      'Tika verlässt die schützende Wellen-Bucht Richtung Norden. Dort, wo das offene Meer beginnt, kreuzen sich zwei schimmernde Wasserstraßen.',
      40,
      180
    ),
    storyNode(
      'j-choice',
      'question',
      'Die Boje im Strom',
      'Auf einer schaukelnden Holzboje sitzt eine Silbermöwe und ruft: „Im offenen Meer verliert man leicht die Richtung! Schwimmst du lieber oben im Wind oder ruhig unter den Wellen?“',
      390,
      180
    ),
    storyNode(
      'j-under',
      'exercise',
      'Ruhiger Tauchzug durch die Kreuzströmung',
      'Tika taucht einen Meter tiefer, wo das Wasser still ist, und nimmt zwei ruhige Ozean-Atemzüge, um ihren Kurs zu halten.',
      760,
      40,
      'ocean'
    ),
    storyNode(
      'j-surface',
      'scene',
      'Blick zum Horizont',
      'Tika hebt den Kopf über die Gischt und peilt die vier markanten Felsen im Norden an. Jeder Flossenschlag bringt sie ein Stück näher.',
      760,
      320
    ),
    storyNode(
      'j-end',
      'ending',
      'Die vier Felsen des Kompass-Riffs',
      'Vor Tika ragen die vier quadratischen Steine aus dem klaren Wasser. Die Überfahrt ist geschafft!',
      1130,
      180
    )
  ],
  edges: [
    { id: 'je1', source: 'j-start', target: 'j-choice', label: 'Zur Boje schwimmen' },
    { id: 'je2', source: 'j-choice', target: 'j-under', label: 'Unter der Kreuzströmung tauchen' },
    { id: 'je3', source: 'j-choice', target: 'j-surface', label: 'Oben auf Sicht schwimmen' },
    { id: 'je4', source: 'j-under', target: 'j-end', label: 'Am Kompass-Riff auftauchen' },
    { id: 'je5', source: 'j-surface', target: 'j-end', label: 'Zwischen die Felsen gleiten' }
  ]
};

const journeyWellenTiefseeStory: Graph = {
  version: 1,
  nodes: [
    storyNode(
      'j-start',
      'start',
      'Hinab in den wiegenden Tangwald',
      'Von der Wellen-Bucht aus folgt Tika einem abfallenden Sandhang nach Südosten. Hohe grüne Seegrasbänder wiegen sich hier wie Vorhänge im Wasser.',
      40,
      180
    ),
    storyNode(
      'j-choice',
      'question',
      'Zwei Pfade durch das Seegras',
      'Zwischen den langen Halmen schimmern Sonnenstrahlen bis zum Meeresboden.',
      390,
      180
    ),
    storyNode(
      'j-kelp-breathe',
      'exercise',
      'Dreistufiger Atem im Tangwald',
      'Wie die großen Kelppflanzen von den Wurzeln über den Stängel bis zu den Blättern wachsen, probiert Tika schon unterwegs den dreistufigen Atem aus.',
      760,
      40,
      'dirga'
    ),
    storyNode(
      'j-seahorse',
      'scene',
      'Begegnung mit dem Seepferdchen',
      'Ein kleines goldenes Seepferdchen hält sich mit dem Schwanz an einem Halm fest und nickt Tika freundlich zu. Hier unten hat niemand Eile.',
      760,
      320
    ),
    storyNode(
      'j-end',
      'ending',
      'Ankunft im Tiefsee-Garten',
      'Die Seegraswiese öffnet sich zu einer warmen, stillen Lichtung unter Wasser: Der Tiefsee-Garten ist erreicht.',
      1130,
      180
    )
  ],
  edges: [
    { id: 'je1', source: 'j-start', target: 'j-choice', label: 'In den Tangwald eintauchen' },
    { id: 'je2', source: 'j-choice', target: 'j-kelp-breathe', label: 'Mit den Kelppflanzen atmen' },
    { id: 'je3', source: 'j-choice', target: 'j-seahorse', label: 'Dem Seepferdchen folgen' },
    { id: 'je4', source: 'j-kelp-breathe', target: 'j-end', label: 'Weiter zur Lichtung' },
    { id: 'je5', source: 'j-seahorse', target: 'j-end', label: 'Gemeinsam zum Garten gleiten' }
  ]
};

const journeyKompassMondscheinStory: Graph = {
  version: 1,
  nodes: [
    storyNode(
      'j-start',
      'start',
      'Der Dämmerungs-Strom nach Osten',
      'Als Tika das Kompass-Riff verlässt, färbt sich der Himmel über dem Meer bereits tiefblau. Das Wasser wird ruhig wie ein dunkler Spiegel.',
      40,
      180
    ),
    storyNode(
      'j-choice',
      'question',
      'Das Meeresleuchten',
      'Bei jedem Flossenschlag wirbelt Tika winzige blau leuchtende Planktonfunken auf, die wie kleine Unterwassersterne glimmen.',
      390,
      180
    ),
    storyNode(
      'j-glow-glide',
      'scene',
      'Spur aus blauem Licht',
      'Tika macht ganz langsame, weite Schwimmzüge. Je ruhiger sie sich bewegt, desto sanfter leuchtet die Spur hinter ihrem Panzer.',
      760,
      40
    ),
    storyNode(
      'j-calm-breath',
      'exercise',
      'Langer Ausatem in die Dämmerung',
      'Tika lässt beim Ausatmen feine silberne Blasen aufsteigen und stimmt sich auf die stille Mondschein-Lagune ein.',
      760,
      320,
      'calm478'
    ),
    storyNode(
      'j-end',
      'ending',
      'Einfahrt in die Mondschein-Lagune',
      'Zwischen zwei abgerundeten Korallenbögen öffnet sich das silbrig schimmernde Wasser der Mondschein-Lagune.',
      1130,
      180
    )
  ],
  edges: [
    { id: 'je1', source: 'j-start', target: 'j-choice', label: 'In die Dämmerung schwimmen' },
    { id: 'je2', source: 'j-choice', target: 'j-glow-glide', label: 'Mit dem Meeresleuchten gleiten' },
    { id: 'je3', source: 'j-choice', target: 'j-calm-breath', label: 'Langsam ausatmen & lauschen' },
    { id: 'je4', source: 'j-glow-glide', target: 'j-end', label: 'Der Lichtspur zur Lagune folgen' },
    { id: 'je5', source: 'j-calm-breath', target: 'j-end', label: 'In die Lagune einbiegen' }
  ]
};

const journeyMondscheinSternenStory: Graph = {
  version: 1,
  nodes: [
    storyNode(
      'j-start',
      'start',
      'Die Morgenröte-Passage',
      'Die Nacht in der Mondschein-Lagune weicht einem rosafarbenen Streifen am östlichen Horizont. Tika schwimmt dem ersten Sonnenlicht entgegen.',
      40,
      180
    ),
    storyNode(
      'j-choice',
      'question',
      'Frische Brise auf dem Meer',
      'Warme und kühle Strömungen mischen sich im Morgenlicht. Delfine ziehen in der Ferne vorbei.',
      390,
      180
    ),
    storyNode(
      'j-dolphin',
      'scene',
      'Sprung durch die glitzernde Gischt',
      'Tika spürt, wie die Müdigkeit aus ihren Flossen weicht, während das Wasser rundherum golden aufleuchtet.',
      760,
      40
    ),
    storyNode(
      'j-star-breath',
      'exercise',
      'Wachwerden mit der Sternen-Atmung',
      'Noch im Wasser streckt Tika sich beim Einatmen weit aus, um die frische Morgenkraft einzuladen.',
      760,
      320,
      'star'
    ),
    storyNode(
      'j-end',
      'ending',
      'An der hellen Sternen-Klippe',
      'Die sonnenbeschienene Sternen-Klippe ragt direkt vor Tika auf.',
      1130,
      180
    )
  ],
  edges: [
    { id: 'je1', source: 'j-start', target: 'j-choice', label: 'Dem Morgenlicht folgen' },
    { id: 'je2', source: 'j-choice', target: 'j-dolphin', label: 'Mit den Wellen mitschwingen' },
    { id: 'je3', source: 'j-choice', target: 'j-star-breath', label: 'Strecken & tief einatmen' },
    { id: 'je4', source: 'j-dolphin', target: 'j-end', label: 'Zur Klippe schwimmen' },
    { id: 'je5', source: 'j-star-breath', target: 'j-end', label: 'An der Sternen-Klippe anlegen' }
  ]
};

export const defaultArchipelago: Archipelago = {
  version: 1,
  title: 'Tikas Inselwelt der Atemwege',
  currentIslandId: 'wellen-bucht',
  visitedIslandIds: ['wellen-bucht'],
  completedJourneyIds: [],
  islands: [
    {
      id: 'wellen-bucht',
      name: 'Wellen-Bucht',
      subtitle: 'Urge Surfing · Ozean-Wellenatmung',
      description:
        'Sanfte Brandung am warmen Sandstrand. Hier lernt Tika, hohe Gefühls- und Druckwellen nicht zu bekämpfen, sondern sicher auf ihnen zu gleiten.',
      patternId: 'ocean',
      position: { x: 145, y: 370 },
      landmark: 'wave',
      accentColor: '#2dd4bf',
      status: 'example',
      story: wellenBuchtStory
    },
    {
      id: 'kompass-riff',
      name: 'Kompass-Riff',
      subtitle: 'Fokus & Klarheit · Vier-Viereck-Atmung',
      description:
        'Vier quadratische Basaltfelsen im klaren Nordwasser. Wenn Gedanken kreisen, gibt das Riff einen verlässlichen Takt in vier gleichen Seiten (4-4-4-4).',
      patternId: 'box',
      position: { x: 345, y: 165 },
      landmark: 'compass',
      accentColor: '#38bdf8',
      status: 'example',
      story: kompassRiffStory
    },
    {
      id: 'tiefsee-garten',
      name: 'Tiefsee-Garten',
      subtitle: 'Körpergefühl · Dirga 3-Stufen-Atmung',
      description:
        'Wie Kelpwälder, die sich von den Wurzeln über die Flanken bis zur Krone wiegen: Hier füllt sich der Atem in drei sanften Stufen (Bauch, Rippen, Brust).',
      patternId: 'dirga',
      position: { x: 425, y: 455 },
      landmark: 'kelp',
      accentColor: '#34d399',
      status: 'template',
      story: createIslandStoryTemplate(
        'Tiefsee-Garten',
        'dirga',
        'Die dreistufige Meeresatmung (Bauch · Flanken · Brust)'
      )
    },
    {
      id: 'mondschein-lagune',
      name: 'Mondschein-Lagune',
      subtitle: 'Vagusnerv & Ruhe · 4-7-8 Beruhigung',
      description:
        'Eine stille, geschützte Bucht unter silbernem Mondlicht. Das lange, sanfte Ausatmen hilft Tika, hartnäckige Anspannung am Abend loszulassen.',
      patternId: 'calm478',
      position: { x: 635, y: 145 },
      landmark: 'moon',
      accentColor: '#818cf8',
      status: 'example',
      story: mondscheinLaguneStory
    },
    {
      id: 'herzschlag-atoll',
      name: 'Herzschlag-Atoll',
      subtitle: 'Gleichklang · Kohärenz-Atmung (5.5s)',
      description:
        'Ein rundes Korallenatoll, in dem Ebbe und Flut exakt gleich lang dauern. Herzschlag und Atmung schwingen sich hier auf einen ruhigen Gleichklang ein.',
      patternId: 'coherence',
      position: { x: 705, y: 435 },
      landmark: 'coral',
      accentColor: '#f472b6',
      status: 'template',
      story: createIslandStoryTemplate(
        'Herzschlag-Atoll',
        'coherence',
        'Kohärenz-Atmung (5,5s Ein · 5,5s Aus) für Herz und Ruhe'
      )
    },
    {
      id: 'sternen-klippe',
      name: 'Sternen-Klippe',
      subtitle: 'Wachwerden & Bewegung · Sternen-Atmung',
      description:
        'Ein heller Leuchtfelsen im Morgenlicht. Hier streckt Tika die Flossen weit nach oben wie ein Seestern, um Müdigkeit abzuschütteln.',
      patternId: 'star',
      position: { x: 875, y: 275 },
      landmark: 'star',
      accentColor: '#fbbf24',
      status: 'example',
      story: sternenKlippeStory
    }
  ],
  journeys: [
    {
      id: 'reise-wellen-kompass',
      from: 'wellen-bucht',
      to: 'kompass-riff',
      title: 'Die glitzernde Nordströmung',
      summary: 'Vom warmen Sandstrand hinaus ins offene Wasser, wo zwei Strömungen aufeinandertreffen.',
      seaMood: 'calm-current',
      status: 'example',
      story: journeyWellenKompassStory
    },
    {
      id: 'reise-wellen-tiefsee',
      from: 'wellen-bucht',
      to: 'tiefsee-garten',
      title: 'Der Weg durch den Tangwald',
      summary: 'Ein sanfter Tauchgang entlang grüner Seegraswiesen in tiefere, stille Wasserschichten.',
      seaMood: 'deep-trench',
      status: 'example',
      story: journeyWellenTiefseeStory
    },
    {
      id: 'reise-kompass-mondschein',
      from: 'kompass-riff',
      to: 'mondschein-lagune',
      title: 'Der Dämmerungs-Strom',
      summary: 'Wenn der Himmel violett wird, weisen blau leuchtende Planktonfunken den Weg zur stillen Lagune.',
      seaMood: 'glowing-reef',
      status: 'example',
      story: journeyKompassMondscheinStory
    },
    {
      id: 'reise-kompass-tiefsee',
      from: 'kompass-riff',
      to: 'tiefsee-garten',
      title: 'Die Unterwasser-Schlucht',
      summary: 'Zwischen klaren Felskanten hinab zu den warmen Quellen des Tiefsee-Gartens.',
      seaMood: 'deep-trench',
      status: 'template',
      story: createJourneyStoryTemplate('Die Unterwasser-Schlucht', 'Kompass-Riff', 'Tiefsee-Garten', 'dirga')
    },
    {
      id: 'reise-tiefsee-herzschlag',
      from: 'tiefsee-garten',
      to: 'herzschlag-atoll',
      title: 'Der warme Golfstrom',
      summary: 'Eine gleichmäßige, tragende Tiefenströmung, in der Tika fast ohne Flossenschlag gleitet.',
      seaMood: 'warm-gulf',
      status: 'template',
      story: createJourneyStoryTemplate('Der warme Golfstrom', 'Tiefsee-Garten', 'Herzschlag-Atoll', 'coherence')
    },
    {
      id: 'reise-mondschein-herzschlag',
      from: 'mondschein-lagune',
      to: 'herzschlag-atoll',
      title: 'Die Korallen-Passage',
      summary: 'Sanfte Gezeitenströme verbinden die stille Mondlagune mit dem runden Korallenatoll.',
      seaMood: 'glowing-reef',
      status: 'template',
      story: createJourneyStoryTemplate('Die Korallen-Passage', 'Mondschein-Lagune', 'Herzschlag-Atoll', 'coherence')
    },
    {
      id: 'reise-mondschein-sternen',
      from: 'mondschein-lagune',
      to: 'sternen-klippe',
      title: 'Die Morgenröte-Passage',
      summary: 'Aus der nächtlichen Stille hinaus dem ersten goldenen Sonnenstrahl entgegen.',
      seaMood: 'starlight-drift',
      status: 'example',
      story: journeyMondscheinSternenStory
    },
    {
      id: 'reise-herzschlag-sternen',
      from: 'herzschlag-atoll',
      to: 'sternen-klippe',
      title: 'Der Regenbogen-Riffbogen',
      summary: 'Über bunte Korallenbänke, in denen Schwärme kleiner Fische im Takt schwimmen.',
      seaMood: 'warm-gulf',
      status: 'template',
      story: createJourneyStoryTemplate('Der Regenbogen-Riffbogen', 'Herzschlag-Atoll', 'Sternen-Klippe', 'star')
    }
  ]
};

/** Finds an existing journey connecting two islands in either direction. */
export function findJourneyBetween(
  archipelago: Archipelago,
  fromId: string,
  toId: string
): SeaJourney | undefined {
  return archipelago.journeys.find(
    j => (j.from === fromId && j.to === toId) || (j.from === toId && j.to === fromId)
  );
}

/** Validates an archipelago and all embedded island and journey story graphs. */
export function validateArchipelago(arch: Archipelago): string[] {
  const issues: string[] = [];
  if (!arch.islands.length) issues.push('Die Karte braucht mindestens eine Insel.');
  const islandIds = new Set(arch.islands.map(i => i.id));
  if (islandIds.size !== arch.islands.length) issues.push('Insel-IDs müssen eindeutig sein.');
  if (!islandIds.has(arch.currentIslandId)) issues.push('Tikas aktuelle Insel existiert nicht auf der Karte.');

  for (const island of arch.islands) {
    const storyIssues = validate(island.story);
    for (const issue of storyIssues) {
      issues.push(`Insel „${island.name}“: ${issue}`);
    }
  }

  const journeyIds = new Set(arch.journeys.map(j => j.id));
  if (journeyIds.size !== arch.journeys.length) issues.push('Reiserouten-IDs müssen eindeutig sein.');

  for (const journey of arch.journeys) {
    if (!islandIds.has(journey.from) || !islandIds.has(journey.to)) {
      issues.push(`Reiseroute „${journey.title}“ verweist auf eine fehlende Insel.`);
    }
    if (journey.from === journey.to) {
      issues.push(`Reiseroute „${journey.title}“ muss zwei verschiedene Inseln verbinden.`);
    }
    const storyIssues = validate(journey.story);
    for (const issue of storyIssues) {
      issues.push(`Reise „${journey.title}“: ${issue}`);
    }
  }
  return issues;
}

/** Parses and validates a serialized Archipelago JSON string. */
export function parseArchipelago(text: string): Archipelago {
  const raw = JSON.parse(text);
  if (
    !raw ||
    raw.version !== 1 ||
    typeof raw.title !== 'string' ||
    typeof raw.currentIslandId !== 'string' ||
    !Array.isArray(raw.islands) ||
    !Array.isArray(raw.journeys) ||
    raw.islands.length === 0 ||
    raw.islands.length > 100 ||
    raw.journeys.length > 500
  ) {
    throw new Error('Ungültiges Inselwelt-Format (Version 1 erwartet).');
  }

  const islands: Island[] = raw.islands.map((i: Island) => {
    if (
      !i ||
      typeof i.id !== 'string' ||
      !i.id ||
      typeof i.name !== 'string' ||
      typeof i.subtitle !== 'string' ||
      typeof i.description !== 'string' ||
      typeof i.patternId !== 'string' ||
      !i.position ||
      !Number.isFinite(i.position.x) ||
      !Number.isFinite(i.position.y) ||
      !Object.hasOwn(LANDMARK_LABELS, i.landmark) ||
      typeof i.accentColor !== 'string' ||
      (i.status !== 'example' && i.status !== 'template') ||
      !i.story
    ) {
      throw new Error('Ungültige Insel in der Datei.');
    }
    return {
      id: i.id,
      name: i.name,
      subtitle: i.subtitle,
      description: i.description,
      patternId: i.patternId,
      position: { x: i.position.x, y: i.position.y },
      landmark: i.landmark,
      accentColor: i.accentColor,
      status: i.status,
      story: parseGraph(JSON.stringify(i.story))
    };
  });

  const journeys: SeaJourney[] = raw.journeys.map((j: SeaJourney) => {
    if (
      !j ||
      typeof j.id !== 'string' ||
      !j.id ||
      typeof j.from !== 'string' ||
      typeof j.to !== 'string' ||
      typeof j.title !== 'string' ||
      typeof j.summary !== 'string' ||
      !Object.hasOwn(SEA_MOOD_LABELS, j.seaMood) ||
      (j.status !== 'example' && j.status !== 'template') ||
      !j.story
    ) {
      throw new Error('Ungültige Reiseroute in der Datei.');
    }
    return {
      id: j.id,
      from: j.from,
      to: j.to,
      title: j.title,
      summary: j.summary,
      seaMood: j.seaMood,
      status: j.status,
      story: parseGraph(JSON.stringify(j.story))
    };
  });

  const islandIds = new Set(islands.map(i => i.id));
  if (islandIds.size !== islands.length) throw new Error('Doppelte Insel-IDs in der Datei.');
  if (new Set(journeys.map(j => j.id)).size !== journeys.length) throw new Error('Doppelte Reiserouten-IDs in der Datei.');

  const currentIslandId = islandIds.has(raw.currentIslandId) ? raw.currentIslandId : islands[0].id;
  const visitedIslandIds = Array.isArray(raw.visitedIslandIds)
    ? raw.visitedIslandIds.filter((id: unknown): id is string => typeof id === 'string' && islandIds.has(id))
    : [currentIslandId];
  const journeyIdSet = new Set(journeys.map(j => j.id));
  const completedJourneyIds = Array.isArray(raw.completedJourneyIds)
    ? raw.completedJourneyIds.filter((id: unknown): id is string => typeof id === 'string' && journeyIdSet.has(id))
    : [];

  return {
    version: 1,
    title: raw.title,
    currentIslandId,
    visitedIslandIds: visitedIslandIds.length ? visitedIslandIds : [currentIslandId],
    completedJourneyIds,
    islands,
    journeys
  };
}
