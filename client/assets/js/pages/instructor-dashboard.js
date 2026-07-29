import { api } from "../api.js";
import { requireUser } from "../auth.js";
import { escapeHtml, showToast, tableEmpty } from "../ui.js";

const courseBody = document.querySelector("#instructor-courses-body");
const rosterContainer = document.querySelector("#roster-container");

function renderAssignments(assignments) {
  courseBody.innerHTML = assignments.length
    ? assignments.map((assignment) => `
      <tr>
        <td>${escapeHtml(assignment.courses.course_code)}</td>
        <td>${escapeHtml(assignment.courses.course_name)}</td>
        <td>${escapeHtml(`${assignment.semesters.semester_name} ${assignment.semesters.academic_session}`)}</td>
      </tr>
    `).join("")
    : tableEmpty(3, "No active courses assigned.");
}

function renderRosters(assignments) {
  rosterContainer.innerHTML = assignments.length
    ? assignments.map((assignment) => `
      <section class="panel">
        <div class="panel-heading">
          <h3>${escapeHtml(assignment.courses.course_code)} - ${escapeHtml(assignment.courses.course_name)}</h3>
          <span class="status status-active">${assignment.students.length} student(s)</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Registration Number</th>
                <th>Student Name</th>
              </tr>
            </thead>
            <tbody>
              ${assignment.students.length
                ? assignment.students.map((student) => `
                  <tr>
                    <td>${escapeHtml(student.registration_number)}</td>
                    <td>${escapeHtml(`${student.first_name} ${student.last_name}`)}</td>
                  </tr>
                `).join("")
                : tableEmpty(2, "No students enrolled.")}
            </tbody>
          </table>
        </div>
      </section>
    `).join("")
    : '<p class="empty-state">No class lists are available.</p>';
}

async function start() {
  try {
    await requireUser(["instructor"]);
    const [dashboardData, classData] = await Promise.all([
      api("/dashboard/instructor"),
      api("/instructors/me/courses"),
    ]);
    document.querySelector("[data-current-semester]").textContent = dashboardData.currentSemester
      ? `${dashboardData.currentSemester.semester_name} ${dashboardData.currentSemester.academic_session}`
      : "No open semester";
    document.querySelector("[data-assigned-courses]").textContent =
      dashboardData.counts.assignedCourses;
    document.querySelector("[data-enrolled-students]").textContent =
      dashboardData.counts.enrolledStudents;
    renderAssignments(dashboardData.assignments);
    renderRosters(classData.assignments);
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
