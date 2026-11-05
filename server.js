/**
 * Local helper so you can test with Neon without Vercel CLI.
 * Production on Vercel uses /api/messages.js instead.
 */
require("dotenv").config();
const express = require("express");
const path = require("path");
const messages = require("./api/messages");

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.all("/api/messages", (req, res) => messages(req, res));
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Ours (Neon) at http://localhost:${PORT}`);
});
