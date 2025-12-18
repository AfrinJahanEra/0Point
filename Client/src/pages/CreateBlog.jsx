import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css'; // ← Fixed!

const CreateBlog = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Co-authors (Codeforces style)
  const [showCoAuthors, setShowCoAuthors] = useState(false);
  const [coAuthorInput, setCoAuthorInput] = useState('');
  const [selectedCoAuthors, setSelectedCoAuthors] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  // Mock users (replace with real API later)
  const mockUsers = [
    'tourist', 'jiangly', 'Benq', 'Geothermal', 'ecnerwala', 'orzdevinwang',
    'ksun48', 'Um_nik', 'Petr', 'Errichto', 'secondthread', 'neal',
    'awoo', 'hos.lyric', 'maroonrk', 'Radewoosh', 'ainta', 'scott_wu'
  ];

  useEffect(() => {
    if (!coAuthorInput.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = mockUsers
      .filter(u => u.toLowerCase().includes(coAuthorInput.toLowerCase()) && !selectedCoAuthors.includes(u))
      .slice(0, 8);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [coAuthorInput, selectedCoAuthors]);

  const addCoAuthor = (username) => {
    if (!selectedCoAuthors.includes(username)) {
      setSelectedCoAuthors(prev => [...prev, username]);
    }
    setCoAuthorInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeCoAuthor = (username) => {
    setSelectedCoAuthors(prev => prev.filter(u => u !== username));
  };

  const handleSubmit = (e, isDraft = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      alert(isDraft ? 'Saved as draft!' : 'Blog published successfully!');
      navigate('/blog');
    }, 1500);
  };

  const togglePreview = () => setShowPreview(!showPreview);

const customComponents = {
  spoiler: ({ summary, children }) => (
    <details className="my-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
      <summary className="cursor-pointer text-lg font-semibold text-blue-700 hover:text-blue-900 list-none">
        <span className="inline-block mr-2">▶</span>
        {summary || 'Solution / Spoiler'}
      </summary>
      <div className="mt-3 pl-8 border-l-4 border-blue-400">{children}</div>
    </details>
  ),

  // Enhanced headings with anchor links (Codeforces style)
  h1: ({ children }) => {
    const id = children ? String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    return (
      <h1 id={id} className="text-3xl font-bold mt-10 mb-6 text-blue-900 border-b-2 border-blue-300 pb-3 group">
        <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 mr-3 text-blue-600">§</a>
        {children}
      </h1>
    );
  },
  h2: ({ children }) => {
    const id = children ? String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    return (
      <h2 id={id} className="text-2xl font-bold mt-8 mb-4 text-gray-800 group flex items-center">
        <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 mr-2 text-blue-600 text-lg">§</a>
        {children}
      </h2>
    );
  },
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold mt-7 mb-3 text-gray-700 flex items-center group">
      <span className="opacity-0 group-hover:opacity-100 mr-2 text-blue-500 text-sm">›</span>
      {children}
    </h3>
  ),
  ol: ({ depth, ...props }) => {
    const isTopLevel = depth === 0;
    return (
      <ol
        className={`
          my-5 space-y-3
          ${isTopLevel
            ? 'list-decimal ml-9 text-lg marker:font-bold marker:text-blue-800'
            : 'list-decimal ml-8 text-base marker:font-medium marker:text-blue-600'
          }
        `}
        {...props}
      />
    );
  },
  
  // Unordered list component for -, *, + bullets
  ul: ({ depth, ...props }) => {
    const isTopLevel = depth === 0;
    return (
      <ul
        className={`
          my-5 space-y-3
          ${isTopLevel
            ? 'list-disc ml-9 text-lg marker:text-blue-600'
            : 'list-disc ml-8 text-base marker:text-blue-500'
          }
        `}
        {...props}
      />
    );
  },
  
  li: ({ ordered, children, ...props }) => (
    <li
      className="leading-relaxed text-gray-800 pl-2 hover:text-gray-900 transition-colors"
      {...props}
    >
      <span className="drop-cap:inline">{children}</span>
    </li>
  ),
  
  // Blockquote component for > syntax (simple grey style)
  blockquote: ({ children }) => (
    <blockquote className="my-6 pl-5 border-l-4 border-gray-400 bg-gray-100 py-3 pr-4 rounded-r">
      <div className="text-gray-800">
        {children}
      </div>
    </blockquote>
  ),
  
  // Image component supporting base64 and regular URLs
  img: ({ src, alt, ...props }) => {
    // Check if it's a base64 image
    const isBase64 = src && (src.startsWith('data:image/') || src.startsWith('base64,'));
    
    return (
      <div className="my-6 flex flex-col items-center">
        <img
          src={src}
          alt={alt || 'Image'}
          className="max-w-full h-auto rounded-lg shadow-md border border-gray-300"
          {...props}
        />
        {alt && (
          <p className="mt-2 text-sm text-gray-600 text-center italic">
            {alt}
          </p>
        )}
        {isBase64 && (
          <p className="mt-1 text-xs text-gray-500 text-center">
            (Base64 Image)
          </p>
        )}
      </div>
    );
  },
};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto pl-10 pr-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold text-gray-900">Create New Blog Entry</h2>
              <button onClick={() => navigate('/blog')} className="text-gray-500 hover:text-gray-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter a descriptive title for your blog entry"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (separated by commas)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., tutorial, dp, greedy"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content (Markdown supported, including LaTeX, code blocks, and Codeforces-style spoilers)
                </label>

                {!showPreview ? (
                  <textarea
                    rows={12}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 rounded-md font-mono"
                    placeholder={`Write your blog content here using Markdown syntax...\n\nFor example:\n**bold text**\n[link](https://example.com)\n\`\`\`cpp\n// code block\n\`\`\`\n$a + b = c$ for inline math\n$$E = mc^2$$ for display math\n<spoiler summary="Spoiler Title">Hidden content</spoiler>`}
                    required
                  />
                ) : (
                  <div className="w-full p-4 border border-gray-300 rounded-md bg-white min-h-[300px] prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                      components={customComponents}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Co-authors – Codeforces style */}
              <div className="mb-6">
                {!showCoAuthors ? (
                  <button
                    type="button"
                    onClick={() => setShowCoAuthors(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                  >
                    + Add co-authors
                  </button>
                ) : (
                  <div className="p-4 bg-gray-100 border border-gray-300 rounded-md">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Co-authors</label>

                    {selectedCoAuthors.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedCoAuthors.map(author => (
                          <span
                            key={author}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {author}
                            <button type="button" onClick={() => removeCoAuthor(author)} className="hover:text-blue-900">
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={coAuthorInput}
                        onChange={(e) => setCoAuthorInput(e.target.value)}
                        onFocus={() => coAuthorInput && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Type username..."
                      />

                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                          {suggestions.map(username => (
                            <div
                              key={username}
                              onMouseDown={() => addCoAuthor(username)}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                            >
                              {username}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-gray-600">
                      Co-authors will be able to edit this entry and will be displayed as authors.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCoAuthors(false);
                        setSelectedCoAuthors([]);
                        setCoAuthorInput('');
                      }}
                      className="mt-3 text-sm text-red-600 hover:text-red-800"
                    >
                      Remove co-authors
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => navigate('/blog')} className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
                  Discard
                </button>
                <button type="button" onClick={(e) => handleSubmit(e, true)} disabled={isSubmitting} className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Save Draft
                </button>
                <button type="button" onClick={togglePreview} className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-800 text-white rounded hover:bg-blue-900 disabled:opacity-50 flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Publishing...
                    </>
                  ) : 'Post'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-3">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBlog;