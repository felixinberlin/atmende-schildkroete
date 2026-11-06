import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import type { NodeProps, Connection } from '@xyflow/react';
import { BUILTIN_PATTERNS, findPattern } from './breathing';
import { kinds, parseGraph, sample, validate } from './graph';
import type { Graph, Kind, StoryNode } from './graph';
import {
  defaultArchipelago,
  parseArchipelago,
  validateArchipelago,
  type Archipelago,
  type Island
} from './islands';
import { IslandMap } from './components/IslandMap/IslandMap';
import { SeaPatternMode } from './components/SeaPatternMode/SeaPatternMode';
import { SpectatorVoyageMode } from './components/SpectatorVoyage';
import { StoryVoyagePlayer } from './components/StoryVoyage';
import { TurtleBreathing } from './components/TurtleBreathing';
import { BreathJournalModal } from './components/BreathJournal/BreathJournalModal';
import '@xyflow/react/dist/style.css';
import './style.css';

const STORY_KEY = 'tika-story-v1';
const LEGACY_STORY_KEY = 'chemistry-tika-v1';

const ARCHIPELAGO_KEY = 'tika-archipelago-v1';
const LEGACY_ARCHIPELAGO_KEY = 'chemistry-tika-archipelago-v1';

type EditTarget =
  | { scope: 'island'; id: string }
  | { scope: 'journey'; id: string }
  | { scope: 'standalone' };

interface PreviewSession {
  title: string;
  subtitle: string;
  graph: Graph;
  defaultPatternId: string;
  destinationIslandId?: string;
  island?: Island;
}

function loadStandaloneGraph(): Graph {
  try {
    const saved = localStorage.getItem(STORY_KEY) || localStorage.getItem(LEGACY_STORY_KEY);
    return saved ? parseGraph(saved) : structuredClone(sample);
  } catch {
    return structuredClone(sample);
  }
}

function loadInitialArchipelago(): Archipelago {
  try {
    const saved = localStorage.getItem(ARCHIPELAGO_KEY) || localStorage.getItem(LEGACY_ARCHIPELAGO_KEY);
    return saved ? parseArchipelago(saved) : structuredClone(defaultArchipelago);
  } catch {
    return structuredClone(defaultArchipelago);
  }
}

function StoryCard({ data, selected }: NodeProps<StoryNode>) {
  const pattern = data.kind === 'exercise' ? findPattern(data.patternId ?? 'ocean') : undefined;
  return (
    <article className={`story-card ${data.kind} ${selected ? 'active' : ''}`}>
      {data.kind !== 'start' && <Handle type="target" position={Position.Left} />}
      <div className="story-card-header">
        <span className="node-kind">{kinds[data.kind]}</span>
        {pattern && <span className="node-pattern-pill">{pattern.shortName ?? pattern.name}</span>}
      </div>
      <h3>{data.title}</h3>
      <p>{data.text}</p>
      {data.kind !== 'ending' && <Handle type="source" position={Position.Right} />}
    </article>
  );
}

const nodeTypes = { story: StoryCard };

