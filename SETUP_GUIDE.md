# G-Link setup guide

This guide takes the team from the zip to a running system, branch by branch. Follow the parts in order: **Part 1 (everyone) → Part 2 (database) → Part 3 (backend) → Part 4 (frontend) → Part 5 (merge and run together) → Part 6 (test every flow)**.

Commands are for **Windows PowerShell inside VS Code** (Terminal > New Terminal). Copy each grey box line by line.

---

## What is in the zip

| Folder / file | Goes into branch | Who works on it |
|---|---|---|
| `database/` | `database` | Sonam Lindel, Tshering Dhendup |
| `server/` | `backend` | Kinley Pem, Sonam Lindel |
| `client/` | `frontend` | Tandin Wangchuk, Tenzin Rabten |
| `README.md`, `SETUP_GUIDE.md`, `.gitignore` | `others` (then `main`) | anyone |

Each branch only adds its own folder, so merging the branches into `main` later causes no conflicts.

> If your branches already have the placeholder folders from the earlier project-structure zip, delete the old `client/`, `server/` or `database/` folder in that branch first, then paste the new one. Keep your `docs/` folder.

---

## Part 1: Everyone, once

1. Install, if you do not have them:
   - **Node.js 20 LTS or newer**: https://nodejs.org (check: `node -v`)
   - **MySQL 8 + MySQL Workbench**: https://dev.mysql.com/downloads/installer/ (remember your root password)
   - **Git**: https://git-scm.com (check: `git --version`)
2. Unzip `g-link-project.zip` somewhere **outside** your repo folder. The zip contains one folder, `g-link`. Move it so you have `Downloads\g-link\database`, `Downloads\g-link\server` and `Downloads\g-link\client` (the commands below use that path). You will copy folders from here into the repo.
3. Open your repo folder (the one cloned from GitHub) in VS Code and get the latest branches:

```
git fetch origin
```

---

## Part 2: Database branch (Sonam, Tshering)

**2.1 Switch to the branch and copy the folder**

```
git checkout database
git pull origin database
```

Copy the whole `database` folder from the unzipped files into the repo root (drag it into the VS Code Explorer, or):

```
Copy-Item -Recurse -Force "$HOME\Downloads\g-link\database" .
```

(Change the path if you unzipped somewhere else.)

**2.2 Create the database**

Easiest: open **MySQL Workbench** > connect to your local server > **File > Open SQL Script** > choose `database\all_in_one.sql` > click the **lightning icon** (Execute all). Then click the refresh icon in the Schemas panel: you should see `g_link` with 12 tables.

Or in a terminal:

```
mysql -u root -p
```
then inside MySQL (use forward slashes in the path):
```
SOURCE C:/Users/YOUR_NAME/path/to/repo/database/all_in_one.sql;
SHOW TABLES;
```

**2.3 Check it worked**

```
USE g_link;
SELECT * FROM rates;
SELECT room_number, capacity FROM rooms;
SELECT * FROM halls;
```

You should see 6 rate rows (International rate is NULL), 6 rooms with 3 beds each, and the Meeting Hall (25 seats, 5000.00).

**2.4 Commit and push**

```
git add database
git commit -m "Database: 12 tables from Data Types document + starting rates, rooms, hall"
git push origin database
```

What is in it:

| File | Table (Data Types section) |
|---|---|
| `schema/01_users.sql` | 1. Users (email UK, CID UK, gender, SID, role, status, bcrypt password) |
| `schema/02_guest_houses.sql` | 2. Guest_Houses |
| `schema/03_rooms.sql` | 3. Rooms (3-bedded, capacity = beds) |
| `schema/04_bookings.sql` | 4. Bookings (booking_type, guest_category, gender, allow_sharing, extension_count, approval and check-in/out fields) |
| `schema/05_booking_guests.sql` | 5. Booking_Guests |
| `schema/06_room_sharing.sql` | 6. Room_Sharing |
| `schema/07_stay_extensions.sql` | 7. Stay_Extensions |
| `schema/08_room_blocks.sql` | 8. Room_Blocks |
| `schema/09_halls.sql` | 9. Halls |
| `schema/10_hall_bookings.sql` | 10. Hall_Bookings |
| `schema/11_rates.sql` | 11. Rates (unique guest_category + charge_type) |
| `schema/12_payments.sql` | 12. Payments (a row is for a room booking OR a hall booking, never both) |
| `seeds/*.sql` | Starting rates, sample guest house + rooms, the hall |

---

## Part 3: Backend branch (Kinley, Sonam)

You need the database from Part 2 on **your own laptop** (run `all_in_one.sql` once on your machine too; it does not come through Git).

