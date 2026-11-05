const { neon } = require("@neondatabase/serverless");

function getSql() {
  const url = process.env.OURS_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("OURS_DATABASE_URL is not set");
  }
  return neon(url);
}

module.exports = { getSql };
