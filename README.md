# Punch — Multi-company setup

## What's in this folder
- `company-1` … `company-5` — five ready-to-deploy copies of the app, one per business. Each becomes its own GitHub repo / Pages URL.
- `master` — your master dashboard, for adding companies and their admins.
- `firestore.rules` — paste this into Firebase to enforce that each company can only ever see its own data.

All 5 company sites and the master dashboard share one Firebase project (the one you already created), so data flows into the same database — they're just separate front doors into it.

## One-time setup

### 1. Paste in the security rules
1. Firebase Console → **Firestore Database → Rules** tab.
2. Delete what's there, paste in the contents of `firestore.rules`.
3. Click **Publish**.

### 2. Create your own master-admin login
The very first master account has to be created by hand (after that, the master dashboard creates everything else itself):
1. Firebase Console → **Authentication → Users** tab → **Add user**. Enter your own email + a password. Click Add.
2. Click on the user you just created and copy their **User UID**.
3. Firebase Console → **Firestore Database → Data** tab → **Start collection** → Collection ID: `profiles`.
4. Document ID: paste the UID you copied. Add these fields:
   - `email` (string) — your email
   - `name` (string) — your name
   - `role` (string) — `master`
   - `companyId` (string) — leave empty, or type `null` as a string — it isn't used for master accounts
5. Save.

### 3. Deploy the master dashboard
Push the `master` folder to its own GitHub repo, turn on GitHub Pages, done. Log in there with the email/password from step 2 — you'll see an empty company list and a form to add your first business.

### 4. Add your 5 companies
In the master dashboard:
1. Type a **Company ID** (short, no spaces — e.g. `acme-co`) and a **Company name**, click **Add company**.
2. Click **View roster** next to it, then fill in an email/name/temporary password to create that company's first admin.
3. Repeat for all 5 businesses.

### 5. Deploy each company site
For each of `company-1` … `company-5`:
1. Open `company-config.js` inside that folder, and set:
   ```js
   window.COMPANY_ID = 'acme-co';        // must exactly match the Company ID you typed in step 4
   window.COMPANY_NAME = 'Acme Co';
   ```
2. Push that folder's contents to its own GitHub repo, turn on Pages.
3. That company's admin logs in with the email/temporary password you created for them, and can add their own employees from there (Manage Users → Add Users) — you don't need to do that part for them.

## Day to day
- Each company admin manages only their own employees, sees only their own reports — they have no visibility into the other 4 businesses, and vice versa.
- You (master) log into the master dashboard any time to add a new company or its first admin. Regular day-to-day punches/reports aren't shown in the master dashboard by design — that view lives on each company's own site, exactly like a real company admin would use it.

## Things worth knowing
- **Passwords:** nobody (including admins) can directly set someone else's password — that's a real security boundary Firebase enforces. Instead, admins send a "reset link" (Update Users → Send reset email), and the person picks their own password.
- **Removing a user:** revokes their access immediately (they can no longer log in), but doesn't fully delete their login record — that last step requires going to Firebase Console → Authentication and deleting them there too, if you want it gone completely.
- **Sessions:** logging in stays active while the browser tab/app is open, but closing it requires logging in again next time — this matters if a device is shared between employees (e.g. a front-desk kiosk).
