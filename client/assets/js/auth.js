import { api } from "./api.js";
import { TOKEN_KEY, USER_KEY } from "./config.js";

const ROLE_HOME = {
  admin: "/admin/dashboard.html",
  registration_officer: "/registration/dashboard.html",
  manager: "/manager/dashboard.html",
  instructor: "/instructor/dashboard.html",
};

export function homeForRole(role) {
  return ROLE_HOME[role] || "/index.html";
}

export async function signOut() {
  try {
    await api("/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
      loadingText: "Signing out...",
    });
  } catch {
    // Local sign-out must still work if the API is temporarily unavailable.
  } finally {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.location.assign("/index.html");
  }
}

export async function requireUser(roles) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.replace("/index.html");
    throw new Error("Sign in required.");
  }

  let savedUser = null;
  try {
    savedUser = JSON.parse(sessionStorage.getItem(USER_KEY));
  } catch {
    sessionStorage.removeItem(USER_KEY);
  }

  const data = await api("/auth/me");
  const user = data.user || savedUser;
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));

  if (!roles.includes(user.role)) {
    window.location.replace(homeForRole(user.role));
    throw new Error("Role not permitted.");
  }

  const name = `${user.firstName} ${user.lastName}`;
  document.querySelectorAll("[data-user-name]").forEach((element) => {
    element.textContent = name;
  });
  document.querySelectorAll("[data-user-role]").forEach((element) => {
    element.textContent = user.role.replaceAll("_", " ");
  });
  document.querySelectorAll("[data-sign-out]").forEach((button) => {
    button.addEventListener("click", signOut);
  });

  window.lucide?.createIcons();
  return user;
}
