# G-Link database (MySQL 8)

- `all_in_one.sql`: everything in one file (create database + 12 tables + starting data). Easiest way to set up.
- `schema/00 ... 12`: the same tables, one file per table, in the order they must be created (because of foreign keys).
- `updates/`: changes for a database you already made. Run each file once, in number order (`01_add_payment_method.sql` adds how a bill was paid; `02_rub_non_rub_and_hall_in_guest_house.sql` changes guests to RUB / Non-RUB, genders to Male / Female, and puts the hall inside the guest house; `03_international_guest_bookings.sql` lets the admin book for international guests again; `04_real_rooms_floors_vip_suites.sql` adds room floors, VIP-only suites and the real rooms 1-8, Suite 1 and Suite 2).
- `seeds/`: starting data: the rate table (RUB 250/500, Non-RUB 400/800), the CST guest house with rooms 1-4 (ground floor) and 5-8 (first floor), 3 beds each, two VIP-only suites, and the 25-seat meeting hall inside it.

Table names are lowercase (`guest_houses`, not `Guest_Houses`) so the same SQL works on Windows and on Linux servers like Render.

Run it:
- MySQL Workbench: File > Open SQL Script > `all_in_one.sql` > click the lightning icon (Execute all).
- Or in the MySQL command line: `SOURCE C:/path/to/g-link/database/all_in_one.sql;`

It is safe to run again: tables use `IF NOT EXISTS` and the starting data does not duplicate.

Already have `g_link` from before an update? Either run the files in `updates/` once, or start fresh with `DROP DATABASE g_link;` and then `all_in_one.sql` (this deletes all bookings and accounts).

If you change a file in `schema/` or `seeds/`, also change `all_in_one.sql` (or rebuild it by pasting the files in order).
