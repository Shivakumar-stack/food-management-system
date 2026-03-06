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

  function animateCounter(el, targetValue) {
    const target = Math.max(0, Number(targetValue) || 0);
    const durationMs = 1300;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  function initCounters() {
    const counters = Array.from(document.querySelectorAll("[data-count]"));
    if (!counters.length) return;

    const runCounter = (counterEl) => {
      if (counterEl.dataset.countAnimated === "1") return;
      counterEl.dataset.countAnimated = "1";
      animateCounter(counterEl, counterEl.dataset.count);
    };

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      counters.forEach((counterEl) => runCounter(counterEl));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
    );

    counters.forEach((counterEl) => observer.observe(counterEl));
  }

  function initWindowChips() {
    const chips = Array.from(document.querySelectorAll("[data-window-chip]"));
    const preview = document.getElementById("windowPreview");
    if (!chips.length || !preview) return;

    const setActiveChip = (activeChip) => {
      chips.forEach((chip) => {
        const isActive = chip === activeChip;
        chip.classList.toggle("is-active", isActive);
      });

      preview.textContent = activeChip.dataset.windowLabel || "";
    };

    chips.forEach((chip) => {
      chip.addEventListener("click", () => setActiveChip(chip));
    });

    const initial = chips.find((chip) => chip.classList.contains("is-active")) || chips[0];
    setActiveChip(initial);
  }

  function initCategoryFilters() {
    const filters = Array.from(document.querySelectorAll("[data-category-filter]"));
    const cards = Array.from(document.querySelectorAll("[data-category-card]"));
    const hint = document.getElementById("catalogHint");
    if (!filters.length || !cards.length) return;

    const hintTextByCategory = {
      all: "Showing all donation playbooks.",
      cooked: "Showing cooked meal workflows.",
      bakery: "Showing bakery donation workflows.",
      produce: "Showing produce donation workflows.",
      packaged: "Showing packaged inventory workflows."
    };

    const setActiveCategory = (category) => {
      const normalized = String(category || "all").toLowerCase();

      filters.forEach((filterBtn) => {
        const isActive = filterBtn.dataset.categoryFilter === normalized;
        filterBtn.classList.toggle("is-active", isActive);
        filterBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      cards.forEach((card) => {
        const categories = String(card.dataset.category || "")
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean);

        const visible = normalized === "all" || categories.includes(normalized);
        card.hidden = !visible;
      });

      if (hint) {
        hint.textContent = hintTextByCategory[normalized] || hintTextByCategory.all;
      }
    };

    filters.forEach((filterBtn) => {
      filterBtn.addEventListener("click", () => {
        setActiveCategory(filterBtn.dataset.categoryFilter);
      });
    });

    const initialCategory =
      filters.find((filterBtn) => filterBtn.classList.contains("is-active"))?.dataset.categoryFilter || "all";
    setActiveCategory(initialCategory);
  }

  function initFaqAccordion() {
    const triggers = Array.from(document.querySelectorAll("[data-faq-trigger]"));
    if (!triggers.length) return;

    const setState = (trigger, open) => {
      const panelId = trigger.getAttribute("aria-controls");
      const panel = panelId ? document.getElementById(panelId) : null;
      const item = trigger.closest(".faq-item");

      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      if (item) item.classList.toggle("is-open", open);
      if (panel) panel.hidden = !open;
    };

    triggers.forEach((trigger) => {
      setState(trigger, false);
      trigger.addEventListener("click", () => {
        const willOpen = trigger.getAttribute("aria-expanded") !== "true";
        triggers.forEach((otherTrigger) => setState(otherTrigger, false));
        if (willOpen) setState(trigger, true);
      });
    });
  }

  function initRevealOnScroll() {
    const blocks = Array.from(document.querySelectorAll(".reveal-block"));
    if (!blocks.length) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      blocks.forEach((block) => block.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
    );

    blocks.forEach((block) => observer.observe(block));
  }

  function initChecklistProgress() {
    const items = Array.from(document.querySelectorAll("[data-checklist-item]"));
    const percentEl = document.getElementById("checklistPercent");
    const progressEl = document.getElementById("checklistProgress");

    if (!items.length || !percentEl || !progressEl) return;

    const updateProgress = () => {
      const checked = items.filter((item) => item.checked).length;
      const percent = Math.round((checked / items.length) * 100);
      percentEl.textContent = `${percent}%`;
      progressEl.style.width = `${percent}%`;
    };

    items.forEach((item) => {
      item.addEventListener("change", updateProgress);
    });

    updateProgress();
  }

  function initCoordinationTips() {
    const tipText = document.getElementById("coordinationTipText");
    const nextTipBtn = document.getElementById("nextTipBtn");
    if (!tipText || !nextTipBtn) return;

    const tips = [
      "Label the outer box with a single total meal count to reduce handoff time.",
      "Add a direct parking landmark in notes to cut volunteer call-backs.",
      "Pack same-temperature items together to avoid repacking delays.",
      "Keep one contact person available during the pickup window."
    ];

    let tipIndex = 0;
    nextTipBtn.addEventListener("click", () => {
      tipIndex = (tipIndex + 1) % tips.length;
      tipText.textContent = tips[tipIndex];
    });
  }

  function initInteractiveModules() {
    initCounters();
    initWindowChips();
    initCategoryFilters();
    initFaqAccordion();
    initRevealOnScroll();
    initChecklistProgress();
    initCoordinationTips();
  }

  function init() {
    initInteractiveModules();

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
