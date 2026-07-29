import { api, send } from "../api.js";
import { requireUser } from "../auth.js";
import {
  bindReset,
  escapeHtml,
  formatDate,
  showToast,
  statusBadge,
  tableEmpty,
} from "../ui.js";

const form = document.querySelector("#semester-form");
const tableBody = document.querySelector("#semesters-body");
let semesters = [];

function renderSemesters() {
  tableBody.innerHTML = semesters.length
    ? semesters.map((semester) => `
      <tr>
        <td>${escapeHtml(semester.semester_name)}</td>
        <td>${escapeHtml(semester.academic_session)}</td>
        <td>${formatDate(semester.start_date)}</td>
        <td>${formatDate(semester.end_date)}</td>
        <td>${statusBadge(semester.status)}</td>
        <td>
          <button class="icon-button" type="button" title="Edit semester" data-edit-semester="${semester.id}">
            <i data-lucide="pencil"></i>
          </button>
        </td>
      </tr>
    `).join("")
    : tableEmpty(6);
  window.lucide?.createIcons();
}

async function loadSemesters() {
  const data = await api("/semesters");
  semesters = data.semesters;
  renderSemesters();
}

function fillForm(semester) {
  form.dataset.editId = semester.id;
  form.semesterName.value = semester.semester_name;
  form.academicSession.value = semester.academic_session;
  form.startDate.value = semester.start_date;
  form.endDate.value = semester.end_date;
  form.status.value = semester.status;
  form.querySelector("[data-submit-label]").textContent = "Update semester";
}

function resetLabel() {
  form.querySelector("[data-submit-label]").textContent = "Add semester";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editId = form.dataset.editId;
  try {
    await send(editId ? `/semesters/${editId}` : "/semesters", editId ? "PATCH" : "POST", {
      semesterName: form.semesterName.value,
      academicSession: form.academicSession.value,
      startDate: form.startDate.value,
      endDate: form.endDate.value,
      status: form.status.value,
    });
    form.reset();
    form.dataset.editId = "";
    resetLabel();
    showToast(editId ? "Semester updated." : "Semester added.");
    await loadSemesters();
  } catch (error) {
    showToast(error.message, "error");
  }
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-semester]");
  if (!button) {
    return;
  }
  const semester = semesters.find((item) => item.id === button.dataset.editSemester);
  if (semester) {
    fillForm(semester);
  }
});

bindReset(form, resetLabel);

async function start() {
  try {
    await requireUser(["manager"]);
    await loadSemesters();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
