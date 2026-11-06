import { describe, it, expect } from 'vitest';
import { sample, validate, parseGraph, parseNodeDialogueAndCompanion, storyNode } from './graph';
describe('story graph validation', () => {
  it('accepts the branching example and round-trips JSON', () => { expect(validate(sample)).toEqual([]); expect(parseGraph(JSON.stringify(sample))).toEqual(sample); });
  it('finds a dangling edge and nodes made unreachable by a cut path', () => { const g = structuredClone(sample); g.edges = g.edges.filter(e => e.id !== 'e1'); g.edges.push({ id: 'broken', source: 'start', target: 'missing' }); const issues = validate(g); expect(issues.some(i => i.includes('fehlenden Knoten'))).toBe(true); expect(issues.filter(i => i.includes('nicht erreichbar'))).toHaveLength(5); });
  it('terminates on cycles and reports unreachable endings', () => { const g = structuredClone(sample); g.edges = g.edges.filter(e => e.target !== 'end'); g.edges.push({ id: 'loop', source: 'breathe', target: 'choice' }); expect(validate(g).some(i => i.includes('Ein Schritt ist genug') && i.includes('nicht erreichbar'))).toBe(true); });
  it('requires a start and at least two labelled answers', () => { const g = structuredClone(sample); g.nodes = g.nodes.filter(n => n.id !== 'start'); g.edges = g.edges.filter(e => e.id !== 'e4'); g.edges.find(e => e.id === 'e3')!.label = ''; const issues = validate(g); expect(issues.some(i => i.includes('genau einen Start'))).toBe(true); expect(issues.some(i => i.includes('mindestens zwei Antworten'))).toBe(true); expect(issues.some(i => i.includes('ohne Beschriftung'))).toBe(true); });
  it.each(['null', '{}', '{"version":2,"nodes":[],"edges":[]}', JSON.stringify({ ...sample, nodes: [{ ...sample.nodes[0], position: { x: 'bad', y: 1 } }] }), JSON.stringify({ ...sample, nodes: [sample.nodes[0], sample.nodes[0]] })])('rejects malformed imports without replacing the graph: %s', raw => { expect(() => parseGraph(raw)).toThrow(); });
  it('normalizes imported renderers and excludes unknown rendering properties', () => { const g = parseGraph(JSON.stringify({ ...sample, nodes: sample.nodes.map(n => ({ ...n, type: 'untrusted', hidden: true })) })); expect(g.nodes[0].type).toBe('story'); expect(g.nodes[0]).not.toHaveProperty('hidden'); });

  it('detects dialogues and companions from story text automatically', () => {
    const elderTurtleNode = storyNode(
      'n1',
      'scene',
      'Die Kunst des Wellenreitens',
      'Eine alte Meeresschildkröte neben ihr blinzelt ruhig: „Gegen eine Welle anzukämpfen kostet alle Kraft, Tika. Aber jede Welle steigt an, hat eine Krone und gleitet wieder aus.“',
      0,
      0
    );
    const parsedElder = parseNodeDialogueAndCompanion(elderTurtleNode);
    expect(parsedElder.companion).toBe('mentor-turtle');
    expect(parsedElder.companionName).toBe('Alte Meeresschildkröte');
    expect(parsedElder.companionDialog).toContain('Gegen eine Welle anzukämpfen');
    expect(parsedElder.tikaDialog).toBeTruthy();

    const friendNode = storyNode(
      'n2',
      'scene',
      'Ein offenes Ohr',
      'Tika erzählt ihrer Freundin, wie es ihr geht. Gemeinsam sitzen sie eine Weile am Wasser.',
      0,
      0
    );
    const parsedFriend = parseNodeDialogueAndCompanion(friendNode);
    expect(parsedFriend.companion).toBe('friend-turtle');
    expect(parsedFriend.companionName).toBe('Tikas Freundin');
    expect(parsedFriend.tikaDialog).toBeTruthy();
  });
});
