export interface FileChunk {
  id: string;
  index: number;
  totalChunks: number;
  data: ArrayBuffer;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface FileTransferProgress {
  fileName: string;
  fileSize: number;
  bytesTransferred: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onProgressCallback: ((progress: FileTransferProgress) => void) | null = null;
  private onFileReceivedCallback: ((file: Blob, fileName: string) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: string) => void) | null = null;
  
  // File transfer state
  private receivedChunks: Map<number, ArrayBuffer> = new Map();
  private expectedChunks = 0;
  private currentFileName = "";
  private currentFileSize = 0;
  private currentFileType = "";
  private transferStartTime = 0;
  private lastProgressTime = 0;
  private lastProgressBytes = 0;

  constructor() {
    this.setupPeerConnection();
  }

  private setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState || 'disconnected';
      console.log('WebRTC connection state:', state);
      this.onConnectionStateChangeCallback?.(state);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated');
      }
    };
  }

  createDataChannel(): RTCDataChannel {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    this.dataChannel = this.peerConnection.createDataChannel('fileTransfer', {
      ordered: true
    });

    this.setupDataChannel(this.dataChannel);
    return this.dataChannel;
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log('Data channel opened');
    };

    channel.onclose = () => {
      console.log('Data channel closed');
    };

    channel.onmessage = (event) => {
      this.handleDataChannelMessage(event.data);
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  onDataChannel(callback: (channel: RTCDataChannel) => void) {
    if (!this.peerConnection) return;
    
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
      callback(event.channel);
    };
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  onIceCandidate(callback: (candidate: RTCIceCandidate) => void) {
    if (!this.peerConnection) return;
    
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        callback(event.candidate);
      }
    };
  }

  async sendFile(file: File) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const chunkSize = 16384; // 16KB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    this.transferStartTime = Date.now();
    this.lastProgressTime = this.transferStartTime;
    this.lastProgressBytes = 0;

    // Send file metadata first
    const metadata = {
      type: 'file-metadata',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks
    };
    
    this.dataChannel.send(JSON.stringify(metadata));

    // Send file in chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      const arrayBuffer = await chunk.arrayBuffer();

      const chunkData: FileChunk = {
        id: `${file.name}_${i}`,
        index: i,
        totalChunks,
        data: arrayBuffer,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      };

      // Send chunk metadata followed by chunk data
      this.dataChannel.send(JSON.stringify({
        type: 'file-chunk-metadata',
        ...chunkData,
        data: undefined // Don't include data in metadata
      }));
      
      this.dataChannel.send(arrayBuffer);

      // Update progress
      const bytesTransferred = end;
      this.updateProgress(file.name, file.size, bytesTransferred);
      
      // Small delay to prevent overwhelming the channel
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Send completion signal
    this.dataChannel.send(JSON.stringify({
      type: 'file-complete',
      fileName: file.name
    }));
  }

  private updateProgress(fileName: string, fileSize: number, bytesTransferred: number) {
    const now = Date.now();
    const timeDiff = (now - this.lastProgressTime) / 1000; // seconds
    const bytesDiff = bytesTransferred - this.lastProgressBytes;
    
    const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
    const percentage = (bytesTransferred / fileSize) * 100;
    const remainingBytes = fileSize - bytesTransferred;
    const timeRemaining = speed > 0 ? remainingBytes / speed : 0;

    const progress: FileTransferProgress = {
      fileName,
      fileSize,
      bytesTransferred,
      percentage,
      speed,
      timeRemaining
    };

    this.onProgressCallback?.(progress);
    
    this.lastProgressTime = now;
    this.lastProgressBytes = bytesTransferred;
  }

  private handleDataChannelMessage(data: any) {
    if (typeof data === 'string') {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'file-metadata') {
          this.receivedChunks.clear();
          this.expectedChunks = message.totalChunks;
          this.currentFileName = message.fileName;
          this.currentFileSize = message.fileSize;
          this.currentFileType = message.fileType;
          this.transferStartTime = Date.now();
          this.lastProgressTime = this.transferStartTime;
          this.lastProgressBytes = 0;
        } else if (message.type === 'file-chunk-metadata') {
          // Chunk metadata received, actual data comes next as ArrayBuffer
        } else if (message.type === 'file-complete') {
          this.reconstructAndDownloadFile();
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    } else if (data instanceof ArrayBuffer) {
      // This is chunk data
      const chunkIndex = this.receivedChunks.size;
      this.receivedChunks.set(chunkIndex, data);
      
      // Update progress
      const bytesReceived = Array.from(this.receivedChunks.values())
        .reduce((total, chunk) => total + chunk.byteLength, 0);
      
      this.updateProgress(this.currentFileName, this.currentFileSize, bytesReceived);
    }
  }

  private reconstructAndDownloadFile() {
    if (this.receivedChunks.size !== this.expectedChunks) {
      console.error('Missing chunks:', this.expectedChunks - this.receivedChunks.size);
      return;
    }

    // Combine all chunks in order
    const chunks: ArrayBuffer[] = [];
    for (let i = 0; i < this.expectedChunks; i++) {
      const chunk = this.receivedChunks.get(i);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    const blob = new Blob(chunks, { type: this.currentFileType });
    this.onFileReceivedCallback?.(blob, this.currentFileName);

    // Reset state
    this.receivedChunks.clear();
    this.expectedChunks = 0;
    this.currentFileName = "";
    this.currentFileSize = 0;
    this.currentFileType = "";
  }

  onProgress(callback: (progress: FileTransferProgress) => void) {
    this.onProgressCallback = callback;
  }

  onFileReceived(callback: (file: Blob, fileName: string) => void) {
    this.onFileReceivedCallback = callback;
  }

  onConnectionStateChange(callback: (state: string) => void) {
    this.onConnectionStateChangeCallback = callback;
  }

  close() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  getConnectionState(): string {
    return this.peerConnection?.connectionState || 'disconnected';
  }
}
