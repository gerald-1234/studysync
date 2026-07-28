import { api } from "./api.js";
import { homeForRole } from "./auth.js";
import { TOKEN_KEY, USER_KEY } from "./config.js";
import { showToast } from "./ui.js";

const form = document.querySelector("#login-form");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.email.value.trim(),
        password: form.password.value,
      }),
    });
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    window.location.assign(homeForRole(data.user.role));
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

window.lucide?.createIcons();
