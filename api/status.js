/**
 * Vercel Serverless Function: Check-In Status Polling Endpoint
 * Route: GET /api/status?id=CHK-... or GET /api/status/ATT-001 or GET /api/status?attendeeId=ATT-001
 */

const store = require('../lib/store');

module.exports = async function handler(req, res) {
  const sendJsonResponse = (statusCode, payload) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      res.status(statusCode).json(payload);
    } else {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    }
  };

  let queryParams = req.query;
  if (!queryParams) {
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    queryParams = Object.fromEntries(url.searchParams.entries());
  }

  const { id, attendeeId } = queryParams;

  let searchId = id || attendeeId;
  if (!searchId) {
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 3 && parts[0] === 'api' && parts[1] === 'status') {
      searchId = parts[2];
    }
  }

  let record = null;
  if (searchId) {
    record = store.getRecordById(searchId) || store.getRecordByAttendeeId(searchId);
  } else {
    return sendJsonResponse(200, {
      totalRecords: store.getAllRecords().length,
      records: store.getAllRecords()
    });
  }

  if (!record) {
    return sendJsonResponse(404, {
      error: "Not Found",
      message: "Check-in record for '" + searchId + "' not found."
    });
  }

  return sendJsonResponse(200, record);
};
