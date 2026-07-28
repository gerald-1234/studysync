function allowRoles(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      return response.status(403).json({ message: "You do not have permission to perform this action." });
    }

    return next();
  };
}

module.exports = { allowRoles };
