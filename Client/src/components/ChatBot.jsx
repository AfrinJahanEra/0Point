import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import hljs from "highlight.js";

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
      const res = await fetch("http://localhost:8000/chat/sessions/", {
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
        `http://localhost:8000/chat/sessions/${chat.id}/messages/`,
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
      const res = await fetch("http://localhost:8000/chat/", {
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
      await fetch(`http://localhost:8000/chat/sessions/${activeChat.id}/delete/`, {
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
    normal: "w-80 h-[500px]",
    minimized: "w-64 h-12",
    maximized: "w-[95vw] h-[90vh]",
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setWindowMode("normal");
          }}
          className="fixed bottom-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed bottom-4 left-4 z-50 bg-white border rounded-lg shadow-xl transition-all flex ${
            isMaximized ? "flex-row" : "flex-col"
          } ${sizeMap[windowMode]}`}
        >
          {/* Sidebar */}
          {isMaximized && (
            <div className="w-64 border-r bg-gray-100 overflow-y-auto p-2">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Chats</span>
                <button onClick={createNewChat} className="text-blue-600 text-sm">
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
            <div className="flex justify-between items-center p-3 bg-blue-600 text-white">
              <div className="flex items-center gap-2">
                <Bot size={18} />
                <span className="font-semibold text-sm">Coding Assistant</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setWindowMode("minimized")}>
                  <Minus size={16} />
                </button>
                <button
                  onClick={() =>
                    setWindowMode(isMaximized ? "normal" : "maximized")
                  }
                >
                  <Square size={16} />
                </button>
                <button onClick={() => setIsOpen(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-3 ${
                        msg.sender === "user" ? "text-right" : ""
                      }`}
                    >
                      <div
                        className={`inline-block max-w-[80%] p-3 rounded-lg text-sm ${
                          msg.sender === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-white border"
                        }`}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex, rehypeRaw]}
                        >
                          {msg.text}
                        </ReactMarkdown>
                        <div className="text-xs opacity-60 mt-1">
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="text-sm text-gray-500">AI is typing…</div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="p-3 flex gap-2 border-t"
                >
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="Ask something..."
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="bg-blue-600 text-white p-2 rounded-lg"
                  >
                    <Send size={16} />
                  </button>
                </form>

                <div className="flex justify-between px-3 pb-3 text-xs">
                  <button
                    onClick={handleClearChat}
                    className="flex gap-1 text-gray-500"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                  <button
                    onClick={() => setInputText("Explain binary search")}
                    className="flex gap-1 text-blue-600"
                  >
                    <History size={12} /> Quick help
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
