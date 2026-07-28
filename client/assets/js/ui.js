export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function statusBadge(status) {
  const name = String(status || "").toLowerCase();
  return `<span class="status status-${escapeHtml(name)}">${escapeHtml(name)}</span>`;
}

export function showToast(message, type = "success") {
  let region = document.querySelector(".toast-region");
  if (!region) {
    region = document.createElement("div");
    region.className = "toast-region";
    region.setAttribute("aria-live", "polite");
    document.body.append(region);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

export function populateSelect(select, items, placeholder, label) {
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = label(item);
    select.append(option);
  }
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function bindReset(form, callback) {
  form.querySelector("[data-reset-form]")?.addEventListener("click", () => {
    form.reset();
    form.dataset.editId = "";
    callback?.();
  });
}

export function tableEmpty(columnCount, message = "No records found.") {
  return `<tr><td class="empty-state" colspan="${columnCount}">${escapeHtml(message)}</td></tr>`;
}
