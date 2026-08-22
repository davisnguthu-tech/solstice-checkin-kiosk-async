/**
 * Purely In-Memory Check-In & Attendee State Store
 * Persists in warm lambda instances via global.__solsticeCheckInStoreInstance
 */

const ATTENDEES = {
  "ATT-101": { id: "ATT-101", name: "Alex Morgan", role: "VIP Guest", company: "Aether Dynamics" },
  "ATT-102": { id: "ATT-102", name: "Sam Taylor", role: "Keynote Speaker", company: "Solaris Labs" },
  "ATT-103": { id: "ATT-103", name: "Jordan Lee", role: "Attendee", company: "Vortex Systems" }
};

class CheckInStore {
  constructor() {
    this.recordsByAttendee = new Map();
    this.recordsById = new Map();
  }

  getAttendee(attendeeId) {
    if (!attendeeId) return null;
    const sanitized = attendeeId.trim().toUpperCase();
    if (ATTENDEES[sanitized]) return ATTENDEES[sanitized];
    return {
      id: sanitized,
      name: "Attendee " + sanitized,
      role: "Attendee",
      company: "Solstice 2025"
    };
  }

  getAllAttendees() {
    return Object.values(ATTENDEES);
  }

  setIfNotExists(attendeeId, checkInRecord) {
    const sanitizedId = attendeeId.trim().toUpperCase();
    if (this.recordsByAttendee.has(sanitizedId)) {
      return { isNew: false, record: this.recordsByAttendee.get(sanitizedId) };
    }
    
    this.recordsByAttendee.set(sanitizedId, checkInRecord);
    this.recordsById.set(checkInRecord.id, checkInRecord);
    return { isNew: true, record: checkInRecord };
  }

  getRecordById(checkInId) {
    return this.recordsById.get(checkInId) || null;
  }

  getRecordByAttendeeId(attendeeId) {
    const sanitizedId = attendeeId.trim().toUpperCase();
    return this.recordsByAttendee.get(sanitizedId) || null;
  }

  updateRecordStatus(checkInId, status, printedAt) {
    const record = this.recordsById.get(checkInId);
    if (!record) return null;
    
    record.status = status;
    if (printedAt) record.printedAt = printedAt;
    
    return record;
  }

  getAllRecords() {
    return Array.from(this.recordsById.values());
  }
}

if (!global.__solsticeCheckInStoreInstance) {
  global.__solsticeCheckInStoreInstance = new CheckInStore();
}

module.exports = global.__solsticeCheckInStoreInstance;
