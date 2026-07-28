import { api, send } from "../api.js";
import { requireUser } from "../auth.js";
import {
  bindReset,
  escapeHtml,
  showToast,
  statusBadge,
  tableEmpty,
} from "../ui.js";

const form = document.querySelector("#subject-form");
const tableBody = document.querySelector("#subjects-body");
let subjects = [];

function renderSubjects() {
  tableBody.innerHTML = subjects.length
    ? subjects.map((subject) => `
      <tr>
        <td>${escapeHtml(subject.subject_code)}</td>
        <td>${escapeHtml(subject.subject_name)}</td>
        <td>${escapeHtml(subject.level || "-")}</td>
        <td>${statusBadge(subject.status)}</td>
        <td>
          <button class="icon-button" type="button" title="Edit subject" data-edit-subject="${subject.id}">
            <i data-lucide="pencil"></i>
          </button>
        </td>
      </tr>
    `).join("")
    : tableEmpty(5);
  window.lucide?.createIcons();
}

async function loadSubjects() {
  const data = await api("/subjects");
  subjects = data.subjects;
  renderSubjects();
}

function fillForm(subject) {
  form.dataset.editId = subject.id;
  form.subjectCode.value = subject.subject_code;
  form.subjectName.value = subject.subject_name;
  form.level.value = subject.level || "";
  form.description.value = subject.description || "";
  form.status.value = subject.status;
  form.querySelector("[data-submit-label]").textContent = "Update subject";
}

function resetLabel() {
  form.querySelector("[data-submit-label]").textContent = "Add subject";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editId = form.dataset.editId;
  try {
    await send(editId ? `/subjects/${editId}` : "/subjects", editId ? "PATCH" : "POST", {
      subjectCode: form.subjectCode.value,
      subjectName: form.subjectName.value,
      level: form.level.value,
      description: form.description.value,
      status: form.status.value,
    });
    form.reset();
    form.dataset.editId = "";
    resetLabel();
    showToast(editId ? "Subject updated." : "Subject added.");
    await loadSubjects();
  } catch (error) {
    showToast(error.message, "error");
  }
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-subject]");
  if (!button) {
    return;
  }
  const subject = subjects.find((item) => item.id === button.dataset.editSubject);
  if (subject) {
    fillForm(subject);
  }
});

bindReset(form, resetLabel);

async function start() {
  try {
    await requireUser(["manager"]);
    await loadSubjects();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
