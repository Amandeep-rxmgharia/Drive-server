export const checkNotUserManager = (req, res, next) => {
    if (req.user.role === "User" || req.user.role === "Manager") {
        return res.status(403).json({ error: "unauthorized!" });
    }
    next();
  }