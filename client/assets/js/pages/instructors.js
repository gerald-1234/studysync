import { api, send } from "../api.js";
import { requireUser } from "../auth.js";
import {
  bindReset,
  escapeHtml,
  populateSelect,
  showToast,
  statusBadge,
  tableEmpty,
} from "../ui.js";

const form = document.querySelector("#instructor-form");
const accountSelect = form.userId;
const tableBody = document.querySelector("#instructors-body");
let instructors = [];
let availableAccounts = [];

function renderInstructors() {
  tableBody.innerHTML = instructors.length
    ? instructors.map((instructor) => `
      <tr>
        <td>${escapeHtml(instructor.staff_number)}</td>
        <td>${escapeHtml(`${instructor.first_name} ${instructor.last_name}`)}</td>
        <td>${escapeHtml(instructor.email)}</td>
        <td>${escapeHtml(instructor.qualification || "-")}</td>
        <td>${statusBadge(instructor.status)}</td>
        <td>
          <button class="icon-button" type="button" title="Edit instructor" data-edit-instructor="${instructor.id}">
            <i data-lucide="pencil"></i>
          </button>
        </td>
      </tr>
    `).join("")
    : tableEmpty(6);
  window.lucide?.createIcons();
}

async function loadData() {
  const [instructorData, accountData] = await Promise.all([
    api("/instructors"),
    api("/users/available-instructor-accounts"),
  ]);
  instructors = instructorData.instructors;
  availableAccounts = accountData.users;
  populateSelect(
    accountSelect,
    availableAccounts,
    "No login account",
    (user) => `${user.first_name} ${user.last_name} (${user.email})`,
  );
  renderInstructors();
}

function fillForm(instructor) {
  form.dataset.editId = instructor.id;
  form.staffNumber.value = instructor.staff_number;
  form.firstName.value = instructor.first_name;
  form.lastName.value = instructor.last_name;
  form.phone.value = instructor.phone;
  form.email.value = instructor.email;
  form.qualification.value = instructor.qualification || "";
  form.status.value = instructor.status;

  if (instructor.user_id) {
    let option = [...accountSelect.options].find((item) => item.value === instructor.user_id);
    if (!option) {
      option = document.createElement("option");
      option.value = instructor.user_id;
      option.textContent = "Current linked login account";
      accountSelect.append(option);
    }
    accountSelect.value = instructor.user_id;
  } else {
    accountSelect.value = "";
  }

  form.querySelector("[data-submit-label]").textContent = "Update instructor";
}

function resetLabel() {
  form.querySelector("[data-submit-label]").textContent = "Add instructor";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editId = form.dataset.editId;
  try {
    await send(editId ? `/instructors/${editId}` : "/instructors", editId ? "PATCH" : "POST", {
      userId: form.userId.value || null,
      staffNumber: form.staffNumber.value,
      firstName: form.firstName.value,
      lastName: form.lastName.value,
      phone: form.phone.value,
      email: form.email.value,
      qualification: form.qualification.value,
      status: form.status.value,
    });
    form.reset();
    form.dataset.editId = "";
    resetLabel();
    showToast(editId ? "Instructor updated." : "Instructor added.");
    await loadData();
  } catch (error) {
    showToast(error.message, "error");
  }
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-instructor]");
  if (!button) {
    return;
  }
  const instructor = instructors.find((item) => item.id === button.dataset.editInstructor);
  if (instructor) {
    fillForm(instructor);
  }
});

bindReset(form, resetLabel);

async function start() {
  try {
    await requireUser(["manager"]);
    await loadData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
