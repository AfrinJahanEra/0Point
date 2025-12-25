// src/pages/InterviewSession.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const InterviewSession = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');
  const email = searchParams.get('email') ||
    (role === 'interviewer' ? 'interviewer@example.com' : 'candidate@example.com');

  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pc = useRef(null);
  const ws = useRef(null);
  const streamRef = useRef(null);

  // Media state
  const [localAudioActive, setLocalAudioActive] = useState(false);
  const [localVideoActive, setLocalVideoActive] = useState(false);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);

  // PDF state
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfUploader, setPdfUploader] = useState('');

  // UI state
  const [participants, setParticipants] = useState([]);
  const [permissionState, setPermissionState] = useState({ audio: 'prompt', video: 'prompt' });
  const [error, setError] = useState('');

  const myRoleLabel = role === 'interviewer' ? 'Interviewer' : 'Candidate';
  const remoteRoleLabel = role === 'interviewer' ? 'Candidate' : 'Interviewer';

  // 🔍 Check permissions
  const checkPermissions = useCallback(async () => {
    try {
      const audioStatus = await navigator.permissions.query({ name: 'microphone' });
      const videoStatus = await navigator.permissions.query({ name: 'camera' });
      setPermissionState({
        audio: audioStatus.state,
        video: videoStatus.state
      });
    } catch (err) {
      console.warn('Permission API not supported');
    }
  }, []);

  // 📤 Upload PDF
  const handlePDFUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a PDF file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', email);

    try {
      console.log('📤 Uploading PDF:', file.name, 'size:', file.size);
      const res = await fetch(`/api/pdf/upload/session/${sessionId}/`, {
        method: 'POST',
        body: formData,
      });

      console.log('📥 POST response status:', res.status);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log('✅ PDF upload SUCCESS:', data);

      // Update UI immediately
      setPdfUrl(data.url);
      setPdfUploader(data.uploader_email);

    } catch (err) {
      console.error('❌ PDF upload failed:', err);
      alert(`Failed to upload PDF: ${err.message}`);
    }
  };

  // 📥 Fetch latest PDF
  const fetchLatestPDF = useCallback(async () => {
    try {
      const res = await fetch(`/api/pdf/upload/session/${sessionId}/`);
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType?.includes('application/json')) {
        throw new Error('Invalid API response');
      }
      const data = await res.json();
      if (data.pdf) {
        setPdfUrl(data.pdf.url);
        setPdfUploader(data.pdf.uploader_email);
      }
    } catch (err) {
      console.warn('PDF fetch failed:', err.message);
    }
  }, [sessionId]);

  // 🎯 Initialize session
  useEffect(() => {
    let cleanupScheduled = false;

    const init = async () => {
      await checkPermissions();
      await fetchLatestPDF();

      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cleanupScheduled) return;

        streamRef.current = s;
        setLocalAudioActive(true);
        setLocalVideoActive(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = s;
        }

        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pc.current = peerConnection;

        s.getTracks().forEach(track => peerConnection.addTrack(track, s));

        const websocket = new WebSocket(`ws://localhost:8000/ws/video/${sessionId}/?role=${role}&email=${encodeURIComponent(email)}`);
        ws.current = websocket;

        websocket.onopen = () => {
          console.log(`✅ WebSocket connected as ${role} (${email})`);
          if (role === 'client') {
            peerConnection.createOffer()
              .then(offer => peerConnection.setLocalDescription(offer))
              .then(() => {
                if (websocket.readyState === WebSocket.OPEN) {
                  websocket.send(JSON.stringify({
                    type: 'offer',
                    offer: peerConnection.localDescription
                  }));
                }
              })
              .catch(err => console.error('Offer error:', err));
          }
        };

        websocket.onmessage = async (event) => {
          let data;
          try {
            data = JSON.parse(event.data);
          } catch (e) {
            return;
          }

          // 👉 PDF uploaded
          if (data.type === 'pdf_update') {
            console.log('📥 PDF received:', data.pdf_url);
            setPdfUrl(data.pdf_url);
            setPdfUploader(data.uploader_email);
          }
          // 👉 Media state
          else if (data.type === 'media_update' && data.role !== role) {
            if (data.media_type === 'audio') setRemoteAudioEnabled(data.enabled);
            if (data.media_type === 'video') setRemoteVideoEnabled(data.enabled);
          }
          // 👉 Participant list
          else if (data.type === 'participant_list') {
            setParticipants(data.participants);
          }
          // 👉 Signaling
          else if (data.type === 'offer') {
            try {
              await peerConnection.setRemoteDescription(data.offer);
              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);
              websocket.send(JSON.stringify({ type: 'answer', answer: peerConnection.localDescription }));
            } catch (err) {
              console.error('Offer error:', err);
            }
          } else if (data.type === 'answer') {
            try {
              await peerConnection.setRemoteDescription(data.answer);
            } catch (err) {
              console.error('Answer error:', err);
            }
          } else if (data.type === 'ice_candidate') {
            try {
              if (data.ice_candidate) {
                await peerConnection.addIceCandidate(data.ice_candidate);
              }
            } catch (err) {
              console.error('ICE error:', err);
            }
          }
        };

        peerConnection.onicecandidate = (e) => {
          if (e.candidate && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'ice_candidate', ice_candidate: e.candidate }));
          }
        };

        peerConnection.ontrack = (e) => {
          if (remoteVideoRef.current && e.streams[0]) {
            remoteVideoRef.current.srcObject = e.streams[0];
          }
        };

      } catch (err) {
        console.error('Init error:', err);
        let msg = 'Failed to access camera/microphone.';
        if (err.name === 'NotAllowedError') msg = 'Camera/mic blocked. Click address bar icon to allow.';
        setError(msg);
      }
    };

    init();

    return () => {
      cleanupScheduled = true;
      ws.current?.close();
      pc.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
  }, [sessionId, role, email, checkPermissions, fetchLatestPDF]);

  // 🎯 Toggle CAMERA (hardware level)
  const toggleVideo = async () => {
    const s = streamRef.current;
    if (!s) return;

    const videoTracks = s.getVideoTracks();
    if (videoTracks.length === 0) return;

    const track = videoTracks[0];

    if (track.readyState === 'live') {
      // STOP camera
      track.stop();
      setLocalVideoActive(false);
      if (pc.current) {
        const sender = pc.current.getSenders().find(s => s.track === track);
        if (sender) sender.replaceTrack(null);
      }
    } else {
      // RE-ENABLE camera
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = newStream.getVideoTracks()[0];
        s.addTrack(newTrack);
        if (pc.current) {
          const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(newTrack);
          else pc.current.addTrack(newTrack, s);
        }
        if (localVideoRef.current) {
          const current = localVideoRef.current.srcObject;
          if (current) {
            const newMedia = new MediaStream([
              ...current.getTracks().filter(t => t.kind !== 'video'),
              newTrack
            ]);
            localVideoRef.current.srcObject = newMedia;
            streamRef.current = newMedia;
          }
        }
        setLocalVideoActive(true);
      } catch (err) {
        alert('Could not re-enable camera.');
      }
    }

    // Sync state
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'media_update',
        media_type: 'video',
        enabled: localVideoActive
      }));
    }
  };

  // 🎤 Toggle MIC
  const toggleAudio = () => {
    const s = streamRef.current;
    if (!s) return;

    const audioTracks = s.getAudioTracks();
    if (audioTracks.length === 0) return;

    const track = audioTracks[0];
    const newState = !track.enabled;
    track.enabled = newState;
    setLocalAudioActive(newState);

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'media_update',
        media_type: 'audio',
        enabled: newState
      }));
    }
  };

  const getMediaIcon = (enabled, type) => enabled ? (type === 'audio' ? '🎤' : '🎥') : (type === 'audio' ? '🔇' : '📷');

  // 📄 PDF Viewer (Native iframe)
  const renderPDFViewer = () => {
    // Construct absolute URL for iframe using direct media serving
    const absolutePdfUrl = pdfUrl 
      ? (pdfUrl.startsWith('http') 
          ? pdfUrl 
          : `http://localhost:8000${pdfUrl}#toolbar=1&navpanes=0`)
      : null;

    console.log('PDF URL being used:', absolutePdfUrl); // Debug log

    return (
      <div style={{
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <strong style={{ fontSize: '1.1em' }}>📄 Shared Document</strong>
          {pdfUploader && (
            <span style={{ fontSize: '0.85em', color: '#64748b' }}>
              by {pdfUploader.split('@')[0]}
            </span>
          )}
        </div>

        {role === 'interviewer' && (
          <label style={{
            marginBottom: '12px',
            background: '#3b82f6',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9em',
            width: 'fit-content'
          }}>
            📤 Upload PDF
            <input
              type="file"
              accept=".pdf"
              onChange={handlePDFUpload}
              style={{ display: 'none' }}
            />
          </label>
        )}

        <div style={{
          flex: 1,
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          overflow: 'hidden',
          background: 'white'
        }}>
          {absolutePdfUrl ? (
            <div style={{ width: '100%', height: '100%' }}>
              <embed
                src={absolutePdfUrl}
                type="application/pdf"
                width="100%"
                height="100%"
                style={{ display: 'block' }}
                title="Shared PDF"
              />
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#64748b',
              textAlign: 'center',
              padding: '20px'
            }}>
              <div>
                <p>📄 No PDF shared yet.</p>
                {role === 'interviewer' ? (
                  <p>Upload a PDF to collaborate in real time.</p>
                ) : (
                  <p>Waiting for interviewer to share a document...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: '15px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      {/* Left: Video & Controls */}
      <div style={{ flex: 2, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          flex: 1
        }}>
          {/* Local Video */}
          <div style={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            <div style={{
              background: '#3b82f6',
              color: 'white',
              padding: '6px 10px',
              fontSize: '0.9em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{getMediaIcon(localAudioActive, 'audio')}</span>
              <span>{getMediaIcon(localVideoActive, 'video')}</span>
              <strong>{myRoleLabel} (You)</strong>
              {!localVideoActive && <span style={{ fontSize: '0.8em' }}>(cam off)</span>}
              {!localAudioActive && <span style={{ fontSize: '0.8em' }}>(muted)</span>}
            </div>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                aspectRatio: '16/9',
                background: '#0f172a',
                display: 'block'
              }}
            />
          </div>

          {/* Remote Video */}
          <div style={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            <div style={{
              background: '#10b981',
              color: 'white',
              padding: '6px 10px',
              fontSize: '0.9em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{getMediaIcon(remoteAudioEnabled, 'audio')}</span>
              <span>{getMediaIcon(remoteVideoEnabled, 'video')}</span>
              <strong>{remoteRoleLabel}</strong>
              {!remoteVideoEnabled && <span style={{ fontSize: '0.8em' }}>(cam off)</span>}
              {!remoteAudioEnabled && <span style={{ fontSize: '0.8em' }}>(muted)</span>}
            </div>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                aspectRatio: '16/9',
                background: '#0f172a',
                display: 'block',
                opacity: remoteVideoEnabled ? 1 : 0.4,
                filter: remoteVideoEnabled ? 'none' : 'grayscale(80%)'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={toggleVideo}
            disabled={permissionState.video === 'denied'}
            style={{
              padding: '10px 16px',
              background: localVideoActive ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: permissionState.video === 'denied' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {localVideoActive ? '📷 Camera Off' : '🎥 Camera On'}
          </button>

          <button
            onClick={toggleAudio}
            disabled={permissionState.audio === 'denied'}
            style={{
              padding: '10px 16px',
              background: localAudioActive ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: permissionState.audio === 'denied' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {localAudioActive ? '🔇 Mute Mic' : '🎤 Unmute Mic'}
          </button>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '10px',
            borderRadius: '6px',
            fontSize: '0.9em'
          }}>
            ❗ {error}
          </div>
        )}

        <div style={{ fontSize: '0.9em', color: '#475569' }}>
          <strong>👥 Participants ({participants.length}/2)</strong>
          {participants.map((p, i) => (
            <div key={i} style={{ margin: '4px 0' }}>
              <span style={{ fontWeight: '500' }}>{p.role}</span>: {p.email.split('@')[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Right: PDF Viewer */}
      <div style={{
        flex: 3,
        minWidth: '500px',
        height: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {renderPDFViewer()}
      </div>
    </div>
  );
};

export default InterviewSession;