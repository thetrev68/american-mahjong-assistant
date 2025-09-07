import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useHapticFeedback, useHapticTester, useContextualHaptics } from '../useHapticFeedback';

// Mock reduced motion
vi.mock('../../utils/reduced-motion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// Mock navigator and window objects
const mockVibrate = vi.fn();
const mockTapticEngine = {
  impact: vi.fn().mockResolvedValue(true),
  selection: vi.fn().mockResolvedValue(true),
  notification: vi.fn().mockResolvedValue(true),
};

interface WindowWithHaptics extends Window {
  TapticEngine?: typeof mockTapticEngine;
  DeviceMotionEvent?: typeof DeviceMotionEvent;
}

describe('useHapticFeedback Hook', () => {
  const originalVibrate = navigator.vibrate;
  const originalTapticEngine = (window as WindowWithHaptics).TapticEngine;
  const originalDeviceMotionEvent = (window as WindowWithHaptics).DeviceMotionEvent;

  beforeEach(() => {
    // Set up mocks for each test
    navigator.vibrate = mockVibrate;
    (window as WindowWithHaptics).TapticEngine = mockTapticEngine;
    (window as WindowWithHaptics).DeviceMotionEvent = DeviceMotionEvent;
  });

  afterEach(() => {
    navigator.vibrate = originalVibrate;
    (window as WindowWithHaptics).TapticEngine = originalTapticEngine;
    (window as WindowWithHaptics).DeviceMotionEvent = originalDeviceMotionEvent;
    vi.clearAllMocks();
  });

  describe('Feature Detection', () => {
    it('should detect haptic support correctly', () => {
      navigator.vibrate = () => true;
      const { result } = renderHook(() => useHapticFeedback());
      expect(result.current.isSupported).toBe(true);
    });

    it('should handle unsupported devices gracefully', () => {
      const nav = navigator as Navigator & { vibrate?: unknown }
      if ('vibrate' in nav) {
        delete nav.vibrate
      }
      delete (window as WindowWithHaptics).TapticEngine;
      delete (window as WindowWithHaptics).DeviceMotionEvent;

      const { result } = renderHook(() => useHapticFeedback());
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('Haptic Functions', () => {
    it('should call vibrate function when triggering haptic feedback', () => {
      const { result } = renderHook(() => useHapticFeedback());
      
      act(() => {
        result.current.triggerLight();
      });

      expect(mockVibrate).toHaveBeenCalled();
    });

    it('should call TapticEngine when available', () => {
      const { result } = renderHook(() => useHapticFeedback());
      
      act(() => {
        result.current.triggerMedium();
      });

      expect(mockTapticEngine.impact).toHaveBeenCalled();
    });
  });

  describe('Haptic Tester', () => {
    it('should provide testing utilities', () => {
      const { result } = renderHook(() => useHapticTester());
      
      expect(result.current.testAllHaptics).toBeDefined();
      expect(result.current.triggerHeavy).toBeDefined();
      expect(result.current.triggerSelection).toBeDefined();
    });
  });

  describe('Contextual Haptics', () => {
    it('should provide contextual haptic functions', () => {
      const { result } = renderHook(() => useContextualHaptics('tile'));
      
      expect(result.current.tileSelect).toBeDefined();
      expect(result.current.tileDeselect).toBeDefined();
      expect(result.current.contextualFeedback).toBeDefined();
    });
  });
});

describe('useHapticTester Hook', () => {
  // ...
});

describe('useContextualHaptics Hook', () => {
  // ...
});
