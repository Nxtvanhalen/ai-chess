// Enhanced haptic feedback utilities for iOS and Android
export enum HapticPattern {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Selection = 'selection',
}

class HapticManager {
  private static instance: HapticManager;
  private isSupported: boolean = false;
  private isIOS: boolean = false;
  private isAndroid: boolean = false;

  constructor() {
    this.detectPlatform();
    this.checkSupport();
  }

  static getInstance(): HapticManager {
    if (!HapticManager.instance) {
      HapticManager.instance = new HapticManager();
    }
    return HapticManager.instance;
  }

  private detectPlatform(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      this.isIOS = false;
      this.isAndroid = false;
      return;
    }

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    this.isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    this.isAndroid = /android/i.test(userAgent);
  }

  private checkSupport(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      this.isSupported = false;
      return;
    }

    // Check for Vibration API support
    if ('vibrate' in navigator) {
      this.isSupported = true;
      return;
    }

    // Check for iOS Haptic Feedback (requires user interaction)
    if (this.isIOS && 'ontouchstart' in window) {
      this.isSupported = true;
      return;
    }

    // Check for Web Vibration API
    if (typeof Navigator !== 'undefined' && 'vibrate' in Navigator.prototype) {
      this.isSupported = true;
      return;
    }

    this.isSupported = false;
  }

  private getVibrationPattern(pattern: HapticPattern): number | number[] {
    switch (pattern) {
      case HapticPattern.Light:
        return this.isIOS ? 50 : [50];

      case HapticPattern.Medium:
        return this.isIOS ? 100 : [100];

      case HapticPattern.Heavy:
        return this.isIOS ? 200 : [200];

      case HapticPattern.Success:
        return this.isIOS ? [50, 50, 100] : [70, 50, 70, 50, 120];

      case HapticPattern.Warning:
        return this.isIOS ? [100, 100] : [150, 100, 150];

      case HapticPattern.Error:
        return this.isIOS ? [200, 100, 200] : [250, 100, 250, 100, 250];

      case HapticPattern.Selection:
        return this.isIOS ? 30 : [30];

      default:
        return 50;
    }
  }

  // Main haptic feedback method
  async trigger(pattern: HapticPattern = HapticPattern.Light): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      const vibrationPattern = this.getVibrationPattern(pattern);

      // iOS-specific haptic feedback
      if (this.isIOS) {
        return this.triggerIOSHaptic(pattern, vibrationPattern);
      }

      // Android/Web Vibration API
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const result = navigator.vibrate(vibrationPattern);
        return Promise.resolve(result !== false);
      }

      return false;
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      return false;
    }
  }

  private async triggerIOSHaptic(
    _pattern: HapticPattern,
    vibrationPattern: number | number[],
  ): Promise<boolean> {
    // Try iOS Haptic Feedback API first (iOS 10+)
    if (
      (window as any).DeviceMotionEvent &&
      typeof (window as any).DeviceMotionEvent.requestPermission === 'function'
    ) {
      try {
        // For iOS 13+ with permission model
        const permission = await (window as any).DeviceMotionEvent.requestPermission();
        if (permission !== 'granted') {
          return this.fallbackToVibration(vibrationPattern);
        }
      } catch (_error) {
        // Fallback to vibration
        return this.fallbackToVibration(vibrationPattern);
      }
    }

    // Try iOS-specific patterns
    try {
      // Check for iOS Haptic Feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        // iOS Safari supports some haptic patterns
        const result = navigator.vibrate(vibrationPattern);
        return result !== false;
      }
    } catch (_error) {
      // Fallback to basic vibration
      return this.fallbackToVibration(vibrationPattern);
    }

    return false;
  }

  private fallbackToVibration(pattern: number | number[]): boolean {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        const result = navigator.vibrate(pattern);
        return result !== false;
      } catch (_error) {
        return false;
      }
    }
    return false;
  }

  // Convenience methods for common patterns
  async light(): Promise<boolean> {
    return this.trigger(HapticPattern.Light);
  }

  async medium(): Promise<boolean> {
    return this.trigger(HapticPattern.Medium);
  }

  async heavy(): Promise<boolean> {
    return this.trigger(HapticPattern.Heavy);
  }

  async success(): Promise<boolean> {
    return this.trigger(HapticPattern.Success);
  }

  async warning(): Promise<boolean> {
    return this.trigger(HapticPattern.Warning);
  }

  async error(): Promise<boolean> {
    return this.trigger(HapticPattern.Error);
  }

  async selection(): Promise<boolean> {
    return this.trigger(HapticPattern.Selection);
  }

  // Chess-specific haptic patterns
  async moveMade(): Promise<boolean> {
    return this.trigger(HapticPattern.Medium);
  }

  async illegalMove(): Promise<boolean> {
    return this.trigger(HapticPattern.Warning);
  }

  async checkmate(): Promise<boolean> {
    return this.trigger(HapticPattern.Success);
  }

  async gameStart(): Promise<boolean> {
    return this.trigger(HapticPattern.Light);
  }

  async messageSent(): Promise<boolean> {
    return this.trigger(HapticPattern.Selection);
  }

  // Check if haptics are available
  isHapticSupported(): boolean {
    return this.isSupported;
  }

  // Get platform info
  getPlatformInfo(): { isIOS: boolean; isAndroid: boolean; isSupported: boolean } {
    return {
      isIOS: this.isIOS,
      isAndroid: this.isAndroid,
      isSupported: this.isSupported,
    };
  }
}

// Export singleton instance
export const haptics = HapticManager.getInstance();

// Export class for testing
export { HapticManager };
