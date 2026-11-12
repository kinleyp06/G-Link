// Unit tests: bills. Room = rate x beds x nights + GST from the rates table; hall = Nu. 5,000 per day + 5% GST.
// A fake database answers the rate look-ups with the starting rates.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { priceRoom, priceHall } = require('../../src/services/pricing');

const RATES = {
  'RUB|Per Bed': 250, 'RUB|Exclusive Room': 500,
  'Non-RUB|Per Bed': 400, 'Non-RUB|Exclusive Room': 800,
};
const fakeDb = {
  async query(sql, [category, chargeType]) {
    const rate = RATES[`${category}|${chargeType}`];
    return [rate === undefined ? [] : [{ rate, gst_percent: 5 }]];
  },
};

test('RUB member, one bed, 2 nights = Nu. 500 + GST 25 = Nu. 525', async () => {
  const bill = await priceRoom(fakeDb, { bookingType: 'Per Bed', bookerCategory: 'RUB', nights: 2 });
  assert.equal(bill.subtotal, 500);
  assert.equal(bill.gst_amount, 25);
  assert.equal(bill.total_amount, 525);
});

test('Non-RUB, one bed, 2 nights = Nu. 840', async () => {
  const bill = await priceRoom(fakeDb, { bookingType: 'Per Bed', bookerCategory: 'Non-RUB', nights: 2 });
  assert.equal(bill.total_amount, 840);
});

test('whole room for a RUB member, 2 nights = Nu. 1,050', async () => {
  const bill = await priceRoom(fakeDb, { bookingType: 'Exclusive', bookerCategory: 'RUB', nights: 2 });
  assert.equal(bill.total_amount, 1050);
});

test('family/group: each extra guest pays their own per-bed rate', async () => {
  const bill = await priceRoom(fakeDb, {
    bookingType: 'Family/Group', bookerCategory: 'RUB', nights: 2,
    extraGuests: [{ full_name: 'Karma', guest_category: 'Non-RUB' }],
  });
  assert.equal(bill.lines.length, 2);
  assert.equal(bill.subtotal, 1300); // (250 + 400) x 2
  assert.equal(bill.total_amount, 1365);
});

test('a rate that is not set stops the booking with a clear message', async () => {
  await assert.rejects(
    priceRoom(fakeDb, { bookingType: 'Per Bed', bookerCategory: 'International', nights: 1 }),
    /has not been set yet/
  );
});

test('meeting hall: 2 days = Nu. 10,000 + GST 500 = Nu. 10,500', () => {
  const bill = priceHall({ hall_name: 'Meeting Hall', price_per_day: 5000 }, 2);
  assert.equal(bill.subtotal, 10000);
  assert.equal(bill.gst_amount, 500);
  assert.equal(bill.total_amount, 10500);
});
