import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  BookOpen, 
  ChevronLeft, 
  Loader2, 
  AlertCircle,
  Hash,
  Lock,
  ExternalLink
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

const ContestEditorial = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editorialData, setEditorialData] = useState(null);
  const [problemTutorials, setProblemTutorials] = useState({});
  const [expandedProblems, setExpandedProblems] = useState({});
  
  const TOKEN = localStorage.getItem('token');

  const customComponents = {
    h1: ({ children }) => (
      <h1 className="text-lg font-bold mt-4 mb-3 text-gray-900 border-b border-gray-200 pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-bold mt-3 mb-2 text-gray-800">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-semibold mt-2 mb-1.5 text-gray-700">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="my-2 text-gray-700 leading-relaxed text-xs">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="my-2 ml-4 list-disc space-y-1 text-gray-700 text-xs">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 ml-4 list-decimal space-y-1 text-gray-700 text-xs">
        {children}
      </ol>
    ),
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="my-2 rounded overflow-hidden">
          <div className="bg-gray-800 text-gray-300 text-[10px] px-2 py-1 font-mono">
            {match[1]}
          </div>
          <pre className="bg-gray-900 text-gray-100 p-2 overflow-x-auto text-xs">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      ) : (
        <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[11px] font-mono">
          {children}
        </code>
      );
    },
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-blue-400 pl-2 py-1 my-2 bg-blue-50 italic text-gray-700 text-xs">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300 text-xs">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="px-2 py-1.5 bg-gray-100 text-left font-semibold text-gray-700">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-2 py-1.5 text-gray-700 border-t border-gray-200">
        {children}
      </td>
    ),
    a: ({ href, children }) => (
      <a href={href} className="text-blue-600 hover:text-blue-800 hover:underline text-xs">
        {children}
      </a>
    ),
  };

  const getHeaders = () => ({
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  });

  // Fetch editorial data
  useEffect(() => {
    const fetchEditorialData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const editorialRes = await axios.get(
          `http://localhost:8000/contests/${contestId}/editorial/`,
          { headers: getHeaders() }
        );
        
        setEditorialData(editorialRes.data);
        
        // Fetch tutorials for each problem
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
              tutorials[problem.index] = null;
            }
          });
        
        await Promise.all(problemPromises);
        setProblemTutorials(tutorials);
        
        // Auto-expand first problem
        if (editorialRes.data.problems.length > 0) {
          setExpandedProblems({ [editorialRes.data.problems[0].index]: true });
        }
        
      } catch (err) {
        if (err.response?.status === 403) {
          setError('You do not have access to the editorial yet');
        } else if (err.response?.status === 404) {
          setError('Contest not found');
        } else if (err.message.includes('Network Error')) {
          setError('Cannot connect to server');
        } else {
          setError(err.response?.data?.error || err.message || 'Failed to load editorial');
        }
      } finally {
        setLoading(false);
      }
    };

    if (contestId) {
      fetchEditorialData();
    }
  }, [contestId]);

  const toggleProblem = (problemIndex) => {
    setExpandedProblems(prev => ({
      ...prev,
      [problemIndex]: !prev[problemIndex]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
        <p className="text-gray-600 text-xs">Loading editorial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 max-w-sm w-full">
          <div className="flex items-center justify-center gap-2 mb-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1 text-center">Editorial Error</h3>
          <p className="text-gray-600 text-xs mb-3 text-center">{error}</p>
          <div className="space-y-1.5">
            <button
              onClick={() => navigate(`/contests/${contestId}`)}
              className="w-full bg-blue-800 text-white py-1.5 rounded text-xs font-medium hover:bg-blue-900 transition-colors"
            >
              Back to Contest
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full border border-gray-300 text-gray-700 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!editorialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <BookOpen className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-xs">No editorial data available</p>
        </div>
      </div>
    );
  }

  const { contest_title, problems, tutorials_available } = editorialData;
  const hasTutorials = tutorials_available > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <h1 className="text-sm font-bold">Editorial</h1>
              <span className="text-xs bg-blue-800 text-blue-100 px-1.5 py-0.5 rounded">
                CONTEST
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 py-3">
        {/* Problems List */}
        {problems.length > 0 ? (
          <div className="space-y-2">
            {problems.map((problem) => {
              const hasTutorial = problem.has_tutorial;
              const tutorialContent = problemTutorials[problem.index];
              const isExpanded = expandedProblems[problem.index];
              
              return (
                <div key={problem.index} className="bg-white rounded-lg border border-gray-200">
                  {/* Problem Header */}
                  <button
                    onClick={() => toggleProblem(problem.index)}
                    className="w-full p-2 text-left flex items-center justify-between hover:bg-gray-50 rounded-t-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="w-3 h-3 text-blue-600" />
                      <span className="font-bold text-blue-700">{problem.index}.</span>
                      <span className="font-medium text-gray-900 text-xs truncate max-w-[120px]">
                        {problem.title}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        problem.difficulty?.toLowerCase() === 'easy' 
                          ? 'bg-green-100 text-green-800' 
                          : problem.difficulty?.toLowerCase() === 'hard'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {problem.difficulty?.charAt(0) || 'M'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasTutorial ? (
                        <BookOpen className="w-3 h-3 text-green-600" />
                      ) : (
                        <Lock className="w-3 h-3 text-gray-400" />
                      )}
                      <ChevronLeft className={`w-3 h-3 text-gray-500 transition-transform ${
                        isExpanded ? '-rotate-90' : ''
                      }`} />
                    </div>
                  </button>
                  
                  {/* Tutorial Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-2">
                      {hasTutorial ? (
                        <div>
                          {tutorialContent ? (
                            <div className="prose max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                components={customComponents}
                                className="text-xs"
                              >
                                {tutorialContent}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-2">
                              <Loader2 className="w-3 h-3 animate-spin text-gray-400 mr-1" />
                              <span className="text-gray-500 text-xs">Loading tutorial...</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <BookOpen className="w-4 h-4 text-gray-300 mx-auto mb-1" />
                          <p className="text-gray-500 text-xs">No tutorial available</p>
                        </div>
                      )}
                      
                      {/* Tags */}
                      {problem.tags && problem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100">
                          {problem.tags.map((tag, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <BookOpen className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600 text-xs">No problems in this contest</p>
          </div>
        )}
        
        {/* Stats */}
        {problems.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            {hasTutorials ? (
              <span>{tutorials_available} of {problems.length} problems have tutorials</span>
            ) : (
              <span>No tutorials available</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestEditorial;