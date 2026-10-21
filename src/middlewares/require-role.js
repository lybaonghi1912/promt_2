export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Can dang nhap",
      });
    }

    if (!allowedRoles.includes(req.user.role?.rolename)) {
      return res.status(403).json({
        message: "Ban khong co quyen thuc hien thao tac nay",
      });
    }

    next();
  };
}