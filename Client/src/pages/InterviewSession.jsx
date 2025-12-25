// src/pages/InterviewSession.jsx — ✅ PERMISSIONS-AWARE VERSION
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const InterviewSession = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pc = useRef(null);
  const ws = useRef(null);
  const streamRef = useRef(null);

  // ✅ Track *actual* media state (not just UI)
  const [localAudioActive, setLocalAudioActive] = useState(false); // mic in use?
  const [localVideoActive, setLocalVideoActive] = useState(false); // cam in use?
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [permissionState, setPermissionState] = useState({ audio: 'prompt', video: 'prompt' });
  const [error, setError] = useState('');

  const myRoleLabel = role === 'interviewer' ? 'Interviewer' : 'Candidate';
  const remoteRoleLabel = role === 'interviewer' ? 'Candidate' : 'Interviewer';

  // 🔍 Check current permission status
  const checkPermissions = async () => {
    try {
      const audioStatus = await navigator.permissions.query({ name: 'microphone' });
      const videoStatus = await navigator.permissions.query({ name: 'camera' });
      setPermissionState({
        audio: audioStatus.state,
        video: videoStatus.state
      });
      return { audio: audioStatus.state, video: videoStatus.state };
    } catch (err) {
      console.warn('Permission query not supported:', err);
      return { audio: 'unknown', video: 'unknown' };
    }
  };

  // 🎯 Request media with fallback UX
  const requestMedia = async (constraints = { video: true, audio: true }) => {
    try {
      setError('');
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      setLocalAudioActive(constraints.audio === true);
      setLocalVideoActive(constraints.video === true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = s;
      }

      // Re-check permissions after success
      await checkPermissions();

      return s;
    } catch (err) {
      console.error('Media access denied:', err);
      let msg = 'Camera/microphone access denied.';
      if (err.name === 'NotAllowedError') {
        msg = 'You blocked camera/mic access. Click "Allow" when prompted.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera or microphone found.';
      } else if (err.name === 'OverconstrainedError') {
        msg = 'Camera/mic constraints not supported.';
      }
      setError(msg);
      await checkPermissions();
      return null;
    }
  };

  useEffect(() => {
    let cleanupScheduled = false;

    const init = async () => {
      await checkPermissions();

      // If already denied, don’t auto-prompt (wait for user click)
      const perms = await checkPermissions();
      if (perms.audio === 'denied' || perms.video === 'denied') {
        setError('Camera or microphone access is blocked. Click "Enable Media" to retry.');
        return;
      }

      const s = await requestMedia({ video: true, audio: true });
      if (cleanupScheduled || !s) return;

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pc.current = peerConnection;

      s.getTracks().forEach(track => peerConnection.addTrack(track, s));

      const websocket = new WebSocket(`ws://localhost:8000/ws/video/${sessionId}/?role=${role}`);
      ws.current = websocket;

      websocket.onopen = () => {
        if (role === 'client') {
          peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
              websocket.send(JSON.stringify({ type: 'offer', offer: peerConnection.localDescription }));
            });
        }
      };

      websocket.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'participant_list') {
          setParticipants(data.participants);
        } else if (data.type === 'offer') {
          await peerConnection.setRemoteDescription(data.offer);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          websocket.send(JSON.stringify({ type: 'answer', answer: peerConnection.localDescription }));
        } else if (data.type === 'answer') {
          await peerConnection.setRemoteDescription(data.answer);
        } else if (data.type === 'ice_candidate') {
          if (data.ice_candidate) {
            await peerConnection.addIceCandidate(data.ice_candidate);
          }
        } else if (data.type === 'media_update' && data.role !== role) {
          if (data.media_type === 'audio') setRemoteAudioEnabled(data.enabled);
          if (data.media_type === 'video') setRemoteVideoEnabled(data.enabled);
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
    };

    init();

    return () => {
      cleanupScheduled = true;
      // Full cleanup
      if (ws.current) ws.current.close();
      if (pc.current) pc.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
  }, [sessionId, role]);

  // ✅ REAL camera toggle: stop/start track (releases hardware)
  const toggleVideo = async () => {
    const s = streamRef.current;
    if (!s) return;

    const videoTracks = s.getVideoTracks();
    if (videoTracks.length === 0) return;

    const track = videoTracks[0];

    if (track.readyState === 'live') {
      // 👉 ACTUALLY STOP CAMERA (releases hardware, turns off LED)
      track.stop();
      setLocalVideoActive(false);
      // Remove video track from peer connection
      if (pc.current) {
        pc.current.removeTrack(pc.current.getSenders().find(sender => sender.track === track));
      }

      // 📡 Tell peer: video is OFF
      ws.current?.send?.(JSON.stringify({
        type: 'media_update',
        media_type: 'video',
        enabled: false
      }));
    } else {
      // 👉 RE-ENABLE CAMERA: request new video track
      try {
        const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = newVideoStream.getVideoTracks()[0];
        streamRef.current.addTrack(newTrack); // or replace in stream

        if (pc.current) {
          const sender = pc.current.addTrack(newTrack, streamRef.current);
          // Optional: replace track in existing transceiver
        }

        if (localVideoRef.current) {
          const currentStream = localVideoRef.current.srcObject;
          if (currentStream) {
            newTrack.enabled = true;
            const newStream = new MediaStream([...currentStream.getTracks().filter(t => t.kind !== 'video'), newTrack]);
            localVideoRef.current.srcObject = newStream;
            streamRef.current = newStream;
          }
        }

        setLocalVideoActive(true);

        // 📡 Tell peer: video is ON
        ws.current?.send?.(JSON.stringify({
          type: 'media_update',
          media_type: 'video',
          enabled: true
        }));
      } catch (err) {
        console.error('Failed to re-enable camera:', err);
        setError('Could not re-enable camera. Check permissions.');
      }
    }
  };

  // ✅ REAL mic toggle: stop/start (optional — tradeoff explained below)
  const toggleAudio = () => {
    const s = streamRef.current;
    if (!s) return;

    const audioTracks = s.getAudioTracks();
    if (audioTracks.length === 0) return;

    const track = audioTracks[0];

    // 🔹 Option A (Recommended): Just toggle `.enabled`
    // ✅ Lightweight, fast, preserves connection
    // ✅ No re-negotiation needed
    track.enabled = !track.enabled;
    setLocalAudioActive(track.enabled);

    ws.current?.send?.(JSON.stringify({
      type: 'media_update',
      media_type: 'audio',
      enabled: track.enabled
    }));

    // 🔹 Option B: Stop/start track (like video)
    // 👉 Pros: Releases mic, turns off system indicator
    // 👉 Cons: Requires SDP renegotiation (complex), may cause glitches
    // → Stick with `.enabled` for audio unless privacy-critical
  };

  const getMediaIcon = (enabled, type) => {
    if (type === 'audio') return enabled ? '🎤' : '🔇';
    return enabled ? '🎥' : '📷';
  };

  const isSelf = (p) =>
    (p.role === 'Interviewer' && role === 'interviewer') ||
    (p.role === 'Candidate' && role === 'client');

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
      <div style={{ flex: 3, minWidth: '300px' }}>
        <h2>Interview Room: {sessionId}</h2>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            ❗ {error}
            <button
              onClick={() => requestMedia({ video: true, audio: true })}
              style={{ display: 'block', marginTop: '8px', background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px' }}
            >
              🔁 Enable Camera & Mic
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span>{getMediaIcon(localAudioActive, 'audio')}</span>
              <span>{getMediaIcon(localVideoActive, 'video')}</span>
              <strong>{myRoleLabel} (You)</strong>
              {!localVideoActive && <span style={{ color: '#ef4444', fontSize: '0.85em' }}>(cam off)</span>}
              {!localAudioActive && <span style={{ color: '#f97316', fontSize: '0.85em' }}>(muted)</span>}
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
                borderRadius: '8px',
                border: '2px solid #3b82f6',
                objectFit: 'cover',
                opacity: localVideoActive ? 1 : 0.4,
                filter: localVideoActive ? 'none' : 'grayscale(100%)'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span>{getMediaIcon(remoteAudioEnabled, 'audio')}</span>
              <span>{getMediaIcon(remoteVideoEnabled, 'video')}</span>
              <strong>{remoteRoleLabel}</strong>
              {!remoteVideoEnabled && <span style={{ color: '#ef4444', fontSize: '0.85em' }}>(cam off)</span>}
              {!remoteAudioEnabled && <span style={{ color: '#f97316', fontSize: '0.85em' }}>(muted)</span>}
            </div>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                aspectRatio: '16/9',
                background: '#0f172a',
                borderRadius: '8px',
                border: '2px solid #10b981',
                objectFit: 'cover',
                opacity: remoteVideoEnabled ? 1 : 0.4,
                filter: remoteVideoEnabled ? 'none' : 'grayscale(100%)'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={toggleVideo}
            disabled={permissionState.video === 'denied'}
            style={{
              padding: '10px 16px',
              background: localVideoActive ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: permissionState.video === 'denied' ? 'not-allowed' : 'pointer'
            }}
          >
            {localVideoActive ? '📷 Turn Camera OFF' : '🎥 Turn Camera ON'}
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
              fontWeight: 'bold',
              cursor: permissionState.audio === 'denied' ? 'not-allowed' : 'pointer'
            }}
          >
            {localAudioActive ? '🔇 Mute Mic' : '🎤 Unmute Mic'}
          </button>
        </div>

        {permissionState.audio === 'denied' || permissionState.video === 'denied' ? (
          <p style={{ color: '#d97706', marginTop: '10px', fontSize: '0.9em' }}>
            ⚠️ Permissions blocked. Go to browser settings or click camera icon in address bar to allow.
          </p>
        ) : null}
      </div>

      {/* Participants Sidebar */}
      <div style={{ flex: 1, minWidth: '240px', background: '#f8fafc', borderRadius: '8px', padding: '16px' }}>
        <h3>👥 Participants ({participants.length}/2)</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {participants.map((p, i) => (
            <li key={i} style={{ padding: '10px', background: '#f1f5f9', margin: '6px 0', borderRadius: '4px' }}>
              <strong>{p.role}</strong> ({p.email.split('@')[0]})
              {isSelf(p) && (
                <span style={{ color: '#059669', marginLeft: '6px' }}>
                  ← You ({localAudioActive ? '🎤' : '🔇'}{localVideoActive ? '🎥' : '📷'})
                </span>
              )}
              {!isSelf(p) && (
                <span style={{ float: 'right' }}>
                  {remoteAudioEnabled ? '🎤' : '🔇'}{remoteVideoEnabled ? '🎥' : '📷'}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default InterviewSession;