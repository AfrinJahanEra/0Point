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
  const codeWs = useRef(null);
  const streamRef = useRef(null);

  // Media state
  const [localAudioActive, setLocalAudioActive] = useState(false);
  const [localVideoActive, setLocalVideoActive] = useState(false);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);

  // PDF state
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfUploader, setPdfUploader] = useState('');

  // IDE state
  const [code, setCode] = useState('# Start coding here\nprint("Hello, Interview!")');
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [stdin, setStdin] = useState('');

  // UI state
  const [participants, setParticipants] = useState([]);
  const [permissionState, setPermissionState] = useState({ audio: 'prompt', video: 'prompt' });
  const [error, setError] = useState('');

  const myRoleLabel = role === 'interviewer' ? 'Interviewer' : 'Candidate';
  const remoteRoleLabel = role === 'interviewer' ? 'Candidate' : 'Interviewer';

  // 🔍 Check browser media permissions
  const checkPermissions = useCallback(async () => {
    try {
      const audioStatus = await navigator.permissions.query({ name: 'microphone' });
      const videoStatus = await navigator.permissions.query({ name: 'camera' });
      setPermissionState({
        audio: audioStatus.state,
        video: videoStatus.state
      });
    } catch (err) {
      console.warn('Permission API not supported in this browser');
    }
  }, []);

  // 📤 Upload PDF to backend
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

      setPdfUrl(data.url);
      setPdfUploader(data.uploader_email);
    } catch (err) {
      console.error('❌ PDF upload failed:', err);
      alert(`Failed to upload PDF: ${err.message}`);
    }
  };

  // 📥 Fetch latest PDF for this session
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

  // ✅ Initialize IDE WebSocket
  const initCodeSync = useCallback(() => {
    const codeSocket = new WebSocket(`ws://localhost:8000/ws/code/${sessionId}/`);
    codeWs.current = codeSocket;

    codeSocket.onopen = () => {
      console.log('✅ IDE WebSocket connected');
    };

    codeSocket.onmessage = (event) => {
      console.log('📥 IDE WS Message:', event.data); // 🔴 ADD THIS
      const data = JSON.parse(event.data);
      if (data.type === 'code_update') {
        setCode(data.code);
        setLanguage(data.language);
      }
    };

    codeSocket.onclose = () => {
      console.log('IDE WebSocket disconnected');
    };

    return () => {
      codeSocket.close();
    };
  }, [sessionId]);

  // ✅ Debounced code sync
  const debouncedSync = useRef(null);
  const syncCode = useCallback((newCode, newLang) => {
    if (debouncedSync.current) clearTimeout(debouncedSync.current);
    debouncedSync.current = setTimeout(() => {
      if (codeWs.current?.readyState === WebSocket.OPEN) {
        console.log('📤 WebSocket sending:', { type: 'code_update', code: newCode.substring(0, 30) + '...', language: newLang }); // 🔴 ADD THIS
        codeWs.current.send(JSON.stringify({
          type: 'code_update',
          code: newCode,
          language: newLang
        }));
      }
    }, 500);
  }, []);

  // ✅ Compile code via JDoodle API
  const compile = async () => {
    setIsCompiling(true);
    setOutput('Compiling...\n');
    
    try {
      const res = await fetch('/api/ide/compile/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, stdin })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      
      if (data.error) {
        setOutput(`❌ Error:\n${data.error}`);
      } else {
        setOutput(
          `✅ Output:\n${data.output || '(no output)'}\n\n` +
          `Memory: ${data.memory} | CPU Time: ${data.cpuTime}`
        );
      }
    } catch (err) {
      setOutput(`💥 Compilation failed: ${err.message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  // 🎯 Initialize session
  useEffect(() => {
    let cleanupScheduled = false;

    const init = async () => {
      await checkPermissions();
      await fetchLatestPDF();
      initCodeSync();

      try {
        const constraints = { video: true, audio: true };
        const s = await navigator.mediaDevices.getUserMedia(constraints);
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

        s.getTracks().forEach(track => {
          peerConnection.addTrack(track, s);
        });

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
            console.warn('Invalid WS message:', event.data);
            return;
          }

          // 👉 PDF uploaded
          if (data.type === 'pdf_update') {
            console.log('📥 PDF received:', data.pdf_url);
            setPdfUrl(data.pdf_url);
            setPdfUploader(data.uploader_email);
          }
          // 👉 Media state from remote peer
          else if (data.type === 'media_update' && data.role !== role) {
            if (data.media_type === 'audio') setRemoteAudioEnabled(data.enabled);
            if (data.media_type === 'video') setRemoteVideoEnabled(data.enabled);
          }
          // 👉 Participant list
          else if (data.type === 'participant_list') {
            setParticipants(data.participants);
          }
          // 👉 WebRTC signaling
          else if (data.type === 'offer') {
            try {
              await peerConnection.setRemoteDescription(data.offer);
              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);
              websocket.send(JSON.stringify({ type: 'answer', answer: peerConnection.localDescription }));
            } catch (err) {
              console.error('Error handling offer:', err);
            }
          } else if (data.type === 'answer') {
            try {
              await peerConnection.setRemoteDescription(data.answer);
            } catch (err) {
              console.error('Error handling answer:', err);
            }
          } else if (data.type === 'ice_candidate') {
            try {
              if (data.ice_candidate) {
                await peerConnection.addIceCandidate(data.ice_candidate);
              }
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          }
        };

        peerConnection.onicecandidate = (e) => {
          if (e.candidate && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
              type: 'ice_candidate',
              ice_candidate: e.candidate
            }));
          }
        };

        peerConnection.ontrack = (e) => {
          if (remoteVideoRef.current && e.streams && e.streams[0]) {
            remoteVideoRef.current.srcObject = e.streams[0];
          }
        };

      } catch (err) {
        console.error('❌ Media/init failed:', err);
        let msg = 'Failed to access camera/microphone.';
        if (err.name === 'NotAllowedError') {
          msg = 'You blocked camera/mic. Click the camera icon in the address bar to allow.';
        } else if (err.name === 'NotFoundError') {
          msg = 'No camera or microphone detected.';
        }
        setError(msg);
      }
    };

    init();

    return () => {
      cleanupScheduled = true;

      // Close WebSockets
      ws.current?.close();
      codeWs.current?.close();

      // Close PeerConnection
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }

      // Stop media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') track.stop();
        });
        streamRef.current = null;
      }

      // Clear video elements
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
  }, [sessionId, role, email, checkPermissions, fetchLatestPDF, initCodeSync]);

  // 🎯 Toggle CAMERA (real hardware control)
  const toggleVideo = async () => {
    const s = streamRef.current;
    if (!s) return;

    const videoTracks = s.getVideoTracks();
    if (videoTracks.length === 0) return;

    const track = videoTracks[0];

    if (track.readyState === 'live') {
      // 👉 STOP camera
      track.stop();
      setLocalVideoActive(false);

      if (pc.current) {
        const sender = pc.current.getSenders().find(s => s.track === track);
        if (sender) sender.replaceTrack(null);
      }
    } else {
      // 👉 RE-ENABLE camera
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = newStream.getVideoTracks()[0];
        
        s.addTrack(newTrack);
        if (pc.current) {
          const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newTrack);
          } else {
            pc.current.addTrack(newTrack, s);
          }
        }

        if (localVideoRef.current) {
          const currentSrc = localVideoRef.current.srcObject;
          if (currentSrc) {
            const newMediaStream = new MediaStream([
              ...currentSrc.getTracks().filter(t => t.kind !== 'video'),
              newTrack
            ]);
            localVideoRef.current.srcObject = newMediaStream;
            streamRef.current = newMediaStream;
          }
        }

        setLocalVideoActive(true);
      } catch (err) {
        console.error('Failed to re-enable camera:', err);
        alert('Could not re-enable camera. Check permissions.');
      }
    }

    // 📡 Sync state
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'media_update',
        media_type: 'video',
        enabled: localVideoActive
      }));
    }
  };

  // 🎤 Toggle MIC (lightweight)
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

  // 🎨 Helper: Media icons
  const getMediaIcon = (enabled, type) => {
    if (type === 'audio') return enabled ? '🎤' : '🔇';
    return enabled ? '🎥' : '📷';
  };

  // ✅ Handle code change
  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    console.log('📤 Sending code update:', newCode.substring(0, 30) + '...'); // 🔴 ADD THIS
    syncCode(newCode, language);
  };

  // ✅ Handle language change
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    syncCode(code, newLang);
  };

  // 📄 Render PDF viewer
  const renderPDFViewer = () => {
    const absolutePdfUrl = pdfUrl 
      ? (pdfUrl.startsWith('http') ? pdfUrl : `http://localhost:8000${pdfUrl}`)
      : null;

    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          fontSize: '0.95em'
        }}>
          <strong>📄 Shared Document</strong>
          {pdfUploader && <span>by {pdfUploader.split('@')[0]}</span>}
        </div>

        {role === 'interviewer' && (
          <label style={{
            marginBottom: '12px',
            background: '#3b82f6',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85em',
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
            <embed
              src={absolutePdfUrl}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ display: 'block' }}
              title="Shared PDF"
            />
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
                  <p>Upload a PDF to collaborate.</p>
                ) : (
                  <p>Waiting for interviewer...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 💻 Render IDE
  const renderIDE = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '10px',
        flexWrap: 'wrap'
      }}>
        <select
          value={language}
          onChange={handleLanguageChange}
          style={{
            padding: '6px 10px',
            background: '#1e293b',
            color: 'white',
            border: '1px solid #334155',
            borderRadius: '4px',
            fontSize: '0.9em'
          }}
        >
          <option value="python">🐍 Python</option>
          <option value="java">☕ Java</option>
          <option value="c++">CppClass C++</option>
          <option value="c">C</option>
          <option value="javascript">📜 JavaScript</option>
          <option value="go">🐹 Go</option>
          <option value="rust">🦀 Rust</option>
        </select>

        <button
          onClick={compile}
          disabled={isCompiling}
          style={{
            padding: '6px 12px',
            background: isCompiling ? '#64748b' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isCompiling ? 'not-allowed' : 'pointer',
            fontSize: '0.9em'
          }}
        >
          {isCompiling ? '⏳ Compiling...' : '▶️ Run Code'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
        <label style={{ color: '#94a3b8', fontSize: '0.8em', whiteSpace: 'nowrap' }}>
          Stdin:
        </label>
        <input
          type="text"
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          placeholder="e.g., 5 10"
          style={{
            flex: 1,
            padding: '4px 8px',
            background: '#1e293b',
            color: 'white',
            border: '1px solid #334155',
            borderRadius: '4px',
            fontSize: '0.85em'
          }}
        />
      </div>

      <textarea
        value={code}
        onChange={handleCodeChange}
        spellCheck="false"
        style={{
          flex: 3,
          background: '#020814',
          color: '#e2e8f0',
          fontFamily: 'Consolas, monaco, monospace',
          fontSize: '14px',
          padding: '12px',
          border: '1px solid #334155',
          borderRadius: '6px',
          resize: 'none',
          lineHeight: 1.5
        }}
        placeholder="Write your code here..."
      />

      <div style={{
        flex: 2,
        marginTop: '10px',
        background: '#020814',
        border: '1px solid #334155',
        borderRadius: '6px',
        padding: '12px',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        color: '#cbd5e1',
        fontFamily: 'Consolas, monaco, monospace',
        fontSize: '14px',
        lineHeight: 1.5
      }}>
        <strong style={{ color: '#60a5fa' }}>Output:</strong>
        <div style={{ marginTop: '8px', minHeight: '40px' }}>
          {output || 'Click "Run Code" to execute'}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      padding: '15px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '16px',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      {/* Left: Video */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

        {/* Controls */}
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

        {/* Participants */}
        <div style={{ fontSize: '0.85em', color: '#475569' }}>
          <strong>👥 Participants ({participants.length}/2)</strong>
          {participants.map((p, i) => (
            <div key={i} style={{ margin: '3px 0' }}>
              <span style={{ fontWeight: '500' }}>{p.role}</span>: {p.email.split('@')[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Middle: PDF */}
      <div style={{ height: '100%' }}>
        {renderPDFViewer()}
      </div>

      {/* Right: IDE */}
      <div style={{ height: '100%' }}>
        {renderIDE()}
      </div>
    </div>
  );
};

export default InterviewSession;