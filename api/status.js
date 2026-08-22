/**
 * Vercel Serverless Function: Check-In Status Polling Endpoint
 * Route: GET /api/status?id=CHK-... or GET /api/status?attendeeId=ATT-101
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

  let record = null;
  if (id) {
    record = store.getRecordById(id);
  } else if (attendeeId) {
    record = store.getRecordByAttendeeId(attendeeId);
  } else {
    return sendJsonResponse(200, {
      totalRecords: store.getAllRecords().length,
      records: store.getAllRecords()
    });
  }

  if (!record) {
    return sendJsonResponse(404, {
      error: "Not Found",
      message: "Check-in record not found."
    });
  }

  return sendJsonResponse(200, record);
};
