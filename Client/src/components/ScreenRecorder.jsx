// components/ScreenRecorder.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const ScreenRecorder = ({ contestId, userId, contestStatus, onRecordingComplete }) => {
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaStream, setMediaStream] = useState(null);
  const [recordingId, setRecordingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [requiresRecording, setRequiresRecording] = useState(false);
  const [recordingStarted, setRecordingStarted] = useState(false);
  const [checkedRequirements, setCheckedRequirements] = useState(false);
  const [shouldAutoStart, setShouldAutoStart] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [uploadSuccessful, setUploadSuccessful] = useState(false);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingIdRef = useRef(null);
  const timerRef = useRef(null);
  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjkzNDJlYjJhMWU4ODJiMmJkZjc3ZWFjIiwiZW1haWwiOiJmYWl6YUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.uroarEPp_ECHjie7mwRe2FpXJoOt8QvUoQkj3lxxpuY";

  useEffect(() => {
    if (contestStatus === 'live' && !checkedRequirements) {
      checkRecordingRequirements();
    }
  }, [contestId, contestStatus, checkedRequirements]);

  const checkRecordingRequirements = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/contests/${contestId}/recording/status/`,
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      
      const { requires_recording, recording_started, recording_id } = response.data;
      
      setRequiresRecording(requires_recording);
      setRecordingStarted(recording_started);
      setCheckedRequirements(true);
      
      if (recording_started && recording_id) {
        setRecordingId(recording_id);
      }
      
      if (requires_recording && !recording_started) {
        setShouldAutoStart(true);
        setError(null);
      }
    } catch (err) {
      setCheckedRequirements(true);
      setRequiresRecording(false);
    }
  };

  const getSupportedMimeType = () => {
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    
    for (let mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return 'video/webm';
  };

  const cleanupRecording = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
    }
    
    setRecording(false);
    setStartingRecording(false);
    setRecordingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      if (recording || contestStatus !== 'live' || startingRecording) {
        return;
      }

      setStartingRecording(true);
      setUploadSuccessful(false);
      setError(null);

      const startResponse = await axios.post(
        `http://localhost:8000/contests/${contestId}/recording/start/`,
        {},
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      const newRecordingId = startResponse.data.recording_id;
      
      setRecordingId(newRecordingId);
      recordingIdRef.current = newRecordingId;
      setRecordingStarted(true);
      setShouldAutoStart(false);

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "monitor",
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      setStartingRecording(false);
      setMediaStream(stream);
      
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordedChunksRef.current.length === 0) {
          setError('No recording data was captured. Please try again.');
          cleanupRecording();
          return;
        }
        
        await uploadRecording();
        cleanupRecording();
      };

      mediaRecorder.onerror = (event) => {
        setError(`Recording error: ${event.error.name} - ${event.error.message}`);
      };

      mediaRecorder.start(1000);
      setRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

    } catch (error) {
      setStartingRecording(false);
      setError(`Failed to start recording: ${error.message}`);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setRecordingStarted(false);
        setShouldAutoStart(false);
        recordingIdRef.current = null;
      }
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && recording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        // Ignore stop errors
      }
      
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
      }
      
      if (recordingIdRef.current) {
        try {
          await axios.post(
            `http://localhost:8000/contests/${contestId}/recording/${recordingIdRef.current}/stop/`,
            {},
            { headers: { Authorization: `Bearer ${TOKEN}` } }
          );
        } catch (err) {
          // Ignore stop API errors
        }
      }
    }
  };

  const uploadRecording = async () => {
    const currentRecordingId = recordingIdRef.current;
    
    if (recordedChunksRef.current.length === 0 || !currentRecordingId) {
      return;
    }

    try {
      setUploading(true);
      setUploadSuccessful(false);
      
      const mimeType = getSupportedMimeType();
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });

      const formData = new FormData();
      const filename = `screen-recording-${contestId}-${userId}-${Date.now()}.webm`;
      formData.append('video', blob, filename);

      const response = await axios.post(
        `http://localhost:8000/contests/${contestId}/recording/${currentRecordingId}/upload/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        }
      );

      setUploadSuccessful(true);
      
      if (onRecordingComplete) {
        onRecordingComplete(response.data);
      }
      

      recordedChunksRef.current = [];
      
    } catch (error) {
      setUploadSuccessful(false);
      if (error.response) {
        setError(`Upload failed: ${error.response.data.error || error.response.statusText}`);
      } else if (error.request) {
        setError('Upload failed: No response from server');
      } else {
        setError(`Upload failed: ${error.message}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (contestStatus !== 'live' || !checkedRequirements) {
    return null;
  }

  if (!requiresRecording) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-gray-100 rounded-lg shadow border border-gray-300 p-4 w-64">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Screen Recording (Optional)
            </h3>
          </div>
          
          <button
            onClick={startRecording}
            className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Start Recording
          </button>
          
          <div className="mt-2 text-xs text-gray-500">
            Optional: Record your screen during contest
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-4 w-64">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Screen Recording {recording ? '🔴' : (startingRecording ? '⏳' : '⚪')}
          </h3>
          <span className="text-xs text-gray-600">
            {formatTime(recordingTime)}
          </span>
        </div>
        
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            {error}
          </div>
        )}
        
        {uploading && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs">
            Uploading recording...
          </div>
        )}
        
        {startingRecording && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
            ⏳ Waiting for screen permission... Please select what to share.
          </div>
        )}
        
        {shouldAutoStart && !recording && !uploading && !startingRecording && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
            ⚠️ Screen recording is required for this contest. Please start recording.
          </div>
        )}
        
        {uploadSuccessful && !recording && !uploading && !startingRecording && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-xs">
            ✅ Recording completed and uploaded
          </div>
        )}
        
        <div className="flex space-x-2">
          {(!recordingStarted || shouldAutoStart) && !recording && !startingRecording ? (
            <button
              onClick={startRecording}
              disabled={startingRecording}
              className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors disabled:bg-red-300"
            >
              {shouldAutoStart ? 'Start Required Recording' : 'Start Recording'}
            </button>
          ) : recording ? (
            <button
              onClick={stopRecording}
              className="flex-1 bg-gray-800 text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-900 transition-colors"
            >
              Stop
            </button>
          ) : startingRecording ? (
            <button
              disabled
              className="flex-1 bg-gray-400 text-white px-3 py-2 rounded text-sm font-medium"
            >
              Waiting for Permission...
            </button>
          ) : null}
        </div>
        
        <div className="mt-3 text-xs text-gray-600">
          {startingRecording ? 'Waiting for screen permission...' :
           recording ? 'Recording in progress...' : 
           uploadSuccessful ? 'Recording completed and uploaded' :
           shouldAutoStart ? 'Screen recording is required for this contest' :
           'Ready to start recording'}
        </div>
      </div>
    </div>
  );
};

export default ScreenRecorder;