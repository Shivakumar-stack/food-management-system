const ngoState = {
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

  if (role !== "ngo") {
    window.location.href = "dashboard.html";
    return;
  }

  document.getElementById("refreshNgoBtn")?.addEventListener("click", () => {
    loadNgoClaims();
  });

  document.getElementById("ngoSearchInput")?.addEventListener("input", () => {
    renderNgoClaims();
  });

  document.getElementById("ngoClaimFilter")?.addEventListener("change", () => {
    renderNgoClaims();
  });

  await loadNgoClaims();
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

async function loadNgoClaims() {
  const list = document.getElementById("ngoList");
  if (!list) return;

  renderSkeletonRows(list, 5);

  try {
    const response = await donationService.getNgoAvailable();
    ngoState.items = extractDonationCollection(response);
    renderNgoClaims();
  } catch (error) {
    console.error("Failed to load NGO claims:", error);
    list.innerHTML = '<li class="pending-empty">Unable to load claims right now.</li>';
  }
}

function renderNgoClaims() {
  const list = document.getElementById("ngoList");
  if (!list) return;

  const searchTerm = String(document.getElementById("ngoSearchInput")?.value || "")
    .trim()
    .toLowerCase();
  const filter = String(document.getElementById("ngoClaimFilter")?.value || "all");

  const filtered = ngoState.items.filter((donation) => {
    const itemName = String(donation?.foodItems?.[0]?.name || "food donation").toLowerCase();
    const city = String(donation?.pickupAddress?.city || "").toLowerCase();
    const donorName = String(
      donation?.donor?.organization?.name || donation?.donor?.fullName || "donor"
    ).toLowerCase();
    const hasNotes = Boolean(String(donation?.notes || "").trim());

    const matchesSearch =
      !searchTerm || itemName.includes(searchTerm) || city.includes(searchTerm) || donorName.includes(searchTerm);

    const matchesFilter =
      filter === "all" ||
      (filter === "with-notes" && hasNotes) ||
      (filter === "without-notes" && !hasNotes);

    return matchesSearch && matchesFilter;
  });

  if (!filtered.length) {
    list.innerHTML = '<li class="pending-empty">No claims match your filters.</li>';
    return;
  }

  list.innerHTML = filtered
    .map((donation) => {
      const donationId = escapeHtml(donation?._id || "");
      const itemName = escapeHtml(donation?.foodItems?.[0]?.name || "Food donation");
      const city = escapeHtml(donation?.pickupAddress?.city || "No city");
      const quantity = escapeHtml(donation?.foodItems?.[0]?.quantity || "Not specified");
      const pickupTime = escapeHtml(formatPickupTime(donation?.pickupTime));
      const donorName = escapeHtml(
        donation?.donor?.organization?.name ||
        donation?.donor?.fullName ||
        "Donor"
      );
      const notes = donation?.notes
        ? `<p class="pending-item-quantity">${escapeHtml(donation.notes)}</p>`
        : "";

      return `
        <li class="pending-item pending-item-modal">
          <span class="pending-item-badge">
            <i class="fa-solid fa-building"></i>
          </span>
          <div class="pending-item-content">
            <div class="pending-item-head">
              <p class="name">${itemName} - ${city}</p>
              <button type="button" class="role-action-btn ngo-claim-btn" data-id="${donationId}">
                Claim
              </button>
            </div>
            <p class="pending-item-location"><i class="fa-regular fa-clock"></i>${pickupTime}</p>
            <p class="pending-item-quantity">${quantity} - ${donorName}</p>
            ${notes}
          </div>
        </li>
      `;
    })
    .join("");

  bindClaimButtons();
}

function bindClaimButtons() {
  document.querySelectorAll(".ngo-claim-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const donationId = button.dataset.id;
      if (!donationId) return;

      button.disabled = true;
      button.textContent = "Claiming...";

      try {
        await donationService.claimDonation(donationId);
        if (typeof ui !== "undefined") {
          ui.showAlert("Donation claimed successfully.", "success");
        }
        await loadNgoClaims();
      } catch (error) {
        console.error("Claim donation failed:", error);
        if (typeof ui !== "undefined") {
          ui.showAlert(error.message || "Unable to claim donation.", "error");
        }
        button.disabled = false;
        button.textContent = "Claim";
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
