import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const ReportBlogModal = ({ isOpen, onClose, blogId, blogTitle }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for reporting');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/report/create/', {
        blog_id: blogId,
        reason: reason.trim()
      });
      
      toast.success('Blog reported successfully');
      setReason('');
      onClose();
    } catch (error) {
      console.error('Error reporting blog:', error);
      const errorMessage = error.response?.data?.error || 'Failed to report blog';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Report Blog</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              You are reporting: <span className="font-medium text-gray-900">{blogTitle}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reporting
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="4"
                placeholder="Please explain why you are reporting this blog..."
                maxLength={500}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                {reason.length}/500 characters
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Reporting...' : 'Report Blog'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportBlogModal;
