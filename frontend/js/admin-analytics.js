document.addEventListener("DOMContentLoaded", async () => {
  if (typeof authService === "undefined" || typeof donationService === "undefined") {
    console.error("Required services are unavailable.");
    return;
  }

  if (!authService.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const user = authService.getUser() || {};
  const role = user.role || "";

  applyRoleLinks(role);
  bindLogout();

  if (role !== "admin") {
    window.location.href = "dashboard.html";
    return;
  }

  document.getElementById("refreshAdminStatsBtn")?.addEventListener("click", () => {
    loadAdminAnalytics();
  });

  document.getElementById("runAutoExpireBtn")?.addEventListener("click", async (event) => {
    await runAutoExpire(event.currentTarget);
  });

  document.getElementById("backfillCoordinatesBtn")?.addEventListener("click", async (event) => {
    await runCoordinateBackfill(event.currentTarget);
  });

  await loadAdminAnalytics();
});

function applyRoleLinks(role) {
  document.querySelectorAll(".dashboard-links [data-role]").forEach((item) => {
    const allowedRoles = (item.dataset.role || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    item.style.display = allowedRoles.includes(role) ? "flex" : "none";
  });
}

function bindLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "true";
    logoutBtn.addEventListener("click", () => authService.logout());
  }
}

async function loadAdminAnalytics() {
  const grid = document.getElementById("adminAnalyticsGrid");
  if (!grid) return;

  grid.innerHTML = renderAnalyticsSkeletons();

  try {
    const response = await donationService.getAdminStats();
    const stats = response?.data || {};
    const donationStats = stats?.donations || stats;
    const userStats = stats?.users || {};

    const metrics = [
      { label: "Total Donations", value: donationStats.total || 0 },
      { label: "Pending", value: donationStats.pending || 0 },
      { label: "Claimed", value: donationStats.claimed || 0 },
      { label: "Closed", value: donationStats.closed || 0 },
      { label: "Total Users", value: userStats.total || 0 },
      { label: "Volunteers", value: userStats.volunteers || 0 },
      { label: "NGOs", value: userStats.ngos || 0 }
    ];

    grid.innerHTML = metrics
      .map((metric) => `
        <article class="analytics-card">
          <p class="analytics-label">${escapeHtml(metric.label)}</p>
          <p class="analytics-value">${Number(metric.value || 0).toLocaleString()}</p>
        </article>
      `)
      .join("");
  } catch (error) {
    console.error("Failed to load admin analytics:", error);
    grid.innerHTML = '<p class="pending-empty">Unable to load analytics right now.</p>';
  }
}

function renderAnalyticsSkeletons() {
  return Array.from({ length: 7 }, () => {
    return `
      <article class="analytics-card pending-item-skeleton">
        <span class="skeleton-line short"></span>
        <span class="skeleton-line" style="margin-top: 12px; height: 20px;"></span>
      </article>
    `;
  }).join("");
}

async function runAutoExpire(button) {
  const actionButton = button;
  if (actionButton) {
    actionButton.disabled = true;
    actionButton.textContent = "Running...";
  }

  try {
    const response = await donationService.autoExpireDonations();
    const modified = Number(response?.modified || 0);
    if (typeof ui !== "undefined") {
      ui.showAlert(`Auto-expire completed. Updated ${modified} donation(s).`, "success");
    }
    await loadAdminAnalytics();
  } catch (error) {
    console.error("Auto-expire failed:", error);
    if (typeof ui !== "undefined") {
      ui.showAlert(error.message || "Auto-expire failed.", "error");
    }
  } finally {
    if (actionButton) {
      actionButton.disabled = false;
      actionButton.textContent = "Run Auto Expire";
    }
  }
}

async function runCoordinateBackfill(button) {
  const actionButton = button;
  if (actionButton) {
    actionButton.disabled = true;
    actionButton.textContent = "Running...";
  }

  try {
    const response = await donationService.backfillDonationCoordinates(80);
    const updated = Number(response?.updated || 0);
    const processed = Number(response?.processed || 0);

    if (typeof ui !== "undefined") {
      ui.showAlert(
        `Coordinate backfill completed. Updated ${updated} of ${processed} donation(s).`,
        "success"
      );
    }
  } catch (error) {
    console.error("Coordinate backfill failed:", error);
    if (typeof ui !== "undefined") {
      ui.showAlert(error.message || "Coordinate backfill failed.", "error");
    }
  } finally {
    if (actionButton) {
      actionButton.disabled = false;
      actionButton.textContent = "Backfill Coordinates";
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
