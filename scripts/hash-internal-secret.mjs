import { pbkdf2Sync, randomBytes } from "node:crypto";

const secret = process.argv[2];
if (!secret || secret.length < 12) {
  console.error("Usage: npm run internal:user-hash -- '<passphrase at least 12 characters>'");
  process.exit(1);
}
const iterations = 210000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(secret, salt, iterations, 32, "sha256");
const base64url = (value) => Buffer.from(value).toString("base64url");
console.log(`pbkdf2$${iterations}$${base64url(salt)}$${base64url(hash)}`);
