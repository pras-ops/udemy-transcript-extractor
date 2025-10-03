// Monitoring service for Chrome extension
// Tracks AI model performance, errors, and user feedback

export interface ErrorData {
  timestamp: number;
  error: string;
  context: string;
  userAgent: string;
  version: string;
  stack?: string;
}

export interface PerformanceData {
  timestamp: number;
  model: string;
  loadTime: number;
  success: boolean;
  memoryUsage?: number;
  transcriptLength?: number;
}

export interface UserFeedback {
  timestamp: number;
  rating: number;
  feedback: string;
  version: string;
  platform: string;
}

export interface UsageStats {
  timestamp: number;
  action: string;
  success: boolean;
  duration?: number;
  platform: string;
  version: string;
}

class MonitoringService {
  private readonly MAX_STORED_ITEMS = 100; // Keep only last 100 items of each type
  private readonly STORAGE_KEYS = {
    errors: 'monitoring_errors',
    performance: 'monitoring_performance',
    feedback: 'monitoring_feedback',
    usage: 'monitoring_usage'
  };

  /**
   * Log AI model errors for debugging
   */
  async logAIError(error: Error, context: string): Promise<void> {
    try {
      const errorData: ErrorData = {
        timestamp: Date.now(),
        error: error.message,
        context: context,
        userAgent: navigator.userAgent,
        version: this.getExtensionVersion(),
        stack: error.stack
      };

      await this.storeData(this.STORAGE_KEYS.errors, errorData);
      console.error('🚨 AI Error logged:', errorData);
    } catch (storeError) {
      console.error('Failed to log error:', storeError);
    }
  }

  /**
   * Track AI model performance metrics
   */
  async trackModelPerformance(
    modelName: string, 
    loadTime: number, 
    success: boolean,
    transcriptLength?: number
  ): Promise<void> {
    try {
      const perfData: PerformanceData = {
        timestamp: Date.now(),
        model: modelName,
        loadTime: loadTime,
        success: success,
        memoryUsage: this.getMemoryUsage(),
        transcriptLength: transcriptLength
      };

      await this.storeData(this.STORAGE_KEYS.performance, perfData);
      console.log('📊 Performance tracked:', perfData);
    } catch (storeError) {
      console.error('Failed to track performance:', storeError);
    }
  }

  /**
   * Collect user feedback
   */
  async collectUserFeedback(rating: number, feedback: string): Promise<void> {
    try {
      const feedbackData: UserFeedback = {
        timestamp: Date.now(),
        rating: rating,
        feedback: feedback,
        version: this.getExtensionVersion(),
        platform: navigator.platform
      };

      await this.storeData(this.STORAGE_KEYS.feedback, feedbackData);
      console.log('💬 Feedback collected:', feedbackData);
    } catch (storeError) {
      console.error('Failed to collect feedback:', storeError);
    }
  }

  /**
   * Track usage statistics
   */
  async trackUsage(action: string, success: boolean, duration?: number): Promise<void> {
    try {
      const usageData: UsageStats = {
        timestamp: Date.now(),
        action: action,
        success: success,
        duration: duration,
        platform: navigator.platform,
        version: this.getExtensionVersion()
      };

      await this.storeData(this.STORAGE_KEYS.usage, usageData);
      console.log('📈 Usage tracked:', usageData);
    } catch (storeError) {
      console.error('Failed to track usage:', storeError);
    }
  }

  /**
   * Get stored monitoring data for debugging
   */
  async getMonitoringData(): Promise<{
    errors: ErrorData[];
    performance: PerformanceData[];
    feedback: UserFeedback[];
    usage: UsageStats[];
  }> {
    try {
      const [errors, performance, feedback, usage] = await Promise.all([
        this.getStoredData<ErrorData>(this.STORAGE_KEYS.errors),
        this.getStoredData<PerformanceData>(this.STORAGE_KEYS.performance),
        this.getStoredData<UserFeedback>(this.STORAGE_KEYS.feedback),
        this.getStoredData<UsageStats>(this.STORAGE_KEYS.usage)
      ]);

      return { errors, performance, feedback, usage };
    } catch (error) {
      console.error('Failed to get monitoring data:', error);
      return { errors: [], performance: [], feedback: [], usage: [] };
    }
  }

