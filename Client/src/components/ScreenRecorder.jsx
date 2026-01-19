// components/ScreenRecorder.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const ScreenRecorder = ({ contestId, userId, contestStatus, onRecordingComplete }) => {
  const [recording, setRecording] = useState(() => window.__recordingActive || false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaStream, setMediaStream] = useState(null);
  const [recordingId, setRecordingId] = useState(() => window.__recordingId || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [requiresRecording, setRequiresRecording] = useState(false);
  const [recordingStarted, setRecordingStarted] = useState(() => window.__recordingStarted || false);
  const [checkedRequirements, setCheckedRequirements] = useState(false);
  const [shouldAutoStart, setShouldAutoStart] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [uploadSuccessful, setUploadSuccessful] = useState(false);
  const rafRef = useRef(null);
  const [recordingCompleted, setRecordingCompleted] = useState(() => window.__recordingCompleted || false);


  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingIdRef = useRef(window.__recordingId || null);
  const stopHandledRef = useRef(false);

  const TOKEN = localStorage.getItem('token');

  /* ---------------- TIMER (DERIVED, NO INTERVAL) ---------------- */

  useEffect(() => {
    if (!recording || !window.__recordingStartTime) return;

    const tick = () => {
      if (!window.__recordingStartTime) return;

      setRecordingTime(
        Math.max(
          0,
          Math.floor((Date.now() - window.__recordingStartTime) / 1000)
        )
      );

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [recording]);

  /* ---------------- REQUIREMENT CHECK ---------------- */

/* ---------------- REQUIREMENT CHECK ---------------- */

useEffect(() => {
  if (contestStatus === 'live' && !checkedRequirements) {
    checkRecordingRequirements();
  }
}, [contestId, contestStatus, checkedRequirements]);

const checkRecordingRequirements = async () => {
  try {
    const res = await axios.get(
      `http://localhost:8000/contests/${contestId}/recording/status/`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    const { requires_recording, recording_started, recording_id } = res.data;

    setRequiresRecording(requires_recording);
    setRecordingStarted(recording_started);
    setCheckedRequirements(true);

    // ADD THIS: If recording was already started/completed, update local state
    if (recording_started) {
      setRecordingCompleted(true);  // Mark as completed
      window.__recordingCompleted = true;
      window.__recordingStarted = true;
    }

    if (recording_started && recording_id && !window.__recordingId) {
      setRecordingId(recording_id);
      recordingIdRef.current = recording_id;
    }

    if (requires_recording && !recording_started) {
      setShouldAutoStart(true);
    }
  } catch {
    setCheckedRequirements(true);
    setRequiresRecording(false);
  }
};

  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  };

  /* ---------------- SYNC WITH BACKEND ON LOAD ---------------- */

useEffect(() => {
  // Always check backend status when component loads for a live contest
  if (contestStatus === 'live') {
    syncRecordingStatus();
  }
}, [contestStatus]);

const syncRecordingStatus = async () => {
  try {
    const res = await axios.get(
      `http://localhost:8000/contests/${contestId}/recording/status/`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    
    const { requires_recording, recording_started, recording_id } = res.data;
    
    // Sync with local state
    if (recording_started) {
      setRecordingStarted(true);
      setRecordingCompleted(true);
      window.__recordingStarted = true;
      window.__recordingCompleted = true;
      
      if (recording_id) {
        setRecordingId(recording_id);
        recordingIdRef.current = recording_id;
        window.__recordingId = recording_id;
      }
    }
  } catch (error) {
    console.error('Failed to sync recording status:', error);
  }
};

  /* ---------------- STOP (SINGLE SOURCE OF TRUTH) ---------------- */

  const handleStop = async () => {
    if (stopHandledRef.current) return;
    stopHandledRef.current = true;

    // STOP TIMER IMMEDIATELY
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (recordingIdRef.current) {
      try {
        await axios.post(
          `http://localhost:8000/contests/${contestId}/recording/${recordingIdRef.current}/stop/`,
          {},
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
      } catch {}
    }
  };

  /* ---------------- START ---------------- */

  const startRecording = async () => {
    if (recording || startingRecording || contestStatus !== 'live' || recordingCompleted) return;

    if (recordingStarted) {
    return;
  }

    try {
      setStartingRecording(true);
      setError(null);

      const res = await axios.post(
        `http://localhost:8000/contests/${contestId}/recording/start/`,
        {},
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      const id = res.data.recording_id;
      setRecordingId(id);
      stopHandledRef.current = false;
      recordingIdRef.current = id;

      window.__recordingId = id;
      window.__recordingActive = true;
      window.__recordingStarted = true;
      window.__recordingStartTime = Date.now();

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      setMediaStream(stream);
      setStartingRecording(false);

      const recorder = new MediaRecorder(stream, {
        mimeType: getSupportedMimeType()
      });

      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (!recordedChunksRef.current.length) return;

        try {
          setUploading(true);
          await uploadRecording();
          setUploadSuccessful(true);
          setRecordingCompleted(true);  // ADD THIS LINE
          window.__recordingCompleted = true;  // ADD THIS LINE
        } finally {
          setUploading(false);

          // FINAL UI RESET — ONLY HERE
          setRecording(false);
          setRecordingTime(0);

          window.__recordingActive = false;
          window.__recordingStartTime = null;

          recordedChunksRef.current = [];
        }
      };

      recorder.start(1000);
      setRecording(true);

      stream.getVideoTracks()[0].onended = handleStop;

    } catch (err) {
      setStartingRecording(false);
      setError(err.message);
    }
  };

  const uploadRecording = async () => {
    if (!recordedChunksRef.current.length || !recordingIdRef.current) return;

    try {
      setUploading(true);
      const blob = new Blob(recordedChunksRef.current, { type: getSupportedMimeType() });
      const form = new FormData();
      form.append('video', blob, `recording-${contestId}-${userId}.webm`);

      const res = await axios.post(
        `http://localhost:8000/contests/${contestId}/recording/${recordingIdRef.current}/upload/`,
        form,
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setUploadSuccessful(true);
      onRecordingComplete?.(res.data);
      recordedChunksRef.current = [];
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = s =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60)
      .toString()
      .padStart(2, '0')}`;

  if (contestStatus !== 'live' || !checkedRequirements) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white p-4 rounded shadow w-64">
        <div className="flex justify-between mb-2">
          <b>Screen Recording {recording && '🔴'}</b>
          <span>{formatTime(recordingTime)}</span>
        </div>

        {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
        {uploading && <div className="text-blue-600 text-xs mb-2">Uploading…</div>}
        {uploadSuccessful && <div className="text-green-600 text-xs mb-2">Uploaded ✔</div>}

        {!recording && !recordingCompleted ? 
          <button onClick={startRecording} className="w-full bg-red-600 text-white py-2 rounded">
            Start Recording
          </button>
        : null
        }
      </div>
    </div>
  );
};

export default ScreenRecorder;
