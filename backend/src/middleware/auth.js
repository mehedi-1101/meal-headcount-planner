/**
 * Authentication and authorization middleware.
 *
 * requireAuth — checks session exists, redirects to /login for page requests
 * requireRole — checks user role against allowed list
 */

export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    // If the request expects HTML (browser), redirect to login
    if (req.headers.accept && req.headers.accept.includes("text/html")) {
      return res.redirect("/login");
    }
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

export function requireRole(allowedRoles) {
  return function (req, res, next) {
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}
