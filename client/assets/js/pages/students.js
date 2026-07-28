import { api, send } from "../api.js";
import { requireUser } from "../auth.js";
import {
  bindReset,
  escapeHtml,
  showToast,
  statusBadge,
  tableEmpty,
} from "../ui.js";

const form = document.querySelector("#student-form");
const searchForm = document.querySelector("#student-search-form");
const tableBody = document.querySelector("#students-body");
let students = [];

function fillForm(student) {
  form.dataset.editId = student.id;
  form.registrationNumber.value = student.registration_number;
  form.firstName.value = student.first_name;
  form.lastName.value = student.last_name;
  form.gender.value = student.gender;
  form.phone.value = student.phone;
  form.email.value = student.email || "";
  form.guardianPhone.value = student.guardian_phone;
  form.status.value = student.status;
  form.querySelector("[data-submit-label]").textContent = "Update student";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetFormLabel() {
  form.querySelector("[data-submit-label]").textContent = "Register student";
}

function renderStudents() {
  tableBody.innerHTML = students.length
    ? students.map((student) => `
      <tr>
        <td>${escapeHtml(student.registration_number)}</td>
        <td>${escapeHtml(`${student.first_name} ${student.last_name}`)}</td>
        <td>${escapeHtml(student.phone)}</td>
        <td>${escapeHtml(student.guardian_phone)}</td>
        <td>${statusBadge(student.status)}</td>
        <td>
          <button class="icon-button" type="button" title="Edit student" data-edit-student="${student.id}">
            <i data-lucide="pencil"></i>
          </button>
        </td>
      </tr>
    `).join("")
    : tableEmpty(6);
  window.lucide?.createIcons();
}

async function loadStudents(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const data = await api(`/students${query}`);
  students = data.students;
  renderStudents();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editId = form.dataset.editId;
  try {
    await send(editId ? `/students/${editId}` : "/students", editId ? "PATCH" : "POST", {
      registrationNumber: form.registrationNumber.value,
      firstName: form.firstName.value,
      lastName: form.lastName.value,
      gender: form.gender.value,
      phone: form.phone.value,
      email: form.email.value,
      guardianPhone: form.guardianPhone.value,
      status: form.status.value,
    });
    form.reset();
    form.dataset.editId = "";
    resetFormLabel();
    showToast(editId ? "Student updated." : "Student registered.");
    await loadStudents(searchForm.search.value);
  } catch (error) {
    showToast(error.message, "error");
  }
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadStudents(searchForm.search.value).catch((error) => showToast(error.message, "error"));
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-student]");
  if (!button) {
    return;
  }
  const student = students.find((item) => item.id === button.dataset.editStudent);
  if (student) {
    fillForm(student);
  }
});

bindReset(form, resetFormLabel);

async function start() {
  try {
    await requireUser(["registration_officer"]);
    await loadStudents();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
