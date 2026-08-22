let records = [];
let attendees = {
  'ATT-001': { id: 'ATT-001', name: 'Alex Rivera', role: 'Speaker', company: 'Solstice' },
  'ATT-102': { id: 'ATT-102', name: 'Sam Taylor', role: 'Attendee', company: 'Solstice' },
  'ATT-103': { id: 'ATT-103', name: 'Jordan Lee', role: 'VIP', company: 'TechCo' }
};

if (!global.__solsticeCheckInStoreInstance) {
  global.__solsticeCheckInStoreInstance = { records, attendees };
}
const store = global.__solsticeCheckInStoreInstance;

function promoteIfNeeded(rec) {
  if (!rec) return rec;
  if (rec.status === 'PENDING_PRINT') {
    const age = Date.now() - new Date(rec.requestedAt).getTime();
    if (age > 2000) {
      rec.status = 'CHECKED_IN';
      rec.printedAt = new Date().toISOString();
    }
  }
  return rec;
}

module.exports = {
  getAttendee: (id) => store.attendees[id] || { id, name: `Attendee ${id}`, role: 'Attendee', company: 'Solstice' },
  setIfNotExists: (attendeeId, record) => {
    const existing = store.records.find(r => r.attendeeId === attendeeId);
    if (existing) return { isNew: false, record: promoteIfNeeded(existing) };
    store.records.push(record);
    return { isNew: true, record };
  },
  updateRecordStatus: (checkInId, status, printedAt) => {
    const rec = store.records.find(r => r.id === checkInId);
    if (rec) { rec.status = status; rec.printedAt = printedAt; }
    return rec;
  },
  getRecord: (id) => promoteIfNeeded(store.records.find(r => r.id === id)),
  getRecordByAttendeeId: (attendeeId) => {
    const rec = store.records.find(r => r.attendeeId === attendeeId);
    return promoteIfNeeded(rec);
  },
  getAllRecords: () => store.records.map(r => promoteIfNeeded(r)),
  getAttendees: () => store.attendees
};