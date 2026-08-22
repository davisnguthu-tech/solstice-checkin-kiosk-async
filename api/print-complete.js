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
    return sendJsonResponse(405, { error: "Method Not Allowed" });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body) body = {};

  const { checkInId } = body;
  if (!checkInId) {
    return sendJsonResponse(400, { error: "Missing checkInId" });
  }

  const printedAt = new Date().toISOString();
  const updatedRecord = store.updateRecordStatus(checkInId, "CHECKED_IN", printedAt);

  return sendJsonResponse(200, { status: "SUCCESS", checkInRecord: updatedRecord });
};
