const store = require('../lib/store');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { attendeeId, eventId } = req.body || {};
  if (!attendeeId) return res.status(400).json({ error: 'attendeeId required' });
  const attendee = store.getAttendee(attendeeId);
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
    return res.status(200).json({ status: 'DUPLICATE_PREVENTED', message: `${attendee.name} already checked in`, checkInRecord: result.record });
  }
  const host = req.headers.host;
  const protocol = host.includes('localhost') ? 'http' : 'https';
  setTimeout(() => {
    store.updateRecordStatus(record.id, 'CHECKED_IN', new Date().toISOString());
    fetch(`${protocol}://${host}/api/print-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkInId: record.id })
    }).catch(() => { });
  }, 1500);
  return res.status(202).json({
    status: 'PENDING_PRINT',
    checkInId: record.id,
    attendeeId: attendee.id,
    name: attendee.name,
    message: 'Check-in accepted. Badge print queued asynchronously.',
    requestedAt: record.requestedAt
  });
};