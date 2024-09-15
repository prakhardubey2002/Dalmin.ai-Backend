const validLicenseKeys = ['LICENSE_KEY_1', 'LICENSE_KEY_2']; // Example keys

const checkLicense = (req, res, next) => {
  const licenseKey = req.headers['license-key'];

  if (!validLicenseKeys.includes(licenseKey)) {
    return res.status(403).json({ error: 'Invalid or missing license key' });
  }

  next();
};

module.exports = checkLicense;
