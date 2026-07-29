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
const semesterSelect = form.semesterId;
const courseList = document.querySelector("#course-check-list");
const tableBody = document.querySelector("#enrolments-body");

function renderCourseChecks(courses) {
  courseList.innerHTML = courses.length
    ? courses.map((course) => `
      <label>
        <input type="checkbox" name="courseIds" value="${course.id}">
        <span>${escapeHtml(course.course_code)} - ${escapeHtml(course.course_title)}</span>
      </label>
    `).join("")
    : '<p class="empty-state">No active courses.</p>';
}

function renderEnrolments(enrolments) {
  tableBody.innerHTML = enrolments.length
    ? enrolments.map((enrolment) => `
      <tr>
        <td>${escapeHtml(enrolment.students.registration_number)}</td>
        <td>${escapeHtml(`${enrolment.students.first_name} ${enrolment.students.last_name}`)}</td>
        <td>${escapeHtml(enrolment.courses.course_title)}</td>
        <td>${escapeHtml(`${enrolment.semesters.semester_name} ${enrolment.semesters.academic_session}`)}</td>
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
  const [studentData, courseData, semesterData] = await Promise.all([
    api("/students"),
    api("/courses?activeOnly=true"),
    api("/semesters"),
  ]);
  populateSelect(
    studentSelect,
    studentData.students.filter((student) => student.status === "active"),
    "Select student",
    (student) => `${student.registration_number} - ${student.first_name} ${student.last_name}`,
  );
  populateSelect(
    semesterSelect,
    semesterData.semesters.filter((semester) => semester.status === "open"),
    "Select open semester",
    (semester) => `${semester.semester_name} ${semester.academic_session}`,
  );
  renderCourseChecks(courseData.courses);
}

async function loadEnrolments() {
  const semesterId = semesterSelect.value;
  const data = await api(`/enrolments${semesterId ? `?semesterId=${encodeURIComponent(semesterId)}` : ""}`);
  renderEnrolments(data.enrolments);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const courseIds = [...form.querySelectorAll("input[name='courseIds']:checked")]
    .map((checkbox) => checkbox.value);

  try {
    const data = await send("/enrolments", "POST", {
      studentId: form.studentId.value,
      semesterId: form.semesterId.value,
      courseIds,
    });
    showToast(`${data.enrolments.length} course enrolment(s) saved.`);
    form.querySelectorAll("input[name='courseIds']").forEach((checkbox) => {
      checkbox.checked = false;
    });
    await loadEnrolments();
  } catch (error) {
    showToast(error.message, "error");
  }
});

semesterSelect.addEventListener("change", () => {
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
