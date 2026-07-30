import { api, send } from "../api.js";
import { requireUser } from "../auth.js";
import {
  escapeHtml,
  showToast,
  statusBadge,
  tableEmpty,
} from "../ui.js";

const form = document.querySelector("#instructor-form");
const tableBody = document.querySelector("#instructors-body");
const editorHelp = document.querySelector("#instructor-editor-help");
const saveButton = form.querySelector("[data-save-instructor]");
const editableControls = [...form.querySelectorAll("input, select")];
let instructors = [];

function setEditorEnabled(enabled) {
  for (const control of editableControls) {
    control.disabled = !enabled;
  }
  saveButton.disabled = !enabled;
}

function resetEditor() {
  form.reset();
  form.dataset.editId = "";
  setEditorEnabled(false);
  editorHelp.textContent = "Select the edit button beside an instructor to begin.";
}

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
  const instructorData = await api("/instructors");
  instructors = instructorData.instructors;
  renderInstructors();
}

function fillForm(instructor) {
  setEditorEnabled(true);
  form.dataset.editId = instructor.id;
  form.staffNumber.value = instructor.staff_number;
  form.firstName.value = instructor.first_name;
  form.lastName.value = instructor.last_name;
  form.phone.value = instructor.phone;
  form.email.value = instructor.email;
  form.qualification.value = instructor.qualification || "";
  form.status.value = instructor.status;
  editorHelp.textContent = `Editing ${instructor.staff_number} - ${instructor.first_name} ${instructor.last_name}.`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editId = form.dataset.editId;
  if (!editId) {
    showToast("Select an instructor before editing.", "error");
    return;
  }

  try {
    await send(
      `/instructors/${editId}`,
      "PATCH",
      {
        staffNumber: form.staffNumber.value,
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        phone: form.phone.value,
        email: form.email.value,
        qualification: form.qualification.value,
        status: form.status.value,
      },
      {
        loadingButton: event.submitter,
        loadingText: "Saving profile...",
      },
    );
    resetEditor();
    showToast("Instructor teaching profile updated.");
    await loadData();
  } catch (error) {
    showToast(error.message, "error");
  }
});

form.querySelector("[data-reset-form]").addEventListener("click", resetEditor);

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

async function start() {
  try {
    await requireUser(["manager"]);
    resetEditor();
    await loadData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
