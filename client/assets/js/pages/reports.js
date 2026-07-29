import { api } from "../api.js";
import { requireUser } from "../auth.js";
import {
  escapeHtml,
  populateSelect,
  showToast,
  tableEmpty,
} from "../ui.js";

const semesterSelect = document.querySelector("#report-semester");
const enrolmentBody = document.querySelector("#course-report-body");
const assignmentBody = document.querySelector("#assignment-report-body");

function renderCourseReport(rows) {
  enrolmentBody.innerHTML = rows.length
    ? rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.semester)}</td>
        <td>${escapeHtml(row.courseCode)}</td>
        <td>${escapeHtml(row.courseTitle)}</td>
        <td>${escapeHtml(row.enrolmentCount)}</td>
      </tr>
    `).join("")
    : tableEmpty(4);
}

function renderAssignmentReport(rows) {
  assignmentBody.innerHTML = rows.length
    ? rows.map((row) => `
      <tr>
        <td>${escapeHtml(`${row.semesters.semester_name} ${row.semesters.academic_session}`)}</td>
        <td>${escapeHtml(row.courses.course_code)}</td>
        <td>${escapeHtml(row.courses.course_title)}</td>
        <td>${escapeHtml(`${row.instructors.first_name} ${row.instructors.last_name}`)}</td>
      </tr>
    `).join("")
    : tableEmpty(4);
}

async function loadReports() {
  const suffix = semesterSelect.value ? `?semesterId=${encodeURIComponent(semesterSelect.value)}` : "";
  const [courseData, assignmentData] = await Promise.all([
    api(`/reports/course-enrolments${suffix}`),
    api(`/reports/instructor-assignments${suffix}`),
  ]);
  renderCourseReport(courseData.report);
  renderAssignmentReport(assignmentData.report);
}

semesterSelect.addEventListener("change", () => {
  loadReports().catch((error) => showToast(error.message, "error"));
});

async function start() {
  try {
    await requireUser(["manager"]);
    const semesterData = await api("/semesters");
    populateSelect(
      semesterSelect,
      semesterData.semesters,
      "All semesters",
      (semester) => `${semester.semester_name} ${semester.academic_session}`,
    );
    await loadReports();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
