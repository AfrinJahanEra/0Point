import React, { useState } from 'react';
import { BACKEND_URL } from '../utils/api';

const Interview = () => {
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [links, setLinks] = useState(null);

  const handleCreate = async () => {
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
      } else {
        console.error('Error:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Create Interview Room</h1>
      <input
        type="email"
        placeholder="Interviewer Email"
        value={interviewerEmail}
        onChange={(e) => setInterviewerEmail(e.target.value)}
        style={{ display: 'block', margin: '10px 0' }}
      />
      <input
        type="email"
        placeholder="Candidate Email"
        value={candidateEmail}
        onChange={(e) => setCandidateEmail(e.target.value)}
        style={{ display: 'block', margin: '10px 0' }}
      />
      <button onClick={handleCreate} style={{ padding: '10px 20px' }}>Create Room and Send Invitations</button>
      {links && (
        <div style={{ marginTop: '20px' }}>
          <p>Interviewer Link: <a href={links.interviewer_link}>{links.interviewer_link}</a></p>
          <p>Candidate Link: <a href={links.candidate_link}>{links.candidate_link}</a></p>
        </div>
      )}
    </div>
  );
};

export default Interview;