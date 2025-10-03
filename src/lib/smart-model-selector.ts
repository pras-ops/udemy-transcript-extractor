// Smart Model Selector for Chrome Extension
// Automatically selects the best small model based on system performance

export interface ModelConfig {
  name: string;
  size: number; // in MB
  quality: 'fast' | 'balanced' | 'quality';
  minRAM: number; // in MB
  minCPU: number; // cores
  description: string;
}

export interface SystemInfo {
  ram: number; // in MB
  cores: number;
  gpu: boolean;
  webgl: boolean;
  performance: 'low' | 'medium' | 'high';
}

class SmartModelSelector {
  private static instance: SmartModelSelector;
  private systemInfo: SystemInfo | null = null;
  private selectedModel: ModelConfig | null = null;

  // Available models (all small and Chrome-extension friendly)
  private models: ModelConfig[] = [
    {
      name: 'distilbart-cnn-6-6',
      size: 50,
      quality: 'fast',
      minRAM: 512,
      minCPU: 2,
      description: 'Ultra-fast summarization, perfect for all systems'
    },
    {
      name: 'distilbart-cnn-12-6',
      size: 100,
      quality: 'balanced',
      minRAM: 1024,
      minCPU: 4,
      description: 'Balanced speed and quality, good for mid-range systems'
    }
  ];

  constructor() {
    this.detectSystemCapabilities();
  }

  static getInstance(): SmartModelSelector {
    if (!SmartModelSelector.instance) {
      SmartModelSelector.instance = new SmartModelSelector();
    }
    return SmartModelSelector.instance;
  }

  /**
   * Detect system capabilities
   */
  private async detectSystemCapabilities(): Promise<void> {
    console.log('🔍 Detecting system capabilities...');
    
    try {
      // Get basic system info
      const cores = navigator.hardwareConcurrency || 4;
      const ram = this.estimateRAM();
      const gpu = !!navigator.gpu;
      const webgl = this.testWebGL();
      
      // Determine performance level
      let performance: 'low' | 'medium' | 'high' = 'low';
      if (ram >= 2048 && cores >= 4) {
        performance = 'high';
      } else if (ram >= 1024 && cores >= 2) {
        performance = 'medium';
      }
      
      this.systemInfo = {
        ram,
        cores,
        gpu,
        webgl,
        performance
      };
      
      console.log('🎯 System capabilities detected:', this.systemInfo);
      
      // Select best model
      this.selectedModel = this.selectBestModel();
      console.log('✅ Selected model:', this.selectedModel);
      
    } catch (error) {
      console.error('❌ Error detecting system capabilities:', error);
      // Fallback to safest model
      this.selectedModel = this.models[0]; // distilbart-cnn-6-6
    }
  }

  /**
   * Estimate available RAM (rough estimate)
   */
  private estimateRAM(): number {
    try {
      // Use performance.memory if available (Chrome only)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return Math.round(memory.jsHeapSizeLimit / 1024 / 1024); // Convert to MB
      }
      
      // Fallback estimation based on user agent
      const userAgent = navigator.userAgent;
      if (userAgent.includes('Chrome')) {
        return 2048; // Assume 2GB for Chrome
      } else if (userAgent.includes('Firefox')) {
        return 1024; // Assume 1GB for Firefox
      } else {
        return 512; // Conservative estimate
      }
    } catch (error) {
      return 512; // Safe fallback
    }
  }

  /**
   * Test WebGL availability
   */
  private testWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (error) {
      return false;
    }
  }

  /**
   * Select the best model based on system capabilities
   */
  private selectBestModel(): ModelConfig {
    if (!this.systemInfo) {
      return this.models[0]; // Safe fallback
    }
    
    // Find the best model that meets system requirements
    for (const model of this.models.reverse()) { // Start with highest quality
      if (this.systemInfo.ram >= model.minRAM && 
          this.systemInfo.cores >= model.minCPU) {
        console.log(`✅ Selected ${model.name} - meets system requirements`);
        return model;
      }
    }
    
    // Fallback to safest model
    console.log('⚠️ Using fallback model - system requirements not met');
    return this.models[0];
  }

  /**
   * Get the selected model configuration
   */
  getSelectedModel(): ModelConfig {
    if (!this.selectedModel) {
      this.selectedModel = this.models[0]; // Safe fallback
    }
    return this.selectedModel;
  }

  /**
   * Get system information
   */
  getSystemInfo(): SystemInfo | null {
    return this.systemInfo;
  }

  /**
   * Get model configuration for Transformers.js
   */
  getModelConfig(): any {
    const model = this.getSelectedModel();
    
    return {
      modelName: `Xenova/${model.name}`,
      config: {
        quantized: true,
        use_cache: true,  // Enable caching for better performance
        use_worker: false,
        local_files_only: false,  // Allow remote loading
        allow_remote: true,       // Enable remote requests
        use_cdn: true,            // Allow CDN usage
        use_shared_array_buffer: false,
        use_webgl: this.systemInfo?.webgl || false,
        use_tensorflow: false,
        use_onnx: true,
        onnx_execution_providers: ['cpu']
      },
      summaryConfig: {
        max_length: model.quality === 'fast' ? 100 : 150,
        min_length: model.quality === 'fast' ? 30 : 50,
        do_sample: false,
        temperature: 0.1,
        top_p: 0.6,
        repetition_penalty: 1.3,
        no_repeat_ngram_size: 4,
        early_stopping: true
      }
    };
  }

  /**
   * Get model download priority (for future use)
   */
  getDownloadPriority(): string[] {
    const model = this.getSelectedModel();
    return [model.name]; // Only download the selected model
  }

  /**
   * Check if model switching is recommended
   */
  shouldSwitchModel(): { recommended: boolean; reason: string; newModel: ModelConfig | null } {
    if (!this.systemInfo) {
      return { recommended: false, reason: 'System info not available', newModel: null };
    }
    
    const currentModel = this.getSelectedModel();
    
    // Check if we can upgrade to a better model
    if (currentModel.quality === 'fast' && this.systemInfo.performance === 'high') {
      const betterModel = this.models.find(m => m.quality === 'balanced');
      if (betterModel) {
        return {
          recommended: true,
          reason: 'System can handle better quality model',
          newModel: betterModel
        };
      }
    }
    
    // Check if we should downgrade for performance
    if (currentModel.quality === 'balanced' && this.systemInfo.performance === 'low') {
      const fasterModel = this.models.find(m => m.quality === 'fast');
      if (fasterModel) {
        return {
          recommended: true,
          reason: 'System performance low, switching to faster model',
          newModel: fasterModel
        };
      }
    }
    
    return { recommended: false, reason: 'Current model is optimal', newModel: null };
  }

  /**
   * Get model information for UI display
   */
  getModelInfo(): {
    name: string;
    size: string;
    quality: string;
    description: string;
    systemCompatible: boolean;
  } {
    const model = this.getSelectedModel();
    const system = this.getSystemInfo();
    
    return {
      name: model.name,
      size: `${model.size}MB`,
      quality: model.quality,
      description: model.description,
      systemCompatible: system ? 
        (system.ram >= model.minRAM && system.cores >= model.minCPU) : true
    };
  }
}

export default SmartModelSelector;
