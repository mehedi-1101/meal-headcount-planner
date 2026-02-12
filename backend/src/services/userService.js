import { readJson } from "../storage/jsonStore.js";

const USERS_FILE = "users.json";

export function getAllUsers() {
  return readJson(USERS_FILE);
}

export function getUserByUsername(username) {
  const users = readJson(USERS_FILE);
  return users.find((u) => u.username === username);
}

export function getUserById(id) {
  const users = readJson(USERS_FILE);
  return users.find((u) => u.id === id);
}