function App() {
  const [view, setView] = useState<'map' | 'voyage' | 'pattern' | 'editor'>('map');
  const [patternIslandId, setPatternIslandId] = useState<string | undefined>(undefined);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [archipelago, setArchipelago] = useState<Archipelago>(loadInitialArchipelago);
  const [standaloneGraph, setStandaloneGraph] = useState<Graph>(loadStandaloneGraph);
  const [editTarget, setEditTarget] = useState<EditTarget>(() => ({
    scope: 'island',
    id: loadInitialArchipelago().currentIslandId
  }));

  // Resolve the active graph being edited in the Story Creator
  const activeEditorMeta = useMemo(() => {
    if (editTarget.scope === 'island') {
      const island = archipelago.islands.find(i => i.id === editTarget.id) ?? archipelago.islands[0];
      if (island) {
        return {
          label: `Insel: ${island.name}`,
          sublabel: island.subtitle,
          defaultPatternId: island.patternId,
          graph: island.story
        };
      }
    } else if (editTarget.scope === 'journey') {
      const journey = archipelago.journeys.find(j => j.id === editTarget.id) ?? archipelago.journeys[0];
      if (journey) {
        const toIsland = archipelago.islands.find(i => i.id === journey.to);
        return {
          label: `Überfahrt: ${journey.title}`,
          sublabel: journey.summary,
          defaultPatternId: toIsland?.patternId ?? 'ocean',
          graph: journey.story
        };
      }
    }
    return {
      label: 'Freie Geschichte: Ein kleiner Mutmoment',
      sublabel: 'Unabhängiger Entwurf im Geschichtenatelier',
      defaultPatternId: 'ocean',
      graph: standaloneGraph
    };
  }, [archipelago, editTarget, standaloneGraph]);

  const [nodes, setNodes, onNodesChange] = useNodesState<StoryNode>(activeEditorMeta.graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(activeEditorMeta.graph.edges);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [message, setMessage] = useState('Bereit für Tikas Inselreise und deine Geschichten.');
  const [saving, setSaving] = useState('');

  // Story Preview Modal & Direct Breathing Exercise Modal
  const [previewSession, setPreviewSession] = useState<PreviewSession | null>(null);
  const [breathingIsland, setBreathingIsland] = useState<Island | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  // Sync nodes/edges back into the active target (island story, journey story, or standalone)
  const currentEditorGraph: Graph = useMemo(() => ({ version: 1, nodes, edges }), [nodes, edges]);

  useEffect(() => {
    if (editTarget.scope === 'island') {
      setArchipelago(prev => ({
        ...prev,
        islands: prev.islands.map(i => (i.id === editTarget.id ? { ...i, story: currentEditorGraph } : i))
      }));
    } else if (editTarget.scope === 'journey') {
      setArchipelago(prev => ({
        ...prev,
        journeys: prev.journeys.map(j => (j.id === editTarget.id ? { ...j, story: currentEditorGraph } : j))
      }));
    } else {
      setStandaloneGraph(currentEditorGraph);
    }
  }, [currentEditorGraph, editTarget.scope, editTarget]);

  // Switch active story target cleanly
  function selectEditTarget(next: EditTarget, sourceArch = archipelago) {
    let targetGraph = standaloneGraph;
    if (next.scope === 'island') {
      targetGraph = sourceArch.islands.find(i => i.id === next.id)?.story ?? sourceArch.islands[0].story;
    } else if (next.scope === 'journey') {
      targetGraph = sourceArch.journeys.find(j => j.id === next.id)?.story ?? sourceArch.journeys[0].story;
    }
    const cloned = structuredClone(targetGraph);
    setEditTarget(next);
    setNodes(cloned.nodes);
    setEdges(cloned.edges);
    setSelected(cloned.nodes[0]?.id ?? null);
    setSelectedEdge(null);
  }

  const editorIssues = useMemo(() => validate(currentEditorGraph), [currentEditorGraph]);
  const mapIssues = useMemo(() => validateArchipelago(archipelago), [archipelago]);

  // Persist both standalone graph and archipelago to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORY_KEY, JSON.stringify(standaloneGraph));
        localStorage.setItem(ARCHIPELAGO_KEY, JSON.stringify(archipelago));
        setSaving('Im Browser gespeichert');
      } catch {
        setSaving('Browserspeicher voll oder gesperrt — bitte JSON exportieren');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [standaloneGraph, archipelago]);

  const current = nodes.find(n => n.id === selected);
  const edge = edges.find(e => e.id === selectedEdge);

  function update(data: Partial<StoryNode['data']>) {
    setNodes(ns => ns.map(n => (n.id === selected ? { ...n, data: { ...n.data, ...data } } : n)));
  }

  function connect(c: Connection) {
    setEdges(es => addEdge({ ...c, label: 'Weiter' }, es));
  }

  function add(kind: Kind) {
    const id = crypto.randomUUID();
    const defaultPat = findPattern(activeEditorMeta.defaultPatternId);
    setNodes(ns => [
      ...ns,
      {
        id,
        type: 'story',
        position: { x: 150 + (ns.length % 4) * 310, y: 100 + Math.floor(ns.length / 4) * 270 },
        data:
          kind === 'exercise'
            ? {
                kind,
                title: defaultPat?.shortName ?? 'Atmen wie die Wellen',
                text:
                  defaultPat?.description ??
                  sample.nodes.find(n => n.data.kind === 'exercise')!.data.text,
                patternId: activeEditorMeta.defaultPatternId
              }
            : {
                kind,
                title: `Neue ${kinds[kind]}`,
                text: 'Hier beginnt dein nächster Gedanke …'
              }
      }
    ]);
    setSelected(id);
    setSelectedEdge(null);
    setMessage(`${kinds[kind]} hinzugefügt. Verbinde den Knoten über die Punkte am Rand.`);
  }

  function remove() {
    if (current) {
      setNodes(ns => ns.filter(n => n.id !== current.id));
      setEdges(es => es.filter(e => e.source !== current.id && e.target !== current.id));
      setSelected(null);
    } else if (edge) {
      setEdges(es => es.filter(e => e.id !== edge.id));
      setSelectedEdge(null);
    }
  }

  function download() {
    if (view === 'map') {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(archipelago, null, 2)], { type: 'application/json' })
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tika-inselwelt.json';
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Gesamte Inselwelt als JSON exportiert.');
    } else {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(currentEditorGraph, null, 2)], { type: 'application/json' })
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tika-geschichte.json';
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Aktuelle Geschichte als JSON exportiert.');
    }
  }

  async function load(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('Die Datei ist größer als 5 MB.');
      const text = await file.text();
      const raw = JSON.parse(text);
      if (raw && Array.isArray(raw.islands) && Array.isArray(raw.journeys)) {
        const nextArch = parseArchipelago(text);
        if (!window.confirm('Aktuelle Inselwelt durch die importierte Datei ersetzen?')) return;
        setArchipelago(nextArch);
        selectEditTarget({ scope: 'island', id: nextArch.currentIslandId }, nextArch);
        setPreviewSession(null);
        setMessage('Inselwelt geladen.');
      } else {
        const nextGraph = parseGraph(text);
        if (!window.confirm('Aktuelle Geschichte durch die importierte Datei ersetzen?')) return;
        setNodes(nextGraph.nodes);
        setEdges(nextGraph.edges);
        setSelected(null);
        setSelectedEdge(null);
        setPreviewSession(null);
        setMessage('Geschichte geladen. Prüfe die Hinweise zur Struktur.');
      }
    } catch (e) {
      setMessage(`Import fehlgeschlagen: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function openStoryPreview(
    title: string,
    subtitle: string,
    storyGraph: Graph,
    defaultPatternId: string,
    destinationIslandId?: string,
    island?: Island
  ) {
    setPreviewSession({
      title,
      subtitle,
      graph: storyGraph,
      defaultPatternId,
      destinationIslandId,
      island
    });
  }

  return (
    <div className="app">
      <header>
        <div className="header-left">
          <a
            className="brand"
            href="#map"
            onClick={e => {
              e.preventDefault();
              setView('map');
            }}
            aria-label="Tika · Atmende Schildkröte Inselwelt & Geschichtenatelier"
          >
            <span className="brand-icon">🐢</span> Tika
            <span className="brand-divider">/</span>
            <small>Atmende Schildkröte · Inselwelt</small>
          </a>

          <nav className="mode-tabs" aria-label="Ansicht wechseln">
            <button
              type="button"
              className={`mode-tab ${view === 'map' ? 'active' : ''}`}
              onClick={() => setView('map')}
            >
              🗺️ Inselkarte ({archipelago.islands.length})
            </button>
            <button
              type="button"
              className={`mode-tab ${view === 'voyage' ? 'active' : ''}`}
              onClick={() => setView('voyage')}
            >
              🔭 Weltreise (Zuschauer)
            </button>
            <button
              type="button"
              className={`mode-tab ${view === 'pattern' ? 'active' : ''}`}
              onClick={() => setView('pattern')}
            >
              🌀 Meeresmuster
            </button>
            <button
              type="button"
              className={`mode-tab ${view === 'editor' ? 'active' : ''}`}
              onClick={() => setView('editor')}
            >
              ✒️ Geschichtenatelier
            </button>
          </nav>
        </div>

        <div className="header-actions">
          <span className="saved">{saving}</span>
          <button type="button" onClick={() => setIsJournalOpen(true)} title="Gespeicherte Atem-Reisen im Tagebuch ansehen">
            🐚 Reisetagebuch
          </button>
          <button type="button" onClick={() => fileInput.current?.click()}>
            Importieren
          </button>
          <button type="button" onClick={download}>
            {view === 'map' ? 'Inselwelt exportieren ↗' : 'Geschichte exportieren ↗'}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              if (view === 'map') {
                const cur =
                  archipelago.islands.find(i => i.id === archipelago.currentIslandId) ??
                  archipelago.islands[0];
                openStoryPreview(cur.name, cur.subtitle, cur.story, cur.patternId, undefined, cur);
              } else {
                const curIsland =
                  editTarget.scope === 'island'
                    ? archipelago.islands.find(i => i.id === editTarget.id)
                    : undefined;
                openStoryPreview(
                  activeEditorMeta.label,
                  activeEditorMeta.sublabel,
                  currentEditorGraph,
                  activeEditorMeta.defaultPatternId,
                  undefined,
                  curIsland
                );
              }
            }}
          >
            ▷ Vorschau
          </button>
        </div>
        <input
          type="file"
          ref={fileInput}
          accept="application/json,.json"
          hidden
          onChange={e => void load(e.target.files?.[0])}
        />
      </header>

      {view === 'map' ? (
        <IslandMap
          archipelago={archipelago}
          onChange={updater => setArchipelago(prev => updater(prev))}
          onOpenInEditor={target => {
            selectEditTarget(target);
            setView('editor');
          }}
          onPlayStory={(title, subtitle, story, patternId) => {
            const destIsland = archipelago.islands.find(i => subtitle.includes(i.name));
            const srcIsland = archipelago.islands.find(i => title.includes(i.name) || i.name === title);
            openStoryPreview(title, subtitle, story, patternId, destIsland?.id, srcIsland);
          }}
          onPracticeBreathing={island => setBreathingIsland(island)}
          onOpenSeaPattern={island => {
            setPatternIslandId(island.id);
            setView('pattern');
          }}
          onOpenVoyage={() => setView('voyage')}
          onOpenJournal={() => setIsJournalOpen(true)}
          onResetArchipelago={() => {
            if (window.confirm('Beispiel-Inselwelt wiederherstellen? Exportiere vorher deine eigenen Inseln.')) {
              const fresh = structuredClone(defaultArchipelago);
              setArchipelago(fresh);
              selectEditTarget({ scope: 'island', id: fresh.currentIslandId }, fresh);
            }
          }}
          issues={mapIssues}
        />
      ) : view === 'voyage' ? (
        <SpectatorVoyageMode
          archipelago={archipelago}
          standaloneGraph={standaloneGraph}
          onOpenMap={() => setView('map')}
          onOpenPatternMode={() => setView('pattern')}
          onNavigateToIsland={destId => {
            setArchipelago(prev => ({ ...prev, currentIslandId: destId }));
          }}
        />
      ) : view === 'pattern' ? (
        <SeaPatternMode
          archipelago={archipelago}
          initialIslandId={patternIslandId ?? archipelago.currentIslandId}
          onSelectIsland={island => setPatternIslandId(island.id)}
        />
      ) : (
        <div className="workspace">
          <aside className="library">
            <div className="eyebrow">AKTIVE GESCHICHTE WÄHLEN</div>
            <label className="target-picker-label">
              Insel oder Überfahrt bearbeiten
              <select
                value={`${editTarget.scope}:${editTarget.scope === 'standalone' ? 'main' : editTarget.id}`}
                onChange={e => {
                  const [scope, id] = e.target.value.split(':');
                  if (scope === 'island') selectEditTarget({ scope: 'island', id });
                  else if (scope === 'journey') selectEditTarget({ scope: 'journey', id });
                  else selectEditTarget({ scope: 'standalone' });
                }}
              >
                <optgroup label="🏝️ Inseln (mit Atemtechnik)">
                  {archipelago.islands.map(i => (
                    <option key={i.id} value={`island:${i.id}`}>
                      {i.name} ({findPattern(i.patternId)?.shortName ?? i.patternId})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="⛵ Überfahrten (Insel zu Insel)">
                  {archipelago.journeys.map(j => (
                    <option key={j.id} value={`journey:${j.id}`}>
                      {j.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="📖 Einzel-Entwurf">
                  <option value="standalone:main">Tikas kleiner Mutmoment (See)</option>
                </optgroup>
              </select>
            </label>

            <div className="section-label">BAUSTEINE HINZUFÜGEN</div>
            {(Object.keys(kinds) as Kind[]).map(kind => (
              <button
                type="button"
                className={`library-item ${kind}`}
                key={kind}
                onClick={() => add(kind)}
              >
                <span className="kind-dot" />
                <span>
                  {kinds[kind]}
                  <small>
                    {
                      {
                        start: 'Hier geht es los',
                        scene: 'Ein Moment der Geschichte',
                        question: 'Raum für Entscheidungen',
                        exercise: 'Atempause mit Tika',
                        ending: 'Ein guter Abschluss'
                      }[kind]
                    }
                  </small>
                </span>
                <b>+</b>
              </button>
            ))}

            <div className="library-tip">
              <span>✧</span>
              <strong>Verbunden mit der Inselkarte.</strong>
              <p>
                Jede Änderung hier ist sofort auf der gewählten Insel oder Meeresroute aktiv. Bei Atemübungen kannst du rechts die genaue Atemtechnik wählen.
              </p>
            </div>

            <button
              type="button"
              className="quiet"
              onClick={() => setView('map')}
            >
              ← Zurück zur Inselkarte
            </button>
          </aside>

          <main>
            <div className="canvas-heading">
              <div>
                <div className="eyebrow">TIKA DIE SCHILDKRÖTE · GESCHICHTENATELIER</div>
                <h1>
                  {activeEditorMeta.label} <span>✧</span>
                </h1>
                <p>
                  {activeEditorMeta.sublabel} <span>·</span> {nodes.length} Bausteine <span>·</span>{' '}
                  {edges.length} Verbindungen
                </p>
              </div>
              <span className={`validity ${editorIssues.length ? 'warning' : ''}`}>
                {editorIssues.length ? `${editorIssues.length} Hinweise` : '✓ Alle Wege verbunden'}
              </span>
            </div>

            <div className="canvas">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={connect}
                onNodeClick={(_, n) => {
                  setSelected(n.id);
                  setSelectedEdge(null);
                }}
                onEdgeClick={(_, e) => {
                  setSelectedEdge(e.id);
                  setSelected(null);
                }}
                onPaneClick={() => {
                  setSelected(null);
                  setSelectedEdge(null);
                }}
                fitView
                minZoom={0.2}
                maxZoom={2}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  style: { stroke: '#819b92', strokeWidth: 2 },
                  labelStyle: { fontSize: 11, fill: '#3b5549' },
                  labelBgPadding: [8, 5],
                  labelBgBorderRadius: 6
                }}
              >
                <Background color="#ced8d0" gap={22} />
                <Controls />
                <MiniMap
                  nodeColor={n => (n.data.kind === 'exercise' ? '#c9b9df' : '#b3cbb4')}
                  pannable
                  zoomable
                />
              </ReactFlow>
            </div>

            <footer aria-live="polite">
              {message}
              <span>Ziehen zum Verschieben · Scrollen zum Zoomen · Entf zum Löschen</span>
            </footer>
          </main>

          <aside className="inspector">
            <div className="eyebrow">DETAILS</div>
            {current ? (
              <>
                <h2>Baustein bearbeiten</h2>
                <label>
                  Typ
                  <select
                    value={current.data.kind}
                    onChange={e => {
                      const nextKind = e.target.value as Kind;
                      update({
                        kind: nextKind,
                        patternId:
                          nextKind === 'exercise'
                            ? current.data.patternId ?? activeEditorMeta.defaultPatternId
                            : current.data.patternId
                      });
                    }}
                  >
                    {Object.entries(kinds).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                {current.data.kind === 'exercise' && (
                  <label>
                    Atemtechnik (Insel-Technik)
                    <select
                      value={current.data.patternId ?? activeEditorMeta.defaultPatternId}
                      onChange={e => {
                        const pat = findPattern(e.target.value);
                        update({
                          patternId: e.target.value,
                          title: pat ? pat.shortName ?? pat.name : current.data.title
                        });
                      }}
                    >
                      {BUILTIN_PATTERNS.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label>
                  Titel
                  <input value={current.data.title} onChange={e => update({ title: e.target.value })} />
                </label>
                <label>
                  Geschichte
                  <textarea
                    rows={7}
                    value={current.data.text}
                    onChange={e => update({ text: e.target.value })}
                  />
                </label>

                <div className="section-label">WEGE & ANTWORTEN</div>
                {edges
                  .filter(e => e.source === current.id)
                  .map(e => (
                    <label key={e.id}>
                      → {nodes.find(n => n.id === e.target)?.data.title ?? 'Fehlender Knoten'}
                      <input
                        aria-label={`Antwort zu ${e.target}`}
                        value={String(e.label ?? '')}
                        onChange={ev =>
                          setEdges(es =>
                            es.map(x => (x.id === e.id ? { ...x, label: ev.target.value } : x))
                          )
                        }
                      />
                    </label>
                  ))}
                <button type="button" className="danger" onClick={remove}>
                  Baustein löschen
                </button>
              </>
            ) : edge ? (
              <>
                <h2>Verbindung bearbeiten</h2>
                <label>
                  Antwort / Beschriftung
                  <input
                    value={String(edge.label ?? '')}
                    onChange={e =>
                      setEdges(es =>
                        es.map(x => (x.id === edge.id ? { ...x, label: e.target.value } : x))
                      )
                    }
                  />
                </label>
                <button type="button" className="danger" onClick={remove}>
                  Verbindung löschen
                </button>
              </>
            ) : (
              <>
                <h2>Dein nächster Gedanke</h2>
                <p className="muted">
                  Wähle einen Baustein oder eine Verbindung, um den Inhalt zu bearbeiten.
                </p>
              </>
            )}

            <div className="validation">
              <div className="section-label">GESCHICHTEN-CHECK</div>
              {editorIssues.length ? (
                <ul>
                  {editorIssues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              ) : (
                <p>✓ Deine Geschichte hat einen Start, ein Ende und erreichbare Wege.</p>
              )}
              <small>Prüft die Struktur, nicht die fachliche Eignung des Inhalts.</small>
            </div>
          </aside>
        </div>
      )}

      {/* Interactive Story Voyage Player Modal (for Island Stories, Sea Journeys, or Editor Preview) */}
      {previewSession && (
        <div className="modal-backdrop">
          <StoryVoyagePlayer
            graph={previewSession.graph}
            title={previewSession.title}
            subtitle={previewSession.subtitle}
            defaultPatternId={previewSession.defaultPatternId}
            destinationIslandId={previewSession.destinationIslandId}
            island={previewSession.island}
            archipelago={archipelago}
            onClose={() => setPreviewSession(null)}
            onNavigateToIsland={destId => {
              const dest = archipelago.islands.find(i => i.id === destId);
              if (dest) {
                openStoryPreview(dest.name, dest.subtitle, dest.story, dest.patternId, undefined, dest);
              }
            }}
            onOpenJournal={() => setIsJournalOpen(true)}
          />
        </div>
      )}

      {/* Standalone Island Breathing Practice Modal */}
      {breathingIsland && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Atemübung auf ${breathingIsland.name}`}
            className="preview"
          >
            <button
              type="button"
              className="close"
              autoFocus
              onClick={() => setBreathingIsland(null)}
            >
              Schließen ×
            </button>
            <div className="eyebrow">
              INSEL-ATEMTECHNIK · {breathingIsland.name.toUpperCase()}
            </div>
            <h2>{breathingIsland.subtitle}</h2>
            <TurtleBreathing
              key={breathingIsland.id}
              initialPattern={breathingIsland.patternId}
            />
            <p className="muted">{breathingIsland.description}</p>
          </section>
        </div>
      )}

      {/* Saved Breath Journeys Journal / Gallery */}
      <BreathJournalModal isOpen={isJournalOpen} onClose={() => setIsJournalOpen(false)} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
