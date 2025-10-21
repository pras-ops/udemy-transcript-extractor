// Offscreen document for WebLLM AI processing
// This runs in a separate context because service workers can't use WebGPU

import * as webllm from "@mlc-ai/web-llm";

declare const chrome: any;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

class WebLLMService {
  private engine: webllm.MLCEngine | null = null;
  private isInitializing: boolean = false;
  private isInitialized: boolean = false;
  private chatHistory: ChatMessage[] = [];

  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      console.log('🤖 WebLLM: Already initialized or initializing');
      return;
    }

    this.isInitializing = true;
    console.log('🤖 WebLLM: Starting initialization...');

    try {
      const initProgressCallback = (report: webllm.InitProgressReport) => {
        console.log(`🤖 WebLLM Progress: ${report.text} (${(report.progress * 100).toFixed(1)}%)`);
        
        // Send progress updates to background script
        chrome.runtime.sendMessage({
          type: "AI_INIT_PROGRESS",
          progress: report.progress,
          text: report.text,
        }).catch((err: Error) => {
          console.error('Failed to send progress update:', err);
        });
      };

      // Use the 1B model for better compatibility and lower memory usage
      // Smaller model = faster loading and works on systems with limited GPU memory
      this.engine = await webllm.CreateMLCEngine(
        "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        {
          initProgressCallback: initProgressCallback,
        }
      );

      this.isInitialized = true;
      this.isInitializing = false;
      console.log('✅ WebLLM: Initialization complete!');

      // Notify background script
      chrome.runtime.sendMessage({
        type: "AI_READY",
      }).catch((err: Error) => {
        console.error('Failed to send ready message:', err);
      });
    } catch (error) {
      this.isInitializing = false;
      console.error('❌ WebLLM: Initialization failed:', error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to initialize AI";
      const errorStr = error instanceof Error ? error.message : String(error);
      
      if (errorStr.includes("out of memory") || errorStr.includes("E_OUTOFMEMORY") || errorStr.includes("Device was lost")) {
        errorMessage = "Insufficient GPU memory. Try closing other tabs or restarting your browser.";
      } else if (errorStr.includes("WebGPU")) {
        errorMessage = "WebGPU not available. Please enable it in chrome://flags";
      } else if (errorStr.includes("network") || errorStr.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else {
        errorMessage = errorStr;
      }
      
      chrome.runtime.sendMessage({
        type: "AI_ERROR",
        error: errorMessage,
      }).catch((err: Error) => {
        console.error('Failed to send error message:', err);
      });
      
      throw error;
    }
  }

  async chat(userMessage: string, transcriptContext?: string): Promise<string> {
    if (!this.engine) {
      throw new Error("AI engine not initialized. Please initialize first.");
    }

    console.log('🤖 WebLLM: Processing chat message...');

    // Build the system prompt with context
    const systemPrompt = transcriptContext
      ? `You are a helpful AI assistant analyzing a video transcript. Here is the transcript:

${transcriptContext}

Please answer the user's question based on this transcript. Be concise and accurate.`
      : "You are a helpful AI assistant.";

    // Build messages array
    const messages: webllm.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...this.chatHistory.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content
      })),
      { role: "user", content: userMessage }
    ];

    try {
      // Generate response
      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 512,
        stream: false, // Non-streaming for simpler implementation
      });

      const response = completion.choices[0]?.message?.content || "I couldn't generate a response.";
      
      // Update chat history
      this.chatHistory.push({ role: "user", content: userMessage });
      this.chatHistory.push({ role: "assistant", content: response });

      // Keep history manageable (last 10 messages)
      if (this.chatHistory.length > 10) {
        this.chatHistory = this.chatHistory.slice(-10);
      }

      console.log('✅ WebLLM: Response generated');
      return response;
    } catch (error) {
      console.error('❌ WebLLM: Chat error:', error);
      throw error;
    }
  }

  clearHistory(): void {
    this.chatHistory = [];
    console.log('🧹 WebLLM: Chat history cleared');
  }

  getStatus(): { isInitialized: boolean; isInitializing: boolean } {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
    };
  }
}

// Create service instance
const webLLMService = new WebLLMService();

// Listen for messages from background script
chrome.runtime.onMessage.addListener(
  (message: any, sender: any, sendResponse: any) => {
    console.log('🤖 Offscreen: Received message:', message.type);

    if (message.type === "AI_INITIALIZE") {
      webLLMService
        .initialize()
        .then(() => {
          sendResponse({ success: true, status: webLLMService.getStatus() });
        })
        .catch((error) => {
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        });
      return true; // Keep channel open for async response
    }

    if (message.type === "AI_CHAT") {
      webLLMService
        .chat(message.userMessage, message.transcriptContext)
        .then((response) => {
          sendResponse({ success: true, response });
        })
        .catch((error) => {
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        });
      return true;
    }

    if (message.type === "AI_STATUS") {
      sendResponse({ success: true, status: webLLMService.getStatus() });
      return true;
    }

    if (message.type === "AI_CLEAR_HISTORY") {
      webLLMService.clearHistory();
      sendResponse({ success: true });
      return true;
    }

    return false;
  }
);

console.log('🤖 Offscreen: WebLLM service loaded and ready');

