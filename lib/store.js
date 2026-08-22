/**
 * Shared Check-In & Attendee State Store
 * Supports Upstash Redis for Vercel Cross-Lambda persistence with In-Memory fallback.
 */

let Redis;
try {
  Redis = require('@upstash/redis').Redis;
} catch (e) {
  Redis = null;
}

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL_2 || process.env.UPSTASH_REDIS_REST_URL_2;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN_2 || process.env.UPSTASH_REDIS_REST_TOKEN_2;

const redis = (Redis && url && token) ? new Redis({ url, token }) : null;

if (redis) {
  console.log("State Store: Upstash Redis initialized");
} else {
  console.log("State Store: In-Memory Map fallback initialized");
}

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

  async setIfNotExists(attendeeId, checkInRecord) {
    const sanitizedId = attendeeId.trim().toUpperCase();

    if (redis) {
      try {
        const key = "solstice:checkin:attendee:" + sanitizedId;
        const result = await redis.set(key, checkInRecord, { nx: true });
        if (result === 'OK' || result === true) {
          await redis.set("solstice:checkin:id:" + checkInRecord.id, checkInRecord);
          // Also save in memory for current instance
          this.recordsByAttendee.set(sanitizedId, checkInRecord);
          this.recordsById.set(checkInRecord.id, checkInRecord);
          return { isNew: true, record: checkInRecord };
        } else {
          const existing = await redis.get(key);
          return { isNew: false, record: existing || checkInRecord };
        }
      } catch (err) {
        console.error("Redis setIfNotExists error, falling back to memory:", err.message);
      }
    }

    if (this.recordsByAttendee.has(sanitizedId)) {
      return { isNew: false, record: this.recordsByAttendee.get(sanitizedId) };
    }
    
    this.recordsByAttendee.set(sanitizedId, checkInRecord);
    this.recordsById.set(checkInRecord.id, checkInRecord);
    return { isNew: true, record: checkInRecord };
  }

  async getRecordById(checkInId) {
    if (redis) {
      try {
        const rec = await redis.get("solstice:checkin:id:" + checkInId);
        if (rec) return rec;
      } catch (e) {}
    }
    return this.recordsById.get(checkInId) || null;
  }

  async getRecordByAttendeeId(attendeeId) {
    const sanitizedId = attendeeId.trim().toUpperCase();
    if (redis) {
      try {
        const rec = await redis.get("solstice:checkin:attendee:" + sanitizedId);
        if (rec) return rec;
      } catch (e) {}
    }
    return this.recordsByAttendee.get(sanitizedId) || null;
  }

  async updateRecordStatus(checkInId, status, printedAt) {
    let record = await this.getRecordById(checkInId);
    if (!record) return null;
    
    record.status = status;
    if (printedAt) record.printedAt = printedAt;

    if (redis) {
      try {
        await redis.set("solstice:checkin:id:" + checkInId, record);
        await redis.set("solstice:checkin:attendee:" + record.attendeeId, record);
      } catch (e) {}
    }
    
    this.recordsById.set(checkInId, record);
    this.recordsByAttendee.set(record.attendeeId, record);

    return record;
  }

  async getAllRecords() {
    return Array.from(this.recordsById.values());
  }
}

if (!global.__solsticeCheckInStoreInstance) {
  global.__solsticeCheckInStoreInstance = new CheckInStore();
}

module.exports = global.__solsticeCheckInStoreInstance;
