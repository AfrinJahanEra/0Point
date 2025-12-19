// ContestEditorial.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  BookOpen, ChevronLeft, Loader2, AlertCircle,
  Calendar, User
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

const ContestEditorial = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editorialData, setEditorialData] = useState(null);
  const [problemTutorials, setProblemTutorials] = useState({}); // Store tutorials by problem index
  
  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY";


  const customComponents = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 text-blue-900 border-b border-blue-200 pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-700">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-3 text-gray-700 leading-relaxed">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 ml-6 list-disc space-y-2 text-gray-700">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 ml-6 list-decimal space-y-2 text-gray-700">
      {children}
    </ol>
  ),
  code: ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <div className="my-4 rounded-md overflow-hidden">
        <div className="bg-gray-800 text-gray-300 text-xs px-4 py-2 font-mono">
          {match[1]}
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    ) : (
      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-400 pl-4 py-2 my-4 bg-blue-50 italic text-gray-700">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
        {children}
      </table>
    </div>
  ),
  tr: ({ children }) => (
    <tr className="divide-x divide-gray-200">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 bg-gray-100 text-left text-sm font-semibold text-gray-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-200">
      {children}
    </td>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 hover:text-blue-800 hover:underline">
      {children}
    </a>
  ),
  spoiler: ({ children, summary }) => (
    <details className="my-4 bg-gray-50 border border-gray-300 rounded-lg">
      <summary className="cursor-pointer px-4 py-3 font-medium text-gray-700 hover:bg-gray-100">
        {summary || 'Solution / Spoiler'}
      </summary>
      <div className="px-4 py-3 border-t border-gray-300 bg-white">
        {children}
      </div>
    </details>
  )
};

  const getHeaders = () => ({
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  });

  // Fetch editorial data and tutorials
  const fetchEditorialData = async () => {
    console.log('🚀 Fetching editorial for contest:', contestId);
    setLoading(true);
    setError(null);
    
    try {
      // 1. Get editorial overview
      const editorialRes = await axios.get(
        `http://localhost:8000/contests/${contestId}/editorial/`,
        { headers: getHeaders() }
      );
      
      console.log('✅ Editorial overview:', editorialRes.data);
      setEditorialData(editorialRes.data);
      
      // 2. Fetch tutorials for each problem that has one
      const tutorials = {};
      const problemPromises = editorialRes.data.problems
        .filter(problem => problem.has_tutorial)
        .map(async (problem) => {
          try {
            const tutorialRes = await axios.get(
              `http://localhost:8000/contests/${contestId}/problems/${problem.index}/tutorial/`,
              { headers: getHeaders() }
            );
            
            if (tutorialRes.data.tutorial) {
              tutorials[problem.index] = tutorialRes.data.tutorial;
            }
          } catch (tutorialErr) {
            console.error(`❌ Error fetching tutorial for problem ${problem.index}:`, tutorialErr);
            tutorials[problem.index] = null;
          }
        });
      
      // Wait for all tutorial fetches to complete
      await Promise.all(problemPromises);
      setProblemTutorials(tutorials);
      
      setLoading(false);
      
    } catch (err) {
      console.error('❌ Error fetching editorial:', err);
      
      if (err.response?.status === 403) {
        setError('You do not have access to the editorial yet');
      } else if (err.response?.status === 404) {
        setError('Contest not found');
      } else if (err.message.includes('Network Error')) {
        setError('Cannot connect to server');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load editorial');
      }
      
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contestId) {
      fetchEditorialData();
    }
  }, [contestId]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-gray-600">Loading editorial...</p>
        <p className="text-gray-500 text-sm mt-1">Fetching tutorials...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-md w-full">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Unable to Load Editorial</h3>
          <p className="text-gray-600 mb-4 text-center">{error}</p>

        </div>
      </div>
    );
  }

  if (!editorialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No editorial data available</p>
        </div>
      </div>
    );
  }

  const { contest_title, problems, tutorials_available, created_at, created_by } = editorialData;
  const hasTutorials = tutorials_available > 0;

  return (
    <div className="min-h-screen bg-gray-50">


      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Problems with Tutorials */}
        {problems.length > 0 ? (
          <div className="space-y-8">
            {problems.map((problem) => {
              const hasTutorial = problem.has_tutorial;
              const tutorialContent = problemTutorials[problem.index];
              
              return (
                <div key={problem.index} className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-blue-700">{problem.index}.</span>
                      <h2 className="text-xl font-bold text-gray-900">{problem.title}</h2>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        problem.difficulty?.toLowerCase() === 'easy' 
                          ? 'bg-green-100 text-green-800' 
                          : problem.difficulty?.toLowerCase() === 'hard'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {problem.difficulty || 'Medium'}
                      </span>
                    </div>
                    
                    {/* Tags */}
                    {problem.tags && problem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {problem.tags.map((tag, i) => (
                          <span key={i} className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Tutorial Content */}
                  <div className="p-6">
                    {hasTutorial ? (
                      <div>
                        <div className="flex items-center gap-2 mb-4 text-green-600">
                          <BookOpen className="w-5 h-5" />
                          <span className="font-medium">Tutorial</span>
                        </div>
                        {tutorialContent ? (
  <div className="prose max-w-none">
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
      components={customComponents}
    >
      {tutorialContent}
    </ReactMarkdown>
  </div>
) : (
  <div className="text-gray-500 italic">
    Tutorial content is loading...
  </div>
)}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No tutorial available for this problem yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Problems</h3>
            <p className="text-gray-500">
              This contest doesn't have any problems yet.
            </p>
          </div>
        )}
        
        {/* Empty state if no tutorials at all */}
        {problems.length > 0 && !hasTutorials && (
          <div className="mt-8 bg-yellow-50 rounded-xl border border-yellow-200 p-6 text-center">
            <BookOpen className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tutorials Available</h3>
            <p className="text-gray-600">
              This contest doesn't have any tutorials written yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestEditorial;