import crypto from 'node:crypto';
const password = process.argv[2];
if (!password) { console.error('Usage: node scripts/generate-admin-hash.mjs "password-kuat"'); process.exit(1); }
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 64);
console.log(`scrypt$${salt.toString('hex')}$${hash.toString('hex')}`);
