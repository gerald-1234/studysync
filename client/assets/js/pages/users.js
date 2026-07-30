import { api, send } from "../api.js";
import { requireUser } from "../auth.js";
import { escapeHtml, showToast, statusBadge, tableEmpty } from "../ui.js";

const form = document.querySelector("#user-form");
const tableBody = document.querySelector("#users-body");
const instructorFields = [...form.querySelectorAll("[data-instructor-field]")];

function showInstructorFields() {
  const isInstructor = form.role.value === "instructor";
  for (const field of instructorFields) {
    field.hidden = !isInstructor;
  }

  form.staffNumber.required = isInstructor;
  form.phone.required = isInstructor;
  form.querySelector("[data-submit-label]").textContent = isInstructor
    ? "Create instructor"
    : "Create account";

  if (!isInstructor) {
    form.staffNumber.value = "";
    form.phone.value = "";
    form.qualification.value = "";
  }
}

function renderUsers(users) {
  tableBody.innerHTML = users.length
    ? users.map((user) => `
      <tr>
        <td>${escapeHtml(`${user.first_name} ${user.last_name}`)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.role.replaceAll("_", " "))}</td>
        <td>${statusBadge(user.is_active ? "active" : "inactive")}</td>
        <td>
          <button
            class="button ${user.is_active ? "button-danger" : "button-secondary"}"
            type="button"
            data-toggle-user="${user.id}"
            data-active="${user.is_active}"
          >
            <i data-lucide="${user.is_active ? "user-x" : "user-check"}"></i>
            ${user.is_active ? "Deactivate" : "Activate"}
          </button>
        </td>
      </tr>
    `).join("")
    : tableEmpty(5);
  window.lucide?.createIcons();
}

async function loadUsers() {
  const data = await api("/users");
  renderUsers(data.users);
}

form.role.addEventListener("change", showInstructorFields);
form.addEventListener("reset", () => {
  window.setTimeout(showInstructorFields, 0);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const isInstructor = form.role.value === "instructor";

  try {
    await send(
      "/users",
      "POST",
      {
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        email: form.email.value,
        password: form.password.value,
        role: form.role.value,
        ...(isInstructor
          ? {
            staffNumber: form.staffNumber.value,
            phone: form.phone.value,
            qualification: form.qualification.value,
          }
          : {}),
      },
      {
        loadingButton: event.submitter,
        loadingText: isInstructor ? "Creating instructor..." : "Creating account...",
      },
    );
    form.reset();
    showInstructorFields();
    showToast(isInstructor
      ? "Instructor account and teaching profile created."
      : "User account created.");
    await loadUsers();
  } catch (error) {
    showToast(error.message, "error");
  }
});

tableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-toggle-user]");
  if (!button) {
    return;
  }

  try {
    const isActive = button.dataset.active === "true";
    await send(
      `/users/${button.dataset.toggleUser}/status`,
      "PATCH",
      { isActive: !isActive },
      {
        loadingButton: button,
        loadingText: isActive ? "Deactivating..." : "Activating...",
      },
    );
    showToast(`User account ${isActive ? "deactivated" : "activated"}.`);
    await loadUsers();
  } catch (error) {
    showToast(error.message, "error");
  }
});

async function start() {
  try {
    await requireUser(["admin"]);
    showInstructorFields();
    await loadUsers();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
