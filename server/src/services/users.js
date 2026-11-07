// Helpers about users: safe output, the profile form (used by sign-up and the Profile page),
// profile completeness, and the guest's rate category.
// Only two kinds of guest: RUB (Royal University of Bhutan) members and Non-RUB. The guest says
// which on their profile with the "RUB member" switch; RUB members also give their staff ID and
// department/affiliation. The rate category comes from this, so guests never pick it while booking.
const { HttpError } = require('../utils/http');
const v = require('../utils/validate');

const categoryOf = (u) => (u.is_rub_member ? 'RUB' : 'Non-RUB');

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u; // never send the password hash
  return {
    ...rest,
    email_verified: !!rest.email_verified,
    is_rub_member: !!rest.is_rub_member,
    guest_category: categoryOf(u),
    profile_complete: isProfileComplete(u),
  };
}

function isProfileComplete(u) {
  const base = !!(u.first_name && u.last_name && u.phone_number && u.citizenship_id && v.GENDERS.includes(u.gender));
  return base && (!u.is_rub_member || !!(u.sid && u.department));
}

function requireCompleteProfile(u) {
  if (!isProfileComplete(u)) {
    throw new HttpError(400, 'Please complete your profile (phone, CID, gender, and staff ID and department for RUB members) before booking.', 'PROFILE_INCOMPLETE');
  }
}

// Reads and checks the profile fields. Returns the values to save.
function readProfile(b) {
  v.required(b, ['first_name', 'last_name', 'phone_number', 'citizenship_id', 'gender']);
  v.maxLen(b.first_name, 20, 'First name');
  v.maxLen(b.last_name, 20, 'Last name');
  v.phone(b.phone_number);
  v.maxLen(b.citizenship_id, 20, 'Citizenship ID');
  v.oneOf(b.gender, v.GENDERS, 'Gender');
  const rub = b.is_rub_member === true || b.is_rub_member === 'true' || b.is_rub_member === 1;
  if (rub) {
    if (!b.sid || !String(b.sid).trim()) throw new HttpError(400, 'RUB members: please fill in your staff ID.');
    if (!b.department || !String(b.department).trim()) throw new HttpError(400, 'RUB members: please fill in your department / affiliation.');
    v.maxLen(b.sid, 20, 'Staff ID');
    v.maxLen(b.department, 50, 'Department / affiliation');
  }
  return {
    first_name: String(b.first_name).trim(),
    last_name: String(b.last_name).trim(),
    phone_number: String(b.phone_number),
    citizenship_id: String(b.citizenship_id).trim(),
    gender: b.gender,
    is_rub_member: rub,
    // Non-RUB guests have no staff ID or department.
    sid: rub ? String(b.sid).trim() : null,
    department: rub ? String(b.department).trim() : null,
  };
}

module.exports = { publicUser, isProfileComplete, requireCompleteProfile, readProfile, categoryOf };
