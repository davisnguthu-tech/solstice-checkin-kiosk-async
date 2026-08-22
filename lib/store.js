const fs = require('fs');
const path = require('path');
const os = require('os');

const STORE_FILE = path.join(os.tmpdir(), 'solstice_checkin_store.json');
const MASTER_OBJECT_ID = 'ff8081819ff5b11001a028c26b0e75a3';
const CLOUD_URL = `https://api.restful-api.dev/objects/${MASTER_OBJECT_ID}`;

const attendees = {
  'ATT-101': {
    id: 'ATT-101',
    name: "Hon. Margaret Ndung'u",
    role: '🏛️ Cabinet Secretary (VIP)',
    company: 'Ministry of ICT & Digital Economy (Kenya)'
  },
  'ATT-102': {
    id: 'ATT-102',
    name: 'Dr. Kiprono Rotich',
    role: '🎤 Keynote Speaker',
    company: 'Google Kenya • Cybersecurity Division'
  },
  'ATT-103': {
    id: 'ATT-103',
    name: 'Aisha Omondi',
    role: '🎟️ Tech Attendee',
    company: 'Safaricom M-PESA'
  },
  'ATT-104': {
    id: 'ATT-104',
    name: 'Olumide Adebayo',
    role: '🎤 Panel Speaker',
    company: 'Flutterwave (Nigeria)'
  },
  'ATT-105': {
    id: 'ATT-105',
    name: 'Sarah Jenkins',
    role: '🎟️ Executive Attendee',
    company: 'Microsoft Africa Dev Centre'
  },
  'ATT-106': {
    id: 'ATT-106',
    name: 'Wambui Mwangi',
    role: '🎪 Event Organiser',
    company: 'Africa Tech Summit Operations'
  },
  'ATT-107': {
    id: 'ATT-107',
    name: 'Chef Dennis Mutua',
    role: '🍲 Lead Caterer',
    company: 'GTC Hospitality & Catering'
  },
  'ATT-108': {
    id: 'ATT-108',
    name: 'Capt. Joseph Oduor',
    role: '🛡️ Security Team Lead',
    company: 'GTC Venue Security Operations'
  },
  'ATT-109': {
    id: 'ATT-109',
    name: 'Kevin Kilonzo',
    role: '🔊 Sound & AV Team Lead',
    company: 'Nairobi Live Audio Systems'
  },
  'ATT-110': {
    id: 'ATT-110',
    name: 'Faith Chebet',
    role: '📋 VIP Protocol Usher',
    company: 'Summit Ushering Services'
  }
};

function readDiskStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(r => r && r.id !== 'CHK-1' && r.name);
      }
    }
  } catch (err) {
    console.error('Error reading store file:', err);
  }
  return [];
}

function writeDiskStore(records) {
  try {
    const valid = records.filter(r => r && r.id !== 'CHK-1' && r.name);
    fs.writeFileSync(STORE_FILE, JSON.stringify(valid, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing store file:', err);
  }
}

async function syncFromCloud() {
  try {
    const res = await fetch(CLOUD_URL);
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && Array.isArray(json.data.records)) {
        const cleaned = json.data.records.filter(r => r && r.id !== 'CHK-1' && r.name);
        writeDiskStore(cleaned);
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Error fetching from cloud store:', err);
  }
  return readDiskStore();
}

async function syncToCloud(records) {
  const valid = records.filter(r => r && r.id !== 'CHK-1' && r.name);
  writeDiskStore(valid);
  try {
    await fetch(CLOUD_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'SOLSTICE_MASTER_STORE_V1',
        data: { records: valid }
      })
    });
  } catch (err) {
    console.error('Error pushing to cloud store:', err);
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

function autoPromoteIfPending(rec, recordsList) {
  if (!rec) return rec;
  if (rec.status === 'PENDING_PRINT') {
    const age = Date.now() - new Date(rec.requestedAt).getTime();
    if (age >= 1500) {
      rec.status = 'CHECKED_IN';
      rec.printedAt = rec.printedAt || new Date().toISOString();
      if (recordsList) {
        const item = recordsList.find(r => r.id === rec.id);
        if (item) {
          item.status = 'CHECKED_IN';
          item.printedAt = rec.printedAt;
          syncToCloud(recordsList);
        }
      }
    }
  }
  return rec;
}

module.exports = {
  getAttendee: (id) => store.attendees[id] || { id, name: `Delegate ${id}`, role: 'Tech Delegate', company: 'Africa Tech Summit Nairobi' },

  getRecordById: async (id) => {
    let records = await syncFromCloud();
    let rec = records.find(r => r.id === id) || null;
    return autoPromoteIfPending(rec, records);
  },

  getRecordByAttendeeId: async (attendeeId) => {
    let records = await syncFromCloud();
    let rec = records.find(r => r.attendeeId === attendeeId) || null;
    return autoPromoteIfPending(rec, records);
  },

  getRecord: async (id) => {
    let records = await syncFromCloud();
    let rec = records.find(r => r.id === id || r.attendeeId === id) || null;
    return autoPromoteIfPending(rec, records);
  },

  getAllRecords: async () => {
    let records = await syncFromCloud();
    return records.map(r => autoPromoteIfPending(r, records));
  },

  setIfNotExists: async (attendeeId, record) => {
    let records = await syncFromCloud();
    const existing = records.find(r => r.attendeeId === attendeeId);
    if (existing) {
      return { isNew: false, record: autoPromoteIfPending(existing, records) };
    }
    records.push(record);
    await syncToCloud(records);
    store.records = records;
    return { isNew: true, record };
  },

  updateRecordStatus: async (searchId, status, printedAt) => {
    let records = await syncFromCloud();
    const rec = records.find(r => r.id === searchId || r.attendeeId === searchId);
    if (rec) {
      rec.status = status;
      rec.printedAt = printedAt || new Date().toISOString();
      await syncToCloud(records);
      store.records = records;
      return rec;
    }
    return null;
  },

  getAttendees: () => store.attendees
};