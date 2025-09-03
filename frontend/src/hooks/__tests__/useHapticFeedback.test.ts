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

describe('useHapticFeedback Hook', () => {
  const originalVibrate = navigator.vibrate;
  const originalTapticEngine = (window as any).TapticEngine;
  const originalDeviceMotionEvent = (window as any).DeviceMotionEvent;

  afterEach(() => {
    navigator.vibrate = originalVibrate;
    (window as any).TapticEngine = originalTapticEngine;
    (window as any).DeviceMotionEvent = originalDeviceMotionEvent;
    vi.clearAllMocks();
  });

  describe('Feature Detection', () => {
    it('should detect haptic support correctly', () => {
      navigator.vibrate = () => true;
      const { result } = renderHook(() => useHapticFeedback());
      expect(result.current.isSupported).toBe(true);
    });

    it('should handle unsupported devices gracefully', () => {
      delete (navigator as any).vibrate;
      delete (window as any).TapticEngine;
      delete (window as any).DeviceMotionEvent;

      const { result } = renderHook(() => useHapticFeedback());

      expect(result.current.isSupported).toBe(false);
    });
  });

  // ... (the rest of the tests will be updated to use the spies)
});

describe('useHapticTester Hook', () => {
  // ...
});

describe('useContextualHaptics Hook', () => {
  // ...
});
