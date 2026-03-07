import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Link } from 'react-router-dom';
import MarkdownSyntaxPopup from '../components/MarkdownSyntaxPopup';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CreateBlog = () => {
  const { user } = useApp();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

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

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const blogData = {
        title,
        content,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        co_authors: selectedCoAuthors,
        publish: !isDraft
      };

      const response = await api.post('/blog/create/', blogData);

      if (response.status === 201) {
        toast.success(isDraft ? 'Blog saved as draft!' : 'Blog published successfully!');
        navigate('/blog');
      }
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error('Failed to save blog. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePreview = () => setShowPreview(!showPreview);

  // Function to render Codeforces tags as React components with new display format
  const renderCodeforcesTag = (type, value, isPreview = false) => {
    const trimmedValue = value.trim();
    
    let displayText = trimmedValue;
    let linkTo = '';
    
    switch (type) {
      case 'user':
        // User mentions are styled but not linked (would need user ID lookup)
        displayText = isPreview ? `user - ${trimmedValue}` : `@${trimmedValue}`;
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium text-sm"
          >
            {displayText}
          </span>
        );
        
      case 'submission':
        // Handle format: [submission:contests/contest_id/submissions]
        const submissionMatch = trimmedValue.match(/^contests\/([^\/]+)\/submissions$/);
        if (submissionMatch) {
          const contestId = submissionMatch[1];
          linkTo = `/contests/${contestId}/submissions`;
          displayText = isPreview ? `submission - ${contestId}` : 'Submissions';
        } else {
          // Simple submission ID format
          linkTo = `/submissions/${trimmedValue}`;
          displayText = isPreview ? `submission - ${trimmedValue}` : `#${trimmedValue}`;
        }
        break;
        
      case 'problem':
        // Handle format: [problem:contests/contest_id/problems/problem_index]
        const problemMatch = trimmedValue.match(/^contests\/([^\/]+)\/problems\/(.+)$/);
        if (problemMatch) {
          const contestId = problemMatch[1];
          const problemIndex = problemMatch[2];
          linkTo = `/contests/${contestId}/problems/${problemIndex}`;
          displayText = isPreview ? `problem - ${contestId}/${problemIndex}` : `Problem ${problemIndex}`;
        } else {
          // Simple problem code format
          linkTo = `/problems/${trimmedValue}`;
          displayText = isPreview ? `problem - ${trimmedValue}` : trimmedValue;
        }
        break;
        
      case 'contest':
        linkTo = `/contests/${trimmedValue}`;
        displayText = isPreview ? `contest - ${trimmedValue}` : `Contest ${trimmedValue}`;
        break;
        
      case 'standings':
        linkTo = `/contests/${trimmedValue}/standings`;
        displayText = isPreview ? `standings - ${trimmedValue}` : `Standings ${trimmedValue}`;
        break;
        
      default:
        return <span>[{type}:{trimmedValue}]</span>;
    }
    
    if (isPreview) {
      return (
        <Link 
          to={linkTo} 
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {type === 'user' && (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          )}
          {type === 'submission' && (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          )}
          {type === 'problem' && (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          )}
          {type === 'contest' && (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          )}
          {type === 'standings' && (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {displayText}
        </Link>
      );
    }
    
    // For non-preview (when editing), show the tag as is
    return <span className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">[{type}:{trimmedValue}]</span>;
  };

  const customComponents = {
    // Codeforces-style spoiler
    spoiler: ({ node, children, ...props }) => {
      const summary = props.summary || node?.properties?.summary || 'Solution / Spoiler';
      return (
        <details className="my-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <summary className="cursor-pointer text-lg font-semibold text-blue-700 hover:text-blue-900 list-none">
            <span className="inline-block mr-2">▶</span>
            {summary}
          </summary>
          <div className="mt-3 pl-8 border-l-4 border-blue-400">{children}</div>
        </details>
      );
    },

    // Enhanced paragraph to handle Codeforces tags
    p: ({ node, children, ...props }) => {
      // Convert children to text for parsing
      const childArray = React.Children.toArray(children);
      const hasCodeforcesTags = childArray.some(child => {
        if (typeof child === 'string') {
          return /\[(user|submission|problem|contest|standings):[^\]]+\]/.test(child);
        }
        return false;
      });

      if (hasCodeforcesTags) {
        const newChildren = childArray.map((child, index) => {
          if (typeof child === 'string') {
            const parts = child.split(/(\[(?:user|submission|problem|contest|standings):[^\]]+\])/);
            return parts.map((part, partIndex) => {
              const match = part.match(/\[(user|submission|problem|contest|standings):([^\]]+)\]/);
              if (match) {
                const [, type, value] = match;
                return (
                  <React.Fragment key={`${index}-${partIndex}`}>
                    {renderCodeforcesTag(type, value, showPreview)}
                  </React.Fragment>
                );
              }
              return part;
            });
          }
          return child;
        });

        return <p className="my-4 leading-relaxed" {...props}>{newChildren}</p>;
      }

      return <p className="my-4 leading-relaxed" {...props}>{children}</p>;
    },

    // Enhanced link component
    a: ({ href, children, ...props }) => {
      // Check if it's a Codeforces tag link (excluding profile links which are no longer used)
      if (href && (href.startsWith('/contests/') || href.startsWith('/problems/') || href.startsWith('/submissions/'))) {
        return (
          <Link to={href} className="text-blue-600 hover:text-blue-800 hover:underline font-medium" {...props}>
            {children}
          </Link>
        );
      }
      
      return <a href={href} className="text-blue-600 hover:text-blue-800 hover:underline" {...props}>{children}</a>;
    },

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
    
    // Handle inline code that might contain Codeforces tags
    code: ({ node, inline, children, ...props }) => {
      if (inline) {
        const text = typeof children === 'string' ? children : children.join('');
        
        // Check for Codeforces tags in inline code
        const cfTagMatch = text.match(/\[(user|submission|problem|contest|standings):([^\]]+)\]/);
        
        if (cfTagMatch) {
          const [, type, value] = cfTagMatch;
          return (
            <React.Fragment>
              {renderCodeforcesTag(type, value, showPreview)}
            </React.Fragment>
          );
        }
      }
      
      return (
        <code className={`${inline ? 'bg-gray-100 px-1 py-0.5 rounded text-sm' : 'block'} font-mono`} {...props}>
          {children}
        </code>
      );
    },

    // Other components remain the same...
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
    
    blockquote: ({ children }) => (
      <blockquote className="my-6 pl-5 border-l-4 border-gray-400 bg-gray-100 py-3 pr-4 rounded-r">
        <div className="text-gray-800">
          {children}
        </div>
      </blockquote>
    ),
    
    img: ({ src, alt, ...props }) => {
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
    <div className={`min-h-screen bg-gray-50 ${showPreview ? '' : ''}`}>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Content (Markdown supported, including LaTeX, code blocks, and Codeforces-style tags)
                  </label>
                  <MarkdownSyntaxPopup />
                </div>

                {!showPreview ? (
                  <textarea
                    rows={12}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 rounded-md font-mono scrollbar-thin"
                    placeholder="Write your blog content here"
                    required
                  />
                ) : (
                  <div className="w-full p-4 border border-gray-300 rounded-md bg-white min-h-[300px] prose prose-sm max-w-none overflow-y-auto scrollbar-thin">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath, remarkBreaks]}
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
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto scrollbar-thin">
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

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 3px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        
        /* For Firefox */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #888 #f1f1f1;
        }
      `}</style>
    </div>
  );
};

export default CreateBlog;