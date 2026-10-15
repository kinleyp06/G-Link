// Turns any thrown error into a JSON reply: { message, code }.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.code === 'ER_DUP_ENTRY') {
    const field = /citizenship_id/.test(err.message) ? 'Citizenship ID'
      : /email/.test(err.message) ? 'Email'
      : /room_number/.test(err.message) ? 'Room number'
      : 'This value';
    return res.status(409).json({ message: `${field} is already in use.` });
  }
  if (err.status) return res.status(err.status).json({ message: err.message, code: err.code });
  console.error(err);
  return res.status(500).json({ message: 'Something went wrong on the server. Check the server terminal for details.' });
}

module.exports = errorHandler;
