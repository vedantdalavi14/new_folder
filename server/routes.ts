import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { insertRoomSchema } from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Room management for signaling
  const activeRooms = new Map<string, Set<string>>();

  // API Routes
  app.post("/api/rooms", async (req, res) => {
    try {
      const roomId = nanoid(8);
      const roomData = insertRoomSchema.parse({ id: roomId });
      const room = await storage.createRoom(roomData);
      activeRooms.set(roomId, new Set());
      res.json(room);
    } catch (error) {
      res.status(400).json({ error: "Failed to create room" });
    }
  });

  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const room = await storage.getRoom(id);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ error: "Failed to get room" });
    }
  });

  // Socket.IO signaling for WebRTC
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-room", (roomId: string) => {
      console.log(`Client ${socket.id} joining room ${roomId}`);
      socket.join(roomId);
      
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Set());
      }
      
      const roomClients = activeRooms.get(roomId)!;
      roomClients.add(socket.id);
      
      // Notify others in the room
      socket.to(roomId).emit("peer-joined", socket.id);
      
      // Send current participants to the new client
      socket.emit("room-participants", Array.from(roomClients).filter(id => id !== socket.id));
    });

    socket.on("webrtc-offer", (data: { roomId: string; offer: RTCSessionDescriptionInit; targetId: string }) => {
      console.log(`WebRTC offer from ${socket.id} to ${data.targetId} in room ${data.roomId}`);
      socket.to(data.targetId).emit("webrtc-offer", {
        offer: data.offer,
        fromId: socket.id
      });
    });

    socket.on("webrtc-answer", (data: { roomId: string; answer: RTCSessionDescriptionInit; targetId: string }) => {
      console.log(`WebRTC answer from ${socket.id} to ${data.targetId} in room ${data.roomId}`);
      socket.to(data.targetId).emit("webrtc-answer", {
        answer: data.answer,
        fromId: socket.id
      });
    });

    socket.on("webrtc-ice-candidate", (data: { roomId: string; candidate: RTCIceCandidateInit; targetId: string }) => {
      console.log(`ICE candidate from ${socket.id} to ${data.targetId} in room ${data.roomId}`);
      socket.to(data.targetId).emit("webrtc-ice-candidate", {
        candidate: data.candidate,
        fromId: socket.id
      });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      
      // Remove from all rooms
      for (const [roomId, clients] of activeRooms.entries()) {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);
          socket.to(roomId).emit("peer-left", socket.id);
          
          // Clean up empty rooms
          if (clients.size === 0) {
            activeRooms.delete(roomId);
            storage.deactivateRoom(roomId);
          }
        }
      }
    });
  });

  return httpServer;
}
