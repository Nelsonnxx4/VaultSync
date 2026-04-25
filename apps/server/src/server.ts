import { createServer } from "node:http";

import { Server } from "socket.io";

import type {
  ClientToServerEvents,
  Collaborator,
  JoinDashboardPayload,
  PresenceSnapshot,
  ServerToClientEvents,
} from "../../../shared/types";
import { createApp } from "./app";
import { mockDashboardSummary } from "./data/mockDashboard";

const PORT = Number(process.env.PORT ?? 3000);
const app = createApp();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

const seedCollaborators = [...mockDashboardSummary.collaborators];
const activeCollaborators = new Map<string, Collaborator>();

function buildPresenceSnapshot(): PresenceSnapshot {
  return {
    collaborators: [...seedCollaborators, ...activeCollaborators.values()],
    activeUsers: seedCollaborators.length + activeCollaborators.size,
  };
}

function createLiveCollaborator(
  socketId: string,
  payload: JoinDashboardPayload,
): Collaborator {
  return {
    id: socketId,
    name: payload.name,
    role: payload.role,
    color: "#2563eb",
    status: "online",
  };
}

io.on("connection", (socket) => {
  socket.emit("presence:snapshot", buildPresenceSnapshot());

  socket.on("dashboard:join", (payload) => {
    const collaborator = createLiveCollaborator(socket.id, payload);
    activeCollaborators.set(socket.id, collaborator);
    io.emit("presence:snapshot", buildPresenceSnapshot());
  });

  socket.on("disconnect", () => {
    activeCollaborators.delete(socket.id);
    io.emit("presence:snapshot", buildPresenceSnapshot());
  });
});

httpServer.listen(PORT, () => {
  console.log(`VaultSync server listening on http://localhost:${PORT}`);
});
