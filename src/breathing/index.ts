/**
 * Public API of Tika the Breathing Turtle ("Atmende Schildkröte").
 * Modular, zero-dependency breathing animation, biofeedback, and audio engine.
 */
export * from './core/schema';
export * from './core/timeline';
export * from './core/clock';
export * from './core/easing';
export * from './core/BreathingSession';
export * from './core/patternBuilder';
export * from './patterns';
export * from './registry/CharacterRigRegistry';
export * from './registry/SoundProfileRegistry';
export * from './audio/profiles';
export { AudioEngine, type AudioEngineOptions } from './audio/AudioEngine';
export { synthCue } from './audio/synth';
export { computeTurtlePose, type TurtlePose, type PartTransform, type RigPartKey } from './turtle/pose';
export { RIG_PARTS, TurtleRenderer, bindRig } from './turtle/rig';
export { createTurtleSession, prefersReducedMotion, type TurtleSessionOptions } from './turtle/createTurtleSession';
export { createFullscreenController, isFullscreen, supportsNativeFullscreen, PSEUDO_FULLSCREEN_CLASS, type FullscreenController } from './ui/fullscreen';
export { computeHumanPose, type HumanPose, type AirDot } from './human/pose';
export { HumanGuideRenderer, type HumanGuideOptions } from './human/HumanGuideRenderer';
export { FIGURE as HUMAN_FIGURE, humanFigureMarkup } from './human/figure';
export * from './seaPattern';
export * from './mic/BreathDetector';
export * from './breathJournal';
export * from './voyageData';
