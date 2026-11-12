// Every email the system sends: account confirmation, new bookings, approval or rejection,
// cancellations, check-in, check-out (with what was paid and how), sharing, extensions and halls.
const { pool } = require('../config/db');
const env = require('../config/env');
const { sendMail } = require('./email');

const money = (n) => `Nu. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function adminEmails() {
  const [rows] = await pool.query(
    "SELECT email FROM users WHERE role IN ('Admin','Super Admin') AND status = 'Active'"
  );
  return rows.map((r) => r.email);
}

async function bookerEmail(booking) {
  if (!booking.user_id) return null; // international guest entered by an admin: no account, no email
  const [rows] = await pool.query('SELECT email, first_name FROM users WHERE user_id = ?', [booking.user_id]);
  return rows[0] || null;
}

function stayLine(b) {
  return `Room ${b.room_number || b.room_id}, ${b.check_in_date} to ${b.check_out_date}`;
}

module.exports = {
  async verifyEmail(user, token) {
    const link = `${env.clientUrl}/verify-email?token=${encodeURIComponent(token)}`;
    return sendMail({
      to: user.email,
      subject: 'G-Link: confirm your email',
      text: `Hello ${user.first_name},\n\nConfirm your email to activate your G-Link account:\n${link}\n\nThis link works for 24 hours. If you did not sign up, ignore this email.`,
      button: { url: link, label: 'Confirm my email' },
    });
  },

  async bookingSubmitted(booking) {
    return sendMail({
      to: await adminEmails(),
      subject: `G-Link: new room booking #${booking.booking_id} waiting for review`,
      text: `A new ${booking.booking_type} booking was submitted.\n${stayLine(booking)}\nGuests: ${booking.number_of_guests}\nPurpose: ${booking.purpose_of_visit}\n\nOpen the admin page to approve or reject it.`,
    });
  },

  async bookingOutcome(booking, bill) {
    const u = await bookerEmail(booking);
    if (!u) return false;
    const billText = bill ? `\nAmount due: ${money(bill.total_amount)} (incl. GST ${money(bill.gst_amount)})` : '';
    // RUB rate bookings: remind the guest that the staff ID is checked at the guest house.
    const rubText = booking.booking_status === 'Approved' && booking.guest_category === 'RUB'
      ? '\n\nStaff ID will be verified during check-in and check-out for RUB members. Please bring your staff ID.'
      : '';
    return sendMail({
      to: u.email,
      subject: `G-Link: your booking #${booking.booking_id} was ${booking.booking_status.toLowerCase()}`,
      text: `Hello ${u.first_name},\n\nYour room booking #${booking.booking_id} (${stayLine(booking)}) is now ${booking.booking_status}.${billText}${rubText}`,
    });
  },

  // by: 'guest' (cancelled from My bookings) or 'no-show' (the guest never arrived).
  async bookingCancelled(booking, by = 'guest') {
    const why = by === 'no-show' ? 'was marked as a no-show (the guest did not arrive) and cancelled' : 'was cancelled by the guest';
    await sendMail({
      to: await adminEmails(),
      subject: `G-Link: booking #${booking.booking_id} was cancelled`,
      text: `Booking #${booking.booking_id} (${stayLine(booking)}) ${why}.`,
    });
    const u = await bookerEmail(booking);
    if (!u) return false;
    const guestText = by === 'no-show'
      ? `You did not arrive for booking #${booking.booking_id} (${stayLine(booking)}), so it has been cancelled and the bed(s) released.\n\nIf this is a mistake, contact the guest house office.`
      : `Your booking #${booking.booking_id} (${stayLine(booking)}) has been cancelled as you asked.`;
    return sendMail({ to: u.email, subject: `G-Link: your booking #${booking.booking_id} was cancelled`, text: `Hello ${u.first_name},\n\n${guestText}` });
  },

  async checkedIn(booking) {
    const u = await bookerEmail(booking);
    if (!u) return false;
    return sendMail({
      to: u.email,
      subject: `G-Link: you are checked in (booking #${booking.booking_id})`,
      text: `Hello ${u.first_name},\n\nWelcome! You are checked in to room ${booking.room_number}.\nCheck-out date: ${booking.check_out_date}\n\nTo stay longer, request an extension from My bookings before your check-out date.`,
    });
  },

  // payments: the bills settled at check-out, each with its payment method.
  async checkedOut(booking, payments) {
    const u = await bookerEmail(booking);
    if (!u) return false;
    const lines = payments.length
      ? payments.map((p) => `- ${p.description || 'Bill'} #${p.payment_id}: ${money(p.total_amount)}, ${p.payment_status}${p.payment_method ? ` by ${p.payment_method}` : ''}`).join('\n')
      : '- No bills on this booking.';
    const total = payments.reduce((sum, p) => sum + Number(p.total_amount), 0);
    return sendMail({
      to: u.email,
      subject: `G-Link: you are checked out (booking #${booking.booking_id})`,
      text: `Hello ${u.first_name},\n\nYou checked out of room ${booking.room_number}. Your booking #${booking.booking_id} is complete.\n\nPayment summary:\n${lines}\nTotal: ${money(total)} (incl. GST)\n\nThank you for staying at the CST guest house.`,
    });
  },

  async roomChanged(booking, newRoomNumber) {
    const u = await bookerEmail(booking);
    if (!u) return false;
    return sendMail({
      to: u.email,
      subject: `G-Link: your room for booking #${booking.booking_id} has changed`,
      text: `Hello ${u.first_name},\n\nThe administration moved booking #${booking.booking_id} to room ${newRoomNumber}. Your dates stay ${booking.check_in_date} to ${booking.check_out_date}.`,
    });
  },

  // Occupant is told the sharer's first name, gender and dates. Never the contact details.
  async sharingNotice(hostBooking, sharer) {
    const u = await bookerEmail(hostBooking);
    if (!u) return false;
    return sendMail({
      to: u.email,
      subject: 'G-Link: a guest will share your room',
      text: `Hello ${u.first_name},\n\nYou allowed sharing on booking #${hostBooking.booking_id}. A guest has booked a free bed in your room:\n\nName: ${sharer.first_name}\nGender: ${sharer.gender}\nArrival: ${sharer.check_in_date}\nDeparture: ${sharer.check_out_date}\n\nContact details are kept with the administration.`,
    });
  },

  async extensionRequested(booking, ext) {
    return sendMail({
      to: await adminEmails(),
      subject: `G-Link: stay extension requested for booking #${booking.booking_id}`,
      text: `The guest on booking #${booking.booking_id} wants to stay until ${ext.new_check_out_date} (${ext.extra_nights} extra night(s)). Current check-out: ${ext.previous_check_out_date}.`,
    });
  },

  async extensionOutcome(booking, ext, bill) {
    const u = await bookerEmail(booking);
    const billText = bill ? `\nExtra charge: ${money(bill.total_amount)} (incl. GST ${money(bill.gst_amount)})` : '';
    const text = `Stay extension for booking #${booking.booking_id} to ${ext.new_check_out_date} was ${ext.extension_status.toLowerCase()}.${billText}`;
    await sendMail({ to: await adminEmails(), subject: `G-Link: extension ${ext.extension_status.toLowerCase()} (#${booking.booking_id})`, text });
    if (u) await sendMail({ to: u.email, subject: `G-Link: your stay extension was ${ext.extension_status.toLowerCase()}`, text: `Hello ${u.first_name},\n\n${text}` });
    return true;
  },

  async hallSubmitted(hb) {
    return sendMail({
      to: await adminEmails(),
      subject: `G-Link: new hall booking #${hb.hall_booking_id} waiting for review`,
      text: `Hall booking from ${hb.start_date} to ${hb.end_date} for ${hb.number_of_attendees} attendee(s).\nPurpose: ${hb.purpose}`,
    });
  },

  async hallOutcome(hb, bill) {
    const [rows] = await pool.query('SELECT email, first_name FROM users WHERE user_id = ?', [hb.user_id]);
    if (!rows[0]) return false;
    const billText = bill ? `\nAmount due: ${money(bill.total_amount)} (incl. GST ${money(bill.gst_amount)})` : '';
    return sendMail({
      to: rows[0].email,
      subject: `G-Link: your hall booking #${hb.hall_booking_id} was ${hb.booking_status.toLowerCase()}`,
      text: `Hello ${rows[0].first_name},\n\nYour hall booking #${hb.hall_booking_id} (${hb.start_date} to ${hb.end_date}) is now ${hb.booking_status}.${billText}`,
    });
  },

  async hallCancelled(hb) {
    const [rows] = await pool.query('SELECT email, first_name FROM users WHERE user_id = ?', [hb.user_id]);
    const when = `${hb.start_date} to ${hb.end_date}`;
    await sendMail({
      to: await adminEmails(),
      subject: `G-Link: hall booking #${hb.hall_booking_id} was cancelled`,
      text: `Hall booking #${hb.hall_booking_id} (${when}) was cancelled by the guest.`,
    });
    if (!rows[0]) return false;
    return sendMail({
      to: rows[0].email,
      subject: `G-Link: your hall booking #${hb.hall_booking_id} was cancelled`,
      text: `Hello ${rows[0].first_name},\n\nYour meeting hall booking #${hb.hall_booking_id} (${when}) has been cancelled as you asked. Your room bookings are not affected.`,
    });
  },

  money,
};
