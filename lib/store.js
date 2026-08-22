const fs = require('fs');
const path = require('path');
const os = require('os');

const STORE_FILE = path.join(os.tmpdir(), 'solstice_checkin_store.json');

const attendees = {
  'ATT-101': { id: 'ATT-101', name: 'Alex Morgan', role: '⭐ VIP Guest', company: 'Aether Dynamics' },
  'ATT-102': { id: 'ATT-102', name: 'Sam Taylor', role: '🎤 Keynote Speaker', company: 'Solaris Labs' },
  'ATT-103': { id: 'ATT-103', name: 'Jordan Lee', role: '🎟️ Attendee', company: 'Vortex Systems' }
};

function readDiskStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading store file:', err);
  }
  return [];
}

function writeDiskStore(records) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing store file:', err);
  }
}

// Global instance cache across single process invocations
if (!global.__solsticeCheckInStoreInstance) {
  global.__solsticeCheckInStoreInstance = {
    records: readDiskStore(),
    attendees
  };
}
const store = global.__solsticeCheckInStoreInstance;

function syncStore() {
  store.records = readDiskStore();
  return store.records;
}

/**
 * Ensures records in PENDING_PRINT state transition to CHECKED_IN after
 * 1.5 seconds (simulated vendor badge print duration) during status polling.
 */
function autoPromoteIfPending(rec) {
  if (!rec) return rec;
  if (rec.status === 'PENDING_PRINT') {
    const age = Date.now() - new Date(rec.requestedAt).getTime();
    if (age >= 1500) {
      rec.status = 'CHECKED_IN';
      rec.printedAt = rec.printedAt || new Date().toISOString();
      const records = syncStore();
      const item = records.find(r => r.id === rec.id);
      if (item) {
        item.status = 'CHECKED_IN';
        item.printedAt = rec.printedAt;
        writeDiskStore(records);
        store.records = records;
      }
    }
  }
  return rec;
}

module.exports = {
  getAttendee: (id) => store.attendees[id] || { id, name: `Attendee ${id}`, role: 'Attendee', company: 'Solstice' },

  getRecordById: (id) => {
    const records = syncStore();
    const rec = records.find(r => r.id === id) || null;
    return autoPromoteIfPending(rec);
  },

  getRecordByAttendeeId: (attendeeId) => {
    const records = syncStore();
    const rec = records.find(r => r.attendeeId === attendeeId) || null;
    return autoPromoteIfPending(rec);
  },

  getRecord: (id) => {
    const records = syncStore();
    const rec = records.find(r => r.id === id || r.attendeeId === id) || null;
    return autoPromoteIfPending(rec);
  },

  getAllRecords: () => {
    const records = syncStore();
    return records.map(r => autoPromoteIfPending(r));
  },

  setIfNotExists: (attendeeId, record) => {
    const records = syncStore();
    const existing = records.find(r => r.attendeeId === attendeeId);
    if (existing) {
      return { isNew: false, record: autoPromoteIfPending(existing) };
    }
    records.push(record);
    writeDiskStore(records);
    store.records = records;
    return { isNew: true, record };
  },

  updateRecordStatus: (searchId, status, printedAt) => {
    const records = syncStore();
    const rec = records.find(r => r.id === searchId || r.attendeeId === searchId);
    if (rec) {
      rec.status = status;
      rec.printedAt = printedAt || new Date().toISOString();
      writeDiskStore(records);
      store.records = records;
      return rec;
    }
    return null;
  },

  getAttendees: () => store.attendees
};