import React, { useState } from 'react';

const MarkdownSyntaxPopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  const syntaxExamples = [
    {
      category: 'Text Formatting',
      examples: [
        { syntax: '**bold text**', result: 'bold text' },
        { syntax: '*italic text*', result: 'italic text' },
        { syntax: '# Heading 1', result: 'Heading 1' },
        { syntax: '## Heading 2', result: 'Heading 2' },
        { syntax: '### Heading 3', result: 'Heading 3' },
      ]
    },
    {
      category: 'Lists',
      examples: [
        { syntax: '- Item 1\n- Item 2', result: '• Item 1\n• Item 2' },
        { syntax: '1. First\n2. Second', result: '1. First\n2. Second' },
      ]
    },
    {
      category: 'Links & Images',
      examples: [
        { syntax: '[link text](https://example.com)', result: 'link text' },
        { syntax: '![alt text](image.jpg)', result: 'Image with alt text' },
      ]
    },
    {
      category: 'Code',
      examples: [
        { syntax: '`inline code`', result: 'inline code' },
        { syntax: '```cpp\n// code block\ncout << "Hello";\n```', result: 'Code block with syntax highlighting' },
      ]
    },
    {
      category: 'Math',
      examples: [
        { syntax: '$E = mc^2$', result: 'Inline LaTeX math' },
        { syntax: '$$\n\\int_a^b f(x) dx\n$$', result: 'Display math block' },
      ]
    },
    {
      category: 'Codeforces-style Tags',
      examples: [
        { 
          syntax: '[user:username]', 
          example: '[user:tourist]',
          result: 'Links to user profile' 
        },
        { 
          syntax: '[submission:contests/contest_id/submissions]', 
          example: '[submission:contests/694619cc17471397ca246fd7/submissions]',
          result: 'Links to contest submissions' 
        },
        { 
          syntax: '[problem:contests/contest_id/problems/problem_index]', 
          example: '[problem:contests/694619cc17471397ca246fd7/problems/A]',
          result: 'Links to specific contest problem' 
        },
        { 
          syntax: '[contest:contest_id]', 
          example: '[contest:694619cc17471397ca246fd7]',
          result: 'Links to contest page' 
        },
        { 
          syntax: '[standings:contest_id]', 
          example: '[standings:694619cc17471397ca246fd7]',
          result: 'Links to contest standings' 
        },
        { 
          syntax: '<spoiler summary="Title">content</spoiler>', 
          example: '<spoiler summary="Solution">Hidden content</spoiler>',
          result: 'Creates collapsible spoiler section' 
        },
      ]
    }
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
      >
        Markdown Syntax
        <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Blur backdrop - covers the entire page */}
          <div 
            className="absolute inset-0 backdrop-blur-sm bg-black/20 transition-all duration-200"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal content */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold text-gray-900">Markdown Syntax Guide</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {syntaxExamples.map((category, catIndex) => (
                    <div key={catIndex} className="bg-gray-50/50 rounded-xl p-5 border border-gray-200">
                      <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-3">
                        {category.category}
                      </h3>
                      <div className="space-y-4">
                        {category.examples.map((example, exIndex) => (
                          <div key={exIndex} className="bg-white rounded-lg border border-gray-300 p-4 hover:border-blue-300 transition-colors">
                            <div className="mb-3">
                              <span className="text-sm font-medium text-gray-600 block mb-1">Syntax:</span>
                              <pre className="mt-1 bg-gray-100 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap break-all overflow-x-auto scrollbar-thin">
                                {example.syntax}
                              </pre>
                            </div>
                            {example.example && (
                              <div className="mb-3">
                                <span className="text-sm font-medium text-gray-600 block mb-1">Example:</span>
                                <pre className="mt-1 bg-blue-50 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap break-all overflow-x-auto scrollbar-thin border border-blue-100">
                                  {example.example}
                                </pre>
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-medium text-gray-600 block mb-1">Result:</span>
                              <div className="mt-1 text-gray-800 pl-2">
                                {example.result}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                  <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Tips & Usage
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-blue-700">
                    <li className="flex items-start gap-2">
                      <div className="bg-blue-100 p-1 rounded mt-0.5">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Press <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-bold">Tab</code> to indent code blocks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-blue-100 p-1 rounded mt-0.5">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Use <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-bold">Shift+Enter</code> for soft line breaks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-blue-100 p-1 rounded mt-0.5">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Preview mode shows how your content will appear</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-blue-100 p-1 rounded mt-0.5">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Codeforces tags appear as clickable links in published blog</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t p-5 flex justify-end sticky bottom-0 bg-white">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
};

export default MarkdownSyntaxPopup;