import { api } from "../api.js";
import { requireUser } from "../auth.js";
import { showToast } from "../ui.js";

const role = document.body.dataset.role;

async function loadDashboard() {
  try {
    await requireUser([role]);
    const data = await api("/dashboard/staff");
    const counts = data.counts;

    document.querySelector("[data-current-semester]").textContent = data.currentSemester
      ? `${data.currentSemester.semester_name} ${data.currentSemester.academic_session}`
      : "No open semester";
    document.querySelector("[data-students]").textContent = counts.activeStudents;
    document.querySelector("[data-courses]").textContent = counts.activeCourses;
    document.querySelector("[data-instructors]").textContent = counts.activeInstructors;
    document.querySelector("[data-enrolments]").textContent = counts.currentEnrolments;
    document.querySelector("[data-assignments]").textContent = counts.currentAssignments;
  } catch (error) {
    showToast(error.message, "error");
  }
}

loadDashboard();
