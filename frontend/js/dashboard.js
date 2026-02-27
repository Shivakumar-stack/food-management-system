const dashboardState = {
  pendingDonations: [],
  notificationTimer: null,
  latestNotificationId: null,
  notificationBootstrapped: false,
  role: "donor"
};

const dashboardGoals = {
  donations: 50,
  servings: 500,
  communities: 15
};

document.addEventListener("DOMContentLoaded", async () => {
  const loadingOverlay = document.getElementById("loadingOverlay");
  const body = document.body;

  // Small delay to ensure auth state is properly initialized
  await new Promise(resolve => setTimeout(resolve, 100));

  if (typeof authService === "undefined" || typeof donationService === "undefined") {
    console.error("Required services are unavailable.");
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    return;
  }

  if (!authService.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const user = authService.getUser() || {};
  const role = user.role || "donor";
  const firstName = user.firstName || "User";
  dashboardState.role = role;

  applyRoleVisibility(role);
  applySidebarRoles(role);
  applyQueueCopy(role, 0);
  bindUserInfo(firstName, role);
  bindLogout();
  bindPendingModal();
  startNotificationPolling();

  try {
    const [statsResult, donationsResult] = await Promise.allSettled([
      donationService.getStats(),
      loadDashboardDonations(role)
    ]);

    const statsRes = statsResult.status === "fulfilled" ? statsResult.value : null;
    const donations = donationsResult.status === "fulfilled" ? donationsResult.value : [];

    if (statsResult.status === "rejected") {
      console.error("Failed to load donation stats:", statsResult.reason);
    }
    if (donationsResult.status === "rejected") {
      console.error("Failed to load donations list:", donationsResult.reason);
    }

    const fallbackTotals = deriveTotalsFromDonations(donations);
    const totalDonations = Number(statsRes?.data?.totalDonations ?? fallbackTotals.totalDonations);
    const totalServings = Number(statsRes?.data?.totalServings ?? fallbackTotals.totalServings);
    const communitiesServed = statsRes?.data?.communitiesServed ?? fallbackTotals.communitiesServed;

    renderDashboard({ role, totalDonations, totalServings, communitiesServed, donations });
    await loadWeeklyTrends(donations);

  } catch (error) {
    console.error("Dashboard loading failed:", error);
  } finally {
    if (loadingOverlay) {
      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        body.classList.remove('loading');
        loadingOverlay.addEventListener('transitionend', () => {
          loadingOverlay.style.display = 'none';
        }, { once: true });
      }, 100);
    }
  }
});

/* ================= USER INFO ================= */

function bindUserInfo(firstName, role) {
  const welcomeCopy = {
    donor: "Manage your donations and impact.",
    volunteer: "Track and complete pickups efficiently.",
    ngo: "Claim and manage available donations.",
    admin: "Oversee platform activity and system health."
  };

  const roleLabel = {
    donor: "Donor Workspace",
    volunteer: "Volunteer Workspace",
    ngo: "NGO Workspace",
    admin: "Admin Workspace"
  };

  const initials = String(firstName || "U")
    .trim()
    .charAt(0)
    .toUpperCase() || "U";

  setText("userName", firstName);
  setText("welcomeMessage", welcomeCopy[role] || "Welcome to your dashboard.");
  setText("topbarUserName", firstName || "User");
  setText("topbarUserRole", roleLabel[role] || "Enterprise Panel");
  setText("sidebarRoleLabel", roleLabel[role] || "Enterprise Panel");
  setText("topbarAvatar", initials);
}

function bindLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => authService.logout());
}

function applyRoleVisibility(role) {
  const roles = ["donor", "volunteer", "ngo", "admin"];

  roles.forEach((r) => {
    const panel = document.getElementById(`${r}Panel`);
    if (!panel) return;
    panel.style.display = r === role ? "block" : "none";
  });
}

