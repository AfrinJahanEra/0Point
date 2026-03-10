import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import hljs from "highlight.js";
import { BACKEND_URL } from "../utils/api";

import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";

import {
  MessageSquare,
  X,
  Send,
  Bot,
  History,
  Trash2,
  Minus,
  Square,
  Copy,
} from "lucide-react";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [windowMode, setWindowMode] = useState("normal"); // normal | minimized | maximized

  const [chatSessions, setChatSessions] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);

  const isMinimized = windowMode === "minimized";
  const isMaximized = windowMode === "maximized";

  /* ---------------- Scroll ---------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* ---------------- Highlight Code ---------------- */
  useEffect(() => {
    document.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
    });
  }, [messages]);

  /* ---------------- Load Chat Sessions ---------------- */
  useEffect(() => {
    if (isOpen) fetchChatSessions();
  }, [isOpen]);

  const fetchChatSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/chat/sessions/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setChatSessions(data.chats || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------- Load Messages ---------------- */
  const loadChatMessages = async (chat) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/chat/sessions/${chat.id}/messages/`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      const data = await res.json();

      setActiveChat(chat);
      setMessages(
        (data.messages || []).map((m) => ({
          id: m.id,
          text: m.content,
          sender: m.role === "user" ? "user" : "bot",
          created_at: m.created_at,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------- Handle input keydown for Shift+Enter (multiline) and Enter (submit) ---------------- */
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift+Enter: allow newline
        e.preventDefault();
        setInputText((prev) => prev + "\n");
      } else {
        // Enter: submit
        e.preventDefault();
        handleSendMessage(e);
      }
    }
  };

  /* ---------------- Send Message ---------------- */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const chatId = activeChat?.id || null;

    const userMessage = {
      id: Date.now(),
      text: inputText,
      sender: "user",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          message: userMessage.text,
          chat_id: chatId,
          current_url: window.location.href,
        }),
      });

      const data = await res.json();

      if (data.chat_id && !activeChat) {
        setActiveChat({ id: data.chat_id, title: inputText.slice(0, 40) });
        fetchChatSessions();
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: data.reply || "Something went wrong.",
          sender: "bot",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          text: "Server error. Please try again.",
          sender: "bot",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  /* ---------------- Clear Chat ---------------- */
  const handleClearChat = async () => {
    if (!activeChat) return;
    try {
      await fetch(`${BACKEND_URL}/chat/sessions/${activeChat.id}/delete/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setActiveChat(null);
      setMessages([]);
      fetchChatSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const createNewChat = () => {
    setActiveChat(null);
    setMessages([
      {
        id: Date.now(),
        text: "New chat started. Ask me something about programming!",
        sender: "bot",
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  /* ---------------- Window Sizes ---------------- */
  const sizeMap = {
    normal: "w-96 h-[520px]",
    minimized: "w-56 h-auto",
    maximized: "w-[88vw] h-[80vh] max-w-6xl",
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setWindowMode("normal");
          }}
          className="fixed bottom-6 right-6 z-[70] bg-blue-800 hover:bg-blue-900 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 hover:shadow-blue-900/30"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Backdrop blur overlay for maximized mode */}
      {isOpen && isMaximized && (
        <div 
          className="fixed inset-0 z-[60] bg-white/30 backdrop-blur-lg transition-all"
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <div
          className={`z-[70] bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-2xl transition-all flex overflow-hidden ${
            isMaximized 
              ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex-row" 
              : "fixed bottom-6 right-6 flex-col"
          } ${sizeMap[windowMode]}`}
        >
          {/* Sidebar */}
          {isMaximized && (
            <div className="w-64 border-r border-blue-100 bg-gray-50/90 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent hover:scrollbar-thumb-blue-300">
              <div className="flex justify-between mb-2">
                <span className="font-semibold text-gray-800">Chats</span>
                <button onClick={createNewChat} className="text-blue-800 hover:text-blue-900 text-sm font-medium">
                  + New
                </button>
              </div>

              {chatSessions.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => loadChatMessages(chat)}
                  className={`p-2 rounded cursor-pointer hover:bg-blue-100 ${
                    activeChat?.id === chat.id ? "bg-blue-200" : ""
                  }`}
                >
                  {chat.title}
                </div>
              ))}
            </div>
          )}

          {/* Chat */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className={`flex justify-between items-center bg-gradient-to-r from-blue-800 to-blue-900 text-white ${isMinimized ? 'px-3 py-2' : 'px-4 py-3'}`}>
              <div 
                className="flex items-center gap-2 cursor-pointer flex-1"
                onClick={() => isMinimized && setWindowMode("normal")}
              >
                <div className={`bg-white/20 rounded-lg ${isMinimized ? 'p-1' : 'p-1.5'}`}>
                  <Bot size={isMinimized ? 14 : 18} />
                </div>
                {!isMinimized && (
                  <div>
                    <span className="font-semibold text-sm block">Coding Assistant</span>
                    <span className="text-xs text-blue-200">Always here to help</span>
                  </div>
                )}
                {isMinimized && (
                  <span className="font-medium text-xs truncate">Coding Assistant</span>
                )}
              </div>

              <div className="flex gap-0.5">
                <button 
                  onClick={() => setWindowMode(isMinimized ? "normal" : "minimized")} 
                  className={`hover:bg-white/20 rounded transition-colors ${isMinimized ? 'p-1.5' : 'p-2'}`}
                >
                  <Minus size={isMinimized ? 14 : 16} />
                </button>
                <button
                  onClick={() =>
                    setWindowMode(isMaximized ? "normal" : "maximized")
                  }
                  className={`hover:bg-white/20 rounded transition-colors ${isMinimized ? 'p-1.5' : 'p-2'}`}
                >
                  {isMaximized ? (
                    <Copy size={isMinimized ? 14 : 16} />
                  ) : (
                    <Square size={isMinimized ? 14 : 16} />
                  )}
                </button>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className={`hover:bg-white/20 rounded transition-colors ${isMinimized ? 'p-1.5' : 'p-2'}`}
                >
                  <X size={isMinimized ? 14 : 16} />
                </button>
              </div>
            </div>

            {/* Body */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white [&_pre]:!my-2 [&_pre]:!p-3 [&_pre_code]:!text-xs [&_code]:!px-1 [&_code]:!py-0.5 [&_code]:!text-xs scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent hover:scrollbar-thumb-blue-300">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Bot size={48} className="mb-4 opacity-30" />
                      <p className="text-sm">Start a conversation with your coding assistant</p>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-4 flex ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${
                          msg.sender === "user"
                            ? "bg-blue-800 text-white rounded-br-md"
                            : "bg-white border border-gray-100 rounded-bl-md shadow-md"
                        }`}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex, rehypeRaw]}
                        >
                          {msg.text}
                        </ReactMarkdown>
                        <div className={`text-xs mt-2 ${msg.sender === "user" ? "text-blue-200" : "text-gray-400"}`}>
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-800 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-blue-800 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                        <span className="w-2 h-2 bg-blue-800 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                      </div>
                      <span>AI is typing...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="p-4 flex gap-3 border-t bg-white"
                >
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    className="flex-1 border-0 bg-gray-100 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:bg-white transition-all"
                    placeholder="Ask something about coding..."
                    rows={2}
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="bg-blue-800 hover:bg-blue-900 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-900/20"
                  >
                    <Send size={18} />
                  </button>
                </form>

                <div className="flex justify-between px-4 pb-4 pt-2 bg-white border-t text-xs">
                  <button
                    onClick={handleClearChat}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Clear chat
                  </button>
                  <button
                    onClick={() => setInputText("Explain binary search")}
                    className="flex items-center gap-1.5 text-blue-800 hover:text-blue-900 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
                  >
                    <History size={14} /> Quick help
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;