**3.1 Switch branch and copy**

```
git checkout backend
git pull origin backend
Copy-Item -Recurse -Force "$HOME\Downloads\g-link\server" .
cd server
```

**3.2 Settings file**

```
Copy-Item .env.example .env
```

Open `server\.env` and change:
- `DB_PASSWORD=` your MySQL root password
- `JWT_SECRET=` any long random text (for example 40 random letters)
- `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` for the ICT unit account
- Leave `SMTP_HOST` empty for now: emails will be **printed in this terminal** instead of being sent (you need this for the email confirmation link while testing).

`.env` is in `.gitignore`. Never commit it.

**3.3 Install and check**

```
npm install
npm run check-db
```

All 12 lines must say `OK`. If you get "Access denied", the password in `.env` is wrong.

```
npm run create-super-admin
npm run dev
```

You should see `G-Link API running on http://localhost:5000`. Open http://localhost:5000/api/health in the browser: it must show `"database":"connected"`.

Leave this terminal running.

**3.4 Commit and push** (open a second terminal, from the repo root)

```
git add server
git commit -m "Backend: auth, bookings, sharing, extensions, halls, admin, incharge, super admin APIs"
git push origin backend
```

---

## Part 4: Frontend branch (Tandin, Tenzin)

**4.1 Switch branch and copy**

```
git checkout frontend
git pull origin frontend
Copy-Item -Recurse -Force "$HOME\Downloads\g-link\client" .
cd client
npm install
```

`package.json` already pins `rollup` to `4.30.1` (the fix for the Windows Rollup error you had before). If `npm install` still fails with a Rollup error: delete `node_modules` and `package-lock.json`, then run `npm install` again.

**4.2 Run it**

The website needs the backend running (Part 3, `npm run dev` in `server`). Before merging, the easiest way is to also have the `server` folder on your laptop: copy it from the zip into a separate folder outside the repo and run it there, or wait for Part 5.

```
npm run dev
```

Open http://localhost:5173

**4.3 Commit and push**

```
cd ..
git add client
git commit -m "Frontend: all pages for guest, admin, incharge and super admin"
git push origin frontend
```

---

## Part 5: Merge and run everything together (team leader)

1. Put the root files on the `others` branch:
   ```
   git checkout others
   git pull origin others
   Copy-Item -Force "$HOME\Downloads\g-link\README.md", "$HOME\Downloads\g-link\SETUP_GUIDE.md", "$HOME\Downloads\g-link\.gitignore" .
   git add README.md SETUP_GUIDE.md .gitignore
   git commit -m "Project README, setup guide, gitignore"
   git push origin others
   ```
2. On GitHub, open a **Pull Request into `main`** for each branch, in this order: `database`, `backend`, `frontend`, `others`. One teammate reviews each, then **Merge**. There should be no conflicts because each branch adds a different folder.
3. Everyone then runs:
   ```
   git checkout main
   git pull origin main
   ```
4. Run the full system with **two terminals**:
   ```
   cd server
   npm install
   npm run dev
   ```
   ```
   cd client
   npm install
   npm run dev
   ```
5. Open http://localhost:5173

From now on keep working in your branch, and bring `main` into it before starting new work: `git checkout frontend` then `git merge main`.

---

## Every page