function applySidebarRoles(role) {
  document.querySelectorAll(".dashboard-links [data-role]").forEach((item) => {
    const allowedRoles = (item.dataset.role || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    item.style.display = allowedRoles.includes(role) ? "flex" : "none";
  });
}

/* ================= NOTIFICATIONS ================= */

function startNotificationPolling() {
  pollNotifications();

  if (dashboardState.notificationTimer) {
    window.clearInterval(dashboardState.notificationTimer);
  }

  dashboardState.notificationTimer = window.setInterval(pollNotifications, 15000);

  if (!dashboardState.unloadBound) {
    window.addEventListener("beforeunload", () => {
      if (dashboardState.notificationTimer) {
        window.clearInterval(dashboardState.notificationTimer);
      }
    });
    dashboardState.unloadBound = true;
  }
}

async function pollNotifications() {
  if (typeof apiService === "undefined") return;

  try {
    const response = await apiService.get("/notifications");
    const notifications =
      (Array.isArray(response?.data?.notifications) && response.data.notifications) ||
      (Array.isArray(response?.data) && response.data) ||
      [];
    const latest = notifications[0];
    const latestId = latest?._id || null;

    if (!dashboardState.notificationBootstrapped) {
      dashboardState.notificationBootstrapped = true;
      dashboardState.latestNotificationId = latestId;
      return;
    }

    if (latestId && dashboardState.latestNotificationId !== latestId) {
      dashboardState.latestNotificationId = latestId;
    }
  } catch (error) {
    // Silent on polling failures to avoid noisy console spam on intermittent network issues.
  }
}

/* ================= DASHBOARD RENDER ================= */

function renderDashboard({ role, totalDonations, totalServings, communitiesServed, donations }) {

  const pendingDonations = getQueueDonations(role, donations);
  const closedDonations = donations.filter((d) => normalizeDonationStatus(d?.status) === "closed");
  dashboardState.pendingDonations = pendingDonations;
  applyQueueCopy(role, pendingDonations.length);

  const resolvedCommunitiesServed = Number.isFinite(Number(communitiesServed))
    ? Number(communitiesServed)
    : getUniqueCommunities(closedDonations);

  const roleTotalDonations = Number(totalDonations) || 0;
  const roleTotalServings = Number(totalServings) || 0;

  const nextPickup = getNextPickup(donations);

  setText("totalDonations", formatNumber(roleTotalDonations));
  setText("totalServings", formatNumber(roleTotalServings));
  setText("impactDonationsValue", formatNumber(roleTotalDonations));
  setText("impactServingsValue", formatNumber(roleTotalServings));
  setText("impactCommunitiesValue", formatNumber(resolvedCommunitiesServed));
  setText("pendingCountMain", pendingDonations.length);
  renderStatusOverview(donations);

  setText(
    "nextPickupText",
    nextPickup ? formatPickupDate(nextPickup.pickupTime) : "No pickups scheduled"
  );

  setProgress("donationsProgress", roleTotalDonations, dashboardGoals.donations);
  setProgress("servingsProgress", roleTotalServings, dashboardGoals.servings);
  setProgress("communitiesProgress", resolvedCommunitiesServed, dashboardGoals.communities);

  renderPendingList("pendingListMain", pendingDonations, 3);
  syncPendingModal();
}

/* ================= PENDING LIST ================= */

function renderPendingList(targetId, items, maxItems = items.length) {
  const container = document.getElementById(targetId);
  if (!container) return;
  const isModalList = targetId === "pendingListModal";
  const queueCopy = getQueueCopy(dashboardState.role);

  if (!items.length) {
    container.innerHTML =
      `<li class="pending-empty">${escapeHtml(queueCopy.empty)}</li>`;
    return;
  }

  container.innerHTML = items
    .slice(0, maxItems)
    .map((donation) => {
      const itemName = escapeHtml(
        donation.foodItems?.[0]?.name || "Food donation"
      );
      const badge = getPriorityBadge(Number(donation?.priorityScore) || 0);

      const city = escapeHtml(
        donation.pickupAddress?.city || "No location"
      );

      const quantity = escapeHtml(
        donation.foodItems?.[0]?.quantity || "Quantity not provided"
      );

      const notes = donation.notes
        ? `<p class="pending-notes">Instructions: ${escapeHtml(
            donation.notes
          )}</p>`
        : "";

      if (isModalList) {
        return `
          <li class="pending-item pending-item-modal">
            <span class="pending-item-badge">
              <i class="fa-solid fa-bowl-food"></i>
            </span>
            <div class="pending-item-content">
              <div class="pending-item-head">
                <p class="name">${itemName}</p>
                <span class="pending-item-time">${formatPendingCreatedAt(donation.createdAt)}</span>
              </div>
              <span class="${badge.class}">${badge.label}</span>
              <p class="pending-item-location"><i class="fa-solid fa-location-dot"></i>${city}</p>
              <p class="pending-item-quantity">${quantity}</p>
              ${notes}
            </div>
          </li>
        `;
      }

      return `
        <li class="pending-item">
          <div>
            <p class="name">${itemName} - ${city}</p>
            <span class="${badge.class}">${badge.label}</span>
            ${notes}
          </div>
        </li>
      `;
    })
    .join("");
}

/* ================= PENDING MODAL ================= */

function bindPendingModal() {
  const viewAllBtn = document.getElementById("viewAllPendingBtn");
  const pendingModal = document.getElementById("pendingModal");
  const closeBtn = document.getElementById("closePendingModal");
  if (!viewAllBtn || !pendingModal || !closeBtn) return;

  const closeModal = () => {
    pendingModal.classList.add("hidden");
    pendingModal.classList.remove("flex");
    pendingModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("pending-modal-open");
  };

  const openModal = () => {
    syncPendingModal();

    const pendingSection = document.querySelector(".dashboard-pending");
    pendingSection?.scrollIntoView({ behavior: "smooth", block: "start" });

    pendingModal.classList.remove("hidden");
    pendingModal.classList.add("flex");
    pendingModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("pending-modal-open");

    const modalList = document.getElementById("pendingListModal");
    modalList?.scrollTo({ top: 0, behavior: "smooth" });
  };

  viewAllBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);

  pendingModal.addEventListener("click", (event) => {
    if (event.target === pendingModal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !pendingModal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

function syncPendingModal() {
  const pendingItems = dashboardState.pendingDonations || [];
  setText("pendingCountModal", pendingItems.length);
  renderPendingList("pendingListModal", pendingItems, pendingItems.length);
}

/* ================= WEEKLY TREND ================= */

async function loadWeeklyTrends(donations = []) {
  const chart = document.getElementById("trendChart");
  const axis = document.getElementById("trendAxis");
  const yAxis = document.getElementById("trendYAxis");
  if (!chart || !axis) return;

  chart.innerHTML = "";
  axis.innerHTML = "";
  if (yAxis) yAxis.innerHTML = "";

  try {
    const response = await donationService.getStatsWeekly();
    const weeklyData = normalizeWeeklyApiData(response?.data);
    const weeklySeries = buildWeeklySeries(weeklyData);

    const maxValue = Math.max(
      ...weeklySeries.map(item => Number(item?.count) || 0),
      1
    );
    const yAxisMax = getNiceScaleMax(maxValue);
    renderTrendYAxis(yAxisMax);
    const hasData = weeklySeries.some(item => (Number(item?.count) || 0) > 0);

    if (!hasData) {
      chart.innerHTML = '<p class="trend-empty">No donations this week</p>';
      axis.innerHTML = weeklySeries
        .map((item) => `<span>${escapeHtml(item.label)}</span>`)
        .join("");
      renderTrendChange(weeklySeries, donations);
      return;
    }

    weeklySeries.forEach((item) => {
      const count = Number(item?.count) || 0;
      const heightPercent = (count / yAxisMax) * 100;
      const barHeight = count > 0 ? Math.max(heightPercent, 4) : 0;

      chart.innerHTML += `
        <div class="trend-bar-wrapper">
          <span class="trend-bar-value">${count > 0 ? count : ""}</span>
          <div class="trend-bar" style="height:${barHeight}%"></div>
        </div>
      `;

      axis.innerHTML += `<span>${escapeHtml(item.label)}</span>`;
    });

    renderTrendChange(weeklySeries, donations);
  } catch (error) {
    chart.innerHTML = '<p class="trend-empty">Unable to load trends</p>';
    const fallbackDays = buildLast7Days();
    axis.innerHTML = fallbackDays
      .map((day) => `<span>${escapeHtml(day.label)}</span>`)
      .join("");
    renderTrendYAxis(1);
    renderTrendChange(
      fallbackDays.map((day) => ({ ...day, count: 0 })),
      donations
    );
    console.error("Weekly trends failed:", error);
  }
}

function normalizeWeeklyApiData(data) {
  if (Array.isArray(data)) {
    return data.map((item) => ({
      key: normalizeDateKey(item?._id || item?.date || ""),
      label: normalizeWeekLabel(item?.label || item?.day || ""),
      count: Number(item?.count) || 0
    }));
  }

  // Compatible with previous API shape: { labels: [], values: [] }
  if (Array.isArray(data?.labels) && Array.isArray(data?.values)) {
    return data.labels.map((label, index) => ({
      key: normalizeDateKey(label),
      label: normalizeWeekLabel(label),
      count: Number(data.values[index]) || 0
    }));
  }

  if (Array.isArray(data?.points)) {
    return data.points.map((point) => ({
      key: normalizeDateKey(point?._id || point?.date || ""),
      label: normalizeWeekLabel(point?.label || point?.day || ""),
      count: Number(point?.count) || 0
    }));
  }

  return [];
}

function buildWeeklySeries(entries) {
  const days = buildLast7Days();
  const countsByDate = new Map();
  const countsByLabel = new Map();

  entries.forEach((entry) => {
    const key = normalizeDateKey(entry?.key);
    const label = normalizeWeekLabel(entry?.label);
    const count = Number(entry?.count) || 0;

    if (key) {
      countsByDate.set(key, (countsByDate.get(key) || 0) + count);
    } else if (label) {
      countsByLabel.set(label, (countsByLabel.get(label) || 0) + count);
    }
  });

  return days.map((day) => {
    const byDate = countsByDate.get(day.key);
    const byLabel = countsByLabel.get(day.label);
    return {
      ...day,
      count: Number(byDate ?? byLabel ?? 0)
    };
  });
}

function renderTrendYAxis(maxValue) {
  const yAxis = document.getElementById("trendYAxis");
  if (!yAxis) return;

  const tickCount = 4;
  const labels = Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = (maxValue / tickCount) * (tickCount - index);
    return formatAxisValue(value);
  });

  yAxis.innerHTML = labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("");
}

function getNiceScaleMax(value) {
  if (value <= 1) return 1;

  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / power;

  if (normalized <= 1) return 1 * power;
  if (normalized <= 2) return 2 * power;
  if (normalized <= 5) return 5 * power;
  return 10 * power;
}

function formatAxisValue(value) {
  const safe = Math.max(0, Math.round(value));
  if (safe >= 1000) {
    const compact = safe / 1000;
    return `${Number.isInteger(compact) ? compact : compact.toFixed(1)}k`;
  }
  return String(safe);
}

function renderTrendChange(weeklySeries, donations) {
  const trendChange = document.getElementById("trendChange");
  if (!trendChange) return;

  const currentTotal = weeklySeries.reduce(
    (sum, item) => sum + (Number(item?.count) || 0),
    0
  );
  const previousTotal = countPreviousWeekDonations(donations);

  let type = "flat";
  let message = "No change vs previous week";

  if (previousTotal === 0 && currentTotal > 0) {
    type = "up";
    message = `Up by ${currentTotal} vs previous week`;
  } else if (previousTotal > 0) {
    const diff = currentTotal - previousTotal;
    if (diff > 0) {
      type = "up";
      message = `Up ${Math.round((diff / previousTotal) * 100)}% vs previous week`;
    } else if (diff < 0) {
      type = "down";
      message = `Down ${Math.round((Math.abs(diff) / previousTotal) * 100)}% vs previous week`;
    }
  }

  trendChange.className = `trend-change trend-change-${type}`;
  trendChange.textContent = `${message} (${currentTotal} this week)`;
}

function countPreviousWeekDonations(donations) {
  if (!Array.isArray(donations) || !donations.length) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentWindowStart = new Date(today);
  currentWindowStart.setDate(today.getDate() - 6);

  const previousWindowEnd = new Date(currentWindowStart);
  const previousWindowStart = new Date(currentWindowStart);
  previousWindowStart.setDate(currentWindowStart.getDate() - 7);

  return donations.reduce((count, donation) => {
    if (normalizeDonationStatus(donation?.status) !== "closed") return count;

    const created = new Date(donation?.createdAt);
    if (Number.isNaN(created.getTime())) return count;

    if (created >= previousWindowStart && created < previousWindowEnd) {
      return count + 1;
    }
    return count;
  }, 0);
}

function buildLast7Days() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - index));
    return {
      key: toDateKey(d),
      label: d.toLocaleDateString("en-US", { weekday: "short" })
    };
  });
}

function normalizeDateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toDateKey(date);
}

function normalizeWeekLabel(value) {
  if (!value) return "";
  const normalized = String(value).trim();
  if (!normalized) return "";

  const short = normalized.slice(0, 3).toLowerCase();
  const map = {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun"
  };
  return map[short] || "";
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

/* ================= HELPERS ================= */

function extractDonationCollection(response) {
  if (Array.isArray(response?.data?.donations)) return response.data.donations;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.donations)) return response.donations;
  return [];
}

function deriveTotalsFromDonations(donations) {
  const closedDonations = Array.isArray(donations)
    ? donations.filter((d) => normalizeDonationStatus(d?.status) === "closed")
    : [];

  const totalServings = closedDonations.reduce((sum, donation) => {
    return sum + (Number(donation?.impact?.estimatedServings) || 0);
  }, 0);

  return {
    totalDonations: Array.isArray(donations) ? donations.length : 0,
    totalServings,
    communitiesServed: getUniqueCommunities(closedDonations)
  };
}

async function loadDashboardDonations(role) {
  if (role === "volunteer") {
    const [availableResponse, assignedResponse] = await Promise.allSettled([
      donationService.getVolunteerAvailable(),
      donationService.getAll({ page: 1, limit: 200 })
    ]);

    const available =
      availableResponse.status === "fulfilled"
        ? extractDonationCollection(availableResponse.value)
        : [];
    const assigned =
      assignedResponse.status === "fulfilled"
        ? extractDonationCollection(assignedResponse.value)
        : [];

    return mergeDonationCollections(available, assigned);
  }

  if (role === "ngo") {
    const [claimableResponse, ownResponse] = await Promise.allSettled([
      donationService.getNgoAvailable(),
      donationService.getAll({ page: 1, limit: 200 })
    ]);

    const claimable =
      claimableResponse.status === "fulfilled"
        ? extractDonationCollection(claimableResponse.value)
        : [];
    const own =
      ownResponse.status === "fulfilled"
        ? extractDonationCollection(ownResponse.value)
        : [];

    return mergeDonationCollections(claimable, own);
  }

  const response = await donationService.getAll({ page: 1, limit: 200 });
  return extractDonationCollection(response);
}

function mergeDonationCollections(...collections) {
  const merged = new Map();

  collections
    .filter(Array.isArray)
    .flat()
    .forEach((donation) => {
      const donationId = String(donation?._id || donation?.id || "");
      if (!donationId) return;

      const existing = merged.get(donationId);
      // Prefer the richer object when duplicate IDs exist.
      if (!existing || Object.keys(donation || {}).length > Object.keys(existing || {}).length) {
        merged.set(donationId, donation);
      }
    });

  return Array.from(merged.values()).sort((a, b) => {
    return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
  });
}

function getQueueDonations(role, donations) {
  const safeDonations = Array.isArray(donations) ? donations : [];

  if (role === "admin") {
    return safeDonations.filter((donation) => normalizeDonationStatus(donation?.status) === "pending");
  }

  if (role === "volunteer") {
    return safeDonations.filter((donation) => {
      const status = normalizeDonationStatus(donation?.status);
      return ["pending", "claimed"].includes(status);
    });
  }

  if (role === "ngo") {
    return safeDonations.filter((donation) => {
      const status = normalizeDonationStatus(donation?.status);
      return ["pending", "claimed"].includes(status);
    });
  }

  return safeDonations.filter((donation) => {
    const status = normalizeDonationStatus(donation?.status);
    return !["closed", "cancelled"].includes(status);
  });
}

