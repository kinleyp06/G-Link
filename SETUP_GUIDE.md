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

You should see 4 rate rows (RUB and Non-RUB, per bed and whole room), 10 rooms: rooms 1-4 (ground floor) and 5-8 (first floor) with 3 beds each, Suite 1 and Suite 2 (VIP only), and the Meeting Hall (25 seats, 5000.00) inside guest house 1.

**2.4 Commit and push**

```
git add database
git commit -m "Database: 12 tables from Data Types document + starting rates, rooms, hall"
git push origin database
```

What is in it:

| File | Table (Data Types section) |
|---|---|
| `schema/01_users.sql` | 1. Users (email UK, CID UK, gender Male/Female, RUB member, SID = staff ID, department, role, status, bcrypt password) |
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
- `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`: the team Gmail account and its **App password**. These are **required**: every confirmation link and booking notice is sent by real email, and the server will not start without them. See **Email setup** below.

`.env` is in `.gitignore`. Never commit it.

**3.3 Install and check**

```
npm install
npm run check-db
```

All 12 lines and `payments.payment_method` must say `OK`. If you get "Access denied", the password in `.env` is wrong. If `payments.payment_method` says `MISSING`, run `database/updates/01_add_payment_method.sql` once in Workbench.

```
npm run test-email -- your-own-email@gmail.com
npm run create-super-admin
npm run dev
```

`test-email` must say `Sent.` and the email must arrive (check Spam). Then you should see `Email ready: sending as ...` and `G-Link API running on http://localhost:5000`. Open http://localhost:5000/api/health in the browser: it must show `"database":"connected"`.

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
| Sign up | `/register` | `pages/auth/Register.jsx` | visitors | Sign up with email ID and the same details as the Profile page (shared `components/ProfileFields.jsx`) |
| Sign in | `/login` | `pages/auth/Login.jsx` | everyone | Sign in with email ID, then "check role" sends each role to its own start page |
| Email confirmation | `/verify-email` | `pages/auth/VerifyEmail.jsx` | everyone | Accounts verified through their email |
| Profile | `/profile` | `pages/guest/Profile.jsx` | everyone | Edit profile: name, phone, CID, gender (Male/Female), **RUB member** switch (then staff ID and department/affiliation); change password |
| Find a room | `/rooms` | `pages/guest/BrowseRooms.jsx` | **everyone** (sign in to book) | Browse guest houses and rooms with photos, availability by date per bed, bed-wise charge, shared-room label |
| Floor map | `/floor-map` | `pages/FloorMap.jsx` | **everyone** | Floor plan of each floor with its rooms and tonight's free beds, the meeting hall inside the guest house, campus map showing the guest house |
| Book a room | `/book/:roomId` | `pages/guest/BookRoom.jsx` | Guest | Exclusive / Per bed / Family-group, rate from guest category, bill + 5% GST, allow-sharing tick box, sharing notice to confirm |
| My bookings | `/my-bookings` | `pages/guest/MyBookings.jsx` | Guest | Room and hall bookings in separate sections, bills, cancel, request stay extension, who shares my room |
| Meeting hall | `/hall` | `pages/guest/BookHall.jsx` | **everyone** (sign in to book) | The 25-seat hall inside the guest house: photos, free days, Nu. 5,000/day + GST; book it |
| Dashboard | `/admin` | `pages/admin/AdminDashboard.jsx` | Admin | What is waiting today |
| Bookings | `/admin/bookings` | `pages/admin/ManageBookings.jsx` | Admin | Review requests (approve/reject sets approved_by + approval_date), contact details, change rooms for others |
| Extensions | `/admin/extensions` | `pages/admin/Extensions.jsx` | Admin | Approve stay extensions (beds free check, new check-out, extension count +1, extra nights billed) |
| Hall | `/admin/halls` | `pages/admin/HallBookings.jsx` | Admin | Manage hall bookings, hall price and status |
| International guest | `/admin/international` | `pages/admin/InternationalBooking.jsx` | Admin | Book for an international guest (no account) and record their details; billed at the Non-RUB rate, approved at once |
| Rooms | `/admin/rooms` | `pages/admin/ManageRooms.jsx` | Admin | Manage guest houses, rooms and room availability |
| Blocks | `/admin/blocks` | `pages/admin/RoomBlocks.jsx` | Admin | Block rooms/beds for VIP or official guests (no booking made) |
| Rates | `/admin/rates` | `pages/admin/Rates.jsx` | Admin | Edit rate table (RUB and Non-RUB rates, GST) |
| Payments | `/admin/payments` | `pages/admin/Payments.jsx` | Admin | Bills, paid / unpaid, and the payment method (mBOB, MPay, DK, TPay, DrukPay, BDBLePay or Cash) |
| Check-in / out | `/incharge` | `pages/incharge/CheckInOut.jsx` | Incharge (and Admin) | View bookings, check in, check out with the payment method (Completed), no-show (Cancelled), extra people on exclusive booking |
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

