import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { addClient } from "../services/sseService.js";

const router = express.Router();

/**
 * GET /api/events/stream
 * SSE endpoint. Authenticated via session cookie (EventSource sends cookies automatically).
 */
router.get("/stream", requireAuth, (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });

    // Send initial connection confirmation
    res.write("event: connected\ndata: {}\n\n");

    addClient(res);

    req.on("close", () => {
        // Client cleanup handled in sseService.addClient
    });
});

export default router;
