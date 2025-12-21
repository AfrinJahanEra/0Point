import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Video, Trash2, Square } from 'lucide-react';

const CodeEditorPanel = ({ 
  code,
  setCode,
  language,
  setLanguage,
  isRunning,
  setIsRunning,
  output,
  setOutput,
  cursorPosition,
  collaboratorCursors,
  codeVersion,
  isVideoOpen,
  setIsVideoOpen,
  onRunCode,
  onEditorDidMount,
  onEditorChange,
  onLanguageChange
}) => {
  const getDefaultCode = (lang) => {
    const templates = {
      python: `# Python code here
def solution():
    print("Hello from Python!")
    return 0

if __name__ == "__main__":
    solution()`,
      javascript: `// JavaScript code here
function solution() {
    console.log("Hello from JavaScript!");
    return 0;
}

solution();`,
      java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    return 0;
}`,
      c: `#include <stdio.h>

int main() {
    printf("Hello from C!\\n");
    return 0;
}`
    };
    return templates[lang] || '// Write your code here...';
  };

  const handleLanguageChange = (newLanguage) => {
    const oldDefault = getDefaultCode(language);
    // Only reset to template if current code matches default (fresh start)
    if (code.trim() === oldDefault.trim() || codeVersion === 0) {
      const newDefault = getDefaultCode(newLanguage);
      setCode(newDefault);
      onEditorChange(newDefault);
    }

    setLanguage(newLanguage);
    onLanguageChange(newLanguage);
  };

  const handleStopExecution = () => {
    setIsRunning(false);
    // Clear the timeout if user stops execution
    if (window.currentExecutionTimeout) {
      clearTimeout(window.currentExecutionTimeout);
      window.currentExecutionTimeout = null;
    }
    setOutput(prev => prev + '\n\n> Execution terminated by user.');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-semibold text-gray-800">Collaborative Code Editor</h2>
          <span className="text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium">
            Live • Version {codeVersion}
          </span>
          {!isVideoOpen && (
            <button 
              onClick={() => setIsVideoOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
            >
              <Video className="w-4 h-4" />
              Show Video Panel
            </button>
          )}
        </div>

        <div className="flex items-center gap-6">
          <select 
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
          </select>

          <div className="text-sm text-gray-600 font-medium">
            Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
          </div>

          {/* Run / Stop Buttons */}
          <div className="flex items-center gap-3">
            {isRunning && (
              <button
                onClick={handleStopExecution}
                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition shadow-md"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            )}

            <button
              onClick={onRunCode}
              disabled={isRunning}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-md ${
                isRunning
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative bg-gray-900">
        <Editor
          key={language}  // Forces full reload on language change → fixes syntax highlighting
          height="100%"
          language={language}
          value={code}
          onChange={onEditorChange}
          onMount={onEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 15,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            wordWrap: 'on',
            renderWhitespace: 'selection',
          }}
        />

        {/* Collaborator Cursors */}
        {Object.values(collaboratorCursors).map((cursor, idx) => (
          <div 
            key={idx}
            className="absolute w-0.5 h-5 bg-orange-400 animate-pulse pointer-events-none z-50"
            style={{
              top: `${(cursor.lineNumber - 1) * 21}px`,
              left: `${(cursor.column - 1) * 9}px`,
            }}
          >
            <div className="absolute -top-7 left-0 bg-orange-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
              {cursor.username}
            </div>
          </div>
        ))}

        {/* Status Badge */}
        <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          {Object.keys(collaboratorCursors).length + 1} online
        </div>
      </div>

      {/* Output Console */}
      <div className="h-80 bg-black border-t border-gray-700 flex flex-col">
        <div className="px-5 py-3 border-b border-gray-700 flex justify-between items-center bg-gray-900">
          <h3 className="text-sm font-medium text-gray-300">Output Console</h3>
          <button 
            onClick={() => setOutput('')}
            className="text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded border border-gray-600 hover:bg-gray-800 transition flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
        <pre className="flex-1 p-5 text-green-400 font-mono text-sm overflow-auto whitespace-pre-wrap">
          {output || <span className="text-gray-600">$ Ready to run {language} code...</span>}
        </pre>
      </div>
    </div>
  );
};

export default CodeEditorPanel;