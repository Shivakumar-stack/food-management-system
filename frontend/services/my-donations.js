const donationsState = {
  items: []
};

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

  if (!["donor", "admin"].includes(role)) {
    window.location.href = "dashboard.html";
    return;
  }

  const title = document.getElementById("donationsPageTitle");
  if (title && role === "admin") {
    title.textContent = "Donations";
  }

  document.getElementById("refreshDonationsBtn")?.addEventListener("click", () => {
    loadDonations();
  });

  document.getElementById("donationsSearchInput")?.addEventListener("input", () => {
    renderDonations();
  });

  document.getElementById("donationsStatusFilter")?.addEventListener("change", () => {
    renderDonations();
  });

  await loadDonations();
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

async function loadDonations() {
  const list = document.getElementById("donationsList");
  if (!list) return;

  renderSkeletonRows(list, 5);

  try {
    const response = await donationService.getAll({ page: 1, limit: 250 });
    donationsState.items = extractDonationCollection(response);
    renderDonations();
  } catch (error) {
    console.error("Failed to load donations:", error);
    list.innerHTML = '<li class="pending-empty">Unable to load donations right now.</li>';
  }
}

function renderDonations() {
  const list = document.getElementById("donationsList");
  if (!list) return;

  const searchTerm = String(document.getElementById("donationsSearchInput")?.value || "")
    .trim()
    .toLowerCase();
  const statusFilter = String(document.getElementById("donationsStatusFilter")?.value || "all");

  const filtered = donationsState.items.filter((donation) => {
    const itemName = String(donation?.foodItems?.[0]?.name || "food donation").toLowerCase();
    const city = String(donation?.pickupAddress?.city || "").toLowerCase();
    const status = String(donation?.status || "pending").toLowerCase();

    const matchesSearch = !searchTerm || itemName.includes(searchTerm) || city.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!filtered.length) {
    list.innerHTML = '<li class="pending-empty">No donations match your filters.</li>';
    return;
  }

  list.innerHTML = filtered
    .map((donation) => {
      const itemName = escapeHtml(donation?.foodItems?.[0]?.name || "Food donation");
      const city = escapeHtml(donation?.pickupAddress?.city || "No city");
      const quantity = escapeHtml(donation?.foodItems?.[0]?.quantity || "Not specified");
      const pickupTime = escapeHtml(formatPickupTime(donation?.pickupTime));
      const status = String(donation?.status || "pending");
      const statusClass = `status-${status}`;

      return `
        <li class="pending-item pending-item-modal">
          <span class="pending-item-badge">
            <i class="fa-solid fa-box-open"></i>
          </span>
          <div class="pending-item-content">
            <div class="pending-item-head">
              <p class="name">${itemName} - ${city}</p>
              <span class="status-badge ${escapeHtml(statusClass)}">${escapeHtml(formatStatus(status))}</span>
            </div>
            <p class="pending-item-location"><i class="fa-regular fa-clock"></i>${pickupTime}</p>
            <p class="pending-item-quantity">${quantity}</p>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderSkeletonRows(list, count = 4) {
  list.innerHTML = Array.from({ length: count }, () => {
    return `
      <li class="pending-item pending-item-modal pending-item-skeleton">
        <span class="pending-item-badge"></span>
        <div class="pending-item-content">
          <div class="pending-item-head">
            <span class="skeleton-line"></span>
            <span class="skeleton-pill"></span>
          </div>
          <span class="skeleton-line short"></span>
          <span class="skeleton-line"></span>
        </div>
      </li>
    `;
  }).join("");
}

function extractDonationCollection(response) {
  if (Array.isArray(response?.data?.donations)) return response.data.donations;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.donations)) return response.donations;
  return [];
}

function formatStatus(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPickupTime(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "No pickup time";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
