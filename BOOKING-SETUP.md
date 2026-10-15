# Booking system: one-off Cloudflare setup

1. Database: Cloudflare > Storage & databases > D1 > Create database, name it purrfect-bookings.
2. Tables: open the database > Console, paste everything in schema.sql, run it.
3. Connect it: Workers & Pages > purrfect-coffee > Settings > Bindings > Add > D1 database.
   Variable name: DB   Database: purrfect-bookings   (Production, and Preview if asked)
4. Password: Settings > Variables and Secrets > Add. Type: Secret. Name: ADMIN_PASSWORD. Value: Louise's bookings password.
5. Push the code. Bindings and secrets only take effect on the next deploy.

Test: open the site with ?testbooking on the end, make a booking, then check /bookings.
Go live: editor > Café details > Booking rules > tick "Online booking switched on".
