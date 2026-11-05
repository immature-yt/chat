const { getSql } = require("../lib/db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sql = getSql();

    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        author TEXT NOT NULL CHECK (author IN ('him', 'her')),
        body TEXT NOT NULL CHECK (char_length(body) <= 2000),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at)
    `;

    return res.status(200).json({
      ok: true,
      message: "messages table is ready",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message || "Setup failed",
    });
  }
};
