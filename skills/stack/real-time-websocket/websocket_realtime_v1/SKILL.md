---
name: websocket_realtime_v1
description: WebSocket patterns, real-time communication, connection management, scaling, pub/sub, and production WebSocket architecture
version: 1.0.0
tags: [websocket, real-time, pubsub, scaling, connection-management, socket-io, ws]
category: stack
triggers:
  keywords: [websocket, real-time, live updates, push notifications, socket, wss]
  filePatterns: [websocket/*.ts, socket/*.ts, real-time/*.ts, ws/*.ts]
  commands: [websocket setup, real-time implementation]
  projectArchetypes: [chat-application, collaboration-tool, live-dashboard, trading-platform, gaming]
  modes: [greenfield, refactor, scaling]
prerequisites:
  - rest_api_design_v1
  - event_driven_v1
  - redis_caching_skill_v1
recommended_structure:
  directories:
    - src/websocket/
    - src/websocket/handlers/
    - src/websocket/middleware/
    - src/websocket/adapters/
workflow:
  setup:
    - Define real-time requirements
    - Select WebSocket library
    - Design message protocol
    - Plan scaling strategy
  generate:
    - Implement connection handling
    - Create message handlers
    - Add authentication
    - Set up pub/sub
  test:
    - Connection tests
    - Message delivery tests
    - Load tests
    - Reconnection tests
best_practices:
  - Use WSS in production
  - Implement heartbeat/ping-pong
  - Handle reconnection gracefully
  - Use rooms/namespaces for grouping
  - Implement backpressure handling
  - Monitor connection metrics
  - Plan for horizontal scaling
anti_patterns:
  - No connection limits
  - Missing authentication
  - No heartbeat mechanism
  - Storing state in memory only
  - No reconnection strategy
  - Ignoring backpressure
  - Not handling disconnections
tools:
  - ws (WebSocket)
  - Socket.IO
  - uWebSockets.js
  - Redis Pub/Sub
metrics:
  - Active connections
  - Message throughput
  - Connection duration
  - Reconnection rate
  - Message delivery latency
  - Error rate
---

# WebSocket Real-Time Skill

## Overview

This skill provides comprehensive guidance on implementing real-time communication using WebSockets, including connection management, message protocols, scaling strategies, pub/sub patterns, reconnection handling, and production-ready WebSocket architecture.

WebSockets provide full-duplex communication channels over a single TCP connection, enabling real-time features like chat, live updates, collaboration, and notifications.

## When to Use

- **Chat applications** requiring instant messaging
- **Live dashboards** with real-time data updates
- **Collaboration tools** (shared editing, whiteboards)
- **Gaming** with real-time interactions
- **Trading platforms** with live price updates
- **Notifications** requiring instant delivery

## When NOT to Use

- **Request-response** only communication (use REST/GraphQL)
- **Infrequent updates** (use Server-Sent Events or polling)
- **One-way updates** from server (consider SSE)
- **When firewall compatibility** is critical (SSE over HTTP)

---

## Core Concepts

### 1. WebSocket Connection Management

```typescript
// Basic WebSocket server with ws library
import WebSocket, { WebSocketServer } from 'ws';
import { parse } from 'url';

interface Client extends WebSocket {
  id: string;
  userId?: string;
  rooms: Set<string>;
  isAlive: boolean;
  connectedAt: Date;
}

class WebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port, path: '/ws' });
    this.setupHeartbeat();
    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(ws: Client, req: IncomingMessage) {
    // Generate client ID
    ws.id = this.generateId();
    ws.rooms = new Set();
    ws.isAlive = true;
    ws.connectedAt = new Date();

    // Store connection
    this.clients.set(ws.id, ws);

    // Handle messages
    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('close', () => this.handleClose(ws));
    ws.on('error', (error) => this.handleError(ws, error));
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Send connection acknowledgment
    this.send(ws, {
      type: 'connected',
      payload: { clientId: ws.id, timestamp: Date.now() }
    });

    console.log(`Client connected: ${ws.id}`);
  }

  private handleMessage(ws: Client, data: WebSocket.Data) {
    try {
      const message = JSON.parse(data.toString());
      
      // Route message based on type
      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(ws, message.payload);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, message.payload);
          break;
        case 'message':
          this.handleClientMessage(ws, message.payload);
          break;
        case 'ping':
          this.send(ws, { type: 'pong' });
          break;
        default:
          this.send(ws, { 
            type: 'error', 
            payload: { message: 'Unknown message type' } 
          });
      }
    } catch (error) {
      this.send(ws, { 
        type: 'error', 
        payload: { message: 'Invalid message format' } 
      });
    }
  }

  private handleClose(ws: Client) {
    // Remove from all rooms
    for (const room of ws.rooms) {
      this.removeFromRoom(ws, room);
    }
    
    // Remove client
    this.clients.delete(ws.id);
    console.log(`Client disconnected: ${ws.id}`);
  }

  private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws: Client) => {
        if (!ws.isAlive) {
          return this.terminate(ws);
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(this.heartbeatInterval);
    });
  }

  // Broadcast to all clients
  broadcast(message: object, filter?: (ws: Client) => boolean) {
    const data = JSON.stringify(message);
    this.wss.clients.forEach((ws: Client) => {
      if (ws.readyState === WebSocket.OPEN && (!filter || filter(ws))) {
        ws.send(data);
      }
    });
  }

  // Send to specific client
  send(ws: Client, message: object) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Send to room
  sendToRoom(room: string, message: object) {
    const data = JSON.stringify(message);
    this.wss.clients.forEach((ws: Client) => {
      if (ws.rooms.has(room) && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  private generateId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 2. Authentication

```typescript
// Token-based authentication
import jwt from 'jsonwebtoken';

class AuthenticatedWebSocketServer extends WebSocketServer {
  private handleConnection(ws: Client, req: IncomingMessage) {
    // Extract token from query or header
    const url = parse(req.url!, true);
    const token = url.query.token as string || req.headers['sec-websocket-protocol'];

    // Authenticate before upgrading
    try {
      const user = this.verifyToken(token);
      ws.userId = user.id;
      
      // Store user connection mapping
      this.userConnections.set(user.id, ws);
      
      super.handleConnection(ws, req);
    } catch (error) {
      ws.close(4001, 'Authentication failed');
    }
  }

  private verifyToken(token: string): User {
    return jwt.verify(token, process.env.JWT_SECRET!) as User;
  }

  // User connection tracking
  private userConnections: Map<string, Client> = new Map();

  // Send to specific user
  sendToUser(userId: string, message: object) {
    const ws = this.userConnections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      this.send(ws, message);
    }
  }

  // Handle multiple sessions per user
  private userSessions: Map<string, Set<Client>> = new Map();

  private registerUserSession(userId: string, ws: Client) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(ws);
  }

  broadcastToUser(userId: string, message: object) {
    const sessions = this.userSessions.get(userId);
    if (sessions) {
      sessions.forEach(ws => this.send(ws, message));
    }
  }
}
```

### 3. Room/Channel Management

```typescript
class RoomManager {
  private rooms: Map<string, Set<Client>> = new Map();
  private clientRooms: Map<Client, Set<string>> = new Map();

  join(client: Client, room: string) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    
    this.rooms.get(room)!.add(client);
    
    if (!this.clientRooms.has(client)) {
      this.clientRooms.set(client, new Set());
    }
    this.clientRooms.get(client)!.add(room);
    
    client.rooms.add(room);
  }

  leave(client: Client, room: string) {
    this.rooms.get(room)?.delete(client);
    this.clientRooms.get(client)?.delete(room);
    client.rooms.delete(room);

    // Clean up empty room
    if (this.rooms.get(room)?.size === 0) {
      this.rooms.delete(room);
    }
  }

  leaveAll(client: Client) {
    const rooms = this.clientRooms.get(client);
    if (rooms) {
      rooms.forEach(room => this.leave(client, room));
    }
  }

  getRoomMembers(room: string): Client[] {
    return Array.from(this.rooms.get(room) || []);
  }

  getMemberCount(room: string): number {
    return this.rooms.get(room)?.size || 0;
  }

  broadcastToRoom(room: string, message: object, exclude?: Client) {
    const data = JSON.stringify(message);
    this.rooms.get(room)?.forEach(client => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}

// Usage in WebSocket server
class RoomWebSocketServer extends WebSocketServer {
  private roomManager = new RoomManager();

  private handleSubscribe(ws: Client, payload: { room: string }) {
    this.roomManager.join(ws, payload.room);
    this.send(ws, {
      type: 'subscribed',
      payload: { room: payload.room }
    });

    // Notify others in room
    this.roomManager.broadcastToRoom(payload.room, {
      type: 'user_joined',
      payload: { userId: ws.userId, room: payload.room }
    }, ws);
  }

  private handleUnsubscribe(ws: Client, payload: { room: string }) {
    this.roomManager.leave(ws, payload.room);
    this.send(ws, {
      type: 'unsubscribed',
      payload: { room: payload.room }
    });
  }

  private handleClientMessage(ws: Client, payload: { room: string; content: string }) {
    // Only send if in room
    if (ws.rooms.has(payload.room)) {
      this.roomManager.broadcastToRoom(payload.room, {
        type: 'message',
        payload: {
          userId: ws.userId,
          content: payload.content,
          timestamp: Date.now()
        }
      });
    }
  }
}
```

### 4. Socket.IO Implementation

```typescript
// Socket.IO provides more features out of the box
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware for authentication
io.use((socket: Socket, next) => {
  const token = socket.handshake.auth.token;
  
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!) as User;
    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket: Socket) => {
  const user = socket.data.user;
  console.log(`User connected: ${user.id}`);

  // Join user-specific room
  socket.join(`user:${user.id}`);

  // Handle joining rooms
  socket.on('room:join', (room: string) => {
    socket.join(room);
    socket.to(room).emit('user:joined', {
      userId: user.id,
      room
    });
  });

  // Handle leaving rooms
  socket.on('room:leave', (room: string) => {
    socket.leave(room);
    socket.to(room).emit('user:left', {
      userId: user.id,
      room
    });
  });

  // Handle messages
  socket.on('message', (data: { room: string; content: string }) => {
    socket.to(data.room).emit('message', {
      userId: user.id,
      content: data.content,
      timestamp: Date.now()
    });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${user.id}, reason: ${reason}`);
    
    // Notify rooms
    socket.rooms.forEach(room => {
      if (!room.startsWith('user:')) {
        socket.to(room).emit('user:left', {
          userId: user.id,
          room
        });
      }
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for user ${user.id}:`, error);
  });
});

// Server-side emit examples
function notifyUser(userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data);
}

function notifyRoom(room: string, event: string, data: any, excludeUserId?: string) {
  if (excludeUserId) {
    io.to(room).except(`user:${excludeUserId}`).emit(event, data);
  } else {
    io.to(room).emit(event, data);
  }
}

function broadcast(event: string, data: any) {
  io.emit(event, data);
}

httpServer.listen(3001);
```

### 5. Scaling with Redis Adapter

```typescript
// For multiple server instances
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

async function setupScaledSocketIO() {
  await Promise.all([pubClient.connect(), subClient.connect()]);

  const httpServer = createServer();
  const io = new Server(httpServer, {
    adapter: createAdapter(pubClient, subClient)
  });

  // Now events are broadcast across all instances
  io.on('connection', (socket) => {
    // Handle connection...
  });

  return { io, httpServer };
}

// Manual Redis pub/sub for custom WebSocket
class ScaledWebSocketServer extends WebSocketServer {
  private redisPub: Redis;
  private redisSub: Redis;
  private serverId: string;

  constructor(port: number, redisUrl: string) {
    super(port);
    this.serverId = `ws_${process.pid}_${Date.now()}`;
    
    this.redisPub = createClient({ url: redisUrl });
    this.redisSub = createClient({ url: redisUrl });
    
    this.setupRedisSub();
  }

  private setupRedisSub() {
    this.redisSub.subscribe('ws:broadcast', (message) => {
      const { serverId, event, data } = JSON.parse(message);
      
      // Don't process own messages
      if (serverId === this.serverId) return;
      
      this.broadcast({ type: event, payload: data });
    });

    this.redisSub.subscribe('ws:rooms:*', (message, channel) => {
      const room = channel.split(':')[2];
      const { serverId, event, data } = JSON.parse(message);
      
      if (serverId === this.serverId) return;
      
      this.sendToRoom(room, { type: event, payload: data });
    });
  }

  broadcast(message: object) {
    // Publish to Redis for other servers
    this.redisPub.publish('ws:broadcast', JSON.stringify({
      serverId: this.serverId,
      event: message.type,
      data: message.payload
    }));

    // Also broadcast locally
    super.broadcast(message);
  }

  sendToRoom(room: string, message: object) {
    // Publish to Redis for other servers
    this.redisPub.publish(`ws:rooms:${room}`, JSON.stringify({
      serverId: this.serverId,
      event: message.type,
      data: message.payload
    }));

    // Also send locally
    super.sendToRoom(room, message);
  }
}
```

### 6. Client-Side Reconnection

```typescript
// Client-side with automatic reconnection
class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: any[] = [];
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
      
      // Flush queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        this.send(message);
      }
    };

    this.ws.onclose = (event) => {
      console.log('Disconnected', event.code, event.reason);
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error', error);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.emit(message.type, message.payload);
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.emit('error', { message: 'Connection failed' });
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  send(type: string, payload: any) {
    const message = { type, payload };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function) {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: string, payload: any) {
    this.eventHandlers.get(event)?.forEach(handler => handler(payload));
  }

  close() {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnect
    this.ws?.close();
  }
}

// Usage
const client = new WebSocketClient('wss://api.example.com/ws');

client.on('connected', (data) => {
  console.log('Connected with ID:', data.clientId);
});

client.on('message', (data) => {
  console.log('Received message:', data);
});

client.on('error', (error) => {
  console.error('Connection error:', error);
});

// Send message
client.send('message', { room: 'general', content: 'Hello!' });
```

### 7. Backpressure Handling

```typescript
class BackpressureWebSocketServer extends WebSocketServer {
  private readonly MAX_BUFFER_SIZE = 1000;
  private clientBuffers: Map<Client, MessageQueue> = new Map();

  send(ws: Client, message: object) {
    if (ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    // Check backpressure
    const buffer = this.getBuffer(ws);
    if (buffer.size >= this.MAX_BUFFER_SIZE) {
      console.warn(`Backpressure detected for client ${ws.id}`);
      return false;
    }

    buffer.enqueue(message);
    this.flushBuffer(ws);
    return true;
  }

  private getBuffer(ws: Client): MessageQueue {
    if (!this.clientBuffers.has(ws)) {
      this.clientBuffers.set(ws, new MessageQueue());
    }
    return this.clientBuffers.get(ws)!;
  }

  private flushBuffer(ws: Client) {
    const buffer = this.getBuffer(ws);

    if (buffer.isFlushing) return;
    buffer.isFlushing = true;

    const flush = () => {
      while (!buffer.isEmpty() && ws.readyState === WebSocket.OPEN) {
        const message = buffer.dequeue();
        ws.send(JSON.stringify(message));
      }

      buffer.isFlushing = false;

      if (!buffer.isEmpty() && ws.readyState === WebSocket.OPEN) {
        setImmediate(flush);
      }
    };

    flush();
  }
}

class MessageQueue {
  private queue: any[] = [];
  isFlushing = false;

  enqueue(message: any) {
    this.queue.push(message);
  }

  dequeue(): any {
    return this.queue.shift();
  }

  get size(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
```

---

## Best Practices

### 1. Use WSS in Production
```typescript
// ✅ Good: Secure WebSocket
const ws = new WebSocket('wss://api.example.com/ws');

// ❌ Bad: Unencrypted (only for local dev)
const ws = new WebSocket('ws://api.example.com/ws');
```

### 2. Implement Proper Cleanup
```typescript
// ✅ Good: Clean up on disconnect
socket.on('disconnect', () => {
  // Leave all rooms
  socket.rooms.forEach(room => socket.leave(room));
  
  // Clear any intervals/timeouts
  if (socket.data.heartbeatInterval) {
    clearInterval(socket.data.heartbeatInterval);
  }
  
  // Notify others
  broadcastToChannels({ type: 'user_left', userId: socket.data.userId });
});
```

### 3. Monitor Connections
```typescript
// Connection metrics
const metrics = {
  activeConnections: io.engine.clientsCount,
  connectionsByRoom: new Map<string, number>(),
  messagesPerSecond: 0
};

setInterval(() => {
  metrics.activeConnections = io.engine.clientsCount;
  
  // Track room sizes
  io.allSockets().then(sockets => {
    sockets.forEach(socketId => {
      const socket = io.sockets.sockets.get(socketId);
      socket?.rooms.forEach(room => {
        if (!room.startsWith('/')) {
          metrics.connectionsByRoom.set(
            room,
            (metrics.connectionsByRoom.get(room) || 0) + 1
          );
        }
      });
    });
  });
}, 5000);
```

---

## Anti-Patterns

### ❌ No Authentication
```typescript
// ❌ Bad: Anyone can connect
io.on('connection', (socket) => {
  // No authentication!
});

// ✅ Good: Authenticate first
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!verifyToken(token)) {
    return next(new Error('Auth failed'));
  }
  next();
});
```

### ❌ No Heartbeat
```typescript
// ❌ Bad: Dead connections not detected
io.on('connection', (socket) => {
  // No ping/pong handling
});

// ✅ Good: Detect dead connections
io.on('connection', (socket) => {
  socket.on('ping', () => socket.emit('pong'));
  
  const interval = setInterval(() => {
    if (!socket.receivedPong) {
      return socket.disconnect();
    }
    socket.receivedPong = false;
    socket.emit('ping');
  }, 30000);
  
  socket.on('pong', () => { socket.receivedPong = true; });
  socket.on('disconnect', () => clearInterval(interval));
});
```

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Active Connections** | Track | Capacity planning |
| **Message Throughput** | Track | Load monitoring |
| **Connection Duration** | Track | Engagement |
| **Reconnection Rate** | <10% | Connection stability |
| **Message Delivery Latency** | <100ms | Real-time quality |
| **Error Rate** | <1% | Reliability |

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **ws** | WebSocket library | Basic WebSocket |
| **Socket.IO** | Real-time framework | Full-featured |
| **uWebSockets.js** | High-performance | Low latency |
| **Redis Adapter** | Scaling | Multi-instance |

---

## Implementation Checklist

### Core
- [ ] WebSocket server configured
- [ ] Connection handling implemented
- [ ] Message protocol defined
- [ ] Authentication added

### Features
- [ ] Room/channel management
- [ ] Heartbeat mechanism
- [ ] Reconnection handling
- [ ] Backpressure handling

### Scaling
- [ ] Redis adapter configured
- [ ] Horizontal scaling planned
- [ ] Load balancing configured

### Operations
- [ ] Monitoring configured
- [ ] Alerting set up
- [ ] Documentation complete

---

## Related Skills

- **REST API Design**: `skills/stack/api-design-rest/rest_api_design_v1/SKILL.md`
- **Event-Driven Architecture**: `skills/architecture/event-driven/event_driven_v1/SKILL.md`
- **Redis Caching**: `skills/stack/redis/redis_caching_skill_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
