let currentApiButton = null;
const apiButtonStates = new WeakMap();

function rememberApiButton(button) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  currentApiButton = button;
  window.setTimeout(() => {
    if (currentApiButton === button) {
      currentApiButton = null;
    }
  }, 0);
}

document.addEventListener("click", (event) => {
  rememberApiButton(event.target.closest?.("button"));
}, true);

document.addEventListener("submit", (event) => {
  const submitButton = event.submitter
    || event.target.querySelector?.("button[type='submit']");
  rememberApiButton(submitButton);
}, true);

export function beginApiButtonLoading(button = currentApiButton, loadingText = "") {
  if (!(button instanceof HTMLButtonElement)) {
    return () => {};
  }

  let state = apiButtonStates.get(button);
  if (!state) {
    state = {
      count: 0,
      disabled: button.disabled,
      html: button.innerHTML,
      ariaBusy: button.getAttribute("aria-busy"),
      ariaLabel: button.getAttribute("aria-label"),
      minWidth: button.style.minWidth,
    };
    apiButtonStates.set(button, state);
  }

  state.count += 1;
  if (state.count === 1) {
    const label = loadingText || button.dataset.loadingText || "Loading...";
    const iconOnly = button.classList.contains("icon-button");
    const measuredWidth = Math.ceil(button.getBoundingClientRect().width);

    if (measuredWidth > 0) {
      button.style.minWidth = `${measuredWidth}px`;
    }
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.setAttribute("aria-label", label);
    button.innerHTML = iconOnly
      ? '<span class="button-spinner" aria-hidden="true"></span>'
      : `<span class="button-spinner" aria-hidden="true"></span><span>${escapeHtml(label)}</span>`;
  }

  let stopped = false;
  return () => {
    if (stopped) {
      return;
    }
    stopped = true;
    state.count -= 1;

    if (state.count > 0) {
      return;
    }

    button.disabled = state.disabled;
    button.innerHTML = state.html;
    button.style.minWidth = state.minWidth;

    if (state.ariaBusy === null) {
      button.removeAttribute("aria-busy");
    } else {
      button.setAttribute("aria-busy", state.ariaBusy);
    }

    if (state.ariaLabel === null) {
      button.removeAttribute("aria-label");
    } else {
      button.setAttribute("aria-label", state.ariaLabel);
    }

    apiButtonStates.delete(button);
    window.lucide?.createIcons();
  };
}

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
