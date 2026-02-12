import session from "express-session";
import authRoutes from "./routes/auth.js";

const express = require('express');
const session = require('express-session');

// const { readJSON } = require('./storage/jsonStore');

const app = express();
const PORT = process.env.PORT || 3000;

// basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// session config (will refine later)
app.use(
  session({
    name: "mhp-session",
    secret: "dev-secret-change-later",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
    },
  })
);

app.use("/auth", authRoutes);

// temporary health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// test data endpoint
// app.get('/debug-storage', (req, res) => {
//   const data = readJSON('./data/test.json');
//   res.json(data);
// });

// start server
app.listen(PORT, () => {
  console.log(`MHP backend running on port ${PORT}`);
});
