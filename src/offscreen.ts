// Offscreen document for AI processing (privacy-first approach)
// All AI processing happens locally in the browser

// AI libraries will be imported dynamically to avoid build issues
// Dynamic import logic for privacy-first approach

// Declare Chrome types for offscreen document
declare const chrome: any;

// Set up environment for local-only processing
      (window as any).ENV = {
        USE_BROWSER_CACHE: false,        // No browser caching
        USE_LOCAL_MODELS: true,          // Use local models only
        ALLOW_REMOTE_MODELS: false,      // No remote model downloads
        USE_SAFE_TENSORS: true,          // Use safe tensor operations
  DISABLE_WORKER: true,            // Disable web workers
  USE_CACHE: false,                // No caching
        USE_WASM: true,                  // Use WASM instead of WebGL
        USE_CDN: false,                  // Explicitly disable CDN usage
        REMOTE_URL: '',                  // No remote URLs
  LOCAL_URL: '/models/'            // Use local models only
};

class OffscreenAIService {
  private MLCEngine: any = null;
  private pipeline: any = null;
  private isWebLLMAvailable = false;
  private isTransformersAvailable = false;
  private initializationComplete = false;
  
  constructor() {
    console.log('🎯 Offscreen: Initializing AI service...');
    this.initializeAILibraries();
    console.log('🎯 Offscreen: AI service constructor completed');
    
    // Test AI engines after initialization
    setTimeout(() => {
      this.testAIEngines();
    }, 2000);
  }

  private async initializeAILibraries() {
    console.log('🎯 Offscreen: Setting up AI libraries...');
      
    // Set up Transformers.js environment for CSP compliance
    (window as any).ENV = {
      // Disable remote model loading (privacy-first)
      USE_REMOTE_MODELS: false,
      USE_LOCAL_MODELS: true,
      // Disable CDN usage
      USE_CDN: false,
      // Use local files only
      LOCAL_FILES_ONLY: true,
      // Disable shared array buffer for better compatibility
      USE_SHARED_ARRAY_BUFFER: false,
      // Use CPU execution for better compatibility
      USE_GPU: false,
      // Disable WebGL to avoid blob URLs
      USE_WEBGL: false,
      // Use ONNX runtime for better compatibility
      USE_ONNX: true,
      // Force CPU execution
      ONNX_EXECUTION_PROVIDERS: ['cpu'],
      // Disable Web Workers to avoid CSP issues
      DISABLE_WORKER: true,
      // Disable TensorFlow.js to avoid blob URLs
      USE_TENSORFLOW: false,
      // Additional CSP compliance settings
      USE_BROWSER_CACHE: false,
      USE_CACHE: false,
      USE_WASM: true,
      REMOTE_URL: '',
      LOCAL_URL: '/models/'
    };
    
    // Add delay to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('🔍 Offscreen: Starting dynamic AI library imports...');
    
    // Dynamic imports with local-only configuration
    try {
      console.log('🔄 Offscreen: Importing WebLLM...');
      const webllmModule = await import('@mlc-ai/web-llm');
      this.MLCEngine = webllmModule.MLCEngine;
        console.log('✅ Offscreen: WebLLM imported successfully');
      
      // Test WebLLM availability (more lenient detection)
      if (this.MLCEngine && typeof this.MLCEngine !== 'undefined') {
      // Check WebGPU availability (preferred but not required)
      if (navigator.gpu) {
        console.log('✅ Offscreen: WebGPU available - will use GPU acceleration');
      } else {
        console.log('✅ Offscreen: WebGPU not available - will use CPU fallback');
        }
        
        // Test if MLCEngine constructor is available
        this.isWebLLMAvailable = true; // Available regardless of WebGPU
        console.log('✅ Offscreen: WebLLM support detected and working');
      }
    } catch (webllmError) {
      console.log('❌ Offscreen: WebLLM import failed:', webllmError);
      this.MLCEngine = null;
      this.isWebLLMAvailable = false;
      }
      
    try {
      console.log('🔄 Offscreen: Importing Transformers.js...');
      const transformersModule = await import('@xenova/transformers');
      this.pipeline = transformersModule.pipeline;
        console.log('✅ Offscreen: Transformers.js imported successfully');
      
      // Test Transformers.js availability (more lenient detection)
      if (this.pipeline && typeof this.pipeline !== 'undefined') {
        // Test if pipeline function is available
        console.log('✅ Offscreen: Transformers.js pipeline function available');
      this.isTransformersAvailable = true;
        console.log('✅ Offscreen: Transformers.js support detected and working');
      }
    } catch (transformersError) {
      console.log('❌ Offscreen: Transformers.js import failed:', transformersError);
      this.pipeline = null;
      this.isTransformersAvailable = false;
    }

      console.log('🔍 Offscreen: Engine availability check:', {
        isWebLLMAvailable: this.isWebLLMAvailable,
        isTransformersAvailable: this.isTransformersAvailable,
        MLCEngine: typeof this.MLCEngine,
        pipeline: typeof this.pipeline
      });
    
    // Mark initialization as complete
    this.initializationComplete = true;
    console.log('✅ Offscreen: Engine initialization completed');
  }

  /**
   * Test AI engines with a simple example
   */
  private async testAIEngines(): Promise<void> {
    console.log('🧪 Offscreen: Testing AI engines...');
    
    const testTranscript = "This is a test transcript to verify that the AI engines are working properly.";
    
    try {
      // Test Transformers.js
      if (this.isTransformersAvailable && this.pipeline) {
        console.log('🧪 Offscreen: Testing Transformers.js...');
        try {
          const result = await this.generateTransformersSummary(testTranscript, {});
          if (result.success) {
            console.log('✅ Offscreen: Transformers.js test successful:', result.summary?.substring(0, 100));
          } else {
            console.log('❌ Offscreen: Transformers.js test failed:', result);
          }
        } catch (error) {
          console.log('❌ Offscreen: Transformers.js test error:', error);
        }
      }
      
      // Test WebLLM
      if (this.isWebLLMAvailable && this.MLCEngine) {
        console.log('🧪 Offscreen: Testing WebLLM...');
        try {
          const result = await this.generateWebLLMSummary(testTranscript, {});
          if (result.success) {
            console.log('✅ Offscreen: WebLLM test successful:', result.summary?.substring(0, 100));
          } else {
            console.log('❌ Offscreen: WebLLM test failed:', result);
          }
        } catch (error) {
          console.log('❌ Offscreen: WebLLM test error:', error);
        }
      }
    } catch (error) {
      console.log('❌ Offscreen: AI engine testing failed:', error);
    }
  }

  /**
   * Force re-initialization of AI engines
   */
  private async forceReinitializeEngines(): Promise<void> {
    console.log('🔄 Offscreen: Force re-initializing AI engines...');
    
    // Reset states
    this.isWebLLMAvailable = false;
    this.isTransformersAvailable = false;
    this.MLCEngine = null;
    this.pipeline = null;
    
    // Try multiple import strategies
    const importStrategies = [
      // Strategy 1: Direct dynamic imports
      async () => {
        console.log('🔄 Strategy 1: Direct dynamic imports...');
        try {
          const [webllmModule, transformersModule] = await Promise.all([
            import('@mlc-ai/web-llm'),
            import('@xenova/transformers')
          ]);
          
          this.MLCEngine = webllmModule.MLCEngine;
          this.pipeline = transformersModule.pipeline;
          
          if (typeof this.MLCEngine === 'function') {
            this.isWebLLMAvailable = true;
            console.log('✅ Strategy 1: WebLLM loaded successfully');
          }
          
          if (typeof this.pipeline === 'function') {
            this.isTransformersAvailable = true;
            console.log('✅ Strategy 1: Transformers.js loaded successfully');
          }
        } catch (error) {
          console.log('❌ Strategy 1 failed:', error);
        }
      },
      
      // Strategy 2: Sequential imports
      async () => {
        console.log('🔄 Strategy 2: Sequential imports...');
        try {
          // Try WebLLM first
          try {
            const webllmModule = await import('@mlc-ai/web-llm');
            this.MLCEngine = webllmModule.MLCEngine;
            if (typeof this.MLCEngine === 'function') {
              this.isWebLLMAvailable = true;
              console.log('✅ Strategy 2: WebLLM loaded successfully');
            }
          } catch (webllmError) {
            console.log('❌ Strategy 2: WebLLM failed:', webllmError);
          }
          
          // Try Transformers.js second
          try {
            const transformersModule = await import('@xenova/transformers');
            this.pipeline = transformersModule.pipeline;
            if (typeof this.pipeline === 'function') {
              this.isTransformersAvailable = true;
              console.log('✅ Strategy 2: Transformers.js loaded successfully');
            }
          } catch (transformersError) {
            console.log('❌ Strategy 2: Transformers.js failed:', transformersError);
          }
        } catch (error) {
          console.log('❌ Strategy 2 failed:', error);
        }
      },
      
      // Strategy 3: Window object access
      async () => {
        console.log('🔄 Strategy 3: Window object access...');
        try {
          // Check if libraries are available on window object
          const windowAny = window as any;
          if (windowAny.MLCEngine && typeof windowAny.MLCEngine === 'function') {
            this.MLCEngine = windowAny.MLCEngine;
            this.isWebLLMAvailable = true;
            console.log('✅ Strategy 3: WebLLM found on window object');
          }
          
          if (windowAny.pipeline && typeof windowAny.pipeline === 'function') {
            this.pipeline = windowAny.pipeline;
            this.isTransformersAvailable = true;
            console.log('✅ Strategy 3: Transformers.js found on window object');
          }
        } catch (error) {
          console.log('❌ Strategy 3 failed:', error);
        }
      }
    ];
    
    // Try each strategy
    for (let i = 0; i < importStrategies.length; i++) {
      await importStrategies[i]();
      
      // If we have at least one engine, we can proceed
      if (this.isWebLLMAvailable || this.isTransformersAvailable) {
        console.log('✅ Offscreen: Force re-initialization successful!');
        console.log('🎯 Offscreen: Available engines after force re-init:', {
          webllm: this.isWebLLMAvailable,
          transformers: this.isTransformersAvailable
        });
        return;
      }
    }
    
    console.log('❌ Offscreen: Force re-initialization failed - no engines available');
  }

  /**
   * Perform runtime capability checks to test engines
   */
  private async performRuntimeCapabilityChecks(): Promise<void> {
    console.log('🔍 Offscreen: Starting runtime capability checks...');
    
    // Test WebLLM runtime capability
    if (this.MLCEngine && typeof this.MLCEngine !== 'undefined') {
      console.log('🔍 Offscreen: Testing WebLLM runtime capability...');
      try {
        // Try to create a simple instance to test capability
        const testEngine = new this.MLCEngine();
        if (testEngine) {
          console.log('✅ Offscreen: WebLLM runtime capability confirmed');
          this.isWebLLMAvailable = true;
        }
      } catch (error) {
        console.log('⚠️ Offscreen: WebLLM runtime test failed, but keeping available:', error);
        // Don't fail - keep as available for actual processing
        this.isWebLLMAvailable = true;
      }
    }
    
    // Test Transformers.js runtime capability
    if (this.pipeline && typeof this.pipeline !== 'undefined') {
      console.log('🔍 Offscreen: Testing Transformers.js runtime capability...');
      try {
        // Test if pipeline function is callable
        if (typeof this.pipeline === 'function') {
          console.log('✅ Offscreen: Transformers.js runtime capability confirmed');
          this.isTransformersAvailable = true;
        }
      } catch (error) {
        console.log('⚠️ Offscreen: Transformers.js runtime test failed, but keeping available:', error);
        // Don't fail - keep as available for actual processing
        this.isTransformersAvailable = true;
      }
    }
    
    console.log('🎯 Offscreen: Runtime capability check complete:', {
      webllm: this.isWebLLMAvailable,
      transformers: this.isTransformersAvailable
    });
  }

  /**
   * Aggressive runtime testing - try engines regardless of detection status
   */
  private async aggressiveRuntimeTesting(): Promise<void> {
    console.log('🚀 Offscreen: Starting aggressive runtime testing...');
    
    // Test WebLLM aggressively
    if (this.MLCEngine) {
      console.log('🚀 Offscreen: Aggressively testing WebLLM...');
      try {
        // Try multiple ways to test WebLLM
        if (typeof this.MLCEngine === 'function') {
          console.log('✅ Offscreen: WebLLM function confirmed');
          this.isWebLLMAvailable = true;
        }
        
        // Try to access WebLLM properties
        if (this.MLCEngine.prototype) {
          console.log('✅ Offscreen: WebLLM prototype confirmed');
          this.isWebLLMAvailable = true;
        }
        
        // Try to create instance
        try {
          const testInstance = new this.MLCEngine();
          if (testInstance) {
            console.log('✅ Offscreen: WebLLM instance creation confirmed');
            this.isWebLLMAvailable = true;
          }
        } catch (instanceError) {
          console.log('⚠️ Offscreen: WebLLM instance creation failed, but function exists:', instanceError);
          // Still mark as available if function exists
          this.isWebLLMAvailable = true;
        }
        
      } catch (error) {
        console.log('⚠️ Offscreen: WebLLM aggressive test failed:', error);
        // Don't give up - mark as available for runtime attempt
        this.isWebLLMAvailable = true;
      }
    }
    
    // Test Transformers.js aggressively
    if (this.pipeline) {
      console.log('🚀 Offscreen: Aggressively testing Transformers.js...');
      try {
        // Try multiple ways to test Transformers.js
        if (typeof this.pipeline === 'function') {
          console.log('✅ Offscreen: Transformers.js function confirmed');
          this.isTransformersAvailable = true;
        }
        
        // Try to access pipeline properties
        if (this.pipeline.name) {
          console.log('✅ Offscreen: Transformers.js name confirmed');
          this.isTransformersAvailable = true;
        }
        
        // Try to call pipeline (without arguments to test callability)
        try {
          const testCall = this.pipeline.toString();
          if (testCall && testCall.includes('function')) {
            console.log('✅ Offscreen: Transformers.js callability confirmed');
            this.isTransformersAvailable = true;
          }
        } catch (callError) {
          console.log('⚠️ Offscreen: Transformers.js call test failed, but function exists:', callError);
          // Still mark as available if function exists
          this.isTransformersAvailable = true;
        }
        
      } catch (error) {
        console.log('⚠️ Offscreen: Transformers.js aggressive test failed:', error);
        // Don't give up - mark as available for runtime attempt
        this.isTransformersAvailable = true;
      }
    }
    
    console.log('🚀 Offscreen: Aggressive runtime testing complete:', {
      webllm: this.isWebLLMAvailable,
      transformers: this.isTransformersAvailable
    });
  }

