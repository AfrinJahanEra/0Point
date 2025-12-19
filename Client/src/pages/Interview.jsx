import React, { useState } from 'react';

const Interview = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Interview Sessions</h1>
      <p className="text-gray-600 mb-8">Manage your interview sessions and create new ones.</p>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Upcoming Interviews</h2>
        <p className="text-gray-500">No upcoming interviews scheduled.</p>
      </div>
    </div>
  );
};

export default Interview;