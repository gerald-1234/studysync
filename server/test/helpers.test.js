const assert = require("node:assert/strict");
const test = require("node:test");

const {
  requiredText,
  validEmail,
  validPassword,
} = require("../src/utils/helpers");
const { allowRoles } = require("../src/middleware/roleMiddleware");

test("requiredText trims a valid value", () => {
  assert.equal(requiredText("  Mathematics  ", "Course"), "Mathematics");
});

test("requiredText rejects a blank value", () => {
  assert.throws(
    () => requiredText("   ", "Course"),
    /Course is required/,
  );
});

test("validEmail normalises email addresses", () => {
  assert.equal(validEmail("  USER@Example.COM  "), "user@example.com");
});

test("validPassword requires at least eight characters", () => {
  assert.throws(
    () => validPassword("short"),
    /at least 8 characters/,
  );
});

test("allowRoles blocks a user with the wrong role", () => {
  const middleware = allowRoles("admin");
  const request = { user: { role: "instructor" } };
  let statusCode;
  let body;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  middleware(request, response, () => {
    throw new Error("next should not be called");
  });

  assert.equal(statusCode, 403);
  assert.match(body.message, /permission/);
});
