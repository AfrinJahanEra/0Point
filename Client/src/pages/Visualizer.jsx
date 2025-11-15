import React from 'react';
import { Link } from 'react-router-dom';

const Visualizer = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <span className="mr-2">←</span> Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Algorithm Visualizer</h1>
          <p className="text-gray-600 mt-2">Visualize algorithms and data structures in action</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Algorithm Visualizer Coming Soon</h2>
          <p className="text-gray-600 mb-6">
            We're building an interactive visualization tool to help you understand algorithms and data structures.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              to="/practice" 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300"
            >
              Practice Problems
            </Link>
            <Link 
              to="/" 
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-300"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;