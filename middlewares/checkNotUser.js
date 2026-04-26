export const checkNotUser = (req, res, next) => {
    if (req.user.role !== "User") {
      next();
      return;
    }
    return res.status(403).json({ error: "unauthorized!" });
  }