// End-to-end: one stay from start to finish, in a real browser.
// A RUB member signs up and confirms their email -> books a bed -> the admin approves ->
// the incharge checks them in, then out with mBOB. The steps run in order and share the same guest.
const { test, expect } = require('@playwright/test');

// A new email and CID each time the file loads, so a retry can sign up again without "already registered".
const run = Date.now().toString().slice(-6);
const guest = { first: 'Tshering', last: 'Wangmo', email: `tshering${run}@test.gl`, cid: `11506${run}`, password: 'Password1', staffId: 'CST2024' };
const STAFF_PASSWORD = 'Password123!';

async function signIn(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe.serial('a RUB member books a bed and stays one night', () => {
  test('signs up as a RUB member and sees the staff ID note', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('First name').fill(guest.first);
    await page.getByLabel('Last name').fill(guest.last);
    await page.getByLabel('Phone number').fill('17654321');
    await page.getByLabel('Citizenship ID (CID)').fill(guest.cid);
    await page.getByLabel('Gender').selectOption('Female');
    await page.locator('label.switch').click(); // the RUB member switch, clicked as a person would
    await expect(page.getByRole('switch')).toBeChecked();
    await expect(page.getByText('Staff ID will be verified during check-in and check-out for RUB members.')).toBeVisible();
    await page.getByLabel('Staff ID').fill(guest.staffId);
    await page.getByLabel('Department / Affiliation').fill('IT Department');
    await page.getByLabel('Email').fill(guest.email);
    await page.getByLabel(/^Password/).fill(guest.password); // label reads "Password  At least 8 characters"
    await page.getByLabel('Confirm password').fill(guest.password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  });

  test('confirms the email from the link in the confirmation email', async ({ page, request }) => {
    let link;
    await expect.poll(async () => {
      const mails = await (await request.get('http://127.0.0.1:5051/mail')).json();
      const m = mails.find((x) => x.to.includes(guest.email) && /confirm your email/.test(x.subject));
      link = m && m.text.match(/http:\/\/localhost:5174\/verify-email\?token=\S+/)[0];
      return Boolean(link);
    }).toBe(true);
    await page.goto(link);
    await expect(page.getByText('Email confirmed. You can sign in now.')).toBeVisible();
  });

  test('signs in, books one bed in room 1 and sees the RUB price', async ({ page }) => {
    await signIn(page, guest.email, guest.password);
    await expect(page).toHaveURL(/\/rooms/);
    await page.locator('.room-card').filter({ hasText: 'Room 1' }).getByRole('link', { name: 'Book beds' }).click();
    await page.getByLabel('Purpose of visit').fill('Faculty workshop');
    await page.getByRole('button', { name: 'Check availability and price' }).click();
    await expect(page.locator('.bill-line.total')).toContainText('Nu. 262.50'); // 250 + 5% GST, one night
    await page.getByRole('button', { name: 'Submit booking' }).click();
    await expect(page).toHaveURL(/\/my-bookings/);
    await expect(page.getByText('Pending').first()).toBeVisible();
  });

  test('the admin approves the booking and an unpaid bill appears', async ({ page }) => {
    await signIn(page, 'admin@test.gl', STAFF_PASSWORD);
    await page.goto('/admin/bookings');
    await page.getByRole('row').filter({ hasText: `${guest.first} ${guest.last}` }).click();
    await expect(page.getByText(`staff ID ${guest.staffId}`)).toBeVisible();
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Booking approved and bill created.')).toBeVisible(); // wait for the server before leaving the page
    await page.goto('/admin/payments');
    const bill = page.getByRole('row').filter({ hasText: `${guest.first} ${guest.last}` });
    await expect(bill).toContainText('Nu. 262.50');
    await expect(bill).toContainText('Unpaid');
  });

  test('the incharge checks the staff ID, checks in, then checks out paid by mBOB', async ({ page }) => {
    await signIn(page, 'incharge@test.gl', STAFF_PASSWORD);
    await expect(page).toHaveURL(/\/incharge/);
    const arriving = page.getByRole('row').filter({ hasText: `${guest.first} ${guest.last}` });
    await expect(arriving).toContainText(`Verify staff ID: ${guest.staffId}`);
    await arriving.getByRole('button', { name: 'Check in' }).click();
    await expect(page.getByText('Guest checked in.')).toBeVisible();
    const staying = page.getByRole('row').filter({ hasText: `${guest.first} ${guest.last}` });
    await staying.getByRole('button', { name: 'Check out' }).click();
    await staying.locator('select[id^="pay-"]').selectOption('mBOB');
    await staying.getByRole('button', { name: 'Record payment and check out' }).click();
    await expect(page.getByText(/checked out and paid by mBOB/)).toBeVisible();
  });

  test('a guest cannot open the admin pages', async ({ page }) => {
    await signIn(page, guest.email, guest.password);
    await page.goto('/admin');
    await expect(page.getByText('You do not have permission to open this page.')).toBeVisible();
  });
});
