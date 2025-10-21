import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Loader2, Sparkles, MessageSquare, Trash2, ArrowLeft } from 'lucide-react';

declare const chrome: any;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWithTranscriptProps {
  transcript: string;
  isVisible: boolean;
  onClose?: () => void;
}

export const ChatWithTranscript: React.FC<ChatWithTranscriptProps> = ({
  transcript,
  isVisible,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAIReady, setIsAIReady] = useState(false);
  const [initProgress, setInitProgress] = useState({ text: '', progress: 0 });
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for AI initialization progress
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'AI_INIT_PROGRESS') {
        setInitProgress({ text: message.text, progress: message.progress });
      } else if (message.type === 'AI_READY') {
        setIsAIReady(true);
        setIsInitializing(false);
        setInitProgress({ text: 'AI Ready!', progress: 1 });
      } else if (message.type === 'AI_ERROR') {
        setError(message.error);
        setIsInitializing(false);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Initialize AI when component becomes visible
  useEffect(() => {
    if (isVisible && !isAIReady && !isInitializing) {
      initializeAI();
    }
  }, [isVisible]);

  const initializeAI = async () => {
    setIsInitializing(true);
    setError(null);
    setInitProgress({ text: 'Starting AI initialization...', progress: 0 });

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AI_INITIALIZE',
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to initialize AI');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize AI');
      setIsInitializing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !isAIReady) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AI_CHAT',
        userMessage: inputMessage,
        transcriptContext: transcript,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get AI response');
      }

      const aiMessage: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'AI_CLEAR_HISTORY' });
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[48px] p-6 shadow-2xl border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-700 rounded-[16px] transition-all hover:scale-105 active:scale-95 group"
            title="Back to transcript"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
          </button>
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-[24px]">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Chat</h2>
            <p className="text-sm text-slate-400">Ask questions about the transcript</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="p-2 hover:bg-slate-700 rounded-[16px] transition-colors"
            title="Clear chat history"
          >
            <Trash2 className="w-5 h-5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Initialization Status */}
      {isInitializing && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          <div className="text-center">
            <p className="text-white font-medium mb-2">{initProgress.text}</p>
            <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${initProgress.progress * 100}%` }}
              />
            </div>
            <p className="text-sm text-slate-400 mt-2">
              {Math.round(initProgress.progress * 100)}% Complete
            </p>
          </div>
          <p className="text-xs text-slate-500 max-w-sm text-center">
            First-time setup may take 2-3 minutes to download the model (~500MB). The AI model will be cached for future use.
          </p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-[16px] transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Transcript
          </button>
        </div>
      )}

      {/* Error State */}
      {error && !isInitializing && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-6">
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[24px] max-w-lg">
            <h3 className="text-red-400 font-semibold mb-3 text-center">AI Initialization Failed</h3>
            <p className="text-red-300 text-sm mb-4 text-center">{error}</p>
            
            <div className="mt-4 p-4 bg-slate-800/50 rounded-[16px] space-y-2">
              <p className="text-xs text-slate-300 font-semibold mb-2">💡 Troubleshooting Tips:</p>
              <ul className="text-xs text-slate-400 space-y-1.5">
                <li>• Close other browser tabs to free up memory</li>
                <li>• Restart your browser</li>
                <li>• Enable WebGPU at <code className="text-purple-400">chrome://flags</code></li>
                <li>• Update your GPU drivers</li>
                <li>• Ensure you have at least 2GB free RAM</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-[16px] transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Transcript
            </button>
            <button
              onClick={initializeAI}
              className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-[16px] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {isAIReady && !isInitializing && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                <Sparkles className="w-16 h-16 text-purple-500" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Start a Conversation
                  </h3>
                  <p className="text-slate-400 text-sm max-w-md">
                    Ask me anything about this transcript! I can summarize, explain concepts, or
                    answer specific questions.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 max-w-md">
                  <button
                    onClick={() => setInputMessage('Summarize this transcript')}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-[16px] transition-colors"
                  >
                    💡 Summarize this transcript
                  </button>
                  <button
                    onClick={() => setInputMessage('What are the key points?')}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-[16px] transition-colors"
                  >
                    🎯 What are the key points?
                  </button>
                  <button
                    onClick={() => setInputMessage('Explain the main concepts')}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-[16px] transition-colors"
                  >
                    📚 Explain the main concepts
                  </button>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-[24px] ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.role === 'assistant' && (
                      <Bot className="w-5 h-5 flex-shrink-0 mt-1" />
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-4 rounded-[24px] bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                    <span className="text-sm text-slate-300">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask a question about the transcript..."
              className="flex-1 px-4 py-3 bg-slate-700 text-white placeholder-slate-400 rounded-[24px] focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-[24px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

