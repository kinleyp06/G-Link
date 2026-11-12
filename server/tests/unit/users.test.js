// Unit tests: the profile rules. Only RUB or Non-RUB; the rate comes from the RUB member switch;
// RUB members must give a staff ID and department; gender is Male or Female.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readProfile, isProfileComplete, categoryOf, publicUser } = require('../../src/services/users');

const base = { first_name: 'Pema', last_name: 'Dorji', phone_number: '17123456', citizenship_id: '11111', gender: 'Male' };

test('the rate category comes from the RUB member switch', () => {
  assert.equal(categoryOf({ is_rub_member: 1 }), 'RUB');
  assert.equal(categoryOf({ is_rub_member: 0 }), 'Non-RUB');
});

test('a RUB member must give a staff ID', () => {
  assert.throws(() => readProfile({ ...base, is_rub_member: true, department: 'IT' }), /staff ID/);
});

test('a RUB member must give a department or affiliation', () => {
  assert.throws(() => readProfile({ ...base, is_rub_member: true, sid: 'CST1' }), /department/);
});

test('a Non-RUB guest keeps no staff ID or department', () => {
  const p = readProfile({ ...base, is_rub_member: false, sid: 'X', department: 'Y' });
  assert.equal(p.sid, null);
  assert.equal(p.department, null);
});

test('gender must be Male or Female', () => {
  assert.throws(() => readProfile({ ...base, gender: 'Other' }), /Male, Female/);
});

test('phone number must be 8 to 11 digits', () => {
  assert.throws(() => readProfile({ ...base, phone_number: '123' }), /8 to 11 digits/);
});

test('profile is complete only with every required field', () => {
  assert.equal(isProfileComplete({ ...base, is_rub_member: 0 }), true);
  assert.equal(isProfileComplete({ ...base, is_rub_member: 1, sid: 'CST1' }), false);
  assert.equal(isProfileComplete({ ...base, is_rub_member: 1, sid: 'CST1', department: 'IT' }), true);
});

test('the password hash is never sent out', () => {
  const u = publicUser({ ...base, user_id: 1, password: '$2a$10$secret', email_verified: 1, is_rub_member: 0 });
  assert.equal(u.password, undefined);
  assert.equal(u.guest_category, 'Non-RUB');
});
