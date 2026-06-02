export default function handler(req, res) {
  res.status(200).json({
    hasPassword: !!process.env.ADMIN_PASSWORD,
    passwordLength: process.env.ADMIN_PASSWORD?.length ?? 0,
    receivedHeader: req.headers['x-admin-password'] ?? '(none)',
    receivedHeaderLength: (req.headers['x-admin-password'] ?? '').length,
  });
}
