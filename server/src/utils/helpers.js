function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requiredText(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw createHttpError(`${fieldName} is required.`);
  }

  return value.trim();
}

function optionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredId(value, fieldName) {
  return requiredText(String(value || ""), fieldName);
}

function validEmail(value, fieldName = "Email") {
  const email = requiredText(value, fieldName).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createHttpError(`${fieldName} must be a valid email address.`);
  }

  return email;
}

function validPassword(value, fieldName = "Password") {
  const password = requiredText(value, fieldName);
  if (password.length < 8) {
    throw createHttpError(`${fieldName} must contain at least 8 characters.`);
  }

  return password;
}

function throwIfSupabaseError(error, fallbackMessage = "The database request failed.") {
  if (!error) {
    return;
  }

  const statusCode = error.code === "23505" ? 409 : 400;
  throw createHttpError(error.message || fallbackMessage, statusCode);
}

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

module.exports = {
  asyncHandler,
  createHttpError,
  optionalText,
  requiredId,
  requiredText,
  throwIfSupabaseError,
  validEmail,
  validPassword,
};
