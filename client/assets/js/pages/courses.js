import { api, send } from "../api.js";
import { requireUser } from "../auth.js";
import {
  bindReset,
  escapeHtml,
  showToast,
  statusBadge,
  tableEmpty,
} from "../ui.js";

const form = document.querySelector("#course-form");
const tableBody = document.querySelector("#courses-body");
let courses = [];

function renderCourses() {
  tableBody.innerHTML = courses.length
    ? courses.map((course) => `
      <tr>
        <td>${escapeHtml(course.course_code)}</td>
        <td>${escapeHtml(course.course_title)}</td>
        <td>${escapeHtml(course.level || "-")}</td>
        <td>${statusBadge(course.status)}</td>
        <td>
          <button class="icon-button" type="button" title="Edit course" data-edit-course="${course.id}">
            <i data-lucide="pencil"></i>
          </button>
        </td>
      </tr>
    `).join("")
    : tableEmpty(5);
  window.lucide?.createIcons();
}

async function loadCourses() {
  const data = await api("/courses");
  courses = data.courses;
  renderCourses();
}

function fillForm(course) {
  form.dataset.editId = course.id;
  form.courseCode.value = course.course_code;
  form.courseTitle.value = course.course_title;
  form.level.value = course.level || "";
  form.description.value = course.description || "";
  form.status.value = course.status;
  form.querySelector("[data-submit-label]").textContent = "Update course";
}

function resetLabel() {
  form.querySelector("[data-submit-label]").textContent = "Add course";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editId = form.dataset.editId;
  try {
    await send(editId ? `/courses/${editId}` : "/courses", editId ? "PATCH" : "POST", {
      courseCode: form.courseCode.value,
      courseTitle: form.courseTitle.value,
      level: form.level.value,
      description: form.description.value,
      status: form.status.value,
    });
    form.reset();
    form.dataset.editId = "";
    resetLabel();
    showToast(editId ? "Course updated." : "Course added.");
    await loadCourses();
  } catch (error) {
    showToast(error.message, "error");
  }
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-course]");
  if (!button) {
    return;
  }
  const course = courses.find((item) => item.id === button.dataset.editCourse);
  if (course) {
    fillForm(course);
  }
});

bindReset(form, resetLabel);

async function start() {
  try {
    await requireUser(["manager"]);
    await loadCourses();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
