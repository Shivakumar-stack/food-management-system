(() => {
  const roleLabels = {
    donor: "Donor",
    admin: "Admin",
    volunteer: "Volunteer",
    ngo: "NGO"
  };

  function getAlertContainer() {
    return document.getElementById("alertContainer");
  }

  function showPortalAlert(message, type = "info") {
    const container = getAlertContainer();
    if (typeof ui !== "undefined" && typeof ui.showAlert === "function") {
      ui.showAlert(message, type, container);
      return;
    }

    if (container) {
      container.innerHTML = `<p class="text-sm text-gray-700">${message}</p>`;
    }
  }

  function isAuthenticated() {
    return typeof authService !== "undefined" && authService.isLoggedIn();
  }

  function getCurrentUser() {
    if (!isAuthenticated() || typeof authService === "undefined") return null;
    return authService.getUser() || null;
  }

  function parseRequiredRoles(actionLink) {
    return String(actionLink.dataset.requiresRole || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  function isRoleAllowed(actionLink, role) {
    const requiredRoles = parseRequiredRoles(actionLink);
    if (!requiredRoles.length) return true;
    return requiredRoles.includes(String(role || "").toLowerCase());
  }

  function getRestrictionReason(actionLink, isLoggedIn, role) {
    if (actionLink.dataset.requiresAuth === "true" && !isLoggedIn) {
      return "auth";
    }

    if (!isRoleAllowed(actionLink, role)) {
      return "role";
    }

    return "";
  }

  function updateAccessStrip(user) {
    const strip = document.getElementById("donorAccessText");
    if (!strip) return;

    if (!user) {
      strip.textContent = "Guest mode: you can browse this page. Login is required for donor actions.";
      return;
    }

    const role = String(user.role || "").toLowerCase();
    const label = roleLabels[role] || "User";
    if (["donor", "admin"].includes(role)) {
      strip.textContent = `Signed in as ${label}. You can submit and manage donations from this portal.`;
      return;
    }

    strip.textContent =
      `Signed in as ${label}. You can view donor resources, but donation creation requires a donor account.`;
  }

  function updateGuestActionsVisibility(isLoggedIn) {
    const guestActionRow = document.getElementById("guestAuthActions");
    if (!guestActionRow) return;
    guestActionRow.classList.toggle("hidden", isLoggedIn);
  }

  function updateActionStates(user) {
    const isLoggedIn = Boolean(user);
    const role = String(user?.role || "").toLowerCase();
    const actionLinks = document.querySelectorAll('[data-requires-auth="true"]');

    actionLinks.forEach((actionLink) => {
      const reason = getRestrictionReason(actionLink, isLoggedIn, role);
      const isRestricted = Boolean(reason);

      actionLink.classList.toggle("is-restricted", isRestricted);
      actionLink.setAttribute("aria-disabled", isRestricted ? "true" : "false");
      actionLink.dataset.restrictionReason = reason;

      if (!isRestricted) {
        actionLink.removeAttribute("title");
        return;
      }

      if (reason === "auth") {
        actionLink.setAttribute("title", "Log in to continue");
        return;
      }

      actionLink.setAttribute("title", "This action requires donor access");
    });
  }

  function getActionLabel(actionLink) {
    const fallbackLabel = "continue";
    return String(actionLink?.dataset?.actionLabel || fallbackLabel).trim().toLowerCase();
  }

  function handleProtectedActionClick(event) {
    const actionLink = event.target.closest("[data-requires-auth='true']");
    if (!actionLink) return;

    const reason = String(actionLink.dataset.restrictionReason || "").trim();
    if (!reason) return;

    event.preventDefault();

    if (reason === "auth") {
      const actionLabel = getActionLabel(actionLink);
      sessionStorage.setItem("redirectAfterLogin", actionLink.href);
      showPortalAlert(`Please log in with your account to ${actionLabel}.`, "info");
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 350);
      return;
    }

    showPortalAlert(
      "Your current account role can view this portal but cannot perform donor-only actions.",
      "warning"
    );
  }

  function init() {
    const user = getCurrentUser();
    updateAccessStrip(user);
    updateGuestActionsVisibility(Boolean(user));
    updateActionStates(user);

    document.addEventListener("click", handleProtectedActionClick);

    if (!user) {
      showPortalAlert("You can browse the donor portal in guest mode. Log in to submit donations.", "info");
      return;
    }

    const role = String(user.role || "").toLowerCase();
    if (["donor", "admin"].includes(role)) {
      showPortalAlert("You are logged in. Donation tools are active.", "success");
      return;
    }

    showPortalAlert("You are logged in, but donor submission actions are restricted for this role.", "warning");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
