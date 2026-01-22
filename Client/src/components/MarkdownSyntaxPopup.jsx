import React, { useState } from 'react';

const MarkdownSyntaxPopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  const syntaxExamples = [
    {
      category: 'Text Formatting',
      examples: [
        { syntax: '**bold text**', result: 'bold text' },
        { syntax: '*italic text*', result: 'italic text' },
        { syntax: '~~strikethrough~~', result: 'strikethrough' },
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
        { syntax: '[user:username]', result: 'Links to user profile' },
        { syntax: '[submission:contests/contest_id/submissions]', result: 'Links to contest submissions' },
        { syntax: '[problem:contests/contest_id/problems/problem_index]', result: 'Links to specific contest problem' },
        { syntax: '[contest:contest_id]', result: 'Links to contest page' },
        { syntax: '[standings:contest_id]', result: 'Links to contest standings' },
        { syntax: '<spoiler summary="Title">content</spoiler>', result: 'Creates collapsible spoiler section' },
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Markdown Syntax Guide</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {syntaxExamples.map((category, catIndex) => (
                  <div key={catIndex} className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-3 text-gray-800 border-b pb-2">
                      {category.category}
                    </h3>
                    <div className="space-y-3">
                      {category.examples.map((example, exIndex) => (
                        <div key={exIndex} className="bg-white rounded border p-3">
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-600">Syntax:</span>
                            <pre className="mt-1 bg-gray-100 p-2 rounded text-sm font-mono whitespace-pre-wrap break-all">
                              {example.syntax}
                            </pre>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600">Result:</span>
                            <div className="mt-1 text-gray-800">
                              {example.result}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-2">Tips:</h4>
                <ul className="list-disc pl-5 space-y-1 text-blue-700">
                  <li>Press <code className="bg-blue-100 px-1 rounded">Tab</code> to indent code blocks</li>
                  <li>Use <code className="bg-blue-100 px-1 rounded">Shift+Enter</code> for soft line breaks</li>
                  <li>Preview mode shows how your content will appear</li>
                  <li>Codeforces tags will appear as clickable links in the published blog</li>
                </ul>
              </div>
            </div>

            <div className="border-t p-4 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MarkdownSyntaxPopup;