import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainTextPassword, passwordHash) {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
