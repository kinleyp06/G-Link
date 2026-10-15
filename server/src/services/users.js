// Helpers about users: safe output, profile completeness, which rate categories they may pick.
const env = require('../config/env');
const { HttpError } = require('../utils/http');

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u; // never send the password hash
  return { ...rest, email_verified: !!rest.email_verified, profile_complete: isProfileComplete(u) };
}

function isProfileComplete(u) {
  return !!(u.first_name && u.last_name && u.phone_number && u.citizenship_id && u.gender && u.department);
}

function requireCompleteProfile(u) {
  if (!isProfileComplete(u)) {
    throw new HttpError(400, 'Please complete your profile (phone, CID, gender, department) before booking.', 'PROFILE_INCOMPLETE');
  }
}

function isRubEmail(email) {
  const domain = String(email).split('@')[1]?.toLowerCase() || '';
  return env.rubDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
}

// The online form offers RUB staff (official RUB email only) and Other national.
// International appears only once the admin has set international rates.
async function allowedCategories(conn, user) {
  const list = [];
  if (isRubEmail(user.email)) list.push('RUB staff');
  list.push('Other national');
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS n FROM rates WHERE guest_category = 'International' AND rate IS NOT NULL"
  );
  if (rows[0].n === 2) list.push('International');
  return list;
}

// Categories allowed for additional guests (family members of RUB staff are 'Other national').
async function allowedGuestCategories(conn) {
  const list = ['RUB staff', 'Other national'];
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS n FROM rates WHERE guest_category = 'International' AND rate IS NOT NULL"
  );
  if (rows[0].n === 2) list.push('International');
  return list;
}

module.exports = { publicUser, isProfileComplete, requireCompleteProfile, isRubEmail, allowedCategories, allowedGuestCategories };
