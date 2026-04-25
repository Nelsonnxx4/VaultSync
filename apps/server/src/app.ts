import cors from "cors";
import express from "express";
import helmet from "helmet";

import { mockDashboardSummary } from "./data/mockDashboard";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "vaultsync-server",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/dashboard/summary", (_request, response) => {
    response.json(mockDashboardSummary);
  });

  return app;
}
