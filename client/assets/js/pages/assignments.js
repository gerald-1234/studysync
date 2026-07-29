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
        <td>${escapeHtml(assignment.courses.course_code)}</td>
        <td>${escapeHtml(assignment.courses.course_title)}</td>
        <td>${escapeHtml(`${assignment.instructors.first_name} ${assignment.instructors.last_name}`)}</td>
        <td>${escapeHtml(`${assignment.semesters.semester_name} ${assignment.semesters.academic_session}`)}</td>
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
  const [instructorData, courseData, semesterData] = await Promise.all([
    api("/instructors?activeOnly=true"),
    api("/courses?activeOnly=true"),
    api("/semesters"),
  ]);
  populateSelect(
    form.instructorId,
    instructorData.instructors,
    "Select instructor",
    (instructor) => `${instructor.staff_number} - ${instructor.first_name} ${instructor.last_name}`,
  );
  populateSelect(
    form.courseId,
    courseData.courses,
    "Select course",
    (course) => `${course.course_code} - ${course.course_title}`,
  );
  populateSelect(
    form.semesterId,
    semesterData.semesters.filter((semester) => semester.status === "open"),
    "Select open semester",
    (semester) => `${semester.semester_name} ${semester.academic_session}`,
  );
}

async function loadAssignments() {
  const semesterId = form.semesterId.value;
  const data = await api(`/assignments${semesterId ? `?semesterId=${encodeURIComponent(semesterId)}` : ""}`);
  renderAssignments(data.assignments);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await send("/assignments", "POST", {
      instructorId: form.instructorId.value,
      courseId: form.courseId.value,
      semesterId: form.semesterId.value,
    });
    showToast("Instructor assigned.");
    await loadAssignments();
  } catch (error) {
    showToast(error.message, "error");
  }
});

form.semesterId.addEventListener("change", () => {
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
