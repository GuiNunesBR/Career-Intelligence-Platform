import bcrypt from 'bcryptjs';

const hash = '$2b$10$FFYMqLCw0W8nxbB7ph/sme3qFhx5VxhEpGRQogvCF66eHq4EJ9k/S';
const pass = 'CareerLake@2026';
const isValid = bcrypt.compareSync(pass, hash);

console.log('IsValid:', isValid);