| Page | Address | File | Who | Feature from the documents |
|---|---|---|---|---|
| Home | `/` | `pages/Home.jsx` | visitors | Guest houses, bed-wise charges |
| Sign up | `/register` | `pages/auth/Register.jsx` | visitors | Sign up with email ID |
| Sign in | `/login` | `pages/auth/Login.jsx` | everyone | Sign in with email ID, then "check role" sends each role to its own start page |
| Email confirmation | `/verify-email` | `pages/auth/VerifyEmail.jsx` | everyone | Accounts verified through their email |
| Profile | `/profile` | `pages/guest/Profile.jsx` | everyone | Edit profile; completed before the first booking (name, CID, SID, contact, gender, department) |
| Find a room | `/rooms` | `pages/guest/BrowseRooms.jsx` | Guest | Browse guest houses and rooms, availability by date per bed, bed-wise charge, shared-room label |
| Book a room | `/book/:roomId` | `pages/guest/BookRoom.jsx` | Guest | Exclusive / Per bed / Family-group, rate from guest category, bill + 5% GST, allow-sharing tick box, sharing notice to confirm |
| My bookings | `/my-bookings` | `pages/guest/MyBookings.jsx` | Guest | Room and hall bookings in separate sections, bills, cancel, request stay extension, who shares my room |
| Meeting hall | `/hall` | `pages/guest/BookHall.jsx` | Guest | Book the 25-seat hall, Nu. 5,000/day + GST |
| Dashboard | `/admin` | `pages/admin/AdminDashboard.jsx` | Admin | What is waiting today |
| Bookings | `/admin/bookings` | `pages/admin/ManageBookings.jsx` | Admin | Review requests (approve/reject sets approved_by + approval_date), contact details, change rooms for others |
| Extensions | `/admin/extensions` | `pages/admin/Extensions.jsx` | Admin | Approve stay extensions (beds free check, new check-out, extension count +1, extra nights billed) |
| Hall | `/admin/halls` | `pages/admin/HallBookings.jsx` | Admin | Manage hall bookings, hall price and status |
| International guest | `/admin/international` | `pages/admin/InternationalBooking.jsx` | Admin | Book for international guests and record their details |
| Rooms | `/admin/rooms` | `pages/admin/ManageRooms.jsx` | Admin | Manage guest houses, rooms and room availability |
| Blocks | `/admin/blocks` | `pages/admin/RoomBlocks.jsx` | Admin | Block rooms/beds for VIP or official guests (no booking made) |
| Rates | `/admin/rates` | `pages/admin/Rates.jsx` | Admin | Edit rate table (rates, GST); set International rates |
| Payments | `/admin/payments` | `pages/admin/Payments.jsx` | Admin | Bills and paid / unpaid (no online payment) |
| Check-in / out | `/incharge` | `pages/incharge/CheckInOut.jsx` | Incharge (and Admin) | View bookings, check in, check out (Completed), no-show (Cancelled), extra people on exclusive booking |
| Users | `/superadmin/users` | `pages/superadmin/ManageUsers.jsx` | Super Admin | Manage admins, incharges and users (role, active/inactive, new staff accounts, password reset) |

Super Admin can open every page (full access).

### Suggested split (one page = one commit, matches your task list style)

| Person | Pages / files |
|---|---|
| Tandin | Register, Login, VerifyEmail, Home, Profile, BrowseRooms, BookRoom |
| Tenzin | MyBookings, BookHall, all `pages/admin/*`, CheckInOut, ManageUsers |
| Kinley | `routes/auth.js`, `profile.js`, `catalog.js`, `bookings.js`, `halls.js`, `services/email.js`, `notify.js` |
| Sonam | `routes/admin.js`, `incharge.js`, `superadmin.js`, `services/availability.js`, `pricing.js`, plus the database with Tshering |
| Tshering | `database/schema/*`, `database/seeds/*`, testing the SQL in Workbench |

If you want the history to show this, copy one file at a time into the branch and commit it with a message like `F-04 Sign in page`.

---

## Part 6: Test every flow (do this after Part 5)

Keep the **server terminal visible**: while `SMTP_HOST` is empty, every email (confirmation links, booking notices) is printed there.

**A. Roles and sign in (Role-Based Access Flow)**
1. Sign in at `/login` with the Super Admin email/password from `server/.env`. You land on **Users**.
2. Create an **Admin** and an **Incharge** account there.
3. Sign out. Go to **Sign up** and create a guest, ideally with an `@rub.edu.bt` email (any address works in dev mode because the email is only printed).
4. Copy the link from the server terminal into the browser to confirm the email, then sign in.
5. You are sent to **Profile** first. Fill it in (pick **Male**). Save: you go to **Find a room**.

**B. Room booking (Booking Process Flow)**
6. Pick dates and **Check availability**. Every room shows 3 free beds.
7. On room 101 click **Book beds** > keep **One bed** > fill purpose > tick **Allow sharing** > **Check availability and price**. The bill shows rate x nights, GST 5% as its own line, and the total. The rate category is RUB staff only for a RUB email.
8. **Submit booking**. The server terminal prints the email to the admins. My bookings shows **Pending**.
9. Sign in as the Admin > **Bookings** > click the row > **Approve**. The guest's email is printed with the amount, and **Payments** has a new unpaid bill.

**C. Shared room (Shared Room Booking Flow)**
10. Make a second guest, **Male**. Search the same dates: room 101 shows "Shared room, 2 bed(s) available". Book it: the yellow notice "room is already occupied..." appears. Tick it and submit. The first guest gets an email with only first name, gender and dates.
11. Make a **Female** guest: room 101 shows the reason "only male guests" and no Book button.
12. If the first guest had **not** ticked Allow sharing, room 101 would show "Occupied (not shared)".
13. **Book whole room** is never offered on an occupied room, and an exclusive room is never shown as shared.

