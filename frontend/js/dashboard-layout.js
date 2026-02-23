(function () {
  const STORAGE_KEY = "foodbridge_sidebar_collapsed";

  const NAV_LABEL_BY_FILE = {
    "dashboard.html": "Dashboard",
    "donate.html": "Donate",
    "my-donations.html": "Donations",
    "volunteer-pickups.html": "Pickups",
    "ngo-claims.html": "Claims",
    "admin-analytics.html": "Analytics"
  };

  const PAGE_META = {
    "dashboard.html": {
      title: "Dashboard",
      description: "Monitor donation health, operational flow, and impact signals from one unified workspace.",
      breadcrumb: [{ label: "Dashboard", href: "dashboard.html" }]
    },
    "my-donations.html": {
      title: "Donations",
      description: "Search, filter, and manage donation records with consistent status tracking and history.",
      breadcrumb: [
        { label: "Dashboard", href: "dashboard.html" },
        { label: "Donations" }
      ]
    },
    "volunteer-pickups.html": {
      title: "Pickups",
      description: "Review pickup demand, prioritize urgent requests, and accept assignments in real time.",
      breadcrumb: [
        { label: "Dashboard", href: "dashboard.html" },
        { label: "Pickups" }
      ]
    },
    "ngo-claims.html": {
      title: "Claims",
      description: "Track claim-ready donations and process NGO intake actions with clear operational visibility.",
      breadcrumb: [
        { label: "Dashboard", href: "dashboard.html" },
        { label: "Claims" }
      ]
    },
    "admin-analytics.html": {
      title: "Analytics",
      description: "Review platform performance metrics and run administrative maintenance actions safely.",
      breadcrumb: [
        { label: "Dashboard", href: "dashboard.html" },
        { label: "Analytics" }
      ]
    }
  };

  function isMobileViewport() {
    return window.matchMedia("(max-width: 1024px)").matches;
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
  }

  function getCurrentPageFile() {
    const file = String(window.location.pathname || "")
      .split("/")
      .filter(Boolean)
      .pop();

    return String(file || "dashboard.html").toLowerCase();
  }

  function getLinkFileName(link) {
    try {
      return String(new URL(link.getAttribute("href"), window.location.href).pathname || "")
        .split("/")
        .filter(Boolean)
        .pop()
        .toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function getRoleMeta(role) {
    const roleKey = String(role || "").toLowerCase();
    const roleMap = {
      donor: "Donor Workspace",
      volunteer: "Volunteer Workspace",
      ngo: "NGO Workspace",
      admin: "Admin Workspace"
    };

    return roleMap[roleKey] || "Enterprise Panel";
  }

  function getPageMeta() {
    const currentPage = getCurrentPageFile();
    const directMeta = PAGE_META[currentPage];
    if (directMeta) return directMeta;

    const activeText = document.querySelector(".dashboard-links .dashboard-link.active .dashboard-link-text");
    const inferredTitle = activeText?.textContent?.trim() || "Dashboard";

    return {
      title: inferredTitle,
      description: "View key operational data and workflows for your current workspace.",
      breadcrumb: [
        { label: "Dashboard", href: "dashboard.html" },
        { label: inferredTitle }
      ]
    };
  }

  function syncSidebarMode() {
    const mobile = isMobileViewport();

    if (mobile) {
      document.body.classList.remove("sidebar-collapsed");
      closeSidebar();
      return;
    }

    const collapsed = localStorage.getItem(STORAGE_KEY) === "1";
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    closeSidebar();
  }

  function applyCanonicalNavigation() {
    const currentPage = getCurrentPageFile();
    const navLinks = document.querySelectorAll(".dashboard-links .dashboard-link[href]");

    navLinks.forEach((link) => {
      const fileName = getLinkFileName(link);
      const label = NAV_LABEL_BY_FILE[fileName];
      const labelEl = link.querySelector(".dashboard-link-text");

      if (label && labelEl) {
        labelEl.textContent = label;
      }

      link.classList.toggle("active", fileName === currentPage);
    });
  }

  function updateIdentity() {
    if (typeof authService === "undefined" || !authService.isLoggedIn()) {
      return;
    }

    const user = authService.getUser() || {};
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || user.fullName || "User";
    const role = String(user.role || "member").toLowerCase();

    const initials = (user.initials || `${firstName.charAt(0)}${lastName.charAt(0)}` || "U")
      .slice(0, 2)
      .toUpperCase();

    const nameEl = document.getElementById("topbarUserName");
    const roleEl = document.getElementById("topbarUserRole");
    const avatarEl = document.getElementById("topbarAvatar");
    const sidebarRoleEl = document.getElementById("sidebarRoleLabel");

    if (nameEl) nameEl.textContent = fullName;
    if (roleEl) roleEl.textContent = getRoleMeta(role);
    if (avatarEl) avatarEl.textContent = initials;
    if (sidebarRoleEl) sidebarRoleEl.textContent = getRoleMeta(role);
  }

  function syncHeadingFromActiveLink() {
    const heading = document.querySelector("[data-page-heading]");
    if (!heading) return;

    const pageMeta = getPageMeta();
    heading.textContent = pageMeta.title;
  }

  function buildBreadcrumbMarkup(items) {
    const crumbs = Array.isArray(items) && items.length > 0
      ? items
      : [{ label: "Dashboard", href: "dashboard.html" }];

    return crumbs
      .map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const safeLabel = String(crumb.label || "");
        const safeHref = String(crumb.href || "");

        const labelMarkup = !isLast && safeHref
          ? `<a class="dashboard-breadcrumb-link" href="${safeHref}">${safeLabel}</a>`
          : `<span class="dashboard-breadcrumb-current">${safeLabel}</span>`;

        const separator = isLast ? "" : '<span class="dashboard-breadcrumb-sep" aria-hidden="true">/</span>';
        return `<li class="dashboard-breadcrumb-item">${labelMarkup}${separator}</li>`;
      })
      .join("");
  }

  function ensurePageHeader() {
    const content = document.querySelector(".dashboard-content");
    if (!content) return;

    const pageMeta = getPageMeta();
    let header = content.querySelector(".dashboard-page-header");

    if (!header) {
      header = document.createElement("section");
      header.className = "dashboard-page-header card-surface";
      header.innerHTML = `
        <nav class="dashboard-breadcrumb" aria-label="Breadcrumb">
          <ol class="dashboard-breadcrumb-list"></ol>
        </nav>
        <div class="dashboard-page-heading-wrap">
          <h2 class="dashboard-page-header-title"></h2>
          <p class="dashboard-page-header-copy"></p>
        </div>
      `;
      content.prepend(header);
    }

    const breadcrumbList = header.querySelector(".dashboard-breadcrumb-list");
    const title = header.querySelector(".dashboard-page-header-title");
    const copy = header.querySelector(".dashboard-page-header-copy");

    if (breadcrumbList) {
      breadcrumbList.innerHTML = buildBreadcrumbMarkup(pageMeta.breadcrumb);
    }

    if (title) {
      title.textContent = pageMeta.title;
    }

    if (copy) {
      copy.textContent = pageMeta.description;
    }
  }

  function createConfirmModal(options = {}) {
    const title = String(options.title || "Confirm Action");
    const message = String(options.message || "Are you sure you want to continue?");
    const confirmLabel = String(options.confirmLabel || "Confirm");
    const cancelLabel = String(options.cancelLabel || "Cancel");

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "confirm-modal-overlay";
      overlay.innerHTML = `
        <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle" aria-describedby="confirmModalMessage">
          <h3 id="confirmModalTitle">${title}</h3>
          <p id="confirmModalMessage">${message}</p>
          <div class="confirm-modal-actions">
            <button type="button" class="secondary-btn" data-action="cancel">${cancelLabel}</button>
            <button type="button" class="primary-btn" data-action="confirm">${confirmLabel}</button>
          </div>
        </div>
      `;

      const close = (result) => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
        resolve(Boolean(result));
      };

      const onKeyDown = (event) => {
        if (event.key === "Escape") {
          close(false);
        }
      };

      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          close(false);
        }
      });

      const cancelBtn = overlay.querySelector('[data-action="cancel"]');
      const confirmBtn = overlay.querySelector('[data-action="confirm"]');

      cancelBtn?.addEventListener("click", () => close(false));
      confirmBtn?.addEventListener("click", () => close(true));

      document.addEventListener("keydown", onKeyDown);
      document.body.appendChild(overlay);
      cancelBtn?.focus();
    });
  }

  function bindGuardedLogout(target) {
    if (!target || target.dataset.confirmBound === "1") return;

    target.dataset.confirmBound = "1";
    target.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const confirmed = await createConfirmModal({
        title: "Sign Out",
        message: "Sign out from your workspace now?",
        confirmLabel: "Sign Out",
        cancelLabel: "Cancel"
      });

      if (!confirmed) return;

      if (typeof authService !== "undefined") {
        authService.logout();
      }
    }, true);
  }

  function initSidebarControls() {
    const collapseBtn = document.getElementById("sidebarCollapseBtn");
    const mobileToggle = document.getElementById("sidebarMobileToggle");
    const backdrop = document.getElementById("dashboardBackdrop");

    collapseBtn?.addEventListener("click", () => {
      if (isMobileViewport()) return;

      const next = !document.body.classList.contains("sidebar-collapsed");
      document.body.classList.toggle("sidebar-collapsed", next);
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    });

    mobileToggle?.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-open");
    });

    backdrop?.addEventListener("click", closeSidebar);

    document.querySelectorAll(".dashboard-links .dashboard-link").forEach((item) => {
      item.addEventListener("click", () => {
        if (isMobileViewport()) {
          closeSidebar();
        }
      });
    });

    window.addEventListener("resize", syncSidebarMode);
    syncSidebarMode();
  }

  function initProfileDropdown() {
    const profile = document.getElementById("topbarProfile");
    const profileBtn = document.getElementById("topbarProfileBtn");
    const dropdown = document.getElementById("topbarDropdown");
    const topbarLogout = document.getElementById("topbarLogoutBtn");
    const sidebarLogout = document.getElementById("logoutBtn");

    bindGuardedLogout(topbarLogout);
    bindGuardedLogout(sidebarLogout);

    if (!profile || !profileBtn || !dropdown) return;

    const closeDropdown = () => {
      profile.classList.remove("open");
      profileBtn.setAttribute("aria-expanded", "false");
      dropdown.setAttribute("aria-hidden", "true");
    };

    profileBtn.addEventListener("click", () => {
      const willOpen = !profile.classList.contains("open");
      profile.classList.toggle("open", willOpen);
      profileBtn.setAttribute("aria-expanded", String(willOpen));
      dropdown.setAttribute("aria-hidden", String(!willOpen));
    });

    document.addEventListener("click", (event) => {
      if (!profile.contains(event.target)) {
        closeDropdown();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDropdown();
        closeSidebar();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyCanonicalNavigation();
    syncHeadingFromActiveLink();
    ensurePageHeader();
    initSidebarControls();
    initProfileDropdown();
    updateIdentity();
  });
})();
