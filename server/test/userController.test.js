const assert = require("node:assert/strict");
const test = require("node:test");

const controllerPath = require.resolve("../src/controllers/userController");
const supabasePath = require.resolve("../src/config/supabase");
const auditPath = require.resolve("../src/utils/audit");

function fakeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function fakeDatabase({ instructorError = null } = {}) {
  const calls = [];

  return {
    calls,
    from(table) {
      const state = { action: "", payload: null };
      const builder = {
        insert(payload) {
          state.action = "insert";
          state.payload = payload;
          calls.push({ table, action: "insert", payload });
          return builder;
        },
        delete() {
          state.action = "delete";
          calls.push({ table, action: "delete" });
          return builder;
        },
        select() {
          return builder;
        },
        async single() {
          if (table === "users" && state.action === "insert") {
            return {
              data: {
                id: "user-1",
                email: state.payload.email,
                first_name: state.payload.first_name,
                last_name: state.payload.last_name,
                role: state.payload.role,
                is_active: true,
              },
              error: null,
            };
          }

          if (table === "instructors" && state.action === "insert") {
            return instructorError
              ? { data: null, error: instructorError }
              : {
                data: {
                  id: "instructor-1",
                  ...state.payload,
                },
                error: null,
              };
          }

          throw new Error(`Unexpected single() call for ${table}.`);
        },
        async eq(field, value) {
          calls.push({ table, action: state.action, field, value });
          return { error: null };
        },
      };

      return builder;
    },
  };
}

function loadController(database, auditCalls) {
  const originalSupabase = require.cache[supabasePath];
  const originalAudit = require.cache[auditPath];

  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: database,
  };
  require.cache[auditPath] = {
    id: auditPath,
    filename: auditPath,
    loaded: true,
    exports: {
      writeAuditLog: async (...args) => {
        auditCalls.push(args);
      },
    },
  };
  delete require.cache[controllerPath];
  const controller = require(controllerPath);

  return {
    controller,
    restore() {
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
    },
  };
}

function instructorRequest() {
  return {
    user: { id: "admin-1" },
    body: {
      firstName: "Ada",
      lastName: "Okafor",
      email: "ADA@EXAMPLE.COM",
      password: "Password123",
      role: "instructor",
      staffNumber: "ins-008",
      phone: "08030000000",
      qualification: "B.Sc. Mathematics",
    },
  };
}

test("creating an instructor account also creates and links its teaching profile", async () => {
  const database = fakeDatabase();
  const auditCalls = [];
  const loaded = loadController(database, auditCalls);

  try {
    const response = fakeResponse();
    await loaded.controller.createUser(instructorRequest(), response);

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.user.id, "user-1");
    assert.equal(response.body.instructor.user_id, "user-1");
    assert.equal(response.body.instructor.staff_number, "INS-008");

    const profileInsert = database.calls.find(
      (call) => call.table === "instructors" && call.action === "insert",
    );
    assert.equal(profileInsert.payload.user_id, "user-1");
    assert.equal(profileInsert.payload.email, "ada@example.com");
    assert.equal(auditCalls[0][1], "CREATE_INSTRUCTOR_ACCOUNT");
  } finally {
    loaded.restore();
  }
});

test("a failed teaching-profile insert removes the incomplete login account", async () => {
  const database = fakeDatabase({
    instructorError: {
      code: "23505",
      message: "Instructor staff number already exists.",
    },
  });
  const loaded = loadController(database, []);

  try {
    await assert.rejects(
      () => loaded.controller.createUser(instructorRequest(), fakeResponse()),
      (error) => {
        assert.equal(error.statusCode, 409);
        return true;
      },
    );

    assert.ok(database.calls.some(
      (call) => call.table === "users" && call.action === "delete",
    ));
  } finally {
    loaded.restore();
  }
});
