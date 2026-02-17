/**
 * Authentication and authorization middleware.
 *
 * requireAuth — checks session exists, returns 401 JSON
 * requireRole — checks user role against allowed list
 */

export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
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
