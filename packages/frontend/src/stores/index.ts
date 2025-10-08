export * from './useGameStore';
export * from './useIntelligenceStore';
export * from './useRoomStore';
export * from './useUIStore';
export * from './pattern-store';
export * from './tile-store';
export * from './multiplayer-store';

// Convenience selector hooks
import { useUIStore } from './useUIStore';

export const useAnimationsEnabled = (): boolean =>
  useUIStore((s) => s.tutorial.progress.selectedPreferences.animationsEnabled);

export const useTheme = (): 'light' | 'dark' =>
  useUIStore((s) => s.theme);
