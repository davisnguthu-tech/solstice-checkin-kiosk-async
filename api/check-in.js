const store = require('../lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { attendeeId, eventId } = req.body || {};
  if (!attendeeId) {
    return res.status(400).json({ error: 'attendeeId required' });
  }

  const attendee = store.getAttendee(attendeeId);

  // 1. Atomic Duplicate Scan Protection
  const existing = store.getRecordByAttendeeId(attendee.id);
  if (existing && (existing.status === 'PENDING_PRINT' || existing.status === 'CHECKED_IN')) {
    return res.status(200).json({
      status: 'DUPLICATE_PREVENTED',
      message: `${attendee.name} already checked in`,
      checkInRecord: existing
    });
  }

  // 2. Register new PENDING_PRINT check-in record
  const record = {
    id: `CHK-${Date.now()}`,
    attendeeId: attendee.id,
    name: attendee.name,
    role: attendee.role,
    company: attendee.company,
    eventId: eventId || 'SOLSTICE-2025',
    status: 'PENDING_PRINT',
    requestedAt: new Date().toISOString(),
    printedAt: null
  };

  const result = store.setIfNotExists(attendee.id, record);
  if (!result.isNew) {
    return res.status(200).json({
      status: 'DUPLICATE_PREVENTED',
      message: `${attendee.name} already checked in`,
      checkInRecord: result.record
    });
  }

  // 3. Dispatch Async Background Print Job to Webhook Callback
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3001';
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const webhookUrl = `${protocol}://${host}/api/webhooks/print-complete`;

  // Asynchronously fire vendor simulation webhook callback
  const dispatchWebhook = async () => {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInId: record.id, attendeeId: attendee.id })
      });
    } catch (err) {
      // Fallback direct store update if HTTP fetch cannot be completed in serverless isolate
      store.updateRecordStatus(record.id, 'CHECKED_IN', new Date().toISOString());
    }
  };

  // Trigger dispatch immediately without awaiting response
  dispatchWebhook();

  // 4. Return 202 Accepted instantly
  return res.status(202).json({
    status: 'PENDING_PRINT',
    checkInId: record.id,
    attendeeId: attendee.id,
    name: attendee.name,
    message: 'Check-in accepted. Badge print queued asynchronously.',
    requestedAt: record.requestedAt
  });
};