import type { Node, Edge } from '@xyflow/react';
export type Kind = 'start' | 'scene' | 'question' | 'exercise' | 'ending';

export type CompanionKind =
  | 'auto'
  | 'none'
  | 'mentor-turtle'
  | 'friend-turtle'
  | 'dolphin'
  | 'seahorse'
  | 'jellyfish'
  | 'manta'
  | 'starfish'
  | 'school-of-fish';

export type StoryData = {
  title: string;
  text: string;
  kind: Kind;
  patternId?: string;
  speaker?: string;
  dialog?: string;
  companion?: CompanionKind;
};

export type StoryNode = Node<StoryData>;
export type Graph = { version: 1; nodes: StoryNode[]; edges: Edge[] };
export const kinds: Record<Kind, string> = { start: 'Start', scene: 'Szene', question: 'Frage', exercise: 'Atemübung', ending: 'Ende' };
export const storyNode = (
  id: string,
  kind: Kind,
  title: string,
  text: string,
  x: number,
  y: number,
  patternId?: string,
  extra?: { speaker?: string; dialog?: string; companion?: CompanionKind }
): StoryNode => ({
  id,
  type: 'story',
  position: { x, y },
  data: {
    kind,
    title,
    text,
    ...(patternId ? { patternId } : {}),
    ...(extra ?? {})
  }
});
const node = storyNode;
export const sample: Graph = { version: 1, nodes: [
  node('start', 'start', 'Tikas kleiner Mutmoment', 'Ein neuer Tag am See. Begleite Tika, die kleine Schildkröte.', 40, 180),
  node('lake', 'scene', 'Am Ufer', 'Heute ist am See viel los. Tika spürt ein Kribbeln im Bauch und zieht den Kopf ein wenig ein.', 370, 180),
  node('choice', 'question', 'Was braucht Tika gerade?', 'Manchmal hilft eine Pause. Manchmal ein gutes Gespräch. Du entscheidest.', 700, 180),
  node('breathe', 'exercise', 'Atmen wie die Wellen', 'Atme ruhig ein. Lass die Luft langsam wieder ausströmen. Wiederhole das dreimal, in deinem Tempo.', 1040, 20),
  node('friend', 'scene', 'Ein offenes Ohr', 'Tika erzählt ihrer Freundin, wie es ihr geht. Gemeinsam sitzen sie eine Weile am Wasser.', 1040, 350),
  node('end', 'ending', 'Ein Schritt ist genug', 'Tika hat auf sich gehört. Kleine Schritte zählen. Für heute darf das genug sein.', 1390, 180),
], edges: [
  { id: 'e1', source: 'start', target: 'lake', label: 'Los geht’s' },
  { id: 'e2', source: 'lake', target: 'choice', label: 'Weiter' },
  { id: 'e3', source: 'choice', target: 'breathe', label: 'Eine Atempause' },
  { id: 'e4', source: 'choice', target: 'friend', label: 'Mit jemandem sprechen' },
  { id: 'e5', source: 'breathe', target: 'end', label: 'Zurück zum See' },
  { id: 'e6', source: 'friend', target: 'end', label: 'Danke fürs Zuhören' },
] };
export function validate(graph: Graph): string[] {
  const issues: string[] = [];
  const ids = new Set(graph.nodes.map(n => n.id));
  if (ids.size !== graph.nodes.length) issues.push('Knoten-IDs müssen eindeutig sein.');
  if (new Set(graph.edges.map(e => e.id)).size !== graph.edges.length) issues.push('Verbindungs-IDs müssen eindeutig sein.');
  const starts = graph.nodes.filter(n => n.data.kind === 'start');
  if (starts.length !== 1) issues.push('Die Geschichte braucht genau einen Start.');
  for (const e of graph.edges) if (!ids.has(e.source) || !ids.has(e.target)) issues.push(`Verbindung „${e.id}“ verweist auf einen fehlenden Knoten.`);
  const seen = new Set<string>();
  const queue = starts.map(n => n.id);
  while (queue.length) { const id = queue.pop()!; if (seen.has(id)) continue; seen.add(id); graph.edges.filter(e => e.source === id && ids.has(e.target)).forEach(e => queue.push(e.target)); }
  for (const n of graph.nodes) {
    if (!seen.has(n.id)) issues.push(`„${n.data.title}“ ist vom Start nicht erreichbar.`);
    const outgoing = graph.edges.filter(e => e.source === n.id);
    if (n.data.kind !== 'ending' && !outgoing.length) issues.push(`„${n.data.title}“ hat keine Fortsetzung.`);
    if (n.data.kind === 'ending' && outgoing.length) issues.push(`„${n.data.title}“ ist ein Ende und hat eine Fortsetzung.`);
    if (n.data.kind === 'question' && outgoing.length < 2) issues.push(`„${n.data.title}“ braucht mindestens zwei Antworten.`);
    if (n.data.kind === 'question' && outgoing.some(e => typeof e.label !== 'string' || !e.label.trim())) issues.push(`„${n.data.title}“ hat eine Antwort ohne Beschriftung.`);
  }
  if (!graph.nodes.some(n => n.data.kind === 'ending')) issues.push('Die Geschichte braucht ein Ende.');
  return issues;
}
export function parseGraph(text: string): Graph {
  const g = JSON.parse(text);
  if (!g || g.version !== 1 || !Array.isArray(g.nodes) || !Array.isArray(g.edges) || g.nodes.length > 1000 || g.edges.length > 5000) throw new Error('Ungültiges Dateiformat (Version 1 erwartet, maximal 1.000 Knoten / 5.000 Verbindungen).');
  const nodes = g.nodes.map((n: StoryNode) => {
    if (!n || typeof n.id !== 'string' || !n.id || !n.position || !Number.isFinite(n.position.x) || !Number.isFinite(n.position.y) || !n.data || !Object.hasOwn(kinds, n.data.kind) || typeof n.data.title !== 'string' || typeof n.data.text !== 'string' || (n.data.patternId !== undefined && typeof n.data.patternId !== 'string')) throw new Error('Ungültiger Knoten in der Datei.');
    const data: StoryData = { kind: n.data.kind, title: n.data.title, text: n.data.text };
    if (typeof n.data.patternId === 'string' && n.data.patternId.trim()) data.patternId = n.data.patternId.trim();
    if (typeof n.data.speaker === 'string' && n.data.speaker.trim()) data.speaker = n.data.speaker.trim();
    if (typeof n.data.dialog === 'string' && n.data.dialog.trim()) data.dialog = n.data.dialog.trim();
    if (typeof n.data.companion === 'string' && n.data.companion.trim()) data.companion = n.data.companion as CompanionKind;
    return { id: n.id, type: 'story', position: { x: n.position.x, y: n.position.y }, data };
  });
  const edges = g.edges.map((e: Edge) => {
    if (!e || typeof e.id !== 'string' || !e.id || typeof e.source !== 'string' || typeof e.target !== 'string' || (e.label !== undefined && typeof e.label !== 'string')) throw new Error('Ungültige Verbindung in der Datei.');
    return { id: e.id, source: e.source, target: e.target, label: e.label ?? '' };
  });
  if (new Set(nodes.map((n: StoryNode) => n.id)).size !== nodes.length || new Set(edges.map((e: Edge) => e.id)).size !== edges.length) throw new Error('Doppelte IDs in der Datei.');
  return { version: 1, nodes, edges };
}