**D. Check-in, extension, check-out**
14. Incharge (or Admin) > **Check-in / out** > the approved booking is under Arriving > **Check in** (only on or after the check-in date). Room status becomes Occupied.
15. Guest > My bookings > **Extend my stay until** > pick a later date > Request. Admin > **Extensions** > Approve. Check-out date moves, "extended 1 time(s)" shows, a new bill row "Stay extension" appears. Reject keeps the original dates.
16. For an **Exclusive** booking that is checked in: **Extra people arrived** > add a person > they are billed per bed; if no beds are free the page tells you to turn them away.
17. **Check out** > status Completed. **No-show** on an arriving booking > Cancelled.

**E. Meeting hall (Meeting Hall Booking Flow)**
18. Guest > **Meeting hall** > dates (need not match any room booking) > the fee shows Nu. 5,000 x days + GST > Submit. Admin > **Hall** > Approve > a separate bill appears. Cancelling the hall booking does not touch room bookings.

**F. Admin tools**
19. **Blocks**: block 3 beds of room 102 for VIP/official reservation. Guests now see room 102 as Full for those dates. No booking is created.
20. **International guest**: first set both International rates on **Rates** (the form also starts offering International to guests). Then enter the guest's details: the booking is approved at once with its bill, and `user_id` is empty in the database.
21. **Bookings** > a booking > **Change room to** another room: the guest gets an email.
22. **Rooms**: set a room to Maintenance: it shows "Not open for booking".
23. **Payments** > **Mark paid**.
24. **Users** (Super Admin): set a user Inactive: they can no longer sign in.

---

## Sending real emails (when you are ready)

For a Gmail account: turn on 2-Step Verification, create an **App password** (Google Account > Security > App passwords), then in `server/.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=yourteam@gmail.com
SMTP_PASS=the 16-letter app password
MAIL_FROM="G-Link Guest House <yourteam@gmail.com>"
```

Restart the server. Confirmation links now point at `CLIENT_URL`, so change that when the site is deployed.

---

## Decisions made while building (check these with your documents)

1. **Table names are lowercase** (`guest_houses`, `booking_guests` ...). MySQL on Windows turns names lowercase anyway; using lowercase everywhere stops errors when you deploy to Linux.
2. **Payments has one extra column, `description`** (for example "Room charge", "Stay extension: 2 night(s)"). It is not in the Data Types document. Either add it to the document or delete the column and its uses in `server/src/services/pricing.js` (`insertPayment`).
3. **Per Bed = 1 bed (the booker). Family/Group = the booker + 1 or 2 more guests**, each on their own bed, each priced by their own category (family of RUB staff = Other national). Exclusive = whole room, 1 occupant.
4. **"Beds free" counts approved bookings and blocks** (as the System Flow notes say), on the busiest night of the stay. Approval checks again, so two pending requests can never both be approved for the same last bed.
5. **Sharing:** if a room has any approved bed-level booking for those dates, every occupant must have ticked Allow sharing and all new guests must have the occupant's gender.
6. **Room block end date works like a check-out date** (block 1 to 3 Nov = nights of 1 and 2 Nov). **Hall dates are both used days** (1 to 2 Nov = 2 days).
7. **The RUB staff rate is offered only to accounts with an official RUB email** (domains in `RUB_EMAIL_DOMAINS` in `.env`). Every account confirms its email before signing in.
8. **A bill (payment row) is created when the admin approves**; the guest sees an estimate while booking. Extension and extra-people charges are added as extra rows.
9. **Limits:** a stay is at most 30 nights per booking or extension; a hall booking at most 14 days. Change `MAX_NIGHTS` in `server/src/services/bookingRequest.js` or the 14 in `hallRules.js`.
10. **Room status** changes on check-in (Occupied) and check-out (Available); Maintenance is set by the admin and never overwritten.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm run check-db`: Access denied | Wrong `DB_PASSWORD` in `server/.env` |
| `Unknown database 'g_link'` | Run `database/all_in_one.sql` on this laptop |
| Website says "Cannot reach the server" | Start the backend: `cd server` then `npm run dev` |
| `EADDRINUSE: 5000` | The server is already running in another terminal. Close it, or change `PORT` in `.env` (and the proxy in `client/vite.config.js`) |
| Rollup / `@rollup/rollup-win32-x64-msvc` error | Delete `client/node_modules` and `client/package-lock.json`, run `npm install` again |
| Cannot sign in: "Confirm your email first" | Copy the confirmation link from the server terminal, or use "Send the confirmation email again" |
| Cannot book: "complete your profile" | Fill in every profile field (SID is optional) |
| International option missing | Set both International rates on the Rates page |
| `mysql` is not recognised in PowerShell | Use MySQL Workbench instead, or add `C:\Program Files\MySQL\MySQL Server 8.0\bin` to PATH |
