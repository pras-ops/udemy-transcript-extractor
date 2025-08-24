// Chrome Storage Service for Extension State Persistence
// Maintains state across popup closes/opens until browser restart

export interface ExtensionState {
  batchMode: 'next' | 'collect';
  batchProgress: {[lectureId: string]: 'pending' | 'collecting' | 'completed' | 'failed' | 'skipped'};
  batchStats: { total: number; completed: number; failed: number; skipped: number };
  isBatchCollecting: boolean;
  currentProcessingLecture: string;
  courseStructure: any;
  currentVideo: { title: string; duration: string } | null;
  availability: { platform: string; hasTranscript: boolean; isCoursePage: boolean } | null;
  extractedTranscript: string;
  extractionStatus: 'idle' | 'extracting' | 'success' | 'error';
  exportFormat: 'markdown' | 'txt' | 'json';
  exportTarget: 'clipboard' | 'download';
  includeTimestamps: boolean;
}

export class StorageService {
  private static readonly STORAGE_KEY = 'transcriptExtractorState';

  /**
   * Save current extension state to Chrome storage
   */
  static async saveState(state: Partial<ExtensionState>): Promise<void> {
    try {
      // Get existing state first
      const existingState = await this.loadState();
      
      // Merge with new state
      const updatedState = { ...existingState, ...state };
      
      // Save to Chrome storage
      await chrome.storage.local.set({ [this.STORAGE_KEY]: updatedState });
      
      console.log('🎯 State saved to Chrome storage:', updatedState);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Load extension state from Chrome storage
   */
  static async loadState(): Promise<ExtensionState> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const savedState = result[this.STORAGE_KEY];
      
      if (savedState) {
        console.log('🎯 State loaded from Chrome storage:', savedState);
        return savedState;
      }
      
      // Return default state if nothing saved
      return this.getDefaultState();
    } catch (error) {
      console.error('Failed to load state:', error);
      return this.getDefaultState();
    }
  }

  /**
   * Clear all saved state (reset to defaults)
   */
  static async clearState(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.STORAGE_KEY);
      console.log('🎯 State cleared from Chrome storage');
    } catch (error) {
      console.error('Failed to clear state:', error);
    }
  }

  /**
   * Get default state values
   */
  private static getDefaultState(): ExtensionState {
    return {
      batchMode: 'next',
      batchProgress: {},
      batchStats: { total: 0, completed: 0, failed: 0, skipped: 0 },
      isBatchCollecting: false,
      currentProcessingLecture: '',
      courseStructure: null,
      currentVideo: null,
      availability: null,
      extractedTranscript: '',
      extractionStatus: 'idle',
      exportFormat: 'markdown',
      exportTarget: 'clipboard',
      includeTimestamps: true
    };
  }

  /**
   * Save specific batch collection state
   */
  static async saveBatchState(
    batchProgress: ExtensionState['batchProgress'],
    batchStats: ExtensionState['batchStats'],
    batchMode: ExtensionState['batchMode'],
    isBatchCollecting: boolean
  ): Promise<void> {
    await this.saveState({
      batchProgress,
      batchStats,
      batchMode,
      isBatchCollecting
    });
  }

  /**
   * Save course structure to maintain between sessions
   */
  static async saveCourseStructure(courseStructure: any): Promise<void> {
    await this.saveState({ courseStructure });
  }

  /**
   * Check if user is in middle of batch collection
   */
  static async isBatchCollectionInProgress(): Promise<boolean> {
    const state = await this.loadState();
    return state.isBatchCollecting && state.batchStats.total > 0;
  }

  /**
   * Save clipboard data and entry count
   */
  static async saveClipboardData(clipboardData: string, clipboardEntries: number): Promise<void> {
    try {
      await chrome.storage.local.set({
        'clipboardData': clipboardData,
        'clipboardEntries': clipboardEntries
      });
      console.log('🎯 Clipboard data saved to Chrome storage. Entries:', clipboardEntries);
    } catch (error) {
      console.error('Failed to save clipboard data:', error);
    }
  }

  /**
   * Load clipboard data and entry count
   */
  static async loadClipboardData(): Promise<{ clipboardData: string; clipboardEntries: number }> {
    try {
      const result = await chrome.storage.local.get(['clipboardData', 'clipboardEntries']);
      return {
        clipboardData: result.clipboardData || '',
        clipboardEntries: result.clipboardEntries || 0
      };
    } catch (error) {
      console.error('Failed to load clipboard data:', error);
      return { clipboardData: '', clipboardEntries: 0 };
    }
  }

  /**
   * Clear clipboard data
   */
  static async clearClipboardData(): Promise<void> {
    try {
      await chrome.storage.local.remove(['clipboardData', 'clipboardEntries']);
      console.log('🎯 Clipboard data cleared from Chrome storage');
    } catch (error) {
      console.error('Failed to clear clipboard data:', error);
    }
  }
}
