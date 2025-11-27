import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css'; // For LaTeX rendering
import 'highlight.js/styles/github.css'; // For code highlighting

const CreateBlog = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = (e, isDraft = false) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate blog creation or draft saving
    setTimeout(() => {
      setIsSubmitting(false);
      alert(isDraft ? 'Blog saved as draft!' : 'Blog published successfully!');
      navigate('/blog');
    }, 1500);
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const customComponents = {
    spoiler: ({ summary, children }) => (
      <details className="my-2">
        <summary className="cursor-pointer text-blue-600 hover:underline">{summary || 'Spoiler'}</summary>
        <div className="pl-4 border-l-4 border-gray-300">{children}</div>
      </details>
    ),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto pl-10 pr-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold text-gray-900">Create New Blog Entry</h2>
              <button
                onClick={() => navigate('/blog')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={(e) => handleSubmit(e, false)}>
              <div className="mb-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 rounded-md"
                  placeholder="Enter a descriptive title for your blog entry"
                  required
                />
              </div>
              <div className="mb-6">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (separated by commas)
                </label>
                <input
                  type="text"
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 rounded-md"
                  placeholder="e.g., tutorial, dp, greedy"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Content (Markdown supported, including LaTeX, code blocks, and Codeforces-style spoilers)
                </label>
                {!showPreview ? (
                  <textarea
                    id="content"
                    rows={12}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 rounded-md font-mono"
                    placeholder="Write your blog content here using Markdown syntax...&#10;&#10;For example:&#10;**bold text**&#10;[link](https://example.com)&#10;```cpp&#10;// code block&#10;```&#10;$a + b = c$ for inline math&#10;$$E = mc^2$$ for display math&#10;&lt;spoiler summary=&quot;Spoiler Title&quot;&gt;Hidden content&lt;/spoiler&gt;"
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
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/blog')}
                  className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors duration-300"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={togglePreview}
                  className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors duration-300"
                >
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-sm bg-blue-800 text-white rounded hover:bg-blue-900 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Publishing...
                    </>
                  ) : 'Post'}
                </button>
              </div>
            </form>
          </div>
        
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBlog;