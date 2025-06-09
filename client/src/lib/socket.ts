import { io, Socket } from "socket.io-client";

class SocketManager {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${window.location.protocol}//${window.location.host}`;
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketManager = new SocketManager();