function getQueueCopy(role) {
  const copy = {
    donor: {
      title: "Active Donations",
      subtitle: "Your open requests and in-progress donations.",
      empty: "No active donations right now."
    },
    volunteer: {
      title: "Pickup Queue",
      subtitle: "Available and accepted pickups in your queue.",
      empty: "No pickups are waiting right now."
    },
    ngo: {
      title: "Claim Queue",
      subtitle: "Donations available to claim or currently claimed.",
      empty: "No claimable donations right now."
    },
    admin: {
      title: "Pending Requests",
      subtitle: "Platform-wide pending requests awaiting action.",
      empty: "No pending requests right now."
    }
  };

  return copy[role] || copy.donor;
}

function applyQueueCopy(role, pendingCount = null) {
  const queueCopy = getQueueCopy(role);
  const heading = document.querySelector(".dashboard-pending .pending-title h2");
  const subtitle = document.querySelector("#pendingModal .pending-modal-subtitle");
  const existingCount = Number.parseInt(document.getElementById("pendingCountMain")?.textContent || "0", 10);
  const safeCount = Number.isFinite(Number(pendingCount))
    ? Number(pendingCount)
    : (Number.isFinite(existingCount) ? existingCount : 0);

  if (heading) {
    heading.innerHTML = `${escapeHtml(queueCopy.title)} (<span id="pendingCountMain">${safeCount}</span>)`;
  }
  if (subtitle) {
    subtitle.textContent = queueCopy.subtitle;
  }
}

