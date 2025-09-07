// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: ResizeObserver[] = [];
  private rafId: number | null = null;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Measure function execution time
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.recordMetric(name, end - start);
    return result;
  }

  // Measure async function execution time
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    this.recordMetric(name, end - start);
    return result;
  }

  // Record a custom metric
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only the last 100 measurements
    if (values.length > 100) {
      values.splice(0, values.length - 100);
    }
  }

  // Get average metric value
  getAverageMetric(name: string): number | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Monitor frame rate
  startFPSMonitoring(): void {
    if (this.rafId) return; // Already monitoring
    
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.recordMetric('fps', fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      this.rafId = requestAnimationFrame(measureFPS);
    };
    
    this.rafId = requestAnimationFrame(measureFPS);
  }

  stopFPSMonitoring(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  // Monitor memory usage (if available)
  getMemoryUsage(): any {
    // @ts-ignore - performance.memory is not in TypeScript types
    if (typeof performance.memory !== 'undefined') {
      // @ts-ignore
      const memory = performance.memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
      };
    }
    return null;
  }

  // Clean up all observers and monitoring
  cleanup(): void {
    this.stopFPSMonitoring();
    
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];
    
    this.metrics.clear();
  }

  // Get performance report
  getReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    this.metrics.forEach((values, name) => {
      report[name] = {
        average: this.getAverageMetric(name),
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });
    
    const memory = this.getMemoryUsage();
    if (memory) {
      report.memory = memory;
    }
    
    return report;
  }
}

// Debounce utility for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Throttle utility for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Intersection Observer utility for lazy loading
export function createLazyLoader(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  });
}

// Check if device supports high refresh rates
export function supportsHighRefreshRate(): boolean {
  // @ts-ignore - screen.refreshRate is experimental
  return typeof screen.refreshRate !== 'undefined' && screen.refreshRate > 60;
}

// Check if device prefers reduced motion
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// GPU acceleration detection
export function supportsGPUAcceleration(): boolean {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return !!gl;
}