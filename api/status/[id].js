/**
 * Vercel Serverless Dynamic Route: GET /api/status/[id]
 */

const store = require('../../lib/store');

module.exports = async function handler(req, res) {
  const sendJsonResponse = (statusCode, payload) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      res.status(statusCode).json(payload);
    } else {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    }
  };

  let id = req.query ? req.query.id : null;
  if (!id) {
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 3) {
      id = parts[2];
    }
  }

  let record = null;
  if (id) {
    record = store.getRecordById(id) || store.getRecordByAttendeeId(id);
  }

  if (!record) {
    return sendJsonResponse(404, {
      error: "Not Found",
      message: "Check-in record for '" + id + "' not found."
    });
  }

  return sendJsonResponse(200, record);
};
