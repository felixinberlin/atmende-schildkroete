import React, { useRef, useState } from 'react';
import {
  deleteSavedBreathJourney,
  loadSavedBreathJourneys,
  parseSavedBreathJourneys,
  renderBreathJourneySvg,
  saveBreathJourneysToStorage,
  type SavedBreathJourney
} from '../../breathing';

export interface BreathJournalModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSelectJourney?: (journey: SavedBreathJourney) => void;
}

export function BreathJournalModal({ isOpen = true, onClose }: BreathJournalModalProps) {
  const [journeys, setJourneys] = useState<SavedBreathJourney[]>(loadSavedBreathJourneys);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function refresh() {
    setJourneys(loadSavedBreathJourneys());
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm('Diese Atem-Reise aus deinem Tagebuch löschen?')) return;
    const remaining = deleteSavedBreathJourney(id);
    setJourneys(remaining);
    if (selectedJourneyId === id) setSelectedJourneyId(null);
    setMessage('Atem-Reise gelöscht.');
  }

  function handleDownloadSvg(journey: SavedBreathJourney, e: React.MouseEvent) {
    e.stopPropagation();
    const svgText = renderBreathJourneySvg(journey);
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = journey.title.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    a.download = `tika-atemreise-${safeTitle}-${journey.createdAt.slice(0, 10)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Meeresmuster-Bild (SVG) heruntergeladen.');
  }

  function handleExportJson() {
    const blob = new Blob([JSON.stringify(journeys, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tika-reisetagebuch-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Gesamtes Reisetagebuch als JSON exportiert.');
  }

  async function handleImportJson(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseSavedBreathJourneys(text);
      if (!window.confirm(`${parsed.length} Atem-Reisen importieren?`)) return;
      saveBreathJourneysToStorage(parsed);
      setJourneys(parsed);
      setMessage(`${parsed.length} Atem-Reisen geladen.`);
    } catch (err) {
      setMessage(`Import fehlgeschlagen: ${err instanceof Error ? err.message : 'Ungültige Datei'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const selectedJourney = journeys.find(j => j.id === selectedJourneyId) ?? journeys[0];

  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Tikas Atem-Reisetagebuch & Galerie"
        className="preview journal-modal"
      >
        <button type="button" className="close" autoFocus onClick={onClose}>
          Schließen ×
        </button>

        <div className="eyebrow">PERSÖNLICHE SAMMLUNG · MEERESMUSTER</div>
        <h2>🐚 Tikas Atem-Reisetagebuch</h2>
        <p className="muted" style={{ maxWidth: 540, margin: '0 auto 16px' }}>
          Jede Atemübung zeichnet eine eigene Spur im Meer. Hier findest du deine gesammelten Ruhe-Momente als schimmernde Mandalas.
        </p>

        <div className="journal-header-actions">
          <span className="journal-counter">
            {journeys.length} {journeys.length === 1 ? 'Atem-Reise' : 'Atem-Reisen'} festgehalten
          </span>
          <div className="journal-btn-group">
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              Importieren
            </button>
            <button type="button" onClick={handleExportJson} disabled={journeys.length === 0}>
              JSON Exportieren ↗
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/json,.json"
              hidden
              onChange={e => void handleImportJson(e.target.files?.[0])}
            />
          </div>
        </div>

        {message && <div className="journal-feedback-toast">{message}</div>}

        {journeys.length === 0 ? (
          <div className="journal-empty-state">
            <span style={{ fontSize: 48, display: 'block', margin: '20px 0 10px' }}>🌊</span>
            <h3>Noch keine Meeresmuster gespeichert</h3>
            <p className="muted">
              Atme im <strong>🌀 Meeresmuster-Modus</strong> oder auf einer der Inseln mit Tika und klicke auf <strong>„✨ Reise speichern“</strong>, um dein Kunstwerk hier zu sammeln.
            </p>
          </div>
        ) : (
          <div className="journal-layout-grid">
            {/* List of saved journeys */}
            <div className="journal-list">
              {journeys.map(j => {
                const isSelected = selectedJourney?.id === j.id;
                const dateStr = new Date(j.createdAt).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <article
                    key={j.id}
                    className={`journal-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedJourneyId(j.id)}
                  >
                    <div className="journal-card-header">
                      <span className="journal-card-title">{j.title}</span>
                      <time className="journal-card-date">{dateStr}</time>
                    </div>
                    <div className="journal-card-meta">
                      <span>🏝️ {j.islandName ?? j.patternName}</span>
                      <span>•</span>
                      <span>{j.completedCycles} Atemzüge</span>
                      <span>•</span>
                      <span>{Math.round(j.durationSec)}s</span>
                    </div>
                    {j.reflection && <p className="journal-card-reflection">„{j.reflection}“</p>}
                    <div className="journal-card-actions">
                      <button
                        type="button"
                        className="btn-pill"
                        onClick={e => handleDownloadSvg(j, e)}
                        title="Als SVG-Grafik herunterladen"
                      >
                        📥 SVG Bild
                      </button>
                      <button
                        type="button"
                        className="btn-pill danger"
                        onClick={e => handleDelete(j.id, e)}
                        title="Eintrag löschen"
                      >
                        🗑️
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Selected Journey Large Artwork Preview */}
            {selectedJourney && (
              <div className="journal-detail-view">
                <div
                  className="journal-svg-preview-container"
                  dangerouslySetInnerHTML={{ __html: renderBreathJourneySvg(selectedJourney) }}
                />
                <div className="journal-detail-caption">
                  <h3>{selectedJourney.title}</h3>
                  <p className="muted">
                    {selectedJourney.patternName} · {selectedJourney.completedCycles} Atemzüge ·{' '}
                    {Math.round(selectedJourney.durationSec)} Sekunden
                  </p>
                  {selectedJourney.reflection && (
                    <blockquote className="journal-quote">„{selectedJourney.reflection}“</blockquote>
                  )}
                  <button
                    type="button"
                    className="primary"
                    style={{ marginTop: 12 }}
                    onClick={e => handleDownloadSvg(selectedJourney, e)}
                  >
                    📥 Dieses Meeresmuster als SVG herunterladen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
