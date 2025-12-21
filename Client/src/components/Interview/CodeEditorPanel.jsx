// CodeEditorPanel.jsx - UPDATED for enhanced real-time features
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Video, Trash2, Square, Users, Zap, GitBranch, Cpu, Clock } from 'lucide-react';

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
  collaboratorSelections,
  codeVersion,
  isVideoOpen,
  setIsVideoOpen,
  onlineUsers,
  onRunCode,
  onEditorDidMount,
  onEditorChange,
  onLanguageChange
}) => {
  const [showCollaborators, setShowCollaborators] = useState(true);
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(15);
  
  const getDefaultCode = (lang) => {
    const templates = {
      python: `# Python code here
def fibonacci(n):
    """Return the nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def main():
    print("Fibonacci sequence:")
    for i in range(10):
        print(f"fib({i}) = {fibonacci(i)}")

if __name__ == "__main__":
    main()`,
      javascript: `// JavaScript code here
function fibonacci(n) {
    // Return the nth Fibonacci number
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

function main() {
    console.log("Fibonacci sequence:");
    for (let i = 0; i < 10; i++) {
        console.log(\`fib(\${i}) = \${fibonacci(i)}\`);
    }
}

main();`,
      java: `// Java code here
public class Main {
    public static int fibonacci(int n) {
        // Return the nth Fibonacci number
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
    
    public static void main(String[] args) {
        System.out.println("Fibonacci sequence:");
        for (int i = 0; i < 10; i++) {
            System.out.println("fib(" + i + ") = " + fibonacci(i));
        }
    }
}`,
      cpp: `// C++ code here
#include <iostream>
using namespace std;

int fibonacci(int n) {
    // Return the nth Fibonacci number
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    cout << "Fibonacci sequence:" << endl;
    for (int i = 0; i < 10; i++) {
        cout << "fib(" << i << ") = " << fibonacci(i) << endl;
    }
    return 0;
}`,
      c: `// C code here
#include <stdio.h>

int fibonacci(int n) {
    /* Return the nth Fibonacci number */
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    printf("Fibonacci sequence:\\n");
    for (int i = 0; i < 10; i++) {
        printf("fib(%d) = %d\\n", i, fibonacci(i));
    }
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

  const handleIncreaseFont = () => {
    setFontSize(prev => Math.min(prev + 1, 24));
  };

  const handleDecreaseFont = () => {
    setFontSize(prev => Math.max(prev - 1, 12));
  };

  const handleToggleTheme = () => {
    setEditorTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark');
  };

  const getCollaboratorColor = (userId) => {
    // Generate consistent color based on user ID
    const colors = [
      '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2',
      '#EF476F', '#7209B7', '#F72585', '#3A86FF', '#FB5607'
    ];
    const index = parseInt(userId, 36) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-semibold text-gray-800">Collaborative Code Editor</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Live • v{codeVersion}
            </span>
            <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
              <Users className="w-3 h-3" />
              {onlineUsers.length} online
            </span>
          </div>
          {!isVideoOpen && (
            <button 
              onClick={() => setIsVideoOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
            >
              <Video className="w-4 h-4" />
              Show Participants
            </button>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Language:</span>
            <select 
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript (Node.js)</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          </div>

          {/* Editor Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDecreaseFont}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Decrease font size"
            >
              A-
            </button>
            <span className="text-sm text-gray-600">{fontSize}px</span>
            <button
              onClick={handleIncreaseFont}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Increase font size"
            >
              A+
            </button>
            <button
              onClick={handleToggleTheme}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Toggle theme"
            >
              {editorTheme === 'vs-dark' ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Cursor Position */}
          <div className="text-sm text-gray-600 font-medium">
            <Clock className="w-4 h-4 inline mr-1" />
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
                Stop Execution
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

      {/* Editor Container */}
      <div className="flex-1 relative">
        <div className="absolute top-0 left-0 right-0 bottom-0">
          <Editor
            key={`${language}-${editorTheme}`}
            height="100%"
            language={language}
            value={code}
            onChange={onEditorChange}
            onMount={onEditorDidMount}
            theme={editorTheme}
            options={{
              minimap: { enabled: true },
              fontSize: fontSize,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              wordWrap: 'on',
              renderWhitespace: 'selection',
              renderLineHighlight: 'all',
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: false
              },
              lineNumbersMinChars: 3,
              folding: true,
              lineDecorationsWidth: 0,
              overviewRulerBorder: false,
              tabSize: 2,
              insertSpaces: true
            }}
          />

          {/* Collaborator Cursors */}
          {showCollaborators && Object.values(collaboratorCursors).map((cursor, idx) => (
            <div 
              key={idx}
              className="absolute pointer-events-none z-50"
              style={{
                top: `${(cursor.lineNumber - 1) * 21}px`,
                left: `${(cursor.column - 1) * 9}px`,
              }}
            >
              <div className="relative">
                <div 
                  className="w-0.5 h-5 animate-pulse"
                  style={{ backgroundColor: getCollaboratorColor(Object.keys(collaboratorCursors)[idx]) }}
                />
                <div 
                  className="absolute -top-7 left-0 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
                  style={{ 
                    backgroundColor: getCollaboratorColor(Object.keys(collaboratorCursors)[idx]),
                    color: 'white'
                  }}
                >
                  {cursor.username}
                </div>
              </div>
            </div>
          ))}

          {/* Collaborator Selections */}
          {showCollaborators && Object.values(collaboratorSelections).map((selection, idx) => {
            const color = getCollaboratorColor(Object.keys(collaboratorSelections)[idx]);
            return (
              <div
                key={idx}
                className="absolute pointer-events-none z-40 opacity-30"
                style={{
                  top: `${(selection.selection.startLineNumber - 1) * 21}px`,
                  left: `${(selection.selection.startColumn - 1) * 9}px`,
                  width: `${Math.max(1, (selection.selection.endColumn - selection.selection.startColumn) * 9)}px`,
                  height: `${Math.max(1, (selection.selection.endLineNumber - selection.selection.startLineNumber + 1) * 21)}px`,
                  backgroundColor: color,
                  border: `1px solid ${color}`,
                }}
              />
            );
          })}
        </div>

        {/* Status Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-900 text-gray-300 text-xs px-4 py-2 flex justify-between items-center border-t border-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GitBranch className="w-3 h-3" />
              <span>Version {codeVersion}</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-3 h-3" />
              <span>{language.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{Object.keys(collaboratorCursors).length + 1} active</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCollaborators(!showCollaborators)}
              className={`px-2 py-1 rounded text-xs ${showCollaborators ? 'bg-gray-700' : 'bg-gray-800'}`}
            >
              {showCollaborators ? 'Hide Cursors' : 'Show Cursors'}
            </button>
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          </div>
        </div>
      </div>

      {/* Output Console */}
      <div className="h-80 bg-black border-t border-gray-700 flex flex-col">
        <div className="px-5 py-3 border-b border-gray-700 flex justify-between items-center bg-gray-900">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Play className="w-4 h-4" />
            Output Console
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setOutput('')}
              className="text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded border border-gray-600 hover:bg-gray-800 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>
        <pre className="flex-1 p-5 text-green-400 font-mono text-sm overflow-auto whitespace-pre-wrap">
          {output || (
            <div className="text-gray-600">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Ready to execute {language.toUpperCase()} code</span>
                </div>
                <div className="text-xs text-gray-500 ml-4">
                  • Press <kbd className="px-2 py-1 bg-gray-800 rounded">Run Code</kbd> or <kbd className="px-2 py-1 bg-gray-800 rounded">Ctrl+Enter</kbd><br/>
                  • Code will be executed on the server<br/>
                  • Output appears here in real-time<br/>
                  • All participants see the same output
                </div>
              </div>
              {Object.keys(collaboratorCursors).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <div className="text-gray-500 text-xs mb-2">Active collaborators:</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(collaboratorCursors).map((cursor, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800"
                        style={{ borderLeft: `3px solid ${getCollaboratorColor(Object.keys(collaboratorCursors)[idx])}` }}
                      >
                        <div className="w-2 h-2 rounded-full animate-pulse" 
                             style={{ backgroundColor: getCollaboratorColor(Object.keys(collaboratorCursors)[idx]) }} />
                        <span className="text-xs">{cursor.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </pre>
      </div>
    </div>
  );
};

export default CodeEditorPanel;