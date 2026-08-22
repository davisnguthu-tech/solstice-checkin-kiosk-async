# 🚀 Solstice Event Kiosk — Asynchronous Check-In & Badge Printing Prototype

An event-driven serverless architecture built on **Vercel** demonstrating asynchronous check-in processing, queueing, badge printing status polling, and atomic duplicate-scan protection.

---

## 🏗️ 1. Architecture: The Sync ➔ Async Pivot

```
  [ Kiosk User Scan ]
          │
  POST /api/check-in  (Checks duplicate lock & returns HTTP 202 Accepted instantly)
          │
          ├──► Status set to "PENDING_PRINT"
          │
          └──► Asynchronous Print Queue Job Dispatched
                       │
       ┌───────────────┴───────────────┐
       │                               │
[Kiosk UI Polling]             [Print Queue Worker]
GET /api/status?id=...                 │
Returns "PENDING_PRINT"       Badge Printed Successfully
       │                               │
       │                       POST /api/webhooks/print-complete
       │                               │
       └───────────────┬───────────────┘
                       │
             Status set to "CHECKED_IN"
                       │
        Kiosk UI renders "Badge Printed ✅"
```

### Why Pivot from Synchronous to Asynchronous Check-In?

1. **Hardware Latency & Network Delays**: Thermal badge printers take 2–5 seconds per badge. A synchronous API handler would block the HTTP connection, leading to timeouts on Vercel Serverless Function execution limits.
2. **Kiosk Throughput & Queue Surges**: At large events with thousands of guests, a queue spike can stall synchronous APIs. Async queueing receives requests with `HTTP 202 Accepted` in under 50ms, offloading physical printing to background workers.
3. **Duplicate Scan Protection**: Uses atomic `setIfNotExists` check-and-set logic. If an attendee's barcode is scanned twice, the system immediately returns `HTTP 200 DUPLICATE_PREVENTED` and suppresses duplicate badge printing.

---

## 🌐 2. Serverless API Endpoints

| Endpoint | Method | Expected Status | Description |
| :--- | :--- | :--- | :--- |
| `/api/check-in` | `POST` | `HTTP 202 Accepted` | Submits check-in, checks duplicate state, and queues async badge print job. |
| `/api/status?id={CHK_ID}` | `GET` | `HTTP 200 OK` | Polls current check-in & badge print status (`PENDING_PRINT` vs `CHECKED_IN`). |
| `/api/webhooks/print-complete` | `POST` | `HTTP 200 OK` | Webhook callback triggered upon physical print completion. Updates status to `CHECKED_IN`. |

---

## 🛠️ 3. How to Run Locally

```bash
# Navigate to project directory
cd solstice-checkin-kiosk-async

# Start local runner
npm run dev
```

Open your browser at **`http://localhost:3001`** to launch the interactive Kiosk UI.

---

## 🧪 4. Test Attendees

| Attendee ID | Name | Role | Test Scenario |
| :--- | :--- | :--- | :--- |
| `ATT-101` | Alex Morgan | ⭐ VIP Guest | First scan -> `202 PENDING_PRINT` -> Webhook `200 CHECKED_IN`. Second scan -> `200 DUPLICATE_PREVENTED`. |
| `ATT-102` | Sam Taylor | 🎤 Keynote Speaker | Standard async queueing & badge status polling. |
| `ATT-103` | Jordan Lee | 🎟️ Attendee | Standard async queueing & badge status polling. |
