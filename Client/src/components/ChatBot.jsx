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
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
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
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
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

  /* ---------------- Send Message ---------------- */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // If no active chat, create a temporary chat for new message
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
        }),
      });
      const data = await res.json();

      // Update active chat if it was newly created
      if (data.chat_id && !activeChat) {
        const newChat = { id: data.chat_id, title: inputText.slice(0, 40) };
        setActiveChat(newChat);
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
    } catch (err) {
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
      fetchChatSessions();
    }
  };

  /* ---------------- Clear Chat ---------------- */
  const handleClearChat = async () => {
    if (!activeChat) return;
    try {
      await fetch(`http://localhost:8000/chat/sessions/${activeChat.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
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

  /* ---------------- Format Time ---------------- */
  const formatTime = (date) => {
    if (!date) return "Invalid Date";
    const d = new Date(date);
    if (isNaN(d)) return "Invalid Date";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  /* ---------------- Window Sizes ---------------- */
  const sizeMap = {
    normal: "w-80 h-[500px]",
    minimized: "w-64 h-12",
    maximized: "w-[95vw] h-[90vh]",
  };
  const isMinimized = windowMode === "minimized";
  const isMaximized = windowMode === "maximized";

  return (
    <>
      {/* Open Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setWindowMode("normal");
          }}
          className="fixed bottom-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed bottom-4 left-4 z-50 bg-white border rounded-lg shadow-xl transition-all duration-200 flex ${
            isMaximized ? "flex-row" : "flex-col"
          } ${sizeMap[windowMode]}`}
        >
          {/* Sidebar */}
          {(isMaximized || true) && (
            <div className="w-64 border-r overflow-y-auto bg-gray-100 p-2">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Chats</span>
                <button onClick={createNewChat} className="text-sm text-blue-600">
                  + New
                </button>
              </div>
              {chatSessions.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => loadChatMessages(chat)}
                  className={`p-2 rounded hover:bg-blue-100 cursor-pointer ${
                    activeChat?.id === chat.id ? "bg-blue-200" : ""
                  }`}
                >
                  {chat.title}
                </div>
              ))}
            </div>
          )}

          {/* Chat Window */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-3 bg-blue-600 text-white rounded-t-lg">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="text-sm font-semibold">Coding Assistant</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setWindowMode("minimized")} title="Minimize">
                  <Minus size={16} />
                </button>
                <button
                  onClick={() =>
                    setWindowMode(isMaximized ? "normal" : "maximized")
                  }
                  title={isMaximized ? "Restore" : "Maximize"}
                >
                  <Square size={16} />
                </button>
                <button onClick={() => setIsOpen(false)} title="Close">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            {!isMinimized && (
              <>
                <div
                  className="overflow-y-auto p-3 bg-gray-50 flex-1"
                  style={{
                    height: isMaximized ? "calc(100% - 120px)" : "340px",
                  }}
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-3 ${msg.sender === "user" ? "text-right" : ""}`}
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
                        <div className="text-xs mt-1 opacity-60">
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

                {/* Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 flex gap-2 border-t"
                >
                  <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="Ask something about coding…"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="bg-blue-600 text-white p-2 rounded-lg"
                  >
                    <Send size={16} />
                  </button>
                </form>

                {/* Footer */}
                <div className="flex justify-between px-3 pb-3 text-xs">
                  <button
                    onClick={handleClearChat}
                    className="text-gray-500 flex gap-1"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                  <button
                    onClick={() => setInputText("Explain binary search")}
                    className="text-blue-600 flex gap-1"
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
