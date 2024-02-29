const fs = require("fs");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const logFilePath = "logsfile.log";
let lastReadPosition = 0;

fs.watch(logFilePath, (eventType, filename) => {
  var stats = fs.statSync("logsfile.log");
  if (!stats.size) return;

  // console.log("stats.size",stats.size)

  if (eventType === "change") {
    console.log("lastread", lastReadPosition);
    const readStream = fs.createReadStream(logFilePath, { start: lastReadPosition });
    readStream.on("data", (chunk) => {
    //   console.log("chunks", chunk.toString());
      const lines = chunk.toString().split("\n");

      lines.forEach((line) => {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(line);
          }
        });
      });
    });

    if (stats.size) lastReadPosition = stats.size;
    // console.log("readStream",readStream)
  }
});

function readLastLines(filePath, n) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const lines = fileContent.trim().split("\n");
  const startIndex = Math.max(lines.length - n, 0);
  return lines.slice(startIndex);
}

app.use(express.static("client/build"));

wss.on("connection", (ws) => {
  const lastLines = readLastLines(logFilePath, 10);
  lastLines.forEach((line) => {
    ws.send(line);
  });

  var stats = fs.statSync("logsfile.log");
  if (stats.size) lastReadPosition = stats.size;
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
