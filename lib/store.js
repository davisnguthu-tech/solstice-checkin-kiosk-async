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

module.exports = {
  getAttendee: (id) => store.attendees[id] || { id, name: `Attendee ${id}`, role: 'Attendee', company: 'Solstice' },

  getRecordById: (id) => {
    const records = syncStore();
    return records.find(r => r.id === id) || null;
  },

  getRecordByAttendeeId: (attendeeId) => {
    const records = syncStore();
    return records.find(r => r.attendeeId === attendeeId) || null;
  },

  getRecord: (id) => {
    const records = syncStore();
    return records.find(r => r.id === id || r.attendeeId === id) || null;
  },

  getAllRecords: () => {
    return syncStore();
  },

  setIfNotExists: (attendeeId, record) => {
    const records = syncStore();
    const existing = records.find(r => r.attendeeId === attendeeId);
    if (existing) {
      return { isNew: false, record: existing };
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