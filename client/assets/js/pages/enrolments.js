import { api, send } from "../api.js";
import { requireUser } from "../auth.js";
import {
  escapeHtml,
  populateSelect,
  showToast,
  statusBadge,
  tableEmpty,
} from "../ui.js";

const form = document.querySelector("#enrolment-form");
const studentSelect = form.studentId;
const termSelect = form.termId;
const subjectList = document.querySelector("#subject-check-list");
const tableBody = document.querySelector("#enrolments-body");

function renderSubjectChecks(subjects) {
  subjectList.innerHTML = subjects.length
    ? subjects.map((subject) => `
      <label>
        <input type="checkbox" name="subjectIds" value="${subject.id}">
        <span>${escapeHtml(subject.subject_code)} - ${escapeHtml(subject.subject_name)}</span>
      </label>
    `).join("")
    : '<p class="empty-state">No active subjects.</p>';
}

function renderEnrolments(enrolments) {
  tableBody.innerHTML = enrolments.length
    ? enrolments.map((enrolment) => `
      <tr>
        <td>${escapeHtml(enrolment.students.registration_number)}</td>
        <td>${escapeHtml(`${enrolment.students.first_name} ${enrolment.students.last_name}`)}</td>
        <td>${escapeHtml(enrolment.subjects.subject_name)}</td>
        <td>${escapeHtml(`${enrolment.academic_terms.term_name} ${enrolment.academic_terms.academic_session}`)}</td>
        <td>${statusBadge(enrolment.status)}</td>
        <td>
          ${enrolment.status === "active" ? `
            <button class="button button-danger" type="button" data-cancel-enrolment="${enrolment.id}">
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
  const [studentData, subjectData, termData] = await Promise.all([
    api("/students"),
    api("/subjects?activeOnly=true"),
    api("/terms"),
  ]);
  populateSelect(
    studentSelect,
    studentData.students.filter((student) => student.status === "active"),
    "Select student",
    (student) => `${student.registration_number} - ${student.first_name} ${student.last_name}`,
  );
  populateSelect(
    termSelect,
    termData.terms.filter((term) => term.status === "open"),
    "Select open term",
    (term) => `${term.term_name} ${term.academic_session}`,
  );
  renderSubjectChecks(subjectData.subjects);
}

async function loadEnrolments() {
  const termId = termSelect.value;
  const data = await api(`/enrolments${termId ? `?termId=${encodeURIComponent(termId)}` : ""}`);
  renderEnrolments(data.enrolments);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const subjectIds = [...form.querySelectorAll("input[name='subjectIds']:checked")]
    .map((checkbox) => checkbox.value);

  try {
    const data = await send("/enrolments", "POST", {
      studentId: form.studentId.value,
      termId: form.termId.value,
      subjectIds,
    });
    showToast(`${data.enrolments.length} subject enrolment(s) saved.`);
    form.querySelectorAll("input[name='subjectIds']").forEach((checkbox) => {
      checkbox.checked = false;
    });
    await loadEnrolments();
  } catch (error) {
    showToast(error.message, "error");
  }
});

termSelect.addEventListener("change", () => {
  loadEnrolments().catch((error) => showToast(error.message, "error"));
});

tableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-cancel-enrolment]");
  if (!button) {
    return;
  }
  try {
    await send(`/enrolments/${button.dataset.cancelEnrolment}/cancel`, "PATCH", {});
    showToast("Enrolment cancelled.");
    await loadEnrolments();
  } catch (error) {
    showToast(error.message, "error");
  }
});

async function start() {
  try {
    await requireUser(["registration_officer"]);
    await loadReferenceData();
    await loadEnrolments();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
