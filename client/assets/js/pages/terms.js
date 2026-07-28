import { api, send } from "../api.js";
import { requireUser } from "../auth.js";
import {
  bindReset,
  escapeHtml,
  formatDate,
  showToast,
  statusBadge,
  tableEmpty,
} from "../ui.js";

const form = document.querySelector("#term-form");
const tableBody = document.querySelector("#terms-body");
let terms = [];

function renderTerms() {
  tableBody.innerHTML = terms.length
    ? terms.map((term) => `
      <tr>
        <td>${escapeHtml(term.term_name)}</td>
        <td>${escapeHtml(term.academic_session)}</td>
        <td>${formatDate(term.start_date)}</td>
        <td>${formatDate(term.end_date)}</td>
        <td>${statusBadge(term.status)}</td>
        <td>
          <button class="icon-button" type="button" title="Edit term" data-edit-term="${term.id}">
            <i data-lucide="pencil"></i>
          </button>
        </td>
      </tr>
    `).join("")
    : tableEmpty(6);
  window.lucide?.createIcons();
}

async function loadTerms() {
  const data = await api("/terms");
  terms = data.terms;
  renderTerms();
}

function fillForm(term) {
  form.dataset.editId = term.id;
  form.termName.value = term.term_name;
  form.academicSession.value = term.academic_session;
  form.startDate.value = term.start_date;
  form.endDate.value = term.end_date;
  form.status.value = term.status;
  form.querySelector("[data-submit-label]").textContent = "Update term";
}

function resetLabel() {
  form.querySelector("[data-submit-label]").textContent = "Add term";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editId = form.dataset.editId;
  try {
    await send(editId ? `/terms/${editId}` : "/terms", editId ? "PATCH" : "POST", {
      termName: form.termName.value,
      academicSession: form.academicSession.value,
      startDate: form.startDate.value,
      endDate: form.endDate.value,
      status: form.status.value,
    });
    form.reset();
    form.dataset.editId = "";
    resetLabel();
    showToast(editId ? "Academic term updated." : "Academic term added.");
    await loadTerms();
  } catch (error) {
    showToast(error.message, "error");
  }
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-term]");
  if (!button) {
    return;
  }
  const term = terms.find((item) => item.id === button.dataset.editTerm);
  if (term) {
    fillForm(term);
  }
});

bindReset(form, resetLabel);

async function start() {
  try {
    await requireUser(["manager"]);
    await loadTerms();
  } catch (error) {
    showToast(error.message, "error");
  }
}

start();
