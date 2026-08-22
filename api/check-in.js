/**
 * Vercel Serverless Function: Async Check-In Request Endpoint
 * Route: POST /api/check-in
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

  if (req.method && req.method.toUpperCase() !== 'POST') {
    return sendJsonResponse(405, {
      error: "Method Not Allowed",
      message: "Use POST /api/check-in with JSON body { attendeeId: 'ATT-101' }"
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body) body = {};

  const { attendeeId } = body;

  if (!attendeeId || typeof attendeeId !== 'string' || attendeeId.trim() === '') {
    return sendJsonResponse(400, {
      error: "Bad Request",
      message: "Missing required field: 'attendeeId'",
      validTestAttendees: ["ATT-101", "ATT-102", "ATT-103"]
    });
  }

  const attendee = store.getAttendee(attendeeId);
  if (!attendee) {
    return sendJsonResponse(404, {
      error: "Not Found",
      message: "Attendee with ID '" + attendeeId + "' is not registered.",
      validTestAttendees: ["ATT-101", "ATT-102", "ATT-103"]
    });
  }

  const timestamp = new Date().toISOString();
  const checkInId = "CHK-" + Date.now();

  const newRecord = {
    id: checkInId,
    attendeeId: attendee.id,
    name: attendee.name,
    role: attendee.role,
    company: attendee.company,
    status: "PENDING_PRINT",
    requestedAt: timestamp,
    printedAt: null
  };

  const { isNew, record } = store.setIfNotExists(attendee.id, newRecord);

  if (!isNew) {
    return sendJsonResponse(200, {
      status: "DUPLICATE_PREVENTED",
      message: "Attendee " + attendee.name + " (" + attendee.id + ") has already checked in. No duplicate badge printed.",
      checkInRecord: record
    });
  }

  // Simulate Async Queue Worker triggering print completion webhook after ~2.5 seconds
  const host = req.headers && req.headers.host ? req.headers.host : 'localhost:3001';
  const protocol = req.headers && req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'] : 'http';
  const webhookUrl = protocol + "://" + host + "/api/webhooks/print-complete";

  setTimeout(async () => {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInId: newRecord.id })
      });
    } catch (err) {
      console.error("Async webhook simulation error:", err.message);
      store.updateRecordStatus(newRecord.id, 'CHECKED_IN', new Date().toISOString());
    }
  }, 2500);

  return sendJsonResponse(202, {
    status: "PENDING_PRINT",
    checkInId: newRecord.id,
    attendeeId: attendee.id,
    name: attendee.name,
    message: "Check-in accepted. Badge print queued asynchronously.",
    requestedAt: timestamp
  });
};