Use **real email addresses you can open** for every test account (for example your own Gmail and your RUB email): the confirmation links and booking notices arrive in those inboxes. Check Spam if something does not arrive.

**0. Without signing in (visitors)**
- Open http://localhost:5173 while signed out. **Rooms**, **Meeting hall** and **Floor map** all open, show free beds / free days, prices and photo placeholders. Clicking **Sign in to book** asks you to sign in, then brings you back to the same room and dates.

**A. Roles and sign in (Role-Based Access Flow)**
1. Sign in at `/login` with the Super Admin email/password from `server/.env`. You land on **Users**.
2. Create an **Admin** and an **Incharge** account there.
3. Sign out. Go to **Sign up** and create a guest with an email you can open.
4. Open that inbox, click **Confirm my email** in the G-Link email, then sign in.
5. Sign up already asks for the profile details (pick **Male**; turn on **RUB member** and fill in staff ID and department to get the RUB rate), so after signing in you go straight to **Find a room**. **Profile** shows the same fields to change later.

**B. Room booking (Booking Process Flow)**
6. Pick dates and **Check availability**. Every room shows 3 free beds.
7. On room 1 click **Book beds** > keep **One bed** > fill purpose > tick **Allow sharing** > **Check availability and price**. The bill shows rate x nights, GST 5% as its own line, and the total. The rate (RUB or Non-RUB) comes from the RUB member switch on your profile; there is no rate box on the booking form.
8. **Submit booking**. The admins get an email. My bookings shows **Pending**.
9. Sign in as the Admin > **Bookings** > click the row > **Approve**. The guest gets an approval email with the amount, and **Payments** has a new unpaid bill. (**Reject** sends a rejection email instead. Cancelling from My bookings emails the guest and the admins.)

**C. Shared room (Shared Room Booking Flow)**
10. Make a second guest, **Male**. Search the same dates: room 1 shows "Shared room, 2 bed(s) available". Book it: the yellow notice "room is already occupied..." appears. Tick it and submit. The first guest gets an email with only first name, gender and dates.
11. Make a **Female** guest: room 1 shows the reason "only male guests" and no Book button.
12. If the first guest had **not** ticked Allow sharing, room 1 would show "Occupied (not shared)".
13. **Book whole room** is never offered on an occupied room, and an exclusive room is never shown as shared.

**D. Check-in, extension, check-out**
14. Incharge (or Admin) > **Check-in / out** > the approved booking is under Arriving > **Check in** (only on or after the check-in date). Room status becomes Occupied and the guest gets a check-in email.
15. Guest > My bookings > **Extend my stay until** > pick a later date > Request. Admin > **Extensions** > Approve. Check-out date moves, "extended 1 time(s)" shows, a new bill row "Stay extension" appears. Reject keeps the original dates.
16. For an **Exclusive** booking that is checked in: **Extra people arrived** > add a person > they are billed per bed; if no beds are free the page tells you to turn them away.
17. **Check out** > the amount to pay shows > choose the **Payment method** (Online payment: mBOB, MPay, DK, TPay, DrukPay, BDBLePay; or Cash) > **Record payment and check out**. Status Completed, the bills show as Paid with that method, and the guest gets a check-out email with the payment summary. **No-show** on an arriving booking > Cancelled, and the guest is emailed.

**E. Meeting hall (Meeting Hall Booking Flow)**
18. Guest > **Meeting hall** > dates (need not match any room booking) > the fee shows Nu. 5,000 x days + GST > Submit. Admin > **Hall** > Approve > a separate bill appears. Cancelling the hall booking does not touch room bookings.

**F. Admin tools**
19. **Blocks**: block 3 beds of room 2 for VIP/official reservation. Guests now see room 2 as Full for those dates. No booking is created. The **suites** show "Reserved for college VIP guests" and can never be booked by guests; reserve them for a VIP here (choose "Suite 1 (VIP suite)").
20. **International guest**: Admin > **International guest** > room, dates, the guest's name, gender and passport number > **Save booking**. It is approved at once with a Non-RUB bill; `user_id` is empty and `created_by` is the admin in the database. It shows under Bookings and Check-in / out like any other booking (no emails, as the guest has no account).
21. **Bookings** > a booking > **Change room to** another room: the guest gets an email.
22. **Rooms**: set a room to Maintenance: it shows "Not open for booking".
23. **Payments** > choose how the guest paid in **Paid by** > **Mark paid** (used for hall bills, or any bill paid before check-out).
24. **Users** (Super Admin): set a user Inactive: they can no longer sign in.

---

## Email setup (required)

G-Link sends real emails for: account confirmation, new booking (to admins), approval or rejection, cancellation, no-show, check-in, check-out (with the payment summary), room changes, sharing, extensions and hall bookings. Nothing is printed in the terminal any more.

Use **one team Gmail account** (for example `glink.cst@gmail.com`):

1. Sign in to that Gmail > **Google Account** > **Security** > turn on **2-Step Verification**.
2. Then **Google Account** > search **App passwords** > create one named `G-Link`. Google shows **16 letters**.
3. In `server/.env` (each teammate's own copy, never committed):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=glink.cst@gmail.com
SMTP_PASS=abcdefghijklmnop
MAIL_FROM="G-Link Guest House <glink.cst@gmail.com>"
CLIENT_URL=http://localhost:5173
```

4. Check it: `npm run test-email -- your-own-email@gmail.com` must say `Sent.` and the email must arrive.
5. Restart the server (`npm run dev`). It prints `Email ready: sending as glink.cst@gmail.com`.

`SMTP_PASS` is the App password **without spaces**, not the normal Gmail password. Confirmation links open `CLIENT_URL`, so change it to the real website address when the site is deployed.

## One shared database for the whole team (optional)

By default every laptop has its own MySQL and its own data. To let every laptop use **the same** accounts, bookings and bills, put one MySQL database online and point every laptop's `server/.env` at it. Then nobody installs MySQL or runs `all_in_one.sql` again; only `server` and `client` run on each laptop.

Any hosted MySQL 8 works. Example with **Aiven** (has a free MySQL plan; screen names may differ slightly):

1. **One person** signs up at aiven.io > **Create service** > **MySQL** > the **Free** plan > a nearby region > create, and waits until it says *Running*.
2. On the service's **Overview**, note **Host**, **Port**, **User** (`avnadmin`) and **Password**, and download the **CA certificate**. Save it as `server/ca.pem` (it is ignored by Git; give the file to teammates privately).
3. **Build the database once**, from MySQL Workbench: new connection with that host, port, user and password; on the **SSL** tab choose *Require and verify CA* and pick `ca.pem`; **Test Connection**. Open `database/all_in_one.sql` and run it (lightning icon).
4. **Every laptop**, in `server/.env`:
   ```
   DB_HOST=the host from step 2
   DB_PORT=the port from step 2
   DB_USER=avnadmin
   DB_PASSWORD=the password from step 2
   DB_NAME=g_link
   DB_SSL=true
   DB_SSL_CA=ca.pem
   JWT_SECRET=the same long secret on every laptop
   ```
   plus the same Gmail settings. Then `npm run check-db` must show all `OK`.
5. **Only one person** runs `npm run create-super-admin` (the account is then in the shared database for everyone).
6. Each laptop runs `npm run dev` in `server` and in `client` as usual.

Keep the database password, `ca.pem` and `.env` private: share them directly with teammates, never on GitHub or in screenshots. A database change (a new file in `database/updates/`) is then run **once** on the shared database, not on every laptop.

## Pictures (rooms, hall, floor maps)

The site uses the team's photos of the CST guest house (22 pictures, resized and compressed to about 2 MB in total) and a ground floor plan drawn from the team's sketch. Where they appear: Home (evening banner, the building, Facilities: dining room, canteen, outdoor dining, conference hall, Suite 1), Rooms (3-bed room photos for every room, suite photos for rooms of type "Suite"), Meeting hall, Floor map and Sign in. The full list is in `client/public/images/README.md`. To change a picture, save a new file with the same name.

Still optional: a first floor plan (`floor-maps/floor-2.svg`) and a campus map (`floor-maps/campus-map.png`); until they exist the site shows the first floor corridor photo and the front of the guest house instead.

## Updating a laptop that already has the project

After pulling these changes:
1. In Workbench run the files in `database/updates/` once each, in order (`01_...` to `04_...`), or `DROP DATABASE g_link;` and run `all_in_one.sql` again (easier if you only have test data).
2. Add the email settings to your own `server/.env` (see **Email setup**).
3. `cd server` > `npm run check-db` > `npm run dev`, and `cd client` > `npm run dev`.

---

## Automatic tests

Three levels, all automatic, all using their own database **`g_link_test`** (made fresh each run, so your real data is never touched) and a fake mailbox (no real emails are sent):

| Level | What it checks | Where | Run it |
|---|---|---|---|
| **Unit tests** (29) | One function at a time, no database: prices and GST, nights between dates, RUB / Non-RUB from the profile, staff ID and gender rules, booking-form rules, hall dates | `server/tests/unit/` | `cd server` then `npm test` |
| **Integration tests** (12) | The real server + MySQL + emails: sign-up and email confirmation, quotes, VIP suites refused, booking + approval + bill, sharing by gender, check-in/out with payment method, international guest, meeting hall, roles | `server/tests/integration/` | `cd server` then `npm run test:integration` (MySQL must be running; uses `DB_HOST`, `DB_USER`, `DB_PASSWORD` from `server/.env`) |
| **Browser (end-to-end) tests** (10) | A real Chrome opens the website and clicks through it: visitor pages, sign up as a RUB member, confirm the email, book a bed, admin approves, incharge checks the staff ID, checks in and out with mBOB, guest blocked from admin pages | `e2e/tests/` | Once: `cd e2e`, `npm install`, `npx playwright install chromium`. Then `npm test` (your own `npm run dev` can keep running: the tests use ports 5050, 5051 and 5174) |

Each test prints ✔ or ✖ with its name, so a failure says exactly which feature broke. The manual test-case document is still needed for what a machine cannot judge: how pages look, real Gmail delivery, phones.

## Docker

Docker runs the whole project (database, server and website) in three containers with one command. Nobody needs Node or MySQL installed; only **Docker Desktop** (docker.com, then restart the laptop).

| File | What it does |
|---|---|
| `server/Dockerfile` | Node 22 image with the server; runs `node src/index.js` |
| `client/Dockerfile` | Builds the website, then serves it with nginx |
| `client/nginx.conf` | Sends `/api` to the server container; every other page goes to the website |
| `docker-compose.yml` | Starts `db` (MySQL 8, built from `all_in_one.sql` the first time), `server` and `client` together |
| `.dockerignore` (server, client) | Keeps `node_modules`, `.env` and certificates out of the images |

Run it (from the project folder, with Docker Desktop open):
1. `server/.env` must have the email settings (SMTP_*) and JWT_SECRET. The database lines are ignored: Docker uses its own MySQL.
2. `docker compose up --build` (first time takes a few minutes).
3. Open **http://localhost:8080**. The API is also on http://localhost:5000/api/health.
4. Create the Super Admin (in a second terminal): `docker compose exec server npm run create-super-admin`
5. Stop: `Ctrl+C`, then `docker compose down`. Your data stays. `docker compose down -v` deletes the Docker database so it is rebuilt from `all_in_one.sql` next time.

Docker's MySQL is on port **3307** on the laptop (so it does not clash with your own MySQL on 3306). Workbench: host 127.0.0.1, port 3307, user root, password `glink_root`.

On Render the server can run from `server/Dockerfile` (Language: **Docker**). The website stays a Static Site.

## CI/CD (GitHub Actions)

The file `.github/workflows/ci-cd.yml` runs on GitHub by itself:

- **On every push and pull request:** **Website builds** (the website compiles), **Unit and integration tests** (fresh MySQL 8 from `all_in_one.sql`, all tables checked, then both test levels), **Browser tests** (the 10 end-to-end tests in Chrome), **Docker images** (builds the three containers, starts them together and checks the website reaches the server and the database). A green tick means all passed; a red X means something broke: open the **Actions** tab, the failed step lists the failing test by name. For browser tests, a report with screenshots is saved under the run's **Artifacts**.
- **On a push or merge to `main` only, after all checks pass:** asks Render to deploy the new server and website.

To switch on deploys (once):
1. In Render, open the **server** service > **Settings** > **Deploy Hook** > copy the URL. Do the same for the **website** (static site).
2. In GitHub, open the repo > **Settings > Secrets and variables > Actions > New repository secret**:
   `RENDER_DEPLOY_HOOK_SERVER` = the server's hook URL, `RENDER_DEPLOY_HOOK_CLIENT` = the website's hook URL.
3. In Render, set **Auto-Deploy** to **Off** on both services, so only code that passed every check goes live.

Until the secrets are added, the checks still run and the deploy step is skipped with a warning.
Database changes are not deployed automatically: run a new file from `database/updates/` on the online database yourself.
To make `main` safe: GitHub > **Settings > Branches > Add rule** for `main` > tick **Require status checks to pass** and choose "Website builds", "Unit and integration tests", "Browser tests" and "Docker images".

## Decisions made while building (check these with your documents)

1. **Table names are lowercase** (`guest_houses`, `booking_guests` ...). MySQL on Windows turns names lowercase anyway; using lowercase everywhere stops errors when you deploy to Linux.
2. **Payments has two extra columns**: `description` (for example "Room charge", "Stay extension: 2 night(s)") and `payment_method` (mBOB, MPay, DK, TPay, DrukPay, BDBLePay or Cash; empty until paid). Neither is in the Data Types document yet; add them there.
3. **Per Bed = 1 bed (the booker). Family/Group = the booker + 1 or 2 more guests**, each on their own bed, each priced by their own category (RUB member with staff ID, or Non-RUB). Exclusive = whole room, 1 occupant.
4. **"Beds free" counts approved bookings and blocks** (as the System Flow notes say), on the busiest night of the stay. Approval checks again, so two pending requests can never both be approved for the same last bed.
5. **Sharing:** if a room has any approved bed-level booking for those dates, every occupant must have ticked Allow sharing and all new guests must have the occupant's gender.
6. **Room block end date works like a check-out date** (block 1 to 3 Nov = nights of 1 and 2 Nov). **Hall dates are both used days** (1 to 2 Nov = 2 days).
7. **Only two kinds of guest: RUB (Royal University of Bhutan) members and Non-RUB.** International guests have no account: the admin books them on the **International guest** page and they pay the Non-RUB rate. The **RUB member** switch on the profile sets the rate; RUB members must give a staff ID and department/affiliation, which the admin sees when approving. To stop people posing as RUB members, the site tells them (on sign-up, Profile, Rooms, Home, the booking form and the approval email) that **the staff ID is verified at check-in and check-out**, and the Check-in / out page shows each RUB booking's staff IDs to check. The category is saved on each booking, so changing the profile later does not change existing bills. Every account confirms its email before signing in.
8. **A bill (payment row) is created when the admin approves**; the guest sees an estimate while booking. Extension and extra-people charges are added as extra rows.
9. **Limits:** a stay is at most 30 nights per booking or extension; a hall booking at most 14 days. Change `MAX_NIGHTS` in `server/src/services/bookingRequest.js` or the 14 in `hallRules.js`.
10. **Room status** changes on check-in (Occupied) and check-out (Available); Maintenance is set by the admin and never overwritten.
11. **Payment method is recorded, not processed.** There is still no online payment inside G-Link. At check-out the incharge chooses how the guest paid, and every unpaid bill of that booking is marked Paid with that method. Hall bills (no check-out) are marked paid on the Payments page.
12. **Visitors can browse without an account**: rooms, free beds, the meeting hall, prices and the floor map. Booking a room or the hall needs a confirmed account.
13. **The meeting hall is part of the guest house** (`halls.guesthouse_id`): it is shown with its guest house, and it cannot be booked while the guest house is closed.
14. **Gender is Male or Female** (used for same-gender room sharing).
15. **The real rooms**: rooms 1-4 on the ground floor and 5-8 on the first floor, 3 beds each (room type Triple), plus Suite 1 (ground floor) and Suite 2 (first floor). Each room stores its floor (`rooms.floor`: 0 ground, 1 first) and whether it is **VIP only** (`rooms.vip_only`). VIP-only rooms (the suites) are reserved for college VIP guests: guests and the International guest page cannot book them; the admin reserves them with a room block.
16. **Sign-up fails cleanly if the confirmation email cannot be sent**: the account is not kept, and the person is asked to try again.
17. **Footer on every page** with Contact us (address, the Administrative Officer's number 17160538 for bookings and changes, check-in/out times, the college website) and a Google Map of the college. All details are in `client/src/siteInfo.js`. The map needs an internet connection.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm run check-db`: Access denied | Wrong `DB_PASSWORD` in `server/.env` |
| `Unknown database 'g_link'` | Run `database/all_in_one.sql` on this laptop |
| Website says "Cannot reach the server" | Start the backend: `cd server` then `npm run dev` |
| `EADDRINUSE: 5000` | The server is already running in another terminal. Close it, or change `PORT` in `.env` (and the proxy in `client/vite.config.js`) |
| Rollup / `@rollup/rollup-win32-x64-msvc` error | Delete `client/node_modules` and `client/package-lock.json`, run `npm install` again |
| Cannot sign in: "Confirm your email first" | Open the G-Link email (check Spam), or use "Send the confirmation email again" on the sign in page |
| Server stops with "Email is not set up" | Fill in `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` in `server/.env` (see **Email setup**) |
| "Email login failed (Invalid login: 535 ...)" | `SMTP_PASS` must be the 16-letter Gmail **App password** without spaces, and 2-Step Verification must be on |
| `check-db` says `MISSING payments.payment_method` | Run `database/updates/01_add_payment_method.sql` once |
| Pictures show "Photo needed" | Expected until the pictures are added; see `client/public/images/README.md` |
| Cannot book: "complete your profile" | Fill in every profile field (RUB members also need staff ID and department) |
| `check-db` OK but sign-up fails with "Unknown column 'is_rub_member'" | Run `database/updates/02_rub_non_rub_and_hall_in_guest_house.sql` once |
| International guest booking fails with "Unknown column 'created_by'" or "cannot be null" | Run `database/updates/03_international_guest_bookings.sql` once |
| `check-db` says `MISSING rooms.floor`, or rooms still show 101-203 | Run `database/updates/04_real_rooms_floors_vip_suites.sql` once |
| `Cannot connect to MySQL: Server does not support secure connection` | `DB_SSL=true` is set but the database is local: set `DB_SSL=false` (true only for the shared online database) |
| `ENOENT ... ca.pem` | Save the online database's CA certificate as `server/ca.pem`, or fix `DB_SSL_CA` |
| Shared database: confirmation link says the link is invalid | Every laptop must use the same `JWT_SECRET` in `server/.env` |
| `mysql` is not recognised in PowerShell | Use MySQL Workbench instead, or add `C:\Program Files\MySQL\MySQL Server 8.0\bin` to PATH |
