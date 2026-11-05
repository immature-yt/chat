const { neon } = require("@neondatabase/serverless");

function getSql() {
  // Prefer a dedicated name so this chat can share a Vercel project
  // with another app that already uses POSTGRES_* / DATABASE_URL.
  const url = process.env.OURS_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("OURS_DATABASE_URL is not set");
  }
  return neon(url);
}

function mapRow(row) {
  return {
    id: row.id,
    from: row.author,
    text: row.body,
    at: row.created_at,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const sql = getSql();

    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, author, body, created_at
        FROM messages
        ORDER BY created_at ASC
      `;
      return res.status(200).json(rows.map(mapRow));
    }

    if (req.method === "POST") {
      const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
      const from =
        req.body?.from === "her" ? "her" : req.body?.from === "him" ? "him" : null;

      if (!text || !from || text.length > 2000) {
        return res.status(400).json({ error: "Invalid message" });
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const rows = await sql`
        INSERT INTO messages (id, author, body)
        VALUES (${id}, ${from}, ${text})
        RETURNING id, author, body, created_at
      `;

      return res.status(201).json(mapRow(rows[0]));
    }

    if (req.method === "DELETE") {
      await sql`DELETE FROM messages`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
};
