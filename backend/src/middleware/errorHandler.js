export function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.status(500).send('<h1>500 - Internal Server Error</h1>');
  }
  
  res.status(500).json({ error: 'Internal server error' });
}
