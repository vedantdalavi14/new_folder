import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Share2, 
  Copy, 
  Wifi, 
  ArrowRightLeft, 
  Download,
  CheckCircle, 
  AlertCircle,
  FolderOpen,
  X,
  ChevronDown,
  ChevronUp,
  QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { socketManager } from '@/lib/socket';
import { WebRTCManager, FileTransferProgress } from '@/lib/webrtc';
import { apiRequest } from '@/lib/queryClient';

interface P2PFileSenderProps {
  roomId?: string;
  isReceiver?: boolean;
}

type ConnectionState = 'idle' | 'waiting' | 'connecting' | 'connected' | 'transferring' | 'completed' | 'error';

export function P2PFileSender({ roomId: initialRoomId, isReceiver = false }: P2PFileSenderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [roomId, setRoomId] = useState<string>(initialRoomId || '');
  const [shareableLink, setShareableLink] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [transferProgress, setTransferProgress] = useState<FileTransferProgress | null>(null);
  const [error, setError] = useState<string>('');
  const [showTechnicalInfo, setShowTechnicalInfo] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [receivedFile, setReceivedFile] = useState<{ blob: Blob; name: string } | null>(null);
  
  // WebRTC and Socket management
  const [webrtcManager] = useState(() => {
    console.log('📡 WebRTC Manager created');
    return new WebRTCManager();
  });
  const [peerId, setPeerId] = useState<string>('');

  useEffect(() => {
    console.log('🚀 P2PFileSender initialized', { initialRoomId, isReceiver });
    
    webrtcManager.onProgress(setTransferProgress);
    webrtcManager.onConnectionStateChange((state) => {
      if (state === 'connected') setConnectionState('connected');
      if (state === 'disconnected' || state === 'failed') setConnectionState('error');
    });

    // Setup file received handler
    webrtcManager.onFileReceived((file, fileName) => {
      console.log(`✅ File received: ${fileName}`, file);
      toast({
        title: "File Received",
        description: `${fileName} has been successfully downloaded.`,
      });
      setConnectionState('completed');
      setReceivedFile({ blob: file, name: fileName });
      downloadFile(file, fileName);
    });

    if (initialRoomId && isReceiver) {
      joinRoom(initialRoomId);
    }

    return () => {
      webrtcManager.close();
      socketManager.disconnect();
    };
  }, [initialRoomId, isReceiver]);

  const handleFileSelect = useCallback((file: File) => {
    console.log('📄 File selected:', { 
      name: file.name, 
      size: file.size, 
      type: file.type 
    });
    setSelectedFile(file);
    setError('');
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const createRoom = async () => {
    console.log('🏠 Creating new room...');
    try {
      const response = await apiRequest('POST', '/api/rooms');
      const room = await response.json();
      console.log('✅ Room created:', room.id);
      setRoomId(room.id);
      
      const currentDomain = window.location.origin;
      const link = `${currentDomain}/room/${room.id}`;
      setShareableLink(link);
      console.log('🔗 Share link generated:', link);
      
      // Connect to signaling server and join room
      console.log('🔌 Connecting to signaling server...');
      const socket = socketManager.connect();
      socket.emit('join-room', room.id);
      console.log('🚪 Joined room as sender:', room.id);
      
      setupSocketListeners();
      setConnectionState('waiting');
      console.log('⏳ Waiting for receiver to join...');
      
      toast({
        title: "Room Created",
        description: `Room ${room.id} is ready for file sharing`,
      });
      
      return room.id;
    } catch (error) {
      console.error('❌ Failed to create room:', error);
      setError('Failed to create room');
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive"
      });
    }
  };

  const joinRoom = async (roomIdToJoin: string) => {
    console.log('🚪 Attempting to join room:', roomIdToJoin);
    try {
      const response = await apiRequest('GET', `/api/rooms/${roomIdToJoin}`);
      if (!response.ok) {
        throw new Error('Room not found');
      }
      console.log('✅ Room exists, joining as receiver');
      
      setRoomId(roomIdToJoin);
      setConnectionState('connecting');
      
      // Connect to signaling server and join room
      console.log('🔌 Connecting to signaling server as receiver...');
      const socket = socketManager.connect();
      socket.emit('join-room', roomIdToJoin);
      console.log('📡 Emitted join-room event for:', roomIdToJoin);
      
      setupSocketListeners();
      console.log('👂 Socket listeners set up for receiver');
      
      toast({
        title: "Joined Room",
        description: `Connected to room ${roomIdToJoin}`,
      });
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      setError('Failed to join room');
      setConnectionState('error');
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive"
      });
    }
  };

  const setupSocketListeners = () => {
    console.log('👂 Setting up socket listeners...');
    const socket = socketManager.getSocket();
    if (!socket) {
      console.error('❌ No socket available for listeners');
      return;
    }

    socket.on('peer-joined', async (joinedPeerId: string) => {
      console.log('👋 Peer joined room:', joinedPeerId);
      setPeerId(joinedPeerId);
      
      // Setup ICE candidate handler with the known peer ID
      console.log('🧊 Setting up ICE candidate handler for peer:', joinedPeerId);
      webrtcManager.onIceCandidate((candidate) => {
        console.log('🧊 Sending ICE candidate to peer:', joinedPeerId);
        socket.emit('webrtc-ice-candidate', {
          roomId,
          candidate: candidate.toJSON(),
          targetId: joinedPeerId
        });
      });
      
      if (!isReceiver) {
        // Sender creates offer
        console.log('📤 Sender creating WebRTC offer for peer:', joinedPeerId);
        try {
          webrtcManager.createDataChannels();
          console.log('📺 Data channels created');
          const offer = await webrtcManager.createOffer();
          console.log('📨 WebRTC offer created, sending to peer');
          socket.emit('webrtc-offer', {
            roomId,
            offer,
            targetId: joinedPeerId
          });
          setConnectionState('connecting');
          console.log('🔄 Connection state set to connecting');
        } catch (error) {
          console.error('❌ Error creating offer:', error);
          setError('Failed to establish connection');
        }
      }
    });

    socket.on('room-participants', (participants: string[]) => {
      console.log('📊 Room participants updated:', participants.length);
      setPeerCount(participants.length);
      if (participants.length > 0 && isReceiver) {
        const targetPeerId = participants[0];
        console.log('🎯 Receiver identified sender peer:', targetPeerId);
        setPeerId(targetPeerId);
        
        // Setup ICE candidate handler for receiver
        console.log('🧊 Setting up ICE candidate handler for receiver');
        webrtcManager.onIceCandidate((candidate) => {
          console.log('🧊 Receiver sending ICE candidate to sender:', targetPeerId);
          socket.emit('webrtc-ice-candidate', {
            roomId,
            candidate: candidate.toJSON(),
            targetId: targetPeerId
          });
        });
      }
    });

    socket.on('webrtc-offer', async (data: { offer: RTCSessionDescriptionInit; fromId: string }) => {
      console.log('📥 Received WebRTC offer from sender:', data.fromId);
      try {
        console.log('🔄 Processing offer and creating answer...');
        const answer = await webrtcManager.createAnswer(data.offer);
        console.log('📤 Sending WebRTC answer back to sender');
        socket.emit('webrtc-answer', {
          roomId,
          answer,
          targetId: data.fromId
        });
        
        webrtcManager.onDataChannel((channel) => {
          console.log('📺 Data channel established on receiver side');
          setConnectionState('connected');
        });
        
      } catch (error) {
        console.error('❌ Error handling WebRTC offer:', error);
        setError('Failed to establish connection');
      }
    });

    socket.on('webrtc-answer', async (data: { answer: RTCSessionDescriptionInit; fromId: string }) => {
      console.log('📥 Received WebRTC answer from receiver:', data.fromId);
      try {
        console.log('🔄 Processing answer and finalizing connection...');
        await webrtcManager.handleAnswer(data.answer);
        console.log('✅ WebRTC connection established successfully');
        setConnectionState('connected');
      } catch (error) {
        console.error('❌ Error handling WebRTC answer:', error);
        setError('Failed to establish connection');
      }
    });

    socket.on('webrtc-ice-candidate', async (data: { candidate: RTCIceCandidateInit; fromId: string }) => {
      console.log('🧊 Received ICE candidate from peer:', data.fromId);
      try {
        await webrtcManager.addIceCandidate(data.candidate);
        console.log('✅ ICE candidate added successfully');
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
      }
    });

    socket.on('peer-left', (leftPeerId: string) => {
      console.log('👋 Peer left the room:', leftPeerId);
      setPeerCount(prev => Math.max(0, prev - 1));
      if (leftPeerId === peerId) {
        console.log('💔 Our connected peer left, resetting connection');
        setConnectionState('idle');
        setPeerId('');
      }
    });
  };

  const handleSendFile = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to send",
        variant: "destructive"
      });
      return;
    }

    try {
      const createdRoomId = await createRoom();
      if (!createdRoomId) return;
      
      // Wait for connection to be established
      const checkConnection = () => {
        if (webrtcManager.getConnectionState() === 'connected') {
          sendFile();
        } else {
          setTimeout(checkConnection, 1000);
        }
      };
      
      checkConnection();
      
    } catch (error) {
      setError('Failed to send file');
      toast({
        title: "Error",
        description: "Failed to send file",
        variant: "destructive"
      });
    }
  };

  const sendFile = async () => {
    if (!selectedFile || !webrtcManager) return;
    console.log('🚀 Initiating file send via WebRTC data channel');
    setConnectionState('transferring');
    try {
      await webrtcManager.sendFile(selectedFile);
      console.log('✅ File send process completed on sender side');
      setConnectionState('completed');
    } catch (err: any) {
      console.error('❌ File transfer failed:', err);
      setError(`File transfer failed: ${err.message}`);
      setConnectionState('error');
      toast({
        title: "Transfer Error",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const downloadFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      toast({
        title: "Link Copied",
        description: "Shareable link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const retryConnection = () => {
    setError('');
    setConnectionState('idle');
    setTransferProgress(null);
    webrtcManager.close();
    socketManager.disconnect();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getConnectionStatusInfo = () => {
    switch (connectionState) {
      case 'idle':
        return { icon: AlertCircle, text: 'Ready to connect', color: 'text-gray-500' };
      case 'waiting':
        return { icon: AlertCircle, text: 'Waiting for receiver...', color: 'text-orange-500' };
      case 'connecting':
        return { icon: Wifi, text: 'Establishing connection...', color: 'text-blue-500' };
      case 'connected':
        return { icon: CheckCircle, text: 'Connected', color: 'text-green-500' };
      case 'transferring':
        return { icon: ArrowRightLeft, text: 'Transferring file...', color: 'text-blue-500' };
      case 'completed':
        return { icon: CheckCircle, text: 'Transfer complete', color: 'text-green-500' };
      case 'error':
        return { icon: AlertCircle, text: 'Connection error', color: 'text-red-500' };
      default:
        return { icon: AlertCircle, text: 'Unknown state', color: 'text-gray-500' };
    }
  };

  if (isReceiver) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">P2P File Receiver</h1>
          <p className="text-gray-600">Receiving file via WebRTC</p>
        </div>

        {/* Receiver Header */}
        <Card className="mb-6">
          <CardContent className="pt-6 text-center">
            <Download className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">File Transfer</h2>
            <p className="text-gray-600">
              {connectionState === 'connecting' ? 'Connecting to sender...' : 
               connectionState === 'connected' ? 'Connected! Waiting for file...' :
               connectionState === 'transferring' ? 'Receiving file...' :
               connectionState === 'completed' ? 'Transfer complete!' :
               connectionState === 'error' ? 'Connection failed' :
               'Connecting...'}
            </p>
          </CardContent>
        </Card>

        {/* Connection Process */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Connection Process</h3>
            
            <div className="space-y-3">
              <div className={`flex items-center p-3 rounded-lg border ${
                connectionState === 'connected' || connectionState === 'transferring' || connectionState === 'completed'
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <CheckCircle className={`mr-3 ${
                  connectionState === 'connected' || connectionState === 'transferring' || connectionState === 'completed'
                    ? 'text-green-500' 
                    : 'text-gray-300'
                }`} />
                <span className={`font-medium ${
                  connectionState === 'connected' || connectionState === 'transferring' || connectionState === 'completed'
                    ? 'text-green-500' 
                    : 'text-gray-400'
                }`}>
                  Connected to signaling server
                </span>
              </div>
              
              <div className={`flex items-center p-3 rounded-lg border ${
                connectionState === 'connecting'
                  ? 'bg-orange-50 border-orange-200'
                  : connectionState === 'connected' || connectionState === 'transferring' || connectionState === 'completed'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                {connectionState === 'connecting' ? (
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-3 animate-pulse" />
                ) : (
                  <CheckCircle className={`mr-3 ${
                    connectionState === 'connected' || connectionState === 'transferring' || connectionState === 'completed'
                      ? 'text-green-500' 
                      : 'text-gray-300'
                  }`} />
                )}
                <span className={`font-medium ${
                  connectionState === 'connecting'
                    ? 'text-orange-500'
                    : connectionState === 'connected' || connectionState === 'transferring' || connectionState === 'completed'
                    ? 'text-green-500'
                    : 'text-gray-400'
                }`}>
                  {connectionState === 'connecting' ? 'Establishing peer connection...' : 'Peer connection established'}
                </span>
              </div>
              
              <div className={`flex items-center p-3 rounded-lg border ${
                connectionState === 'transferring' || connectionState === 'completed'
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                {connectionState === 'transferring' ? (
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse" />
                ) : (
                  <CheckCircle className={`mr-3 ${
                    connectionState === 'completed' ? 'text-green-500' : 'text-gray-300'
                  }`} />
                )}
                <span className={`font-medium ${
                  connectionState === 'transferring'
                    ? 'text-blue-500'
                    : connectionState === 'completed'
                    ? 'text-green-500'
                    : 'text-gray-400'
                }`}>
                  {connectionState === 'transferring' ? 'Receiving file...' : 
                   connectionState === 'completed' ? 'File received!' : 'Waiting for file transfer...'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Reception */}
        {(transferProgress || connectionState === 'completed') && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Download className="text-primary mr-2" />
                Receiving File
              </h3>

              {transferProgress && (
                <>
                  {/* File Info */}
                  <div className="flex items-center p-4 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 break-all">{transferProgress.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {formatBytes(transferProgress.fileSize)} • {transferProgress.fileName.split('.').pop()?.toUpperCase()} Document
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">From sender</p>
                      <p className="text-xs text-gray-400">Room: {roomId}</p>
                    </div>
                  </div>

                  {/* Download Progress */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Download Progress</span>
                      <span>{Math.round(transferProgress.percentage)}%</span>
                    </div>
                    <Progress value={transferProgress.percentage} className="h-3" />
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                      <div>Speed: <span className="font-medium">{formatSpeed(transferProgress.speed)}</span></div>
                      <div>ETA: <span className="font-medium">{formatTime(transferProgress.timeRemaining)}</span></div>
                    </div>
                  </div>
                </>
              )}

              {/* Auto-download Notice */}
              <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg">
                <p className="text-sm text-green-700 flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  File will automatically download when transfer is complete
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {connectionState === 'completed' && (
          <Card className="text-center">
            <CardContent className="pt-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Transfer Complete!</h3>
              <p className="text-gray-600 mb-4">Your file has been downloaded successfully</p>
              <Button onClick={() => receivedFile && downloadFile(receivedFile.blob, receivedFile.name)}>
                <Download className="mr-2 h-4 w-4" />
                Download Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {connectionState === 'error' && (
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-start">
                <AlertCircle className="text-red-500 text-xl mr-3 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-red-500 mb-2">Connection Error</h3>
                  <p className="text-gray-600 mb-4">{error || 'Failed to establish peer connection. Please check your network and try again.'}</p>
                  <Button variant="destructive" onClick={retryConnection}>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Retry Connection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">P2P File Sender</h1>
        <p className="text-gray-600">Share files directly between devices using WebRTC</p>
      </div>

      {/* File Selection Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Upload className="text-primary mr-2" />
            Select File to Send
          </h2>
          
          {/* File Drop Zone */}
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop your file here, or</p>
            <Button variant="outline">
              Choose File
            </Button>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          {/* Selected File Display */}
          {selectedFile && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-white text-xs font-medium">
                    {selectedFile.name.split('.').pop()?.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 break-all">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatBytes(selectedFile.size)}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={removeFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Send Button */}
          <Button 
            className="w-full mt-4" 
            onClick={handleSendFile}
            disabled={!selectedFile || connectionState === 'transferring'}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Send File
          </Button>
        </CardContent>
      </Card>

      {/* Share Link Card */}
      {shareableLink && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Share2 className="text-primary mr-2" />
              Share This Link
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Link Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shareable Link</label>
                <div className="flex">
                  <Input 
                    value={shareableLink} 
                    readOnly 
                    className="flex-1 rounded-r-none bg-gray-50 font-mono text-sm"
                  />
                  <Button onClick={copyLink} className="rounded-l-none">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Share this link with the recipient</p>

                {/* Room ID */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room ID</label>
                  <Badge variant="secondary" className="font-mono">{roomId}</Badge>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">QR Code</label>
                <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                  <QRCodeSVG value={shareableLink} size={128} />
                </div>
                <p className="text-xs text-gray-500 mt-2">Scan to open link</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Status Card */}
      {connectionState !== 'idle' && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Wifi className="text-primary mr-2" />
              Connection Status
            </h2>

            {/* Status Indicators */}
            <div className="space-y-4">
              {(() => {
                const { icon: StatusIcon, text, color } = getConnectionStatusInfo();
                return (
                  <div className={`flex items-center p-3 rounded-lg border ${
                    connectionState === 'waiting' ? 'bg-orange-50 border-orange-200' :
                    connectionState === 'connecting' ? 'bg-blue-50 border-blue-200' :
                    connectionState === 'connected' || connectionState === 'completed' ? 'bg-green-50 border-green-200' :
                    connectionState === 'error' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    {connectionState === 'waiting' || connectionState === 'connecting' ? (
                      <div className="w-3 h-3 bg-orange-500 rounded-full mr-3 animate-pulse" />
                    ) : (
                      <StatusIcon className={`mr-3 ${color}`} />
                    )}
                    <span className={`font-medium ${color}`}>{text}</span>
                  </div>
                );
              })()}

              {/* WebRTC Connection Steps */}
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <CheckCircle className="text-green-500 mr-2 h-4 w-4" />
                  <span className="text-gray-700">Room created</span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className={`mr-2 h-4 w-4 ${
                    connectionState === 'connected' || connectionState === 'transferring' || connectionState === 'completed' 
                      ? 'text-green-500' : 'text-gray-300'
                  }`} />
                  <span className={connectionState === 'connected' || connectionState === 'transferring' || connectionState === 'completed' 
                    ? 'text-gray-700' : 'text-gray-400'}>
                    Peer connection established
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className={`mr-2 h-4 w-4 ${
                    connectionState === 'transferring' || connectionState === 'completed' 
                      ? 'text-green-500' : 'text-gray-300'
                  }`} />
                  <span className={connectionState === 'transferring' || connectionState === 'completed' 
                    ? 'text-gray-700' : 'text-gray-400'}>
                    WebRTC channel established
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className={`mr-2 h-4 w-4 ${
                    connectionState === 'completed' ? 'text-green-500' : 'text-gray-300'
                  }`} />
                  <span className={connectionState === 'completed' ? 'text-gray-700' : 'text-gray-400'}>
                    File transfer complete
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfer Progress Card */}
      {transferProgress && connectionState === 'transferring' && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <ArrowRightLeft className="text-primary mr-2" />
              File Transfer
            </h2>

            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Sending {transferProgress.fileName}</span>
                  <span>{Math.round(transferProgress.percentage)}%</span>
                </div>
                <Progress value={transferProgress.percentage} />
              </div>

              {/* Transfer Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Speed:</span>
                  <span className="font-medium ml-1">{formatSpeed(transferProgress.speed)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Remaining:</span>
                  <span className="font-medium ml-1">{formatTime(transferProgress.timeRemaining)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Sent:</span>
                  <span className="font-medium ml-1">{formatBytes(transferProgress.bytesTransferred)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total:</span>
                  <span className="font-medium ml-1">{formatBytes(transferProgress.fileSize)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Handling */}
      {connectionState === 'error' && (
        <Card className="border-red-200 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start">
              <AlertCircle className="text-red-500 text-xl mr-3 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-red-500 mb-2">Connection Error</h3>
                <p className="text-gray-600 mb-4">{error || 'Failed to establish peer connection. Please check your network and try again.'}</p>
                <Button variant="destructive" onClick={retryConnection}>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Retry Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Info (Collapsible) */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-between p-0"
            onClick={() => setShowTechnicalInfo(!showTechnicalInfo)}
          >
            <h3 className="text-lg font-semibold text-gray-800">Technical Information</h3>
            {showTechnicalInfo ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
          </Button>
          
          {showTechnicalInfo && (
            <div className="mt-4 space-y-4">
              <Separator />
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Connection Details</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>Protocol: <code className="bg-gray-100 px-1 rounded">WebRTC DataChannel</code></div>
                    <div>Signaling: <code className="bg-gray-100 px-1 rounded">Socket.IO</code></div>
                    <div>Encryption: <code className="bg-gray-100 px-1 rounded">DTLS/SRTP</code></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Transfer Info</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>Chunk Size: <code className="bg-gray-100 px-1 rounded">16KB</code></div>
                    <div>Storage: <code className="bg-gray-100 px-1 rounded">No server storage</code></div>
                    <div>Direct P2P: <code className="bg-gray-100 px-1 rounded">End-to-end</code></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer complete for sender */}
      {connectionState === 'completed' && !isReceiver && (
        <Card className="mb-6">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Transfer Complete!</h2>
            <p className="text-gray-600 mb-4 break-all">
              <span className="font-medium">{selectedFile?.name}</span> was sent successfully.
            </p>
            <Button onClick={() => {
              setSelectedFile(null);
              setConnectionState('idle');
              setShareableLink('');
              setTransferProgress(null);
            }}>
              <Upload className="mr-2 h-4 w-4" />
              Send Another File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
