# G-Link backend (Node.js + Express + MySQL)

```
npm install
copy .env.example .env      (PowerShell: Copy-Item .env.example .env) then fill in DB_PASSWORD and JWT_SECRET
npm run check-db             checks MySQL connection and the 12 tables
npm run create-super-admin   creates the ICT unit Super Admin from .env
npm run dev                  starts the API on http://localhost:5000
```

## Folders
| Path | Job |
|---|---|
| `src/index.js` | Starts the server, connects all routes |
| `src/config/` | `.env` settings and the MySQL connection pool |
| `src/middleware/` | Login check, role check, error replies |
| `src/utils/` | Date helpers, input checks, HttpError |
| `src/services/availability.js` | Per-bed availability, same-gender sharing, exclusive rule, room status |
| `src/services/pricing.js` | Bills: rate x beds x nights + GST; hall: price per day x days + GST |
| `src/services/bookingRequest.js` | Reads and checks the room booking form |
| `src/services/hallRules.js` | Hall dates and overlap check |
| `src/services/notify.js`, `email.js` | Every email (prints to the terminal if SMTP is not set) |
| `src/services/users.js` | Profile complete check, which rate categories a user may pick |
| `src/routes/*.js` | The API endpoints (list below) |
| `scripts/` | `createSuperAdmin.js`, `checkDb.js` |

## API endpoints
| Method and path | Who | What |
|---|---|---|
| POST /api/auth/register | anyone | Sign up with email |
| POST /api/auth/verify-email | anyone | Confirm email from the emailed link |
| POST /api/auth/resend-verification | anyone | Send the link again |
| POST /api/auth/login | anyone | Sign in, returns token |
| GET /api/auth/me | signed in | Current user |
| GET, PUT /api/profile | signed in | View / edit profile |
| PUT /api/profile/password | signed in | Change password |
| GET /api/guesthouses, /api/rates | anyone | Browse guest houses and rates |
| GET /api/rooms/availability | anyone | Free beds per room for dates |
| GET /api/rooms/:id | anyone | One room |
| GET /api/bookings/options | signed in | Categories the user may choose |
| POST /api/bookings/quote | signed in | Availability + bill before booking |
| POST /api/bookings | signed in | Submit room booking (Pending) |
| GET /api/bookings/mine | signed in | My room bookings |
| POST /api/bookings/:id/cancel | owner | Cancel |
| POST /api/bookings/:id/extensions | owner | Request stay extension |
| GET /api/halls, /api/halls/:id/availability | anyone | Hall and fee |
| POST /api/hall-bookings, GET /api/hall-bookings/mine, POST /api/hall-bookings/:id/cancel | signed in | Hall bookings |
| /api/admin/... | Admin, Super Admin | dashboard, bookings (approve, reject, change room, international), extensions, hall-bookings, halls, guesthouses, rooms, blocks, rates, payments |
| /api/incharge/... | Incharge, Admin, Super Admin | bookings for a day, check-in, check-out, no-show, extra-guests |
| /api/superadmin/users... | Super Admin | list, create, change role/status, reset password |
