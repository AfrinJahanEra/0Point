import React, { useState } from 'react';
import { BACKEND_URL } from '../utils/api';

const Interview = () => {
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [links, setLinks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!interviewerEmail || !candidateEmail) {
      setError('Please enter both email addresses');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${BACKEND_URL}/mock-interview/create-session/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewer_email: interviewerEmail,
          candidate_email: candidateEmail
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setLinks(data);
        if (!data.email_sent) {
          setError('Session created but email notifications could not be sent. Please share the links manually.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to create session: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Create Interview Room</h1>
      <input
        type="email"
        placeholder="Interviewer Email"
        value={interviewerEmail}
        onChange={(e) => setInterviewerEmail(e.target.value)}
        style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%' }}
        disabled={loading}
      />
      <input
        type="email"
        placeholder="Candidate Email"
        value={candidateEmail}
        onChange={(e) => setCandidateEmail(e.target.value)}
        style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%' }}
        disabled={loading}
      />
      <button 
        onClick={handleCreate} 
        style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create Room'}
      </button>
      
      {error && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      
      {links && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
          <p style={{ fontWeight: 'bold', color: '#2e7d32' }}>Session Created Successfully!</p>
          <p><strong>Interviewer Link:</strong><br/>
            <a href={links.interviewer_link} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
              {links.interviewer_link}
            </a>
          </p>
          <p><strong>Candidate Link:</strong><br/>
            <a href={links.candidate_link} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
              {links.candidate_link}
            </a>
          </p>
          {!links.email_sent && (
            <p style={{ color: '#f57c00', fontSize: '12px' }}>Note: Email notifications were not sent. Please share links manually.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Interview;