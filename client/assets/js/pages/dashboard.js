import { api } from "../api.js";
import { requireUser } from "../auth.js";
import { showToast } from "../ui.js";

const role = document.body.dataset.role;

async function loadDashboard() {
  try {
    await requireUser([role]);
    const data = await api("/dashboard/staff");
    const counts = data.counts;

    document.querySelector("[data-current-term]").textContent = data.currentTerm
      ? `${data.currentTerm.term_name} ${data.currentTerm.academic_session}`
      : "No open academic term";
    document.querySelector("[data-students]").textContent = counts.activeStudents;
    document.querySelector("[data-subjects]").textContent = counts.activeSubjects;
    document.querySelector("[data-instructors]").textContent = counts.activeInstructors;
    document.querySelector("[data-enrolments]").textContent = counts.currentEnrolments;
    document.querySelector("[data-assignments]").textContent = counts.currentAssignments;
  } catch (error) {
    showToast(error.message, "error");
  }
}

loadDashboard();