  /**
   * Clear old monitoring data to prevent storage bloat
   */
  async cleanupOldData(): Promise<void> {
    try {
      const keys = Object.values(this.STORAGE_KEYS);
      
      for (const key of keys) {
        const data = await this.getStoredData<any>(key);
        if (data.length > this.MAX_STORED_ITEMS) {
          // Keep only the most recent items
          const recentData = data
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, this.MAX_STORED_ITEMS);
          
          await this.setStoredData(key, recentData);
          console.log(`🧹 Cleaned up old ${key} data`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  /**
   * Get performance summary for debugging
   */
  async getPerformanceSummary(): Promise<{
    totalRequests: number;
    successRate: number;
    averageLoadTime: number;
    modelUsage: Record<string, number>;
  }> {
    try {
      const performanceData = await this.getStoredData<PerformanceData>(this.STORAGE_KEYS.performance);
      
      if (performanceData.length === 0) {
        return {
          totalRequests: 0,
          successRate: 0,
          averageLoadTime: 0,
          modelUsage: {}
        };
      }

      const totalRequests = performanceData.length;
      const successfulRequests = performanceData.filter(p => p.success).length;
      const successRate = (successfulRequests / totalRequests) * 100;
      
      const averageLoadTime = performanceData
        .filter(p => p.success)
        .reduce((sum, p) => sum + p.loadTime, 0) / successfulRequests || 0;

      const modelUsage: Record<string, number> = {};
      performanceData.forEach(p => {
        modelUsage[p.model] = (modelUsage[p.model] || 0) + 1;
      });

      return {
        totalRequests,
        successRate,
        averageLoadTime,
        modelUsage
      };
    } catch (error) {
      console.error('Failed to get performance summary:', error);
      return {
        totalRequests: 0,
        successRate: 0,
        averageLoadTime: 0,
        modelUsage: {}
      };
    }
  }

  /**
   * Export monitoring data for analysis (privacy-safe)
   */
  async exportMonitoringData(): Promise<string> {
    try {
      const data = await this.getMonitoringData();
      const summary = await this.getPerformanceSummary();
      
      // Remove sensitive information
      const sanitizedData = {
        summary: summary,
        errors: data.errors.map(e => ({
          timestamp: e.timestamp,
          error: e.error,
          context: e.context,
          version: e.version
          // Remove userAgent and stack for privacy
        })),
        performance: data.performance.map(p => ({
          timestamp: p.timestamp,
          model: p.model,
          loadTime: p.loadTime,
          success: p.success,
          transcriptLength: p.transcriptLength
          // Remove memoryUsage for privacy
        })),
        feedback: data.feedback.map(f => ({
          timestamp: f.timestamp,
          rating: f.rating,
          version: f.version
          // Remove feedback text and platform for privacy
        })),
        usage: data.usage.map(u => ({
          timestamp: u.timestamp,
          action: u.action,
          success: u.success,
          duration: u.duration,
          version: u.version
          // Remove platform for privacy
        }))
      };

      return JSON.stringify(sanitizedData, null, 2);
    } catch (error) {
      console.error('Failed to export monitoring data:', error);
      return '{}';
    }
  }

  // Private helper methods
  private async storeData(key: string, data: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const existingData = await this.getStoredData<any>(key);
      existingData.push(data);
      
      // Keep only recent data
      if (existingData.length > this.MAX_STORED_ITEMS) {
        existingData.sort((a, b) => b.timestamp - a.timestamp);
        existingData.splice(this.MAX_STORED_ITEMS);
      }
      
      await this.setStoredData(key, existingData);
    }
  }

  private async getStoredData<T>(key: string): Promise<T[]> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(key);
      return result[key] || [];
    }
    return [];
  }

  private async setStoredData(key: string, data: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [key]: data });
    }
  }

  private getExtensionVersion(): string {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      return chrome.runtime.getManifest().version;
    }
    return 'unknown';
  }

  private getMemoryUsage(): number | undefined {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Auto-cleanup old data every 24 hours
if (typeof chrome !== 'undefined' && chrome.alarms) {
  chrome.alarms.create('monitoring-cleanup', { periodInMinutes: 24 * 60 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'monitoring-cleanup') {
      monitoringService.cleanupOldData();
    }
  });
}
