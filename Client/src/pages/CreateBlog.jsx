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

  // Function to parse Codeforces-style tags with your specific routing patterns
  const parseCodeforcesTags = (text) => {
    if (!text) return text;
    
    // Parse [user:username] - redirect to profile page
    text = text.replace(/\[user:([^\]]+)\]/g, (match, username) => {
      const trimmedUsername = username.trim();
      return `<a href="/profile/${trimmedUsername}" class="cf-tag user-tag" data-username="${trimmedUsername}">${trimmedUsername}</a>`;
    });
    
    // Parse [submission:id] - redirect to contest submissions or specific submission
    text = text.replace(/\[submission:([^\]]+)\]/g, (match, id) => {
      const trimmedId = id.trim();
      // Assuming submission ID format, redirect to contest submissions page
      // You might need to adjust this based on your actual submission ID format
      return `<a href="/contests/submissions/${trimmedId}" class="cf-tag submission-tag" data-id="${trimmedId}">#${trimmedId}</a>`;
    });
    
    // Parse [problem:contests/contest_id/problems/problem_index]
    text = text.replace(/\[problem:contests\/([^\/]+)\/problems\/([^\]]+)\]/g, (match, contestId, problemIndex) => {
      const trimmedContestId = contestId.trim();
      const trimmedProblemIndex = problemIndex.trim();
      return `<a href="/contests/${trimmedContestId}/problems/${trimmedProblemIndex}" class="cf-tag problem-tag" data-contest-id="${trimmedContestId}" data-problem-index="${trimmedProblemIndex}">Problem ${trimmedProblemIndex}</a>`;
    });
    
    // Parse [problem:problem_code] - simplified format
    text = text.replace(/\[problem:([A-Za-z0-9]+)\]/g, (match, problemCode) => {
      const trimmedCode = problemCode.trim();
      return `<a href="/problems/${trimmedCode}" class="cf-tag problem-tag" data-code="${trimmedCode}">${trimmedCode}</a>`;
    });
    
    // Parse [contest:contest_id] - redirect to contest detail
    text = text.replace(/\[contest:([^\]]+)\]/g, (match, contestId) => {
      const trimmedId = contestId.trim();
      return `<a href="/contests/${trimmedId}" class="cf-tag contest-tag" data-id="${trimmedId}">Contest ${trimmedId}</a>`;
    });
    
    // Parse [standings:contest_id] - redirect to contest standings
    text = text.replace(/\[standings:([^\]]+)\]/g, (match, contestId) => {
      const trimmedId = contestId.trim();
      return `<a href="/contests/${trimmedId}/standings" class="cf-tag standings-tag" data-id="${trimmedId}">Standings ${trimmedId}</a>`;
    });
    
    return text;
  };

  // Function to render Codeforces tags as React components
  const renderCodeforcesTag = (type, value) => {
    const trimmedValue = value.trim();
    
    switch (type) {
      case 'user':
        return (
          <Link 
            to={`/profile/${trimmedValue}`} 
            className="cf-tag user-tag"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            {trimmedValue}
          </Link>
        );
        
      case 'submission':
        return (
          <Link 
            to={`/contests/submissions/${trimmedValue}`} 
            className="cf-tag submission-tag"
            onClick={(e) => e.stopPropagation()}
          >
            #{trimmedValue}
          </Link>
        );
        
      case 'problem':
        // Check if it's in format "contests/contest_id/problems/problem_index"
        const problemMatch = trimmedValue.match(/^contests\/([^\/]+)\/problems\/(.+)$/);
        if (problemMatch) {
          const [, contestId, problemIndex] = problemMatch;
          return (
            <Link 
              to={`/contests/${contestId.trim()}/problems/${problemIndex.trim()}`} 
              className="cf-tag problem-tag"
              onClick={(e) => e.stopPropagation()}
            >
              Problem {problemIndex.trim()}
            </Link>
          );
        }
        // Simple problem code format
        return (
          <Link 
            to={`/problems/${trimmedValue}`} 
            className="cf-tag problem-tag"
            onClick={(e) => e.stopPropagation()}
          >
            {trimmedValue}
          </Link>
        );
        
      case 'contest':
        return (
          <Link 
            to={`/contests/${trimmedValue}`} 
            className="cf-tag contest-tag"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Contest {trimmedValue}
          </Link>
        );
        
      case 'standings':
        return (
          <Link 
            to={`/contests/${trimmedValue}/standings`} 
            className="cf-tag standings-tag"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Standings {trimmedValue}
          </Link>
        );
        
      default:
        return <span className="cf-tag">[{type}:{trimmedValue}]</span>;
    }
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
                    {renderCodeforcesTag(type, value)}
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
      // Check if it's a Codeforces tag link
      if (href && (href.startsWith('/profile/') || href.startsWith('/contests/') || href.startsWith('/problems/'))) {
        return (
          <Link to={href} className="text-blue-600 hover:text-blue-800 underline" {...props}>
            {children}
          </Link>
        );
      }
      
      return <a href={href} className="text-blue-600 hover:text-blue-800 underline" {...props}>{children}</a>;
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
              {renderCodeforcesTag(type, value)}
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

            {/* Instructions Panel */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-bold text-blue-800 mb-2">Codeforces-style Tags Support</h3>
              <div className="text-sm text-blue-700 space-y-2">
                <p>Use the following syntax for Codeforces-style tags:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div>
                    <code className="block px-2 py-1 bg-white rounded border mb-1">[user:tourist]</code>
                    <span className="text-xs text-gray-600">Links to user profile</span>
                  </div>
                  <div>
                    <code className="block px-2 py-1 bg-white rounded border mb-1">[submission:123456]</code>
                    <span className="text-xs text-gray-600">Links to submission</span>
                  </div>
                  <div>
                    <code className="block px-2 py-1 bg-white rounded border mb-1">[problem:contests/694619cc17471397ca246fd7/problems/A]</code>
                    <span className="text-xs text-gray-600">Links to specific contest problem</span>
                  </div>
                  <div>
                    <code className="block px-2 py-1 bg-white rounded border mb-1">[contest:694619cc17471397ca246fd7]</code>
                    <span className="text-xs text-gray-600">Links to contest page</span>
                  </div>
                  <div>
                    <code className="block px-2 py-1 bg-white rounded border mb-1">[standings:694619cc17471397ca246fd7]</code>
                    <span className="text-xs text-gray-600">Links to contest standings</span>
                  </div>
                  <div>
                    <code className="block px-2 py-1 bg-white rounded border mb-1">&lt;spoiler summary="Title"&gt;...&lt;/spoiler&gt;</code>
                    <span className="text-xs text-gray-600">Creates a collapsible spoiler section</span>
                  </div>
                </div>
              </div>
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
                  Content (Markdown supported, including LaTeX, code blocks, and Codeforces-style tags)
                </label>

                {!showPreview ? (
                  <textarea
                    rows={12}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 rounded-md font-mono"
                    placeholder={`Write your blog content here using Markdown syntax...\n\nFor example:\n**bold text**\n[link](https://example.com)\n\`\`\`cpp\n// code block\n\`\`\`\n$a + b = c$ for inline math\n$$E = mc^2$$ for display math\n\nCodeforces-style tags:\n[user:tourist]\n[submission:694619cc17471397ca246fd7]\n[problem:contests/694619cc17471397ca246fd7/problems/A]\n[contest:694619cc17471397ca246fd7]\n[standings:694619cc17471397ca246fd7]\n<spoiler summary="Spoiler Title">Hidden content</spoiler>`}
                    required
                  />
                ) : (
                  <div className="w-full p-4 border border-gray-300 rounded-md bg-white min-h-[300px] prose prose-sm max-w-none">
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

      {/* Add CSS for Codeforces tags */}
      <style jsx>{`
        .cf-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s;
          margin: 0 2px;
          cursor: pointer;
        }
        
        .user-tag {
          background-color: #dbeafe;
          color: #1e40af;
          border: 1px solid #93c5fd;
        }
        
        .user-tag:hover {
          background-color: #bfdbfe;
          color: #1e3a8a;
        }
        
        .submission-tag {
          background-color: #f0f9ff;
          color: #0369a1;
          border: 1px solid #bae6fd;
        }
        
        .submission-tag:hover {
          background-color: #e0f2fe;
          color: #075985;
        }
        
        .problem-tag {
          background-color: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }
        
        .problem-tag:hover {
          background-color: #fde68a;
          color: #78350f;
        }
        
        .contest-tag {
          background-color: #e0e7ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
        }
        
        .contest-tag:hover {
          background-color: #c7d2fe;
          color: #312e81;
        }
        
        .standings-tag {
          background-color: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        
        .standings-tag:hover {
          background-color: #d1fae5;
          color: #047857;
        }
        
        .cf-tag:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default CreateBlog;