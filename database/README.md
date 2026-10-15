# G-Link database (MySQL 8)

- `all_in_one.sql`: everything in one file (create database + 12 tables + starting data). Easiest way to set up.
- `schema/00 ... 12`: the same tables, one file per table, in the order they must be created (because of foreign keys).
- `seeds/`: starting data: the rate table (RUB staff 250/500, Other national 400/800, International blank), a sample guest house with 6 rooms, and the 25-seat meeting hall.

Table names are lowercase (`guest_houses`, not `Guest_Houses`) so the same SQL works on Windows and on Linux servers like Render.

Run it:
- MySQL Workbench: File > Open SQL Script > `all_in_one.sql` > click the lightning icon (Execute all).
- Or in the MySQL command line: `SOURCE C:/path/to/g-link/database/all_in_one.sql;`

It is safe to run again: tables use `IF NOT EXISTS` and the starting data does not duplicate.

If you change a file in `schema/` or `seeds/`, also change `all_in_one.sql` (or rebuild it by pasting the files in order).
