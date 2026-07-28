import { api, send } from "../api.js";
import { requireUser } from "../auth.js";
import {
  escapeHtml,
  populateSelect,
  showToast,
  statusBadge,
  tableEmpty,
} from "../ui.js";

const form = document.querySelector("#assignment-form");
const tableBody = document.querySelector("#assignments-body");

function renderAssignments(assignments) {
  tableBody.innerHTML = assignments.length
    ? assignments.map((assignment) => `
      <tr>
        <td>${escapeHtml(assignment.subjects.subject_code)}</td>
        <td>${escapeHtml(assignment.subjects.subject_name)}</td>
        <td>${escapeHtml(`${assignment.instructors.first_name} ${assignment.instructors.last_name}`)}</td>
        <td>${escapeHtml(`${assignment.academic_terms.term_name} ${assignment.academic_terms.academic_session}`)}</td>
        <td>${statusBadge(assignment.status)}</td>
        <td>
          ${assignment.status === "active" ? `
            <button class="button button-danger" type="button" data-cancel-assignment="${assignment.id}">
              <i data-lucide="x"></i>
              Cancel
            </button>
          ` : "-"}
        </td>
      </tr>
    `).join("")
    : tableEmpty(6);
  window.lucide?.createIcons();
}

async function loadReferenceData() {
  const [instructorData, subjectData, termData] = await Promise.all([
    api("/instructors?activeOnly=true"),
    api("/subjects?activeOnly=true"),
    api("/terms"),
  ]);
  populateSelect(
    form.instructorId,
    instructorData.instructors,
    "Select instructor",
    (instructor) => `${instructor.staff_number} - ${instructor.first_name} ${instructor.last_name}`,
  );
  populateSelect(
    form.subjectId,
    subjectData.subjects,
    "Select subject",
    (subject) => `${subject.subject_code} - ${subject.subject_name}`,
  );
  populateSelect(
    form.termId,
    termData.terms.filter((term) => term.status === "open"),
    "Select open term",
    (term) => `${term.term_name} ${term.academic_session}`,
  );
}

async function loadAssignments() {
  const termId = form.termId.value;
  const data = await api(`/assignments${termId ? `?termId=${encodeURIComponent(termId)}` : ""}`);
  renderAssignments(data.assignments);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await send("/assignments", "POST", {
      instructorId: form.instructorId.value,
      subjectId: form.subjectId.value,
      termId: form.termId.value,
    });
    showToast("Instructor assigned.");
    await loadAssignments();
  } catch (error) {
    showToast(error.message, "error");
  }
});

form.termId.addEventListener("change", () => {
  loadAssignments().catch((error) => showToast(error.message, "error"));
});

tableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-cancel-assignment]");
  if (!button) {
    return;
  }
  try {
    await send(`/assignments/${button.dataset.cancelAssignment}/cancel`, "PATCH", {});
    showToast("Instructor assignment cancelled.");
    await loadAssignments();
  } catch (error) {
    showToast(error.message, "error");
  }
});

async function start() {
  try {
    await requireUser(["manager"]);
    await loadReferenceData();
    await loadAssignments();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