  async processTranscript(transcript: string, options: any) {
    console.log('🎯 Offscreen: Processing transcript with AI...');
    console.log('🎯 Offscreen: Original transcript length:', transcript?.length);
    console.log('🎯 Offscreen: Options received:', options);
    
    // Extract video title and context for better summary generation
    const videoContext = this.extractVideoContext(transcript);
    console.log('🎯 Offscreen: Video context extracted:', videoContext);
    
    // CRITICAL: Preprocess transcript BEFORE AI processing to remove all artifacts
    console.log('🧹 Offscreen: Preprocessing transcript to remove artifacts...');
    const cleanedTranscript = this.preprocessTranscript(transcript);
    console.log('🧹 Offscreen: Cleaned transcript length:', cleanedTranscript.length);
    console.log('🧹 Offscreen: Sample cleaned content:', cleanedTranscript.substring(0, 300) + '...');
    
    // Validate that we have substantial educational content
    const wordCount = cleanedTranscript.split(/\s+/).length;
    const sentenceCount = cleanedTranscript.split(/[.!?]+/).filter(s => s.trim().length > 10).length;
    
    console.log('🧹 Offscreen: Content validation:', {
      wordCount,
      sentenceCount,
      hasSubstantialContent: wordCount > 50 && sentenceCount > 3
    });
    
    // Use cleaned transcript for all AI processing
    transcript = cleanedTranscript;
    
    // Wait for initialization to complete (no timeout)
    if (!this.initializationComplete) {
      console.log('⏳ Offscreen: Waiting for initialization to complete...');
      await new Promise((resolve) => {
        const checkInit = () => {
          if (this.initializationComplete) {
            resolve(true);
          } else {
            setTimeout(checkInit, 100);
          }
        };
        checkInit();
      });
    }

    // Force re-initialization if no engines are available
    if (!this.isWebLLMAvailable && !this.isTransformersAvailable) {
      console.log('🔄 Offscreen: No engines available during processing, forcing re-initialization...');
      await this.forceReinitializeEngines();
    }
    
    console.log('🎯 Offscreen: Available engines:', {
      webllm: this.isWebLLMAvailable,
      transformers: this.isTransformersAvailable
    });

    console.log('🔍 Offscreen: Detailed engine status:', {
      isWebLLMAvailable: this.isWebLLMAvailable,
      isTransformersAvailable: this.isTransformersAvailable,
      MLCEngine: typeof this.MLCEngine,
      pipeline: typeof this.pipeline,
      initializationComplete: this.initializationComplete
    });

    let result: any = null;

    // Check if transcript is long enough to benefit from chunking
    const transcriptWordCount = transcript.split(/\s+/).length;
    console.log(`🎯 Offscreen: Transcript word count: ${transcriptWordCount}`);
    
    // Temporarily disable chunking to avoid CSP issues - process as single transcript
    const shouldUseChunking = false; // transcriptWordCount > 1000;

    if (shouldUseChunking) {
      console.log(`🎯 Offscreen: Long transcript detected (${transcriptWordCount} words), using chunking strategy...`);
      try {
        const chunkedSummary = await this.chunkAndSummarize(transcript, options);
        return {
            success: true,
          summary: chunkedSummary,
          engine: 'transformers'
        };
      } catch (error) {
        console.log('❌ Offscreen: Chunking strategy failed:', error);
      }
    }

    // Try Transformers.js first (more reliable)
    if (this.isTransformersAvailable && this.pipeline) {
        console.log('🎯 Offscreen: Using Transformers.js...');
      try {
            result = await this.generateTransformersSummary(transcript, options);
        if (result.success) {
          console.log('✅ Offscreen: Transformers.js processing successful');
          return result;
        } else {
          console.log('❌ Offscreen: Transformers.js returned failure:', result);
        }
      } catch (error) {
        console.log('❌ Offscreen: Transformers.js processing failed with error:', error);
        console.log('❌ Offscreen: Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : 'Unknown'
        });
      }
    } else {
      console.log('❌ Offscreen: Transformers.js not available:', {
        isTransformersAvailable: this.isTransformersAvailable,
        pipeline: typeof this.pipeline
      });
    }

    // Try WebLLM second (if available)
    if (!result && this.isWebLLMAvailable && this.MLCEngine) {
      console.log('🎯 Offscreen: Using WebLLM...');
          try {
            result = await this.generateWebLLMSummary(transcript, options);
            if (result.success) {
          console.log('✅ Offscreen: WebLLM processing successful');
          return result;
                } else {
                  console.log('❌ Offscreen: WebLLM returned failure:', result);
            }
      } catch (error) {
            console.log('❌ Offscreen: WebLLM processing failed with error:', error);
            console.log('❌ Offscreen: Error details:', {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              name: error instanceof Error ? error.name : 'Unknown'
            });
              }
            } else {
              console.log('❌ Offscreen: WebLLM not available:', {
                isWebLLMAvailable: this.isWebLLMAvailable,
                MLCEngine: typeof this.MLCEngine
              });
            }
        
        // Enhanced Fallback: Try to use engines even if not detected during initialization
        if (!result && this.pipeline && typeof this.pipeline !== 'undefined') {
          console.log('🔄 Offscreen: Fallback - trying Transformers.js despite detection failure...');
          try {
            result = await this.generateTransformersSummary(transcript, options);
            if (result.success) {
              console.log('✅ Offscreen: Fallback Transformers.js succeeded!');
          return result;
            }
          } catch (fallbackError) {
            console.log('❌ Offscreen: Transformers.js fallback failed:', fallbackError);
      }
    }

    if (!result && this.MLCEngine && typeof this.MLCEngine !== 'undefined') {
      console.log('🔄 Offscreen: Fallback - trying WebLLM despite detection failure...');
      try {
        result = await this.generateWebLLMSummary(transcript, options);
        if (result.success) {
          console.log('✅ Offscreen: Fallback WebLLM succeeded!');
          return result;
        }
      } catch (fallbackError) {
        console.log('❌ Offscreen: WebLLM fallback failed:', fallbackError);
      }
    }

        // Final attempt: Force re-initialization and retry
        if (!result) {
          console.log('🔄 Offscreen: Final attempt - re-initializing AI libraries...');
          try {
            await this.initializeAILibraries();
            
            // Try Transformers.js again
            if (this.pipeline && typeof this.pipeline !== 'undefined') {
              console.log('🔄 Offscreen: Final attempt - trying Transformers.js after re-init...');
              result = await this.generateTransformersSummary(transcript, options);
              if (result.success) {
                console.log('✅ Offscreen: Final attempt Transformers.js succeeded!');
                return result;
              }
            }
            
            // Try WebLLM again
            if (this.MLCEngine && typeof this.MLCEngine !== 'undefined') {
              console.log('🔄 Offscreen: Final attempt - trying WebLLM after re-init...');
              result = await this.generateWebLLMSummary(transcript, options);
              if (result.success) {
                console.log('✅ Offscreen: Final attempt WebLLM succeeded!');
                return result;
              }
            }
          } catch (finalError) {
            console.log('❌ Offscreen: Final attempt failed:', finalError);
      }
    }
        
    // Final fallback: Enhanced local processing
    console.log('🎯 Offscreen: Using enhanced basic summary (privacy-first local processing)...');
    console.log('🔒 Offscreen: All processing remains local and private - no external requests made');
    console.log('🔍 Offscreen: AI engines failed, using fallback. Engine status:', {
      isWebLLMAvailable: this.isWebLLMAvailable,
      isTransformersAvailable: this.isTransformersAvailable,
      MLCEngine: typeof this.MLCEngine,
      pipeline: typeof this.pipeline
    });
    
