const assert = require("node:assert/strict");
const test = require("node:test");

const controllerPath = require.resolve("../src/controllers/studentController");
const supabasePath = require.resolve("../src/config/supabase");
const auditPath = require.resolve("../src/utils/audit");

test("student creation rejects the removed Other gender option", async () => {
  const originalSupabase = require.cache[supabasePath];
  const originalAudit = require.cache[auditPath];

  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: {
      from() {
        return {
          insert() {
            throw new Error("The database insert should not run for invalid gender.");
          },
        };
      },
    },
  };
  require.cache[auditPath] = {
    id: auditPath,
    filename: auditPath,
    loaded: true,
    exports: { writeAuditLog: async () => {} },
  };
  delete require.cache[controllerPath];

  try {
    const controller = require(controllerPath);
    await assert.rejects(
      () => controller.createStudent(
        {
          user: { id: "registration-user" },
          body: {
            registrationNumber: "20261234567",
            firstName: "Ada",
            lastName: "Okafor",
            gender: "Other",
            phone: "08030000000",
            email: "ada@example.com",
            faculty: "Faculty of Engineering",
            department: "Computer Engineering",
            emergencyContactPhone: "08031111111",
            status: "active",
          },
        },
        {},
      ),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, "Gender must be Female or Male.");
        return true;
      },
    );
  } finally {
    delete require.cache[controllerPath];
    if (originalSupabase) {
      require.cache[supabasePath] = originalSupabase;
    } else {
      delete require.cache[supabasePath];
    }
    if (originalAudit) {
      require.cache[auditPath] = originalAudit;
    } else {
      delete require.cache[auditPath];
    }
  }
});
