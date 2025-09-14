import { ServiceWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let handler: ServiceWorkerMLCEngineHandler;

self.addEventListener("activate", () => {
  try {
    handler = new ServiceWorkerMLCEngineHandler();
    console.log("WebLLM Service Worker Ready ✅");
  } catch (error) {
    console.error("Failed to initialize WebLLM Service Worker:", error);
  }
});

self.onmessage = (msg: MessageEvent) => {
  try {
    if (handler) {
      handler.onmessage(msg);
    } else {
      console.error("WebLLM handler not initialized");
    }
  } catch (error) {
    console.error("Error in WebLLM service worker:", error);
  }
};

// Handle service worker errors
self.addEventListener("error", (event) => {
  console.error("Service Worker Error:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("Service Worker Unhandled Rejection:", event.reason);
});
