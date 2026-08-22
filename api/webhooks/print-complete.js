const store = require('../../lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const searchId = body.checkInId || body.id || body.attendeeId;

  if (!searchId) {
    return res.status(400).json({ error: 'checkInId or attendeeId required' });
  }

  const printedAt = new Date().toISOString();
  const updated = store.updateRecordStatus(searchId, 'CHECKED_IN', printedAt);

  if (!updated) {
    return res.status(404).json({ error: 'Check-in record not found', searchId });
  }

  return res.status(200).json({
    success: true,
    message: 'Badge print complete. Attendee checked in.',
    record: updated
  });
};
