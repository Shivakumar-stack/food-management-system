const pickupState = {
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

  if (role !== "volunteer") {
    window.location.href = "dashboard.html";
    return;
  }

  document.getElementById("refreshPickupsBtn")?.addEventListener("click", () => {
    loadVolunteerPickups();
  });

  document.getElementById("pickupSearchInput")?.addEventListener("input", () => {
    renderVolunteerPickups();
  });

  document.getElementById("pickupPriorityFilter")?.addEventListener("change", () => {
    renderVolunteerPickups();
  });

  await loadVolunteerPickups();
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

async function loadVolunteerPickups() {
  const list = document.getElementById("pickupList");
  if (!list) return;

  renderSkeletonRows(list, 5);

  try {
    const response = await donationService.getVolunteerAvailable();
    pickupState.items = extractDonationCollection(response);
    renderVolunteerPickups();
  } catch (error) {
    console.error("Failed to load volunteer pickups:", error);
    list.innerHTML = '<li class="pending-empty">Unable to load pickups right now.</li>';
  }
}

function renderVolunteerPickups() {
  const list = document.getElementById("pickupList");
  if (!list) return;

  const searchTerm = String(document.getElementById("pickupSearchInput")?.value || "")
    .trim()
    .toLowerCase();
  const priorityFilter = String(document.getElementById("pickupPriorityFilter")?.value || "all");

  const filtered = pickupState.items.filter((donation) => {
    const itemName = String(donation?.foodItems?.[0]?.name || "food donation").toLowerCase();
    const city = String(donation?.pickupAddress?.city || "").toLowerCase();
    const priorityScore = Number(donation?.priorityScore || 0);

    const matchesSearch = !searchTerm || itemName.includes(searchTerm) || city.includes(searchTerm);
    const matchesPriority =
      priorityFilter === "all" ||
      (priorityFilter === "critical" && priorityScore >= 70) ||
      (priorityFilter === "medium" && priorityScore >= 40 && priorityScore < 70) ||
      (priorityFilter === "low" && priorityScore < 40);

    return matchesSearch && matchesPriority;
  });

  if (!filtered.length) {
    list.innerHTML = '<li class="pending-empty">No pickups match your filters.</li>';
    return;
  }

  list.innerHTML = filtered
    .map((donation) => {
      const donationId = escapeHtml(donation?._id || "");
      const itemName = escapeHtml(donation?.foodItems?.[0]?.name || "Food donation");
      const city = escapeHtml(donation?.pickupAddress?.city || "No city");
      const quantity = escapeHtml(donation?.foodItems?.[0]?.quantity || "Not specified");
      const priorityScore = Number(donation?.priorityScore || 0);
      const pickupTime = escapeHtml(formatPickupTime(donation?.pickupTime));
      const notes = donation?.notes
        ? `<p class="pending-item-quantity">${escapeHtml(donation.notes)}</p>`
        : "";

      return `
        <li class="pending-item pending-item-modal">
          <span class="pending-item-badge">
            <i class="fa-solid fa-truck"></i>
          </span>
          <div class="pending-item-content">
            <div class="pending-item-head">
              <p class="name">${itemName} - ${city}</p>
              <button type="button" class="role-action-btn pickup-accept-btn" data-id="${donationId}">
                Accept
              </button>
            </div>
            <p class="pending-item-location"><i class="fa-regular fa-clock"></i>${pickupTime}</p>
            <p class="pending-item-quantity">Priority ${priorityScore} - ${quantity}</p>
            ${notes}
          </div>
        </li>
      `;
    })
    .join("");

  bindAcceptButtons();
}

function bindAcceptButtons() {
  document.querySelectorAll(".pickup-accept-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const donationId = button.dataset.id;
      if (!donationId) return;

      button.disabled = true;
      button.textContent = "Accepting...";

      try {
        await donationService.acceptVolunteerPickup(donationId);
        if (typeof ui !== "undefined") {
          ui.showAlert("Pickup accepted successfully.", "success");
        }
        await loadVolunteerPickups();
      } catch (error) {
        console.error("Accept pickup failed:", error);
        if (typeof ui !== "undefined") {
          ui.showAlert(error.message || "Unable to accept pickup.", "error");
        }
        button.disabled = false;
        button.textContent = "Accept";
      }
    });
  });
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

function extractDonationCollection(response) {
  if (Array.isArray(response?.data?.donations)) return response.data.donations;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.donations)) return response.donations;
  return [];
}
