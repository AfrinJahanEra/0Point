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
      console.log('📥 IDE WS Message:', event.data);
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
        console.log('📤 WebSocket sending:', { type: 'code_update', code: newCode.substring(0, 30) + '...', language: newLang });
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

          if (data.type === 'pdf_update') {
            console.log('📥 PDF received:', data.pdf_url);
            setPdfUrl(data.pdf_url);
            setPdfUploader(data.uploader_email);
          }
          else if (data.type === 'media_update' && data.role !== role) {
            if (data.media_type === 'audio') setRemoteAudioEnabled(data.enabled);
            if (data.media_type === 'video') setRemoteVideoEnabled(data.enabled);
          }
          else if (data.type === 'participant_list') {
            setParticipants(data.participants);
          }
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

      ws.current?.close();
      codeWs.current?.close();

      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') track.stop();
        });
        streamRef.current = null;
      }

      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
  }, [sessionId, role, email, checkPermissions, fetchLatestPDF, initCodeSync]);

  // 🎯 Toggle CAMERA
  const toggleVideo = async () => {
    const s = streamRef.current;
    if (!s) return;

    const videoTracks = s.getVideoTracks();
    if (videoTracks.length === 0) return;

    const track = videoTracks[0];

    if (track.readyState === 'live') {
      track.stop();
      setLocalVideoActive(false);

      if (pc.current) {
        const sender = pc.current.getSenders().find(s => s.track === track);
        if (sender) sender.replaceTrack(null);
      }
    } else {
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

  // 🎨 Helper: Media icons
  const getMediaIcon = (enabled, type) => {
    if (type === 'audio') return enabled ? '🎤' : '🔇';
    return enabled ? '🎥' : '📷';
  };

  // ✅ Handle code change
  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
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
        flexDirection: 'column',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div>
            <strong style={{ fontSize: '1.1em', color: '#1e293b' }}>📄 Shared Document</strong>
            {pdfUploader && <span style={{ marginLeft: '10px', color: '#64748b', fontSize: '0.9em' }}>by {pdfUploader.split('@')[0]}</span>}
          </div>

          {role === 'interviewer' && (
            <label style={{
              background: '#3b82f6',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(59,130,246,0.3)'
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
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          {absolutePdfUrl ? (
            <embed
              src={absolutePdfUrl}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              textAlign: 'center',
              padding: '40px'
            }}>
              <div>
                <p style={{ fontSize: '1.1em', marginBottom: '8px' }}>📄 No PDF shared yet.</p>
                <p style={{ fontSize: '0.95em' }}>
                  {role === 'interviewer' ? 'Upload a PDF to get started.' : 'Waiting for interviewer to upload...'}
                </p>
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
      flexDirection: 'column',
      background: '#0f172a',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center'
      }}>
        <select
          value={language}
          onChange={handleLanguageChange}
          style={{
            padding: '10px 14px',
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontSize: '0.95em',
            minWidth: '140px'
          }}
        >
          <option value="python">🐍 Python</option>
          <option value="java">☕ Java</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
          <option value="javascript">📜 JavaScript</option>
          <option value="go">🐹 Go</option>
          <option value="rust">🦀 Rust</option>
        </select>

        <button
          onClick={compile}
          disabled={isCompiling}
          style={{
            padding: '10px 20px',
            background: isCompiling ? '#475569' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isCompiling ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '0.95em',
            boxShadow: isCompiling ? 'none' : '0 4px 10px rgba(16,185,129,0.3)'
          }}
        >
          {isCompiling ? '⏳ Running...' : '▶️ Run Code'}
        </button>
      </div>

      <div style={{ padding: '0 16px 12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label style={{ color: '#94a3b8', fontSize: '0.9em', whiteSpace: 'nowrap' }}>Input (stdin):</label>
        <input
          type="text"
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          placeholder="e.g., 5 10"
          style={{
            flex: 1,
            padding: '10px 12px',
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontSize: '0.9em'
          }}
        />
      </div>

      <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', padding: '0 16px' }}>
        <textarea
          value={code}
          onChange={handleCodeChange}
          spellCheck="false"
          style={{
            flex: 1,
            background: '#020817',
            color: '#e2e8f0',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '14.5px',
            padding: '16px',
            border: '1px solid #334155',
            borderRadius: '10px',
            resize: 'none',
            lineHeight: '1.6',
            outline: 'none'
          }}
          placeholder="// Start coding here..."
        />
      </div>

      <div style={{
        margin: '16px',
        marginTop: '12px',
        background: '#020817',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '16px',
        minHeight: '120px',
        color: '#cbd5e1',
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '14px',
        lineHeight: '1.6'
      }}>
        <strong style={{ color: '#60a5fa', display: 'block', marginBottom: '8px' }}>Output:</strong>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {output || 'Click "Run Code" to see output here'}
        </pre>
      </div>
    </div>
  );

  return (
    <div style={{
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      background: '#f1f5f9',
      minHeight: '100vh',
      boxSizing: 'border-box',
      display: 'grid',
      gridTemplateColumns: '380px 1fr 1fr',
      gap: '20px',
      alignItems: 'start'
    }}>
      {/* Left Column: Video + Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: 'calc(100vh - 40px)',
        position: 'sticky',
        top: '20px'
      }}>
        {/* Videos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Local Video */}
          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            background: '#1e293b'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              padding: '12px 16px',
              fontSize: '0.95em',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {getMediaIcon(localAudioActive, 'audio')}
              {getMediaIcon(localVideoActive, 'video')}
              {myRoleLabel} (You)
            </div>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '220px',
                objectFit: 'cover',
                background: '#0f172a',
                display: 'block'
              }}
            />
          </div>

          {/* Remote Video */}
          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            background: '#1e293b'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              padding: '12px 16px',
              fontSize: '0.95em',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {getMediaIcon(remoteAudioEnabled, 'audio')}
              {getMediaIcon(remoteVideoEnabled, 'video')}
              {remoteRoleLabel}
            </div>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '220px',
                objectFit: 'cover',
                background: '#0f172a',
                display: 'block',
                opacity: remoteVideoEnabled ? 1 : 0.5,
                filter: remoteVideoEnabled ? 'none' : 'grayscale(100%)'
              }}
            />
          </div>
        </div>

        {/* Media Controls */}
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={toggleVideo}
              disabled={permissionState.video === 'denied'}
              style={{
                flex: 1,
                padding: '14px',
                background: localVideoActive ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '1em',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}
            >
              {localVideoActive ? '📷 Turn Off Camera' : '🎥 Turn On Camera'}
            </button>

            <button
              onClick={toggleAudio}
              disabled={permissionState.audio === 'denied'}
              style={{
                flex: 1,
                padding: '14px',
                background: localAudioActive ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '1em',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}
            >
              {localAudioActive ? '🔇 Mute Mic' : '🎤 Unmute Mic'}
            </button>
          </div>
        </div>

        {/* Participants */}
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          fontSize: '0.9em'
        }}>
          <strong style={{ display: 'block', marginBottom: '10px', color: '#1e293b' }}>
            👥 Participants ({participants.length}/2)
          </strong>
          {participants.map((p, i) => (
            <div key={i} style={{ margin: '8px 0', color: '#475569' }}>
              <strong>{p.role.charAt(0).toUpperCase() + p.role.slice(1)}:</strong> {p.email.split('@')[0]}
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.9em',
            border: '1px solid #fecaca'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Middle: PDF Viewer */}
      <div style={{ height: 'calc(100vh - 40px)' }}>
        {renderPDFViewer()}
      </div>

      {/* Right: Code Editor */}
      <div style={{ height: 'calc(100vh - 40px)' }}>
        {renderIDE()}
      </div>
    </div>
  );
};

export default InterviewSession;