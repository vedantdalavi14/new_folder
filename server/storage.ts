import { users, rooms, type User, type InsertUser, type Room, type InsertRoom } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(id: string): Promise<Room | undefined>;
  deactivateRoom(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rooms: Map<string, Room>;
  currentUserId: number;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.currentUserId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const room: Room = {
      ...insertRoom,
      createdAt: new Date(),
      isActive: true,
    };
    this.rooms.set(room.id, room);
    return room;
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async deactivateRoom(id: string): Promise<void> {
    const room = this.rooms.get(id);
    if (room) {
      room.isActive = false;
      this.rooms.set(id, room);
    }
  }
}

export const storage = new MemStorage();
