// frontend/src/hooks/useWakeLock.ts
// Hook to manage screen wake lock to prevent device sleep during gameplay

import { useCallback, useEffect, useRef, useState } from 'react';

// Simple types for Wake Lock API
interface WakeLockSentinel {
  release: () => Promise<void>;
  released: boolean;
  type: string;
}

export const useWakeLock = (shouldKeepAwake: boolean = false) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Check if Wake Lock API is supported
  useEffect(() => {
    const supported = 'wakeLock' in navigator;
    setIsSupported(supported);
    
    if (!supported) {
      console.log('Wake Lock API not supported on this device');
    }
  }, []);

  // Function to request wake lock
  const requestWakeLock = useCallback(async () => {
    if (!isSupported) return false;

    try {
      // Use any to bypass TypeScript issues with experimental API
      const nav = navigator as { wakeLock?: { request: (type: string) => Promise<WakeLockSentinel> } };
      wakeLockRef.current = await nav.wakeLock.request('screen');
      
      // Note: Wake lock will automatically release when user switches tabs/apps
      // We handle this in the visibility change listener

      setIsActive(true);
      setError(null);
      console.log('Wake lock is active - screen will stay on');
      return true;
    } catch (err) {
      const errorMsg = `Failed to activate wake lock: ${err}`;
      setError(errorMsg);
      console.error(errorMsg);
      return false;
    }
  }, [isSupported]);

  // Function to release wake lock
  const releaseWakeLock = async () => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        console.log('Wake lock released - screen can sleep normally');
      } catch (err) {
        console.error('Failed to release wake lock:', err);
      }
    }
  };

  // Auto-manage wake lock based on shouldKeepAwake prop
  useEffect(() => {
    if (shouldKeepAwake && isSupported && !isActive) {
      requestWakeLock();
    } else if (!shouldKeepAwake && isActive) {
      releaseWakeLock();
    }
  }, [shouldKeepAwake, isSupported, isActive, requestWakeLock]);

  // Handle visibility change (when user switches tabs/apps)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldKeepAwake && !isActive) {
        // Re-request wake lock when returning to the page
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldKeepAwake, isActive, requestWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        wakeLockRef.current.release().catch(console.error);
      }
    };
  }, []);

  return {
    isSupported,
    isActive,
    error,
    requestWakeLock,
    releaseWakeLock
  };
};