// src/pages/InterviewSession.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import c from 'react-syntax-highlighter/dist/esm/languages/hljs/c';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('rust', rust);

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
  const connectedParticipantsRef = useRef({});

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

  // Code examples
  const codeExamples = {
    python: [
      { name: 'Hello World', code: 'print("Hello, World!")' },
      { name: 'Fibonacci', code: 'def fibonacci(n):\n    if n <= 1:\n        return n\n    else:\n        return fibonacci(n-1) + fibonacci(n-2)\n\nprint(fibonacci(10))' },
      { name: 'Bubble Sort', code: 'def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr\n\nprint(bubble_sort([64, 34, 25, 12, 22, 11, 90]))' }
    ],
    java: [
      { name: 'Hello World', code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
      { name: 'Fibonacci', code: 'public class Fibonacci {\n    public static int fibonacci(int n) {\n        if (n <= 1) {\n            return n;\n        }\n        return fibonacci(n-1) + fibonacci(n-2);\n    }\n    public static void main(String[] args) {\n        System.out.println(fibonacci(10));\n    }\n}' },
      { name: 'Bubble Sort', code: 'public class BubbleSort {\n    static void bubbleSort(int arr[]) {\n        int n = arr.length;\n        for (int i = 0; i < n - 1; i++) {\n            for (int j = 0; j < n - i - 1; j++) {\n                if (arr[j] > arr[j + 1]) {\n                    int temp = arr[j];\n                    arr[j] = arr[j + 1];\n                    arr[j + 1] = temp;\n                }\n            }\n        }\n    }\n    public static void main(String[] args) {\n        int arr[] = {64, 34, 25, 12, 22, 11, 90};\n        bubbleSort(arr);\n        for (int i = 0; i < arr.length; i++) {\n            System.out.print(arr[i] + " ");\n        }\n    }\n}' }
    ],
    cpp: [
      { name: 'Hello World', code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
      { name: 'Fibonacci', code: '#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n-1) + fibonacci(n-2);\n}\n\nint main() {\n    cout << fibonacci(10) << endl;\n    return 0;\n}' },
      { name: 'Bubble Sort', code: '#include <iostream>\nusing namespace std;\n\nvoid bubbleSort(int arr[], int n) {\n    for (int i = 0; i < n - 1; i++) {\n        for (int j = 0; j < n - i - 1; j++) {\n            if (arr[j] > arr[j + 1]) {\n                int temp = arr[j];\n                arr[j] = arr[j + 1];\n                arr[j + 1] = temp;\n            }\n        }\n    }\n}\n\nint main() {\n    int arr[] = {64, 34, 25, 12, 22, 11, 90};\n    int n = sizeof(arr) / sizeof(arr[0]);\n    bubbleSort(arr, n);\n    for (int i = 0; i < n; i++) {\n        cout << arr[i] << " ";\n    }\n    cout << endl;\n    return 0;\n}' }
    ],
    c: [
      { name: 'Hello World', code: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
      { name: 'Fibonacci', code: '#include <stdio.h>\n\nint fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n-1) + fibonacci(n-2);\n}\n\nint main() {\n    printf("%d\\n", fibonacci(10));\n    return 0;\n}' },
      { name: 'Bubble Sort', code: '#include <stdio.h>\n\nvoid bubbleSort(int arr[], int n) {\n    for (int i = 0; i < n-1; i++) {\n        for (int j = 0; j < n-i-1; j++) {\n            if (arr[j] > arr[j+1]) {\n                int temp = arr[j];\n                arr[j] = arr[j+1];\n                arr[j+1] = temp;\n            }\n        }\n    }\n}\n\nint main() {\n    int arr[] = {64, 34, 25, 12, 22, 11, 90};\n    int n = sizeof(arr) / sizeof(arr[0]);\n    bubbleSort(arr, n);\n    for (int i = 0; i < n; i++) {\n        printf("%d ", arr[i]);\n    }\n    printf("\\n");\n    return 0;\n}' }
    ],
    javascript: [
      { name: 'Hello World', code: 'console.log("Hello, World!");' },
      { name: 'Fibonacci', code: 'function fibonacci(n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n-1) + fibonacci(n-2);\n}\n\nconsole.log(fibonacci(10));' },
      { name: 'Bubble Sort', code: 'function bubbleSort(arr) {\n    const n = arr.length;\n    for (let i = 0; i < n - 1; i++) {\n        for (let j = 0; j < n - i - 1; j++) {\n            if (arr[j] > arr[j + 1]) {\n                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];\n            }\n        }\n    }\n    return arr;\n}\n\nconsole.log(bubbleSort([64, 34, 25, 12, 22, 11, 90]));' }
    ],
    go: [
      { name: 'Hello World', code: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}' },
      { name: 'Fibonacci', code: 'package main\nimport "fmt"\n\nfunc fibonacci(n int) int {\n    if n <= 1 {\n        return n\n    }\n    return fibonacci(n-1) + fibonacci(n-2)\n}\n\nfunc main() {\n    fmt.Println(fibonacci(10))\n}' },
      { name: 'Bubble Sort', code: 'package main\nimport "fmt"\n\nfunc bubbleSort(arr []int) {\n    n := len(arr)\n    for i := 0; i < n-1; i++ {\n        for j := 0; j < n-i-1; j++ {\n            if arr[j] > arr[j+1] {\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n            }\n        }\n    }\n}\n\nfunc main() {\n    arr := []int{64, 34, 25, 12, 22, 11, 90}\n    bubbleSort(arr)\n    fmt.Println(arr)\n}' }
    ],
    rust: [
      { name: 'Hello World', code: 'fn main() {\n    println!("Hello, world!");\n}' },
      { name: 'Fibonacci', code: 'fn fibonacci(n: u32) -> u32 {\n    match n {\n        0 => 0,\n        1 => 1,\n        _ => fibonacci(n-1) + fibonacci(n-2)\n    }\n}\n\nfn main() {\n    println!("{}", fibonacci(10));\n}' },
      { name: 'Bubble Sort', code: 'fn bubble_sort(arr: &mut [i32]) {\n    let n = arr.len();\n    for i in 0..n {\n        for j in 0..n-i-1 {\n            if arr[j] > arr[j+1] {\n                arr.swap(j, j+1);\n            }\n        }\n    }\n}\n\nfn main() {\n    let mut arr = [64, 34, 25, 12, 22, 11, 90];\n    bubble_sort(&mut arr);\n    println!("{:?}", arr);\n}' }
    ]
  };

  const [selectedExample, setSelectedExample] = useState('');

  // Connection status state
  const [videoConnectionStatus, setVideoConnectionStatus] = useState('connecting'); // 'connected' | 'disconnected' | 'connecting'
  const [codeConnectionStatus, setCodeConnectionStatus] = useState('connecting');
  const [peerConnectionStatus, setPeerConnectionStatus] = useState('connecting');

  // UI state
  const [participants, setParticipants] = useState([]);
  const [permissionState, setPermissionState] = useState({ audio: 'prompt', video: 'prompt' });
  const [error, setError] = useState('');

  const myRoleLabel = role === 'interviewer' ? 'Interviewer' : 'Candidate';
  const remoteRoleLabel = role === 'interviewer' ? 'Candidate' : 'Interviewer';


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


  const handlePDFUpload = useCallback(async (e) => {
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
      console.log('Uploading PDF:', file.name, 'size:', file.size);
      const res = await fetch(`/api/pdf/upload/session/${sessionId}/`, {
        method: 'POST',
        body: formData,
      });

      console.log('POST response status:', res.status);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log('PDF upload SUCCESS:', data);

      setPdfUrl(data.url);
      setPdfUploader(data.uploader_email);
    } catch (err) {
      console.error('PDF upload failed:', err);
      alert(`Failed to upload PDF: ${err.message}`);
    }
  }, [sessionId]);

  const createAndSendOffer = useCallback(async () => {
    if (!pc.current || pc.current.signalingState !== 'stable') {
      console.log('PeerConnection not ready for offer');
      return;
    }
    
    try {
      console.log('Creating offer...');
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'offer',
          offer: pc.current.localDescription
        }));
        console.log('Offer sent to remote participant');
      }
    } catch (err) {
      console.error('Failed to create offer:', err);
    }
  }, []);

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


  const initCodeSync = useCallback(() => {
    const codeSocket = new WebSocket(`ws://localhost:8000/ws/code/${sessionId}/`);
    codeWs.current = codeSocket;

    codeSocket.onopen = () => {
      console.log('IDE WebSocket connected');
      setCodeConnectionStatus('connected');
    };

    codeSocket.onmessage = (event) => {
      console.log('IDE WS Message:', event.data);
      const data = JSON.parse(event.data);
      if (data.type === 'code_update') {
        setCode(data.code);
        setLanguage(data.language);
      }
    };

    codeSocket.onclose = () => {
      console.log('IDE WebSocket disconnected');
      setCodeConnectionStatus('disconnected');
      // Auto-reconnect after 2s
      setTimeout(() => {
        if (codeWs.current?.readyState !== WebSocket.OPEN) {
          initCodeSync();
        }
      }, 2000);
    };

    codeSocket.onerror = (e) => {
      console.error('IDE WebSocket error:', e);
      setCodeConnectionStatus('disconnected');
    };

    return () => {
      codeSocket.close();
    };
  }, [sessionId]);


  const debouncedSync = useRef(null);
  const syncCode = useCallback((newCode, newLang) => {
    if (debouncedSync.current) clearTimeout(debouncedSync.current);
    debouncedSync.current = setTimeout(() => {
      if (codeWs.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket sending:', { type: 'code_update', code: newCode.substring(0, 30) + '...', language: newLang });
        codeWs.current.send(JSON.stringify({
          type: 'code_update',
          code: newCode,
          language: newLang
        }));
      }
    }, 500);
  }, []);


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
        setOutput(`Error:\n${data.error}`);
      } else {
        setOutput(
          `Output:\n${data.output || '(no output)'}\n\n` +
          `Memory: ${data.memory} | CPU Time: ${data.cpuTime}`
        );
      }
    } catch (err) {
      setOutput(`Compilation failed: ${err.message}`);
    } finally {
      setIsCompiling(false);
    }
  };


  useEffect(() => {
    let cleanupScheduled = false;

    const init = async () => {
      await checkPermissions();
      await fetchLatestPDF();
      initCodeSync();

      try {
        const constraints = { 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }, 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true 
          } 
        };
        
        console.log('Requesting media devices with constraints:', constraints);
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        if (cleanupScheduled) return;
        
        console.log('Media devices acquired:', {
          videoTracks: s.getVideoTracks().length,
          audioTracks: s.getAudioTracks().length,
          videoDevice: s.getVideoTracks()[0]?.label || 'Unknown',
          audioDevice: s.getAudioTracks()[0]?.label || 'Unknown'
        });

        streamRef.current = s;
        setLocalAudioActive(true);
        setLocalVideoActive(true);
        setError(''); // Clear any previous errors

        // Ensure video element gets the stream with proper handling
        if (localVideoRef.current) {
          // Use a temporary variable to avoid race conditions
          const videoElement = localVideoRef.current;
          videoElement.srcObject = s;
          
          // Handle play promise to avoid uncaught exceptions
          if (videoElement.paused) {
            videoElement.play().catch(e => {
              console.warn('Auto-play prevented:', e);
              // On mobile devices, video might not autoplay until user interaction
              // This is expected behavior
            });
          }
        }
        
        console.log('Media devices successfully initialized');

        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pc.current = peerConnection;
        
        // Add local tracks to peer connection
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            console.log('Adding local track to peer connection:', track.kind);
            peerConnection.addTrack(track, streamRef.current);
          });
        }



        const websocket = new WebSocket(`ws://localhost:8000/ws/video/${sessionId}/?role=${role}&email=${encodeURIComponent(email)}`);
        ws.current = websocket;

        websocket.onopen = () => {
          console.log(`WebSocket connected as ${role} (${email})`);
          setVideoConnectionStatus('connected');
          
          // Wait a moment for participant list to sync
          setTimeout(() => {
            const participantCount = Object.keys(connectedParticipantsRef.current).length;
            console.log(`Current participants: ${participantCount}`);
            
            // If we're the only one, wait for others
            // If both are here, initiate connection
            if (participantCount >= 2) {
              // Both participants present - initiate connection
              console.log('Both participants detected, initiating connection...');
              setTimeout(() => {
                createAndSendOffer();
              }, 500);
            }
          }, 1000);
        };

        websocket.onclose = () => {
          console.log('Video WebSocket disconnected');
          setVideoConnectionStatus('disconnected');
          // Optional: auto-reconnect
        };

        websocket.onerror = (e) => {
          console.error('Video WebSocket error:', e);
          setVideoConnectionStatus('disconnected');
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
            console.log('PDF received:', data.pdf_url);
            setPdfUrl(data.pdf_url);
            setPdfUploader(data.uploader_email);
          }
          else if (data.type === 'media_update' && data.role !== role) {
            if (data.media_type === 'audio') setRemoteAudioEnabled(data.enabled);
            if (data.media_type === 'video') setRemoteVideoEnabled(data.enabled);
          }
          else if (data.type === 'participant_list') {
            // Update participant tracking
            connectedParticipantsRef.current = data.participants.reduce((acc, p) => {
              acc[p.email] = p.role;
              return acc;
            }, {});
            
            setParticipants(data.participants);
            
            // When a new participant joins and we're already connected
            if (data.count === 2 && pc.current?.signalingState === 'stable') {
              console.log('New participant joined, initiating connection...');
              setTimeout(() => {
                createAndSendOffer();
              }, 500);
            }
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
            console.log('Sending ICE candidate');
            websocket.send(JSON.stringify({
              type: 'ice_candidate',
              ice_candidate: e.candidate
            }));
          }
        };
        
        // Handle ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', peerConnection.iceConnectionState);
          if (peerConnection.iceConnectionState === 'connected') {
            console.log('ICE connection established!');
          } else if (peerConnection.iceConnectionState === 'failed') {
            console.warn('ICE connection failed');
          }
        };

        peerConnection.onconnectionstatechange = () => {
          console.log('PeerConnection state:', peerConnection.connectionState);
          setPeerConnectionStatus(peerConnection.connectionState);
          
          // Handle connection failures
          if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
            console.warn('Peer connection failed, attempting reconnect...');
            setTimeout(() => {
              if (websocket.readyState === WebSocket.OPEN) {
                createAndSendOffer();
              }
            }, 2000);
          } else if (peerConnection.connectionState === 'connected') {
            console.log('Peer connection established successfully!');
          }
        };

        peerConnection.onsignalingstatechange = () => {
          console.log('Signaling state:', peerConnection.signalingState);
        };
        
        // Log track events
        peerConnection.ontrack = (event) => {
          console.log('Received remote track:', event.track.kind);
          if (event.track.kind === 'video' && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            console.log('Remote video stream set');
          }
        };
        
        // Add local tracks to peer connection
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            console.log('Adding local track:', track.kind);
            peerConnection.addTrack(track, streamRef.current);
          });
        }



      } catch (err) {
        console.error('Media/init failed:', err);
        
        // Don't show error if we already have a working stream
        if (streamRef.current) {
          console.log('Already have working media stream, clearing error');
          setError('');
          return;
        }
        
        // Detailed error messages based on error type
        let msg = 'Failed to access camera/microphone.';
        
        switch (err.name) {
          case 'NotAllowedError':
            msg = 'Camera/microphone access denied. Please:\n' +
                  '1. Click the camera/microphone icon in the address bar\n' +
                  '2. Select "Allow" for camera and microphone\n' +
                  '3. Refresh the page';
            break;
          case 'NotFoundError':
            msg = 'No camera or microphone detected. Please:\n' +
                  '1. Check if devices are properly connected\n' +
                  '2. Ensure no other application is using them\n' +
                  '3. Try restarting your computer';
            break;
          case 'NotReadableError':
            msg = 'Camera/microphone is being used by another application. Please:\n' +
                  '1. Close other applications using camera/microphone\n' +
                  '2. Check browser extensions that might block access\n' +
                  '3. Restart your browser';
            break;
          case 'OverconstrainedError':
            msg = 'Requested media settings not supported. Trying with basic settings...';
            setError(msg); // Show temporary message
            
            // Try with basic constraints
            setTimeout(async () => {
              try {
                const basicStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = basicStream;
                setLocalAudioActive(true);
                setLocalVideoActive(true);
                
                if (localVideoRef.current) {
                  localVideoRef.current.srcObject = basicStream;
                  localVideoRef.current.play().catch(e => console.warn('Auto-play prevented:', e));
                }
                
                console.log('Successfully connected with basic camera/microphone settings');
                setError(''); // Clear error on success
              } catch (basicErr) {
                console.error('Basic constraints also failed:', basicErr);
                setError(`Could not access media devices: ${basicErr.message}`);
              }
            }, 100);
            return;
          case 'SecurityError':
            msg = 'Security error. Please:\n' +
                  '1. Make sure you\'re using HTTPS (or localhost)\n' +
                  '2. Check browser security settings\n' +
                  '3. Try in incognito/private browsing mode';
            break;
          default:
            msg = `Media device error (${err.name}): ${err.message}\n` +
                  'Please check browser permissions and device availability.';
        }
        
        console.log('Media error details:', {
          name: err.name,
          message: err.message,
          constraint: err.constraintName
        });
        
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

      // Properly clean up video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [sessionId, role, email, checkPermissions, fetchLatestPDF, initCodeSync]);


  const toggleVideo = async () => {
    const s = streamRef.current;
    if (!s) return;

    const videoTracks = s.getVideoTracks();
    if (videoTracks.length === 0) return;

    const track = videoTracks[0];

    if (track.enabled) {
      // 👉 Turn OFF
      track.enabled = false;  // Disable the track instead of stopping it
      setLocalVideoActive(false);

      // ✅ Send update
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'media_update',
          media_type: 'video',
          enabled: false
        }));
      }
    } else {
      // 👉 Turn ON
      track.enabled = true;  // Enable the track instead of creating a new stream
      setLocalVideoActive(true);

      // Ensure the video element has the correct stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = s;
        
        // Handle play promise to avoid uncaught exceptions
        if (localVideoRef.current.paused) {
          localVideoRef.current.play().catch(e => {
            console.warn('Auto-play prevented for local video after toggle:', e);
          });
        }
      }

      // ✅ Add to WebRTC if not already added
      if (pc.current) {
        const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.current.addTrack(track, s);
        }
      }

      // ✅ Send update
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'media_update',
          media_type: 'video',
          enabled: true
        }));
      }
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

    // Toggle the track enabled state
    track.enabled = newState;
    setLocalAudioActive(newState);

    // Update WebRTC audio sender
    if (pc.current) {
      const sender = pc.current.getSenders().find(s => s.track?.kind === 'audio');
      if (sender) {
        sender.track.enabled = newState;
      }
    }

    // Send update to remote peer
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'media_update',
        media_type: 'audio',
        enabled: newState
      }));
    }
  };


  const getMediaIcon = (enabled, type) => {
    if (type === 'audio') {
      return enabled ? <FaMicrophone style={{ fontSize: '1.2em' }} /> : <FaMicrophoneSlash style={{ fontSize: '1.2em' }} />;
    }
    return enabled ? <FaVideo style={{ fontSize: '1.2em' }} /> : <FaVideoSlash style={{ fontSize: '1.2em' }} />;
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
    setSelectedExample('');
    syncCode(code, newLang);
  };

  // ✅ Handle example change
  const handleExampleChange = (e) => {
    const exampleName = e.target.value;
    setSelectedExample(exampleName);
    
    if (exampleName) {
      const example = codeExamples[language].find(ex => ex.name === exampleName);
      if (example) {
        setCode(example.code);
        syncCode(example.code, language);
      }
    }
  };

  // Effect to ensure local video stream is always assigned to the video element
  useEffect(() => {
    if (localVideoRef.current && streamRef.current) {
      const videoElement = localVideoRef.current;
      videoElement.srcObject = streamRef.current;
      
      // Handle play promise to avoid uncaught exceptions
      if (videoElement.srcObject && videoElement.paused) {
        videoElement.play().catch(e => {
          console.warn('Auto-play prevented for local video:', e);
        });
      }
    }
  }, [localVideoActive, streamRef.current]);

  // Effect to handle remote video when stream changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteVideoEnabled) {
      // The actual remote stream will be assigned in the ontrack event
      // This effect is mainly for handling play state
      const videoElement = remoteVideoRef.current;
      if (videoElement.paused && videoElement.srcObject) {
        videoElement.play().catch(e => {
          console.warn('Auto-play prevented for remote video:', e);
        });
      }
    }
  }, [remoteVideoEnabled]);

  // Effect to ensure audio track is properly handled
  useEffect(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
        audioTrack.enabled = localAudioActive;
        
        // Update WebRTC audio sender if it exists
        if (pc.current) {
          const sender = pc.current.getSenders().find(s => s.track?.kind === 'audio');
          if (sender && sender.track) {
            sender.track.enabled = localAudioActive;
          }
        }
      }
    }
  }, [localAudioActive]);

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
            <strong style={{ fontSize: '1.1em', color: '#1e293b' }}>Shared Document</strong>
            {pdfUploader && <span style={{ marginLeft: '10px', color: '#64748b', fontSize: '0.9em' }}>by {pdfUploader.split('@')[0]}</span>}
          </div>

          {role === 'interviewer' && (
            <label style={{
              background: '#1e40af',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95em',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(30,64,175,0.3)',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              Upload PDF
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
            <iframe
              key={absolutePdfUrl} /* Prevent re-render when other state changes */
              src={absolutePdfUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="PDF Viewer"
              onError={(e) => {
                console.error('PDF embed error:', e);
                // Fallback to direct link
                window.open(absolutePdfUrl, '_blank');
              }}
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
                <p style={{ fontSize: '1.1em', marginBottom: '8px' }}>No PDF shared yet.</p>
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
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
          <option value="javascript">JavaScript</option>
          <option value="go">Go</option>
          <option value="rust">Rust</option>
        </select>
                
        <select
          value={selectedExample}
          onChange={handleExampleChange}
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
          <option value="">Select Example</option>
          {codeExamples[language]?.map((example, index) => (
            <option key={index} value={example.name}>{example.name}</option>
          ))}
        </select>

        <button
          onClick={compile}
          disabled={isCompiling}
          style={{
            padding: '12px 20px',
            background: isCompiling ? '#475569' : '#1e40af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isCompiling ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '0.95em',
            boxShadow: isCompiling ? 'none' : '0 4px 6px rgba(30,64,175,0.3)'
          }}
        >
          {isCompiling ? 'Running...' : '▶Run Code'}
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
        <div style={{
          position: 'relative',
          flex: 1,
          background: '#020817',
          border: '1px solid #334155',
          borderRadius: '10px',
          overflow: 'hidden',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '14.5px',
          lineHeight: '1.6'
        }}>
          <textarea
            value={code}
            onChange={handleCodeChange}
            spellCheck="false"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'transparent',
              color: 'transparent',
              caretColor: '#e2e8f0',
              padding: '16px',
              border: 'none',
              outline: 'none',
              resize: 'none',
              zIndex: 2,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit'
            }}
            placeholder="// Start coding here..."
          />
          <SyntaxHighlighter
            language={language}
            style={atomOneDark}
            customStyle={{
              margin: 0,
              padding: '16px',
              background: 'transparent',
              borderRadius: 0,
              height: '100%',
              overflow: 'auto',
              position: 'relative',
              zIndex: 1,
              border: 'none'
            }}
            codeTagProps={{
              style: {
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit'
              }
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
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
              background: 'linear-gradient(135deg, #1e40af, #1e3a8a)',
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
            <div style={{ position: 'relative', width: '100%', height: '220px' }}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={
                  {
                    width: '100%',
                    height: '220px',
                    objectFit: 'cover',
                    background: '#0f172a',
                    display: localVideoActive ? 'block' : 'none',
                    opacity: localVideoActive ? 1 : 0
                  }
                }
              />
              {!localVideoActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '220px',
                  background: '#0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.2em',
                  fontWeight: '600'
                }}>
                  <div style={{ fontSize: '2em', marginBottom: '10px' }}><FaVideoSlash /></div>
                  <div>Camera Off</div>
                </div>
              )}
            </div>
          </div>

          {/* Remote Video */}
          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            background: '#1e293b'
          }}>
            <div style={
              {
                background: 'linear-gradient(135deg, #1e40af, #1e3a8a)',
                color: 'white',
                padding: '12px 16px',
                fontSize: '0.95em',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }
            }>
              {getMediaIcon(remoteAudioEnabled, 'audio')}
              {getMediaIcon(remoteVideoEnabled, 'video')}
              {remoteRoleLabel}
            </div>
            <div style={{ position: 'relative', width: '100%', height: '220px' }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                style={
                  {
                    width: '100%',
                    height: '220px',
                    objectFit: 'cover',
                    background: '#0f172a',
                    display: remoteVideoEnabled ? 'block' : 'none',
                    opacity: remoteVideoEnabled ? 1 : 0
                  }
                }
              />
              {!remoteVideoEnabled && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '220px',
                  background: '#0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.2em',
                  fontWeight: '600'
                }}>
                  <div style={{ fontSize: '2em', marginBottom: '10px' }}><FaVideoSlash /></div>
                  <div>Remote Camera Off</div>
                </div>
              )}
            </div>
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
                padding: '12px 20px',
                background: localVideoActive ? '#1e40af' : '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95em',
                boxShadow: '0 4px 6px rgba(30,64,175,0.3)'
              }}
            >
              {localVideoActive ? 'Turn Off Camera' : 'Turn On Camera'}
            </button>

            <button
              onClick={toggleAudio}
              disabled={permissionState.audio === 'denied'}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: localAudioActive ? '#1e40af' : '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95em',
                boxShadow: '0 4px 6px rgba(30,64,175,0.3)'
              }}
            >
              {localAudioActive ? 'Mute Mic' : 'Unmute Mic'}
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
            Participants ({participants.length}/2)
          </strong>
          {participants.map((p, i) => (
            <div key={i} style={{ margin: '8px 0', color: '#475569' }}>
              <strong>{p.role.charAt(0).toUpperCase() + p.role.slice(1)}:</strong> {p.email.split('@')[0]}
            </div>
          ))}
        </div>

        {/* Connection Status */}
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          fontSize: '0.9em'
        }}>
          <strong style={{ display: 'block', marginBottom: '10px', color: '#1e293b' }}>
            Connection Status
          </strong>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: videoConnectionStatus === 'connected' ? '#10b981' : 
                         videoConnectionStatus === 'disconnected' ? '#ef4444' : '#f59e0b'
              }} />
              <span>Video WS: <strong>{videoConnectionStatus}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: codeConnectionStatus === 'connected' ? '#10b981' : 
                         codeConnectionStatus === 'disconnected' ? '#ef4444' : '#f59e0b'
              }} />
              <span>Code WS: <strong>{codeConnectionStatus}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: peerConnectionStatus === 'connected' ? '#10b981' : 
                         peerConnectionStatus === 'failed' ? '#ef4444' : '#f59e0b'
              }} />
              <span>WebRTC: <strong>{peerConnectionStatus}</strong></span>
            </div>
          </div>

          {videoConnectionStatus === 'disconnected' && (
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85em',
                cursor: 'pointer'
              }}
            >
              Reconnect
            </button>
          )}
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
            {error}
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