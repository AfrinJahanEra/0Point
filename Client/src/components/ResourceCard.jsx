import React from 'react';

const ResourceCard = ({ resource }) => {
  return (
    <div className="bg-white rounded-lg p-6 text-center shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:-translate-y-2">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-900 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-4">
        <i className={`fas fa-${resource.icon}`}></i>
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{resource.title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{resource.description}</p>
    </div>
  );
};

export default ResourceCard;