const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "messages.json");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

function loadMessages() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2), "utf8");
}

let messages = loadMessages();

io.on("connection", (socket) => {
  socket.emit("history", messages);

  socket.on("message", (payload) => {
    const text = typeof payload?.text === "string" ? payload.text.trim() : "";
    const from = payload?.from === "her" ? "her" : payload?.from === "him" ? "him" : null;

    if (!text || !from || text.length > 2000) return;

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from,
      text,
      at: new Date().toISOString(),
    };

    messages.push(message);
    saveMessages(messages);
    io.emit("message", message);
  });

  socket.on("clear", () => {
    messages = [];
    saveMessages(messages);
    io.emit("cleared");
  });
});

server.listen(PORT, () => {
  console.log(`Ours is running at http://localhost:${PORT}`);
});
