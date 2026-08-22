/**
 * Vercel Serverless Function: Badge Print Completion Webhook Endpoint
 * Route: POST /api/webhooks/print-complete
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

  if (req.method && req.method.toUpperCase() !== 'POST') {
    return sendJsonResponse(405, {
      error: "Method Not Allowed",
      message: "Use POST /api/webhooks/print-complete"
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body) body = {};

  const { checkInId } = body;

  if (!checkInId) {
    return sendJsonResponse(400, {
      error: "Bad Request",
      message: "Missing required field: 'checkInId'"
    });
  }

  const printedAt = new Date().toISOString();
  const updatedRecord = store.updateRecordStatus(checkInId, "CHECKED_IN", printedAt);

  if (!updatedRecord) {
    return sendJsonResponse(404, {
      error: "Not Found",
      message: "Check-in record with ID '" + checkInId + "' not found."
    });
  }

  return sendJsonResponse(200, {
    status: "SUCCESS",
    message: "Badge print confirmed. Attendee " + updatedRecord.name + " status updated to CHECKED_IN.",
    checkInRecord: updatedRecord
  });
};
