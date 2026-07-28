import { api } from "../api.js";
import { requireUser } from "../auth.js";
import {
  escapeHtml,
  populateSelect,
  showToast,
  tableEmpty,
} from "../ui.js";

const termSelect = document.querySelector("#report-term");
const enrolmentBody = document.querySelector("#subject-report-body");
const assignmentBody = document.querySelector("#assignment-report-body");

function renderSubjectReport(rows) {
  enrolmentBody.innerHTML = rows.length
    ? rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.term)}</td>
        <td>${escapeHtml(row.subjectCode)}</td>
        <td>${escapeHtml(row.subjectName)}</td>
        <td>${escapeHtml(row.enrolmentCount)}</td>
      </tr>
    `).join("")
    : tableEmpty(4);
}

function renderAssignmentReport(rows) {
  assignmentBody.innerHTML = rows.length
    ? rows.map((row) => `
      <tr>
        <td>${escapeHtml(`${row.academic_terms.term_name} ${row.academic_terms.academic_session}`)}</td>
        <td>${escapeHtml(row.subjects.subject_code)}</td>
        <td>${escapeHtml(row.subjects.subject_name)}</td>
        <td>${escapeHtml(`${row.instructors.first_name} ${row.instructors.last_name}`)}</td>
      </tr>
    `).join("")
    : tableEmpty(4);
}

async function loadReports() {
  const suffix = termSelect.value ? `?termId=${encodeURIComponent(termSelect.value)}` : "";
  const [subjectData, assignmentData] = await Promise.all([
    api(`/reports/subject-enrolments${suffix}`),
    api(`/reports/instructor-assignments${suffix}`),
  ]);
  renderSubjectReport(subjectData.report);
  renderAssignmentReport(assignmentData.report);
}

termSelect.addEventListener("change", () => {
  loadReports().catch((error) => showToast(error.message, "error"));
});

async function start() {
  try {
    await requireUser(["manager"]);
    const termData = await api("/terms");
    populateSelect(
      termSelect,
      termData.terms,
      "All academic terms",
      (term) => `${term.term_name} ${term.academic_session}`,
    );
    await loadReports();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