export interface ParsedSceneInfo {
  companion: CompanionKind;
  companionName: string;
  companionAvatar: string;
  companionDialog?: string;
  tikaDialog: string;
}

export const COMPANION_METADATA: Record<CompanionKind, { name: string; avatar: string }> = {
  auto: { name: 'Begleiter', avatar: '✨' },
  none: { name: '', avatar: '' },
  'mentor-turtle': { name: 'Alte Meeresschildkröte', avatar: '🐢' },
  'friend-turtle': { name: 'Tikas Freundin', avatar: '🐢' },
  dolphin: { name: 'Riff-Delfin', avatar: '🐬' },
  seahorse: { name: 'Goldenes Seepferdchen', avatar: '🌊' },
  jellyfish: { name: 'Leuchtqualle', avatar: '🪼' },
  manta: { name: 'Eleganter Rochen', avatar: '🪸' },
  starfish: { name: 'Bunter Seestern', avatar: '⭐' },
  'school-of-fish': { name: 'Silberner Fischschwarm', avatar: '🐟' }
};

export function parseNodeDialogueAndCompanion(
  node: StoryNode,
  defaultCompanion: CompanionKind = 'none'
): ParsedSceneInfo {
  const text = node.data.text || '';
  const title = node.data.title || '';
  const combined = `${title} ${text}`.toLowerCase();

  // 1. Resolve companion
  let companion: CompanionKind = node.data.companion ?? 'auto';
  if (companion === 'auto') {
    if (
      combined.includes('alte meeresschildkröte') ||
      combined.includes('alte schildkröte') ||
      combined.includes('schildkröte neben ihr')
    ) {
      companion = 'mentor-turtle';
    } else if (
      combined.includes('freundin') ||
      combined.includes('freund') ||
      combined.includes('offenes ohr')
    ) {
      companion = 'friend-turtle';
    } else if (combined.includes('seepferdchen')) {
      companion = 'seahorse';
    } else if (combined.includes('delfin') || combined.includes('delfine')) {
      companion = 'dolphin';
    } else if (
      combined.includes('qualle') ||
      combined.includes('leuchtqualle') ||
      combined.includes('quallen')
    ) {
      companion = 'jellyfish';
    } else if (combined.includes('rochen') || combined.includes('manta')) {
      companion = 'manta';
    } else if (combined.includes('seestern') || combined.includes('seesterne')) {
      companion = 'starfish';
    } else if (
      combined.includes('fisch') ||
      combined.includes('fischschwarm') ||
      combined.includes('schwarm')
    ) {
      companion = 'school-of-fish';
    } else {
      companion = defaultCompanion;
    }
  }

  const meta = COMPANION_METADATA[companion] ?? COMPANION_METADATA.none;
  const companionName = node.data.speaker || meta.name;
  const companionAvatar = meta.avatar;

  // 2. Extract companion dialogue
  let companionDialog: string | undefined = node.data.dialog;
  if (!companionDialog) {
    const quoteMatch = text.match(/[„"]([^“"]+)[“"]/);
    if (quoteMatch) {
      companionDialog = quoteMatch[1].trim();
    }
  }

  // 3. Formulate Tika's line / response
  let tikaDialog = '';
  if (companionDialog && companion !== 'none') {
    if (companion === 'mentor-turtle') {
      tikaDialog = 'Ich muss die Welle nicht bekämpfen – ich breite die Flossen aus und surfe darauf!';
    } else if (companion === 'seahorse') {
      tikaDialog = 'Drei Stufen: Bauch, Flanken, Schultern. Ganz ohne Eile wachse ich ins Licht.';
    } else if (companion === 'friend-turtle') {
      tikaDialog = 'Danke fürs Zuhören. Es tut gut, nicht allein damit zu sein.';
    } else if (companion === 'dolphin') {
      tikaDialog = 'Zusammen schwimmt es sich doppelt so leicht!';
    } else if (companion === 'jellyfish') {
      tikaDialog = 'Vier einatmen, sieben halten, acht loslassen... Jetzt wird mein Panzer ruhig.';
    } else if (companion === 'manta') {
      tikaDialog = 'Fünf Sekunden ein, fünf Sekunden aus... Mein Herzschlag schwingt im gleichen Takt.';
    } else if (companion === 'starfish') {
      tikaDialog = 'Alle vier Flossen weit ausstrecken! Ich bin wach und bereit für die Welt.';
    } else if (companion === 'school-of-fish') {
      tikaDialog = 'Eins, zwei, drei, vier Felsen. Schon ordnen sich meine Gedanken wieder.';
    }
  }

  if (!tikaDialog) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const tikaSentence = sentences.find(s => s.toLowerCase().includes('tika'));
    if (tikaSentence) {
      tikaDialog = tikaSentence.trim();
    } else if (sentences[0]) {
      tikaDialog = sentences[0].trim();
    } else {
      tikaDialog = title;
    }
  }

  return {
    companion,
    companionName,
    companionAvatar,
    companionDialog,
    tikaDialog
  };
}
