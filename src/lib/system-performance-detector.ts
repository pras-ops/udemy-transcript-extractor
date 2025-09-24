// System Performance Detector for AI Processing Timing
// Detects system capabilities to provide accurate processing time estimates

export interface SystemPerformanceInfo {
  cpuCores: number;
  memoryGB: number;
  isWebGLSupported: boolean;
  isWebGPUSupported: boolean;
  performanceScore: number;
  estimatedProcessingTime: {
    min: number;
    max: number;
    average: number;
  };
  systemTier: 'low' | 'medium' | 'high' | 'ultra';
}

export class SystemPerformanceDetector {
  private static instance: SystemPerformanceDetector;
  private performanceInfo: SystemPerformanceInfo | null = null;

  private constructor() {}

  public static getInstance(): SystemPerformanceDetector {
    if (!SystemPerformanceDetector.instance) {
      SystemPerformanceDetector.instance = new SystemPerformanceDetector();
    }
    return SystemPerformanceDetector.instance;
  }

  public async detectSystemPerformance(): Promise<SystemPerformanceInfo> {
    if (this.performanceInfo) {
      return this.performanceInfo;
    }

    console.log('🔍 System Performance Detector: Starting system analysis...');

    // Get basic system info
    const cpuCores = navigator.hardwareConcurrency || 4;
    const memoryGB = this.estimateMemoryGB();
    const isWebGLSupported = this.checkWebGLSupport();
    const isWebGPUSupported = await this.checkWebGPUSupport();

    // Run performance benchmark
    const benchmarkScore = await this.runPerformanceBenchmark();

    // Calculate overall performance score
    const performanceScore = this.calculatePerformanceScore({
      cpuCores,
      memoryGB,
      isWebGLSupported,
      isWebGPUSupported,
      benchmarkScore
    });

    // Determine system tier
    const systemTier = this.determineSystemTier(performanceScore);

    // Calculate estimated processing times
    const estimatedProcessingTime = this.calculateProcessingTime(systemTier);

    this.performanceInfo = {
      cpuCores,
      memoryGB,
      isWebGLSupported,
      isWebGPUSupported,
      performanceScore,
      estimatedProcessingTime,
      systemTier
    };

    console.log('✅ System Performance Detector: Analysis complete', this.performanceInfo);
    return this.performanceInfo;
  }

  private estimateMemoryGB(): number {
    // Estimate memory based on available APIs
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory || 4;
    }
    
    // Fallback estimation based on other factors
    const cores = navigator.hardwareConcurrency || 4;
    if (cores >= 8) return 16;
    if (cores >= 4) return 8;
    return 4;
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  private async checkWebGPUSupport(): Promise<boolean> {
    try {
      if ('gpu' in navigator) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        return !!adapter;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  private async runPerformanceBenchmark(): Promise<number> {
    console.log('🔍 System Performance Detector: Running benchmark...');
    
    const startTime = performance.now();
    
    // CPU-intensive task: Matrix multiplication simulation
    const matrixSize = 100;
    const matrixA = new Array(matrixSize).fill(null).map(() => 
      new Array(matrixSize).fill(0).map(() => Math.random())
    );
    const matrixB = new Array(matrixSize).fill(null).map(() => 
      new Array(matrixSize).fill(0).map(() => Math.random())
    );
    
    // Perform matrix multiplication
    const result = new Array(matrixSize).fill(null).map(() => new Array(matrixSize).fill(0));
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        for (let k = 0; k < matrixSize; k++) {
          result[i][j] += matrixA[i][k] * matrixB[k][j];
        }
      }
    }
    
    const endTime = performance.now();
    const benchmarkTime = endTime - startTime;
    
    // Convert to score (lower time = higher score)
    const score = Math.max(0, 100 - (benchmarkTime / 10));
    
    console.log(`🔍 System Performance Detector: Benchmark completed in ${benchmarkTime.toFixed(2)}ms (score: ${score.toFixed(1)})`);
    return score;
  }

  private calculatePerformanceScore(info: {
    cpuCores: number;
    memoryGB: number;
    isWebGLSupported: boolean;
    isWebGPUSupported: boolean;
    benchmarkScore: number;
  }): number {
    let score = 0;
    
    // CPU cores (0-30 points)
    score += Math.min(30, info.cpuCores * 3);
    
    // Memory (0-25 points)
    score += Math.min(25, info.memoryGB * 2.5);
    
    // WebGL support (0-15 points)
    score += info.isWebGLSupported ? 15 : 0;
    
    // WebGPU support (0-20 points)
    score += info.isWebGPUSupported ? 20 : 0;
    
    // Benchmark score (0-10 points)
    score += Math.min(10, info.benchmarkScore / 10);
    
    return Math.min(100, score);
  }

  private determineSystemTier(score: number): 'low' | 'medium' | 'high' | 'ultra' {
    if (score >= 80) return 'ultra';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private calculateProcessingTime(tier: 'low' | 'medium' | 'high' | 'ultra') {
    switch (tier) {
      case 'ultra':
        return { min: 30, max: 60, average: 45 };
      case 'high':
        return { min: 45, max: 90, average: 67 };
      case 'medium':
        return { min: 60, max: 120, average: 90 };
      case 'low':
        return { min: 90, max: 180, average: 135 };
    }
  }

  public getPerformanceInfo(): SystemPerformanceInfo | null {
    return this.performanceInfo;
  }

  public getTimingDisplay(): string {
    if (!this.performanceInfo) {
      return '⏱️ Processing time varies by system performance';
    }

    const { estimatedProcessingTime, systemTier } = this.performanceInfo;
    const tierEmoji = {
      'ultra': '🚀',
      'high': '⚡',
      'medium': '💻',
      'low': '🐌'
    };

    return `${tierEmoji[systemTier]} ${systemTier.toUpperCase()} system: ${estimatedProcessingTime.min}-${estimatedProcessingTime.max}s`;
  }

  public getDetailedTimingDisplay(): string {
    if (!this.performanceInfo) {
      return '💻 Faster systems: 45-90s | Slower systems: 90-180s';
    }

    const { estimatedProcessingTime, systemTier } = this.performanceInfo;
    return `💻 ${systemTier.toUpperCase()} system: ${estimatedProcessingTime.min}-${estimatedProcessingTime.max}s (avg: ${estimatedProcessingTime.average}s)`;
  }
}
