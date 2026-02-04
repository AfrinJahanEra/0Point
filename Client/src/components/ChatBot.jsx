import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

import {
  MessageSquare, X, Send, Bot, Minimize2, Maximize2, History, Trash2
} from 'lucide-react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    setMessages([{
      id: Date.now(),
      text: "Hello! I'm your coding assistant. How can I help you?",
      sender: 'bot',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    document.querySelectorAll('pre code').forEach(block => {
      hljs.highlightBlock(block);
    });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = { id: Date.now(), text: inputText, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch('http://localhost:8000/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: userMessage.text, chat_id: chatId })
      });
      const data = await res.json();
      if (data.chat_id && !chatId) setChatId(data.chat_id);

      const botMessage = { id: Date.now() + 1, text: data.reply || "Something went wrong.", sender: 'bot', timestamp: new Date() };
      setMessages(prev => [...prev, botMessage]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 2, text: "Server error. Please try again.", sender: 'bot', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    setMessages([{ id: Date.now(), text: "New chat started. Ask me something about programming!", sender: 'bot', timestamp: new Date() }]);
    setChatId(null);
  };

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Determine width/height based on minimized/maximized state
  const chatWidth = isMaximized ? 'w-[95vw]' : isMinimized ? 'w-64' : 'w-80';
  const chatHeight = isMaximized ? 'h-[90vh]' : isMinimized ? 'h-12' : 'h-[500px]';

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className="fixed bottom-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700"
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className={`fixed bottom-4 left-4 z-50 bg-white rounded-lg shadow-xl border ${chatWidth} ${chatHeight}`}>
          
          {/* Header */}
          <div className="flex justify-between items-center p-3 bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="text-sm font-semibold">Coding Assistant</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setIsMinimized(!isMinimized)}>
                {isMinimized ? <Maximize2 size={16}/> : <Minimize2 size={16}/>}
              </button>
              <button onClick={() => setIsMaximized(!isMaximized)}>
                {isMaximized ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
              </button>
              <button onClick={() => setIsOpen(false)}><X size={16}/></button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="overflow-y-auto p-3 bg-gray-50" style={{ height: isMaximized ? 'calc(100% - 120px)' : '340px' }}>
                {messages.map(msg => (
                  <div key={msg.id} className={`mb-3 ${msg.sender === 'user' && 'text-right'}`}>
                    <div className={`inline-block max-w-[80%] p-3 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex, rehypeRaw]}
                        children={msg.text}
                      />
                      <div className="text-xs mt-1 opacity-70">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && <div className="text-sm text-gray-500">AI is typing…</div>}
                <div ref={messagesEndRef}/>
              </div>

              <form onSubmit={handleSendMessage} className="p-3 flex gap-2 border-t">
                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ask something about coding…"
                />
                <button type="submit" disabled={!inputText.trim()} className="bg-blue-600 text-white p-2 rounded-lg">
                  <Send size={16}/>
                </button>
              </form>

              <div className="flex justify-between px-3 pb-3 text-xs">
                <button onClick={handleClearChat} className="text-gray-500 flex gap-1">
                  <Trash2 size={12}/> Clear
                </button>
                <button onClick={() => setInputText("Explain binary search")} className="text-blue-600 flex gap-1">
                  <History size={12}/> Quick help
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default Chatbot;
