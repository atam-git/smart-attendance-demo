import express from "express";
import { spawn } from "child_process";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8081;
const RTSP_URL = process.env.RTSP_URL;

if (!RTSP_URL) {
  console.error("❌ Error: RTSP_URL is not defined in .env");
  process.exit(1);
}

app.use(cors());

let activeProcess = null;
let clients = [];

// Home route
app.get("/", (req, res) =>
  res.json({ message: "Server running", status: "active" })
);

// SSE for live status updates
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.push(res);
  console.log(`🟢 Client connected to /events (${clients.length} total)`);

  req.on("close", () => {
    clients = clients.filter((client) => client !== res);
    console.log(`🔴 Client disconnected from /events (${clients.length} left)`);
  });
});

function broadcastEvent(data) {
  clients.forEach((client) =>
    client.write(`data: ${JSON.stringify(data)}\n\n`)
  );
}

// ✅ Fix: Proper RTSP Camera Availability Check
async function checkCameraAvailability() {
  return new Promise((resolve, reject) => {
    console.log("🔍 Checking RTSP Camera Availability...");

    const testProcess = spawn("ffmpeg", [
      "-rtsp_transport",
      "tcp",
      "-i",
      RTSP_URL,
      "-t",
      "1",
      "-f",
      "null",
      "-",
    ]);

    let timeout = setTimeout(() => {
      console.log("⏳ Timeout: RTSP Camera check took too long. Aborting.");
      testProcess.kill("SIGKILL");
      reject(false);
    }, 10000); // ⏳ Increased timeout to 10s

    testProcess.stdout.on("data", () => {
      // ✅ If FFmpeg starts sending data, it's working → Clear timeout
      clearTimeout(timeout);
      console.log("✅ RTSP Camera Found: Stream is active.");
      testProcess.kill("SIGKILL"); // Stop test process immediately
      resolve(true);
    });

    testProcess.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        console.log("✅ RTSP Camera Found: Stream is active.");
        resolve(true);
      } else {
        console.error("❌ RTSP Camera not found!");
        reject(false);
      }
    });

    testProcess.on("error", (err) => {
      clearTimeout(timeout);
      console.error("❌ FFmpeg error:", err);
      reject(false);
    });
  });
}

// Start the RTSP stream
app.get("/start-stream", async (req, res) => {
  if (activeProcess) {
    return res.json({ message: "Stream already running", status: "active" });
  }

  try {
    const cameraAvailable = await checkCameraAvailability();
    if (!cameraAvailable) {
      return res
        .status(400)
        .json({ message: "RTSP Camera not available", status: "error" });
    }

    console.log("🔄 Starting FFmpeg stream...");
    activeProcess = spawn("ffmpeg", [
      "-rtsp_transport",
      "tcp",
      "-i",
      RTSP_URL,
      "-vf",
      "scale=640:360",
      "-f",
      "mjpeg",
      "pipe:1",
      "-loglevel",
      "error",
    ]);

    activeProcess.on("error", (err) => {
      console.error("❌ FFmpeg error:", err);
      broadcastEvent({ message: "Stream failed to start", status: "error" });
      activeProcess = null;
    });

    activeProcess.on("close", (code) => {
      console.log(`⚠️ FFmpeg exited with code ${code}`);
      activeProcess = null;
      if (code !== 0) {
        broadcastEvent({ message: "Stream failed", status: "error" });
      }
    });

    return res.json({ message: "Stream starting...", status: "active" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "RTSP Camera not responding", status: "error" });
  }
});

// Serve the video stream
app.get("/stream", (req, res) => {
  if (!activeProcess) {
    return res.status(400).json({ message: "Stream is not running" });
  }

  res.setHeader("Content-Type", "multipart/x-mixed-replace; boundary=frame");

  const onData = (chunk) => {
    res.write(`--frame\r\nContent-Type: image/jpeg\r\n\r\n`);
    res.write(chunk);
    res.write("\r\n");
  };

  activeProcess.stdout.on("data", onData);

  req.on("close", () => {
    console.log("🔴 Client disconnected from /stream");

    if (activeProcess) {
      activeProcess.stdout.off("data", onData);
    }

    res.end();
  });
});

// Stop the stream
app.get("/stop-stream", (req, res) => {
  if (activeProcess) {
    console.log("🛑 Stopping FFmpeg...");
    activeProcess.kill("SIGKILL");
    activeProcess = null;
    broadcastEvent({ message: "Stream stopped", status: "inactive" });
  }
  return res.json({ message: "Stream stopped", status: "stopped" });
});

// Start the server
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