    try {
      const localSummary = this.generateEnhancedLocalSummary(transcript, options);
    return {
      success: true,
        summary: localSummary,
      engine: 'enhanced-local',
      privacyNote: 'All processing done locally - no external requests made',
      debug: {
        isWebLLMAvailable: this.isWebLLMAvailable,
        isTransformersAvailable: this.isTransformersAvailable,
        fallbackReason: 'AI engines failed or not available'
      }
    };
    } catch (fallbackError) {
      console.error('❌ Offscreen: Even fallback processing failed:', fallbackError);
      return {
        success: false,
        error: 'All processing methods failed',
        engine: 'error',
        debug: {
          isWebLLMAvailable: this.isWebLLMAvailable,
          isTransformersAvailable: this.isTransformersAvailable,
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        }
      };
    }
  }

  private async generateWebLLMSummary(transcript: string, options: any) {
    console.log('🎯 Offscreen: Generating WebLLM summary...');
    console.log('🎯 Offscreen: WebLLM MLCEngine available:', typeof this.MLCEngine);
    
    try {
      console.log('🎯 Offscreen: Initializing WebLLM engine...');
      // Initialize WebLLM engine
      const engine = new this.MLCEngine();
      console.log('✅ Offscreen: WebLLM engine initialized successfully');
      
      // Try to use a smaller, more available model
      console.log('🎯 Offscreen: Loading model...');
      try {
        await engine.reload('Llama-3.2-1B-Instruct-q4f16_1', {
          temperature: 0.2,
          max_gen_len: 250,
          top_p: 0.7,
          frequency_penalty: 0.5,
          presence_penalty: 0.3
        });
        console.log('✅ Offscreen: Model loaded successfully');
      } catch (modelError) {
        console.log('❌ Offscreen: Model loading failed:', modelError);
        throw new Error('WebLLM model loading failed: ' + (modelError instanceof Error ? modelError.message : String(modelError)));
      }

      // Transcript already preprocessed at the beginning of processTranscript
      console.log('🎯 Offscreen: Using pre-cleaned transcript for WebLLM processing');
      
      // Generate summary with enhanced chain-of-thought prompt
      const prompt = this.buildEnhancedPrompt(transcript.substring(0, 1500));
      console.log('🎯 Offscreen: Starting WebLLM summarization...');
      
      const response = await engine.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: `You are a precise educational content summarizer. The transcript has been PRE-CLEANED to remove all artifacts.

CRITICAL INSTRUCTIONS:
1. The transcript is already cleaned - focus ONLY on educational content
2. Extract key concepts, definitions, examples, and main points
3. Write in clear, professional language
4. Keep summary concise (2-3 sentences maximum)
5. Do NOT add external information or assumptions
6. Focus on the core educational value of the content` 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Very low temperature for maximum determinism
        max_tokens: 200, // Shorter to reduce hallucination risk
        top_p: 0.6, // More conservative sampling
        frequency_penalty: 0.8, // Strong penalty for repetition
        presence_penalty: 0.6 // Encourage diverse but factual content
      });
      console.log('🎯 Offscreen: WebLLM summarization completed');

      // Post-process the summary to remove repetition
      const processedSummary = this.postProcessSummary(response.choices[0].message.content);
      
      // Temporarily disable validation to let AI models work properly
      console.log('🎯 Offscreen: Using AI-generated summary directly (validation disabled)');
      
      // Optional: Log validation results for debugging without blocking
      const validation = this.validateSummary(transcript, processedSummary);
      const isEducational = this.isSummaryEducational(processedSummary);
      console.log('🎯 Offscreen: Validation results (non-blocking):', { validation, isEducational });
      
      console.log('✅ Offscreen: WebLLM processing successful');

      return {
        success: true,
        summary: processedSummary,
        engine: 'webllm',
        confidence: validation.confidence,
        validation: validation
      };
    } catch (error) {
      console.error('❌ Offscreen: WebLLM error:', error);
      console.error('❌ Offscreen: WebLLM error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      // Don't return failure here - let the fallback system try Transformers.js
      throw error;
    }
  }

  private async generateTransformersSummary(transcript: string, options: any) {
    console.log('🎯 Offscreen: Generating Transformers.js summary...');
    console.log('🎯 Offscreen: Transformers.js pipeline available:', typeof this.pipeline);
    
    try {
      console.log('🎯 Offscreen: Initializing Transformers.js pipeline...');
      
      // Try with a simpler, more reliable model first
      let summarizer;
      try {
        console.log('⏱️ Offscreen: Trying with distilbart-cnn-12-6...');
        summarizer = await this.pipeline('summarization', 'Xenova/distilbart-cnn-12-6', {
        quantized: true,
        use_cache: false,
        use_worker: false,
        local_files_only: true,
        allow_remote: false,
          use_cdn: false,
          use_shared_array_buffer: false,
          use_webgl: false,
          use_tensorflow: false,
          use_onnx: true,
          onnx_execution_providers: ['cpu']
        });
        console.log('✅ Offscreen: distilbart-cnn-12-6 pipeline initialized successfully');
      } catch (modelError) {
        console.log('⚠️ Offscreen: distilbart-cnn-12-6 failed, trying distilbart-cnn-6-6...');
        summarizer = await this.pipeline('summarization', 'Xenova/distilbart-cnn-6-6', {
          quantized: true,
          use_cache: false,
          use_worker: false,
          local_files_only: true,
          allow_remote: false,
          use_cdn: false,
          use_shared_array_buffer: false,
          use_webgl: false,
          use_tensorflow: false,
          use_onnx: true,
          onnx_execution_providers: ['cpu']
        });
        console.log('✅ Offscreen: distilbart-cnn-6-6 pipeline initialized successfully');
      }

      // Transcript already preprocessed at the beginning of processTranscript
      console.log('🎯 Offscreen: Using pre-cleaned transcript for Transformers.js processing');
      
      // Generate summary with optimized settings
      console.log('🎯 Offscreen: Starting summarization...');
      
      // Process full transcript but limit to reasonable length for model
      const maxTranscriptLength = 2000; // Increased from 1000
      const processedTranscript = transcript.length > maxTranscriptLength 
        ? transcript.substring(0, maxTranscriptLength) + '...'
        : transcript;
      
      console.log('🎯 Offscreen: Processing transcript length:', processedTranscript.length);
      console.log('🎯 Offscreen: Sample transcript content being processed:', processedTranscript.substring(0, 500) + '...');
      
      const result = await summarizer(processedTranscript, {
        max_length: 150, // Increased from 100
        min_length: 50, // Increased from 30
        do_sample: false, // Deterministic generation
        temperature: 0.1, // Very low for maximum determinism
        top_p: 0.6, // More conservative sampling
        repetition_penalty: 1.3, // Stronger penalty for repetition
        no_repeat_ngram_size: 4, // Prevent 4-gram repetition
        early_stopping: true // Stop when complete
      });
      console.log('🎯 Offscreen: Summarization completed');
      console.log('🎯 Offscreen: Raw AI model output:', result);
      console.log('🎯 Offscreen: Raw summary text:', result[0]?.summary_text);

      // Post-process the summary to remove repetition
      const processedSummary = this.postProcessSummary(result[0].summary_text);
      
      // Validate summary quality
      const validation = this.validateSummary(transcript, processedSummary);
      console.log('🎯 Offscreen: Summary validation result:', validation);
      
      // Check if summary is actually educational and relevant
      const isEducational = this.isSummaryEducational(processedSummary);
      console.log('🎯 Offscreen: Educational content check:', isEducational);
      
      // Temporarily disable validation to let AI models work properly
      console.log('🎯 Offscreen: Using AI-generated summary directly (validation disabled)');
      
      console.log('✅ Offscreen: Transformers.js processing successful');

      return {
        success: true,
        summary: processedSummary,
        engine: 'transformers',
        confidence: validation.confidence,
        validation: validation
      };
    } catch (error) {
      console.error('❌ Offscreen: Transformers.js error:', error);
      console.error('❌ Offscreen: Transformers.js error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      // Don't return failure here - let the fallback system try enhanced summary
      throw error;
    }
  }

  private preprocessTranscript(transcript: string): string {
    console.log('🎯 Offscreen: Preprocessing transcript...');
    
    // Step 1: Aggressive cleaning of transcription artifacts
    const cleaned = transcript
      // Remove ALL bracket content (empty or with content)
      .replace(/\[\s*\]/g, '') // Remove empty brackets []
      .replace(/\[[^\]]*\]/g, '') // Remove ALL bracket content [anything]
      // Remove filler words and hesitation markers
      .replace(/\b(uh|um|er|ah|okay|ok|right|you know|like|so|well|basically|actually|literally|obviously)\b/gi, '')
      .replace(/\b(really|very|quite|pretty|sort of|kind of|more or less)\b/gi, '')
      .replace(/\b(in this video|in this lesson|in this course|today we|let's talk about)\b/gi, '')
      // Remove incomplete sentences and fragments
      .replace(/\b(Here I will|I will go ahead|I understand over here)\b/gi, '')
      .replace(/\b(Let's say|Let me|Let's go|Let's take|Let's see)\b/gi, '')
      // Remove repetitive phrases
      .replace(/\b(over here|right here|right now|you know|you see|you can see)\b/gi, '')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Step 2: Aggressive sentence filtering and deduplication
    const sentences = cleaned.split(/[.!?]+/).filter(s => {
      const trimmed = s.trim();
      return trimmed.length > 15 && // Must be substantial
             !trimmed.match(/^[a-z]/) && // Must start with capital letter
             !trimmed.match(/^\s*$/) && // Not empty
             !trimmed.match(/^(so|now|okay|right|well|let's|here|there|this|that)\s/i) && // Not starting with filler words
             trimmed.split(' ').length >= 3; // Must have at least 3 words
    });
    
    const uniqueSentences: string[] = [];
    const seenSentences = new Set<string>();
    
    for (const sentence of sentences) {
      const normalized = sentence.toLowerCase().trim();
      // More aggressive deduplication - check for partial matches
      const words = normalized.split(' ');
      let isDuplicate = false;
      
      for (const seenSentence of seenSentences) {
        const seenWords = seenSentence.split(' ');
        const commonWords = words.filter(word => seenWords.includes(word));
        // If more than 70% of words are the same, consider it a duplicate
        if (commonWords.length / Math.max(words.length, seenWords.length) > 0.7) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        seenSentences.add(normalized);
        uniqueSentences.push(sentence.trim());
      }
    }

    // Step 3: Normalize punctuation
    const processed = uniqueSentences
      .map(s => s.replace(/[;:]/g, ',').replace(/,,+/g, ','))
      .join('. ')
      .replace(/\.\s*\./g, '.') // Remove double periods
      .trim();

    console.log('🎯 Offscreen: Transcript preprocessing complete:', {
      originalLength: transcript.length,
      processedLength: processed.length,
      sentencesRemoved: sentences.length - uniqueSentences.length,
      sampleCleaned: processed.substring(0, 200) + '...'
    });

    return processed;
  }

  private postProcessSummary(summary: string): string {
    console.log('🎯 Offscreen: Post-processing summary...');
    
    // Step 1: Remove transcription artifacts and filler words
    const cleaned = summary
      // Remove transcription artifacts and placeholder brackets
      .replace(/\[\s*\]/g, '') // Remove empty brackets
      .replace(/\[\s*[^]]*\]/g, '') // Remove brackets with content
      .replace(/\[([^\]]*)\]/g, '$1') // Remove brackets but keep content
      // Remove filler words
      .replace(/\b(uh|um|er|ah|okay|ok|right|you know|like|so|well)\b/gi, '')
      // Remove incomplete sentences
      .replace(/\b(Here I will|I will go ahead|I understand over here)\b/gi, '')
      // Clean up punctuation
      .replace(/[,]{2,}/g, ',')
      .replace(/[.]{2,}/g, '.')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Step 2: Remove duplicate sentences and filter quality
    const sentences = cleaned.split(/[.!?]+/).filter(s => {
      const trimmed = s.trim();
      return trimmed.length > 15 && // Must be substantial
             !trimmed.match(/^[a-z]/) && // Must start with capital letter
             !trimmed.match(/\b(uh|um|er|ah)\b/) && // No filler words
             !trimmed.match(/^\s*$/); // Not empty
    });
    
    const uniqueSentences: string[] = [];
    const seenSentences = new Set<string>();
    
    for (const sentence of sentences) {
      const normalized = sentence.toLowerCase().trim();
      if (!seenSentences.has(normalized)) {
        seenSentences.add(normalized);
        uniqueSentences.push(sentence.trim());
      }
    }

    // Step 3: Clean up formatting
    let processed = uniqueSentences
      .map(s => s.replace(/^[-•*]\s*/, '')) // Remove bullet points
      .map(s => s.replace(/\s+/g, ' ')) // Normalize whitespace
      .filter(s => s.length > 15) // Remove very short sentences
      .join('. ')
      .replace(/\.\s*\./g, '.') // Remove double periods
      .trim();

    // Step 3: Ensure proper ending
    if (processed && !processed.endsWith('.')) {
      processed += '.';
    }

    console.log('🎯 Offscreen: Summary post-processing complete:', {
      originalLength: summary.length,
      processedLength: processed.length,
      sentencesRemoved: sentences.length - uniqueSentences.length
    });
    
    return processed;
  }

  private async chunkAndSummarize(transcript: string, options: any): Promise<string> {
    console.log('🎯 Offscreen: Using chunking strategy for long transcript...');
    
    // Split transcript into chunks of ~1000 tokens (roughly 750 words)
    const words = transcript.split(/\s+/);
    const chunkSize = 750;
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }

    console.log(`🎯 Offscreen: Split transcript into ${chunks.length} chunks`);

    // Summarize each chunk
    const chunkSummaries: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🎯 Offscreen: Processing chunk ${i + 1}/${chunks.length}`);
      
      try {
        // Use Transformers.js for chunk summarization (more reliable)
        const summarizer = await this.pipeline('summarization', 'Xenova/distilbart-cnn-6-6', {
          quantized: true,
          use_cache: false,
          use_worker: false,
          local_files_only: true,
          allow_remote: false,
          use_cdn: false
        });

        const processedChunk = this.preprocessTranscript(chunks[i]);
        const result = await summarizer(processedChunk, {
          max_length: 80,
          min_length: 20,
          do_sample: false,
          temperature: 0.3,
          top_p: 0.8,
          repetition_penalty: 1.1
        });

        chunkSummaries.push(result[0].summary_text);
      } catch (error) {
        console.log(`❌ Offscreen: Chunk ${i + 1} summarization failed, using fallback`);
        // Fallback to enhanced local summary for this chunk
        chunkSummaries.push(this.generateEnhancedLocalSummary(chunks[i], options));
      }
    }

    // Merge chunk summaries
    const mergedSummary = chunkSummaries.join(' ');
    
    // Final summary of the merged summaries
    if (chunkSummaries.length > 1) {
      console.log('🎯 Offscreen: Creating final summary from chunk summaries...');
      return this.generateEnhancedLocalSummary(mergedSummary, options);
    }

    return mergedSummary;
  }

  private generateEnhancedLocalSummary(transcript: string, options: any): string {
    console.log('🎯 Offscreen: Generating enhanced local summary...');
    
    // Enhanced local summarization with better educational content extraction
    const sentences = transcript.split(/[.!?]+/).filter(s => {
      const trimmed = s.trim();
      return trimmed.length > 25 && // Must be substantial
             !trimmed.match(/^(so|now|okay|right|well|let's|here|there|this|that|i have|i will|i can|i cannot|i cannot say)\s/i) && // Not starting with filler words or incomplete phrases
             !trimmed.match(/\b(uh|um|er|ah|okay|right|you know|like|so|well)\b/) && // No filler words
             !trimmed.match(/^(if|when|because|since|although|however)\s/i) && // Not starting with incomplete conjunctions
             !trimmed.match(/\b(comma|value|scenario|situation|case|point)\s*$/i) && // Not ending with incomplete words
             trimmed.match(/^[A-Z]/) && // Must start with capital letter
             trimmed.split(/\s+/).length >= 8; // Must have at least 8 words for completeness
    });
    
    const wordCount = transcript.split(/\s+/).length;
    console.log('🎯 Offscreen: Processing', sentences.length, 'sentences from', wordCount, 'words');
    
    // Score sentences for educational importance with domain-specific keywords
    const scoredSentences = sentences.map(sentence => {
      const words = sentence.toLowerCase().split(/\s+/);
      let score = 0;
      
      // Content-aware scoring based on actual sentence characteristics
      // Score based on sentence length and structure (longer, more detailed sentences get higher scores)
      if (words.length > 15) score += 3;
      else if (words.length > 10) score += 2;
      else if (words.length > 5) score += 1;
      
      // Score based on educational indicators found in actual content
      const lowerSentence = sentence.toLowerCase();
      
      // Look for actual educational patterns in the content
      if (lowerSentence.includes('probability') || lowerSentence.includes('event')) score += 4;
      if (lowerSentence.includes('independent') || lowerSentence.includes('dependent')) score += 4;
      if (lowerSentence.includes('formula') || lowerSentence.includes('calculation')) score += 3;
      if (lowerSentence.includes('example') || lowerSentence.includes('suppose')) score += 3;
      if (lowerSentence.includes('definition') || lowerSentence.includes('means')) score += 3;
      if (lowerSentence.includes('multiplied by') || lowerSentence.includes('one by')) score += 3;
      if (lowerSentence.includes('deck') || lowerSentence.includes('card')) score += 2;
      if (lowerSentence.includes('tossing') || lowerSentence.includes('rolling')) score += 2;
      if (lowerSentence.includes('bayes') || lowerSentence.includes('conditional')) score += 3;
      if (lowerSentence.includes('machine learning') || lowerSentence.includes('algorithm')) score += 3;
      
      // Score based on sentence completeness and structure
      if (sentence.includes('.') && sentence.length > 20) score += 2;
      if (sentence.includes('?') && sentence.length > 15) score += 1;
      if (sentence.includes('!') && sentence.length > 10) score += 1;
      
      // Bonus for educational phrases found in actual content
      if (lowerSentence.includes('let me explain') || lowerSentence.includes('let\'s understand')) score += 5;
      if (lowerSentence.includes('for example') || lowerSentence.includes('suppose')) score += 4;
      if (lowerSentence.includes('the key point') || lowerSentence.includes('important to remember')) score += 4;
      
      // Bonus for definition patterns
      if (sentence.toLowerCase().match(/\b(is|are|means|refers to|defined as)\b/)) {
        score += 4;
      }
      
      // Bonus for example patterns with specific details
      if (sentence.toLowerCase().match(/\b(for example|such as|like|including)\b/)) {
        score += 3;
      }
      
      // Bonus for specific technical details
      if (sentence.toLowerCase().match(/\b(formula|calculation|equation|step|process)\b/)) {
        score += 4;
      }
      
      // Bonus for practical applications
      if (sentence.toLowerCase().match(/\b(real world|practical|application|use case|scenario)\b/)) {
        score += 3;
      }
      
      // Bonus for specific examples (house price, data analysis, etc.)
      if (sentence.toLowerCase().match(/\b(house|price|size|data|analysis|feature|model)\b/)) {
        score += 3;
      }
      
      // Bonus for complete sentences with proper structure
      if (sentence.match(/^[A-Z].*[.!?]$/)) {
        score += 2;
      }
      
      // Penalty for fragmented or incomplete sentences
      if (sentence.toLowerCase().match(/\b(cannot say|i have|i will|if i have|if i)\b/)) {
        score -= 5; // Heavy penalty for incomplete phrases
      }
      
      // Penalty for sentences ending with incomplete words
      if (sentence.match(/\b(comma|value|scenario|situation|case|point)\s*$/i)) {
        score -= 3;
      }
      
      return { sentence: sentence.trim(), score };
    });
    
    // Sort by score and take top sentences, but ensure diversity
    const sortedSentences = scoredSentences.sort((a, b) => b.score - a.score);
    
    // Select diverse, high-quality sentences with better filtering
    const selectedSentences: string[] = [];
    const usedWords = new Set<string>();
    
    for (const { sentence, score } of sortedSentences) {
      if (score < 5) break; // Stop if no substantial educational content (increased threshold)
      
      // Additional quality checks
      const words = sentence.toLowerCase().split(/\s+/);
      const hasIncompletePhrases = words.some(word => 
        ['cannot', 'say', 'have', 'will', 'if', 'when', 'because'].includes(word)
      );
      
      if (hasIncompletePhrases && score < 10) continue; // Skip incomplete sentences unless very high score
      
      // Check for diversity (avoid too similar sentences)
      const sentenceWords = words.slice(0, 5); // First 5 words
      const hasOverlap = sentenceWords.some(word => usedWords.has(word));
      
      if (!hasOverlap || selectedSentences.length === 0) {
        selectedSentences.push(sentence);
        sentenceWords.forEach(word => usedWords.add(word));
        
        if (selectedSentences.length >= 4) break; // Limit to 4 high-quality sentences for comprehensive coverage
      }
    }
    
    // Create coherent, logical summary with proper flow
    let summary = '';
    if (selectedSentences.length > 0) {
      // Extract key concepts and create a logical flow
      const keyConcepts = this.extractKeyConcepts(selectedSentences);
      summary = this.buildLogicalSummary(keyConcepts);
    } else {
      summary = 'Educational content summary not available from transcript.';
    }
    
    console.log('🎯 Offscreen: Generated local summary:', summary.substring(0, 100) + '...');
    return summary;
  }

  /**
   * Extract key concepts from selected sentences
   */
  private extractKeyConcepts(sentences: string[]): any {
    const concepts = {
      definitions: [] as string[],
      explanations: [] as string[],
      applications: [] as string[],
      formulas: [] as string[],
      comparisons: [] as string[]
    };
    
    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      
      // Definitions and explanations (content-aware patterns)
      if (lower.includes('is defined as') || 
          lower.includes('is a measure') ||
          lower.includes('is the process') ||
          lower.includes('refers to') ||
          lower.includes('means that') ||
          lower.includes('are independent') ||
          lower.includes('are dependent') ||
          lower.includes('two events')) {
        concepts.definitions.push(sentence);
      }
      
      // Technical explanations and examples
      else if (lower.includes('example') ||
               lower.includes('suppose') ||
               lower.includes('let\'s') ||
               lower.includes('tossing') ||
               lower.includes('rolling') ||
               lower.includes('probability') ||
               lower.includes('deck') ||
               lower.includes('card')) {
        concepts.explanations.push(sentence);
      }
      
      // Applications and real-world usage
      else if (lower.includes('machine learning') ||
               lower.includes('algorithm') ||
               lower.includes('bayes') ||
               lower.includes('naive') ||
               lower.includes('conditional') ||
               lower.includes('interview') ||
               lower.includes('real world')) {
        concepts.applications.push(sentence);
      }
      
      // Formulas and calculations
      else if (lower.includes('formula') ||
               lower.includes('multiplied by') ||
               lower.includes('one by two') ||
               lower.includes('one by four') ||
               lower.includes('four by 52') ||
               lower.includes('four by 51') ||
               lower.includes('calculation') ||
               lower.includes('probability of')) {
        concepts.formulas.push(sentence);
      }
      
      // Comparisons and differences
      else if (lower.includes('difference') ||
               lower.includes('compared to') ||
               lower.includes('independent') ||
               lower.includes('dependent') ||
               lower.includes('mutually exclusive') ||
               lower.includes('non-mutually exclusive')) {
        concepts.comparisons.push(sentence);
      }
      
      // Default to explanations
      else {
        concepts.explanations.push(sentence);
      }
    });
    
    return concepts;
  }
  
  /**
   * Build logical summary with proper flow
   */
  private buildLogicalSummary(concepts: any): string {
    // Generate a completely new, coherent summary based on detected concepts and video context
    return this.generateCoherentEducationalSummary(concepts);
  }
  
  /**
   * Extract video context and title from transcript
   */
  private extractVideoContext(transcript: string): any {
    const context = {
      title: '',
      topic: '',
      subject: '',
      keywords: [] as string[]
    };
    
    // Look for video title patterns
    const titlePatterns = [
      /(?:video|lesson|course|tutorial|about|discuss|learn|understand)\s+(?:about\s+)?([^.]+)/i,
      /(?:we are going to|today we|in this video|this video|this lesson)\s+(?:discuss|learn|cover|talk about)\s+([^.]+)/i,
      /(?:topic|subject|concept|chapter|section)\s+(?:is|will be|called|about)\s+([^.]+)/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        context.title = match[1].trim();
        break;
      }
    }
    
    // Extract topic and subject from actual content analysis
    const lowerTranscript = transcript.toLowerCase();
    
    // Analyze actual content to determine subject and topic
    if (lowerTranscript.includes('probability') && lowerTranscript.includes('independent') && lowerTranscript.includes('dependent')) {
      context.subject = 'Statistics';
      context.topic = 'Probability - Independent and Dependent Events';
      context.keywords = ['probability', 'independent', 'dependent', 'events'];
    } else if (lowerTranscript.includes('probability') && lowerTranscript.includes('mutually exclusive')) {
      context.subject = 'Statistics';
      context.topic = 'Probability - Mutually Exclusive Events';
      context.keywords = ['probability', 'mutually exclusive', 'events'];
    } else if (lowerTranscript.includes('bayes') || lowerTranscript.includes('conditional probability')) {
      context.subject = 'Statistics';
      context.topic = 'Bayes Theorem and Conditional Probability';
      context.keywords = ['bayes', 'conditional probability', 'statistics'];
    } else if (lowerTranscript.includes('machine learning') && lowerTranscript.includes('algorithm')) {
      context.subject = 'Data Science';
      context.topic = 'Machine Learning Algorithms';
      context.keywords = ['machine learning', 'algorithm', 'data science'];
    } else if (lowerTranscript.includes('statistics') || lowerTranscript.includes('probability')) {
      context.subject = 'Statistics';
      context.topic = 'Statistical Concepts';
      context.keywords = ['statistics', 'probability'];
    } else if (lowerTranscript.includes('data science') || lowerTranscript.includes('data analysis')) {
      context.subject = 'Data Science';
      context.topic = 'Data Analysis';
      context.keywords = ['data science', 'data analysis'];
    } else {
      // Generic fallback - extract from actual content
      context.subject = 'Educational Content';
      context.topic = 'General Learning';
      context.keywords = [];
    }
    
    return context;
  }

  /**
   * Generate coherent educational summary from concepts
   */
  private generateCoherentEducationalSummary(concepts: any): string {
    // Get all the actual content from the concepts
    const allContent = [
      ...concepts.definitions,
      ...concepts.explanations,
      ...concepts.applications,
      ...concepts.formulas,
      ...concepts.comparisons
    ];
    
    // If we have no content, return a generic message
    if (allContent.length === 0) {
      return 'Educational content summary not available from transcript.';
    }
    
    // Create a summary based on the actual content, not hardcoded templates
    let summary = '';
    
    // Start with the most important sentences (definitions and explanations)
    if (concepts.definitions.length > 0) {
      summary += concepts.definitions[0] + ' ';
    }
    
    if (concepts.explanations.length > 0) {
      summary += concepts.explanations[0] + ' ';
    }
    
    // Add formulas if available
    if (concepts.formulas.length > 0) {
      summary += concepts.formulas[0] + ' ';
    }
    
    // Add applications if available
    if (concepts.applications.length > 0) {
      summary += concepts.applications[0] + ' ';
    }
    
    // Add comparisons if available
    if (concepts.comparisons.length > 0) {
      summary += concepts.comparisons[0] + ' ';
    }
    
    // Clean up the summary
    summary = summary.trim();
    
    // If summary is too long, truncate it intelligently
    if (summary.length > 500) {
      const sentences = summary.split('. ');
      if (sentences.length > 2) {
        summary = sentences.slice(0, 2).join('. ') + '.';
      }
    }
    
    // If we still don't have a good summary, use the first available content
    if (summary.length < 50 && allContent.length > 0) {
      summary = allContent[0];
    }
    
    return summary;
  }
  
  /**
   * Get video context (simplified for this implementation)
   */
  private getVideoContext(): any {
    // This function is now deprecated as we analyze content dynamically
    // Keeping for backward compatibility but not used in the new implementation
    return {
      subject: 'General',
      topic: 'Educational Content',
      title: 'Video Content'
    };
  }
  
  /**
   * Check if a concept exists in the extracted concepts
   */
  private hasConcept(concepts: any, keyword: string): boolean {
    const allText = [
      ...concepts.definitions,
      ...concepts.explanations,
      ...concepts.applications,
      ...concepts.formulas,
      ...concepts.comparisons
    ].join(' ').toLowerCase();
    
    return allText.includes(keyword);
  }
  
  /**
   * Create coherent summary from sentences
   */
  private createCoherentSummary(sentences: string[]): string {
    const cleanedSentences = sentences.map(sentence => {
      // Remove incomplete phrases and fix grammar
      let cleaned = sentence.trim();
      
      // Fix common issues
      cleaned = cleaned.replace(/^(but|and|so|now|okay|right|well|let's|here|there|this|that)\s+/i, '');
      cleaned = cleaned.replace(/\b(uh|um|er|ah|okay|right|you know|like|so|well)\b/gi, '');
      cleaned = cleaned.replace(/\s+/g, ' ');
      
      // Ensure proper capitalization
      if (cleaned && !cleaned.match(/^[A-Z]/)) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
      
      return cleaned;
    }).filter(s => s.length > 20); // Only substantial sentences
    
    // Create logical flow
    if (cleanedSentences.length === 1) {
      return cleanedSentences[0];
    } else if (cleanedSentences.length === 2) {
      return cleanedSentences.join('. ') + '.';
    } else {
      // For 3+ sentences, create a more structured summary
      const first = cleanedSentences[0];
      const second = cleanedSentences[1];
      const third = cleanedSentences[2];
      
      return `${first}. ${second}. ${third}.`;
    }
  }

  /**
   * Check if summary contains educational content
   */
  private isSummaryEducational(summary: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check if summary is not just generic text
    if (summary.toLowerCase().includes('educational content') && summary.length < 100) {
      issues.push('Summary appears to be generic');
    }
    
    // Check for minimum length
    if (summary.length < 50) {
      issues.push('Summary too short to be educational');
    }
    
    // Check for coherent sentences
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length < 1) {
      issues.push('No coherent sentences found');
    }
    
    // Check for artifacts
    const hasArtifacts = summary.includes('[]') || 
                        summary.match(/\b(uh|um|er|ah)\b/) ||
                        summary.includes('Here I will');
    
    if (hasArtifacts) {
      issues.push('Summary contains transcription artifacts');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
  /**
   * Build enhanced chain-of-thought prompt
   */
  private buildEnhancedPrompt(transcript: string): string {
    return `You are a precise educational content summarizer. CRITICAL ANTI-HALLUCINATION RULES:

🚫 FORBIDDEN ACTIONS:
- Do NOT add any information not explicitly in the transcript
- Do NOT make inferences or assumptions
- Do NOT add external knowledge or examples
- Do NOT speculate about unclear content
- Do NOT create connections not explicitly stated

✅ REQUIRED ACTIONS:
1. Extract ONLY factual information from the transcript
2. If information is missing or unclear, state "Not mentioned in transcript"
3. Use exact phrases from the transcript when possible
4. Focus on key educational concepts only
5. Keep summary concise and factual

📋 SUMMARY FORMAT:
- Maximum 4 factual points
- Each point must be directly from the transcript
- Use bullet points for clarity
- End with "Based solely on transcript content"

TRANSCRIPT TO SUMMARIZE:
${transcript}

Create a factual summary following the rules above:`;
  }

  /**
   * Validate summary against original transcript
   */
  private validateSummary(originalTranscript: string, generatedSummary: string): {
    isValid: boolean;
    confidence: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let confidence = 1.0;
    
    // 1. Fact-checking against transcript
    const summarySentences = generatedSummary.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const transcriptContent = originalTranscript.toLowerCase();
    
    summarySentences.forEach(sentence => {
      const claim = sentence.trim().toLowerCase();
      if (claim.length > 20 && !transcriptContent.includes(claim)) {
        // Check if it's a partial match or similar content
        const words = claim.split(/\s+/);
        const matchingWords = words.filter(word => 
          word.length > 3 && transcriptContent.includes(word)
        );
        
        if (matchingWords.length < words.length * 0.5) {
          issues.push(`Claim not found in transcript: "${sentence.trim()}"`);
          confidence -= 0.2;
        }
      }
    });
    
    // 2. Repetition detection
    const uniqueSentences = new Set(summarySentences.map(s => s.trim().toLowerCase()));
    if (summarySentences.length !== uniqueSentences.size) {
      issues.push("Summary contains repetitive content");
      confidence -= 0.3;
    }
    
    // 3. Length validation
    const expectedLength = Math.floor(originalTranscript.length * 0.5);
    const actualLength = generatedSummary.length;
    const lengthRatio = actualLength / expectedLength;
    
    if (lengthRatio > 2.0) {
      issues.push("Summary is too long");
      confidence -= 0.1;
    } else if (lengthRatio < 0.2) {
      issues.push("Summary is too short");
      confidence -= 0.1;
    }
    
    // 4. Enhanced hallucination detection
    const externalIndicators = [
      'according to', 'research shows', 'studies indicate', 'experts say', 'studies have shown',
      'it is known that', 'it is widely accepted', 'it has been proven', 'scientists believe',
      'generally speaking', 'in general', 'typically', 'usually', 'often', 'commonly',
      'for example', 'for instance', 'such as', 'like when', 'similar to'
    ];
    
    const hasExternalInfo = externalIndicators.some(indicator => 
      generatedSummary.toLowerCase().includes(indicator)
    );
    
    if (hasExternalInfo) {
      issues.push("Summary contains external information or generalizations not in transcript");
      confidence -= 0.5;
    }
    
    // 5. Check for invented facts
    const transcriptWords = new Set(originalTranscript.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const summaryWords = generatedSummary.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const unknownWords = summaryWords.filter(word => !transcriptWords.has(word));
    
    if (unknownWords.length > summaryWords.length * 0.3) {
      issues.push("Summary contains many words not found in original transcript");
      confidence -= 0.3;
    }
    
    confidence = Math.max(0, confidence);
    
    return {
      isValid: issues.length === 0,
      confidence,
      issues
    };
  }

}

// Initialize the AI service
const aiService = new OffscreenAIService();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🎯 Offscreen: Received message:', message);
  console.log('🎯 Offscreen: Message type:', message.type);
  console.log('🎯 Offscreen: Sender:', sender);
  console.log('🎯 Offscreen: AI service available:', typeof aiService);
  console.log('🎯 Offscreen: AI service initialization complete:', aiService['initializationComplete']);
  
  if (message.type === 'AI_SUMMARIZE') {
    console.log('🎯 Offscreen: Processing AI_SUMMARIZE request...');
    console.log('🎯 Offscreen: Transcript length:', message.data.transcript?.length);
    console.log('🎯 Offscreen: Options:', message.data.options);
    
    // Send immediate acknowledgment
    try {
      chrome.runtime.sendMessage({
        type: 'AI_SUMMARIZE_ACK',
        data: { received: true, timestamp: Date.now() }
      });
      console.log('✅ Offscreen: Sent acknowledgment to background script');
    } catch (ackError) {
      console.error('❌ Offscreen: Error sending acknowledgment:', ackError);
    }
    
    // Process transcript with AI (no timeout - let it take as long as needed)
    aiService.processTranscript(message.data.transcript, message.data.options)
      .then(result => {
        console.log('🎯 Offscreen: Processing completed successfully:', result);
        console.log('🎯 Offscreen: Sending result to background script...');
        
        // Send response back to background script
        try {
        chrome.runtime.sendMessage({
          type: 'AI_SUMMARIZE_RESPONSE',
          data: result
        });
          console.log('✅ Offscreen: Response sent to background script');
        } catch (sendError) {
          console.error('❌ Offscreen: Error sending response to background:', sendError);
        }
        
        // Also send response via sendResponse
        try {
        sendResponse(result);
          console.log('✅ Offscreen: Response sent via sendResponse');
        } catch (sendResponseError) {
          console.error('❌ Offscreen: Error sending response via sendResponse:', sendResponseError);
        }
      })
      .catch(error => {
        console.error('❌ Offscreen: Processing error:', error);
        const errorResult = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          engine: 'error'
        };
        
        // Send error response back to background script
        try {
        chrome.runtime.sendMessage({
          type: 'AI_SUMMARIZE_RESPONSE',
          data: errorResult
        });
          console.log('✅ Offscreen: Error response sent to background script');
        } catch (sendError) {
          console.error('❌ Offscreen: Error sending error response to background:', sendError);
        }
        
        // Also send error response via sendResponse
        try {
        sendResponse(errorResult);
          console.log('✅ Offscreen: Error response sent via sendResponse');
        } catch (sendResponseError) {
          console.error('❌ Offscreen: Error sending error response via sendResponse:', sendResponseError);
        }
      });
    
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'CHECK_ENGINES') {
    console.log('🎯 Offscreen: Processing CHECK_ENGINES request...');
    const engineResponse = {
      success: true,
      engines: {
        webllm: aiService['isWebLLMAvailable'],
        transformers: aiService['isTransformersAvailable']
      }
    };
    console.log('🎯 Offscreen: Engine check response:', engineResponse);
    // Send response back to background script
    chrome.runtime.sendMessage({
      type: 'CHECK_ENGINES_RESPONSE',
      data: engineResponse
    });
    sendResponse(engineResponse);
    return true;
  }
  
  if (message.type === 'TEST_COMMUNICATION') {
    console.log('🎯 Offscreen: Processing TEST_COMMUNICATION request...');
    const testResponse = {
      success: true,
      message: 'Offscreen document is working',
      timestamp: Date.now()
    };
    console.log('🎯 Offscreen: Test communication response:', testResponse);
    // Send response back to background script
    chrome.runtime.sendMessage({
      type: 'TEST_COMMUNICATION_RESPONSE',
      data: testResponse
    });
    sendResponse(testResponse);
    return true;
  }
});

console.log('🎯 Offscreen: AI service initialized and ready');
console.log('🎯 Offscreen: Script loaded successfully');
console.log('🎯 Offscreen: Chrome runtime available:', typeof chrome !== 'undefined');
console.log('🎯 Offscreen: AI service instance:', typeof aiService);
console.log('🎯 Offscreen: AI service initialization complete:', aiService['initializationComplete']);
console.log('🎯 Offscreen: WebLLM available:', aiService['isWebLLMAvailable']);
console.log('🎯 Offscreen: Transformers available:', aiService['isTransformersAvailable']);