function getNextPickup(donations) {
  const now = Date.now();
  return donations
    .filter(d =>
      new Date(d.pickupTime).getTime() > now &&
      !["closed", "cancelled"].includes(normalizeDonationStatus(d?.status))
    )
    .sort((a, b) => new Date(a.pickupTime) - new Date(b.pickupTime))[0];
}

function normalizeDonationStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return "pending";

  if (["accepted", "picked_up", "in_transit"].includes(value)) return "claimed";
  if (["delivered"].includes(value)) return "closed";
  if (["expired"].includes(value)) return "cancelled";
  return value;
}

function renderStatusOverview(donations) {
  const counts = {
    pending: 0,
    claimed: 0,
    closed: 0,
    cancelled: 0
  };

  const safeDonations = Array.isArray(donations) ? donations : [];
  safeDonations.forEach((donation) => {
    const status = normalizeDonationStatus(donation?.status);
    if (Object.prototype.hasOwnProperty.call(counts, status)) {
      counts[status] += 1;
    }
  });

  setText("statusCountPending", formatNumber(counts.pending));
  setText("statusCountClaimed", formatNumber(counts.claimed));
  setText("statusCountClosed", formatNumber(counts.closed));
  setText("statusCountCancelled", formatNumber(counts.cancelled));
}

function getUniqueCommunities(donations) {
  const set = new Set();
  donations.forEach(d => {
    if (d.pickupAddress?.city)
      set.add(d.pickupAddress.city.toLowerCase());
  });
  return set.size;
}

function setProgress(id, value, goal) {
  const bar = document.getElementById(id);
  if (!bar) return;
  const percent = Math.min(100, (value / goal) * 100);
  bar.style.width = `${percent}%`;
}

function formatPickupDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatNumber(v) {
  return Number(v || 0).toLocaleString();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatPendingCreatedAt(dateString) {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getPriorityBadge(priorityScore = 0) {
  if (priorityScore >= 70) {
    return {
      label: "Critical",
      class: "priority-badge critical"
    };
  }

  if (priorityScore >= 40) {
    return {
      label: "Medium",
      class: "priority-badge medium"
    };
  }

  return {
    label: "Low",
    class: "priority-badge low"
  };
}
