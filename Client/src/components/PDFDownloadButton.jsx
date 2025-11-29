import React from 'react';

const PDFDownloadButton = ({ onClick, label = "Download PDF" }) => {
  return (
    <button 
      onClick={onClick}
      className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
    >
      {label}
    </button>
  );
};

export default PDFDownloadButton;