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
    secret: 'mhp-dev-secret',
    resave: false,
    saveUninitialized: false,
  })
);

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
