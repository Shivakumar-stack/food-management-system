const DEFAULT_MAP_CENTER = [15.3173, 75.7139];
const DEFAULT_MAP_ZOOM = 7;
const MAP_REFRESH_INTERVAL_MS = 30000;
const SOCKET_SERVER_URL = window.appConfig.SOCKET_SERVER_URL;

const CITY_COORDINATES = {
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  bangaluru: [12.9716, 77.5946],
  mysore: [12.2958, 76.6394],
  mysuru: [12.2958, 76.6394],
  hubli: [15.3647, 75.1240],
  hublidharwad: [15.3647, 75.1240],
  dharwad: [15.4589, 75.0078],
  mangalore: [12.9141, 74.8560],
  mangaluru: [12.9141, 74.8560],
  belgaum: [15.8497, 74.4977],
  belagavi: [15.8497, 74.4977],
  kalaburagi: [17.3297, 76.8343],
  gulbarga: [17.3297, 76.8343],
  davanagere: [14.4644, 75.9218],
  shivamogga: [13.9299, 75.5681],
  shimoga: [13.9299, 75.5681],
  mumbai: [19.076, 72.8777]
};

function getPriorityMeta(score = 0) {
  if (score >= 70) {
    return {
      bucket: "critical",
      label: "Critical",
      markerColor: "#ef4444",
      className: "map-priority-critical"
    };
  }

  if (score >= 40) {
    return {
      bucket: "medium",
      label: "Medium",
      markerColor: "#f97316",
      className: "map-priority-medium"
    };
  }

  return {
    bucket: "low",
    label: "Low",
    markerColor: "#22c55e",
    className: "map-priority-low"
  };
}

const MapModule = {
  map: null,
  markerLayer: null,
  markers: [],
  selectedDonationId: "",
  isExpanded: false,
  hasAutoFitted: false,
  role: "",
  user: null,
  donations: [],
  urgencyFilter: "all",
  radiusFilterKm: "all",
  searchQuery: "",
  refreshTimer: null,
  refreshInFlight: false,
  actionInFlight: false,
  interactionEnabled: false,
  socket: null,
  heatLayer: null,
  heatmapEnabled: false,
  userLocation: null,
  userLocationMarker: null,
  detailDrawerEl: null,
  detailContentEl: null,
  accessNoticeTextEl: null,
  accessNoticeActionEl: null,

  init() {
    if (typeof donationService === "undefined") {
      console.error("Required services are unavailable.");
      return;
    }

    const hasAuthService = typeof authService !== "undefined";
    const isLoggedIn = hasAuthService && authService.isLoggedIn();
    this.user = isLoggedIn ? authService.getUser() || {} : null;
    this.role = this.user?.role || "public";

    const mapNode = document.getElementById("map");
    if (!mapNode || typeof L === "undefined") return;

    this.map = L.map("map", {
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false
    }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    }).addTo(this.map);

    this.createMarkerLayer();
    this.setMapInteractivity(true);

    this.syncNavOffset();
    this.bindControls();
    this.setupDetailDrawer();
    this.setupExpandButton();
    this.setupRealtimeSync();
    this.startAutoRefresh();
    this.bootstrapUserLocation({ recenter: true, showMarker: true })
      .catch((error) => {
        console.warn("Initial geolocation unavailable:", error?.message || error);
      })
      .finally(() => {
        this.refreshData({ forceFit: false });
      });

    // Recompute map dimensions after layout settles (fonts/auth overlay/nav updates).
    window.setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 120);

    window.addEventListener(
      "load",
      () => {
        if (this.map) this.map.invalidateSize();
      },
      { once: true }
    );

    window.addEventListener("beforeunload", () => {
      if (this.refreshTimer) {
        window.clearInterval(this.refreshTimer);
      }
      if (this.socket) {
        this.socket.disconnect();
      }
    });
  },

  createMarkerLayer() {
    if (!this.map) return;

    if (this.markerLayer && this.map.hasLayer(this.markerLayer)) {
      this.map.removeLayer(this.markerLayer);
    }

    if (typeof L.markerClusterGroup === "function") {
      this.markerLayer = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 46,
        iconCreateFunction: (cluster) => this.createClusterIcon(cluster)
      });
    } else {
      this.markerLayer = L.layerGroup();
    }

    this.markerLayer.addTo(this.map);
  },

  isAuthenticated() {
    return typeof authService !== "undefined" && authService.isLoggedIn();
  },

  showAlert(message, type = "info") {
    if (typeof ui !== "undefined" && typeof ui.showAlert === "function") {
      ui.showAlert(message, type);
    }
  },

  refreshRolePresentation() {
    const subtitle = document.getElementById("mapViewSubtitle");
    const roleLabels = {
      donor: "Donor View - Your donations and statuses",
      volunteer: "Volunteer View - Available pickups by urgency",
      ngo: "NGO View - Discover and claim available donations",
      admin: "Admin View - Global donations overview",
      public: "Community View - Live public donation feed"
    };

    if (subtitle) {
      subtitle.textContent = roleLabels[this.role] || "Live donation map";
    }

    const urgencySelect = document.getElementById("urgencyFilter");
    if (urgencySelect) {
      if (this.role === "volunteer") {
        urgencySelect.classList.remove("hidden");
      } else {
        urgencySelect.classList.add("hidden");
      }
    }

    this.updateMapScopeLabel();
    this.updateAccessNotice();
  },

  setupAccessNotice() {
    this.accessNoticeTextEl = document.getElementById("mapAccessNoticeText");
    this.accessNoticeActionEl = document.getElementById("mapAccessNoticeAction");

    if (this.accessNoticeActionEl && !this.accessNoticeActionEl.dataset.bound) {
      this.accessNoticeActionEl.dataset.bound = "true";
      this.accessNoticeActionEl.addEventListener("click", () => {
        if (this.isAuthenticated()) return;
        sessionStorage.setItem("redirectAfterLogin", window.location.href);
      });
    }

    this.updateAccessNotice();
  },

  updateAccessNotice() {
    if (!this.accessNoticeTextEl || !this.accessNoticeActionEl) return;

    if (!this.isAuthenticated()) {
      this.accessNoticeTextEl.textContent =
        "Guest mode: viewing public live data. Log in with your account to claim or accept donations.";
      this.accessNoticeActionEl.classList.remove("hidden");
      return;
    }

    const roleMessages = {
      donor: "Signed in as donor. You can track your donation statuses in real time.",
      volunteer: "Signed in as volunteer. You can accept nearby pickups directly from the map.",
      ngo: "Signed in as NGO. You can claim eligible donations directly from the map.",
      admin: "Signed in as admin. You are viewing network-wide donation activity."
    };

    this.accessNoticeTextEl.textContent =
      roleMessages[this.role] || "Signed in. Your role-based map permissions are active.";
    this.accessNoticeActionEl.classList.add("hidden");
  },

  bindControls() {
    this.refreshRolePresentation();
    this.setupAccessNotice();

    const urgencySelect = document.getElementById("urgencyFilter");
    if (urgencySelect) {
      urgencySelect.addEventListener("change", () => {
        this.urgencyFilter = urgencySelect.value;
        this.renderMarkers({ forceFit: true });
      });
    }

    const searchInput = document.getElementById("mapSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        this.searchQuery = String(searchInput.value || "").trim().toLowerCase();
        this.renderMarkers({ forceFit: false });
      });
    }

    const radiusSelect = document.getElementById("radiusFilter");
    if (radiusSelect) {
      radiusSelect.addEventListener("change", async () => {
        this.radiusFilterKm = radiusSelect.value;

        if (this.radiusFilterKm !== "all" && !this.userLocation) {
          await this.bootstrapUserLocation({ recenter: false, showMarker: true });
        }

        this.renderMarkers({ forceFit: true });
      });
    }

    const heatmapToggleBtn = document.getElementById("heatmapToggleBtn");
    heatmapToggleBtn?.addEventListener("click", () => {
      this.toggleHeatmap();
    });
    this.updateHeatmapButton();

    const interactionBtn = document.getElementById("interactionToggleBtn");
    interactionBtn?.addEventListener("click", () => {
      this.toggleInteraction();
    });
    this.updateInteractionButton();
  },

  updateMapScopeLabel() {
    const scopeLabel = document.getElementById("mapDataScopeLabel");
    if (!scopeLabel) return;

    const roleLabelMap = {
      donor: "Your donation activity",
      volunteer: "Nearby pending pickups",
      ngo: "Claimable public donations",
      admin: "Network-wide donation feed",
      public: "Public active donation feed"
    };

    scopeLabel.textContent = roleLabelMap[this.role] || "Live donation feed";
  },

  setupDetailDrawer() {
    this.detailDrawerEl = document.getElementById("mapDetailDrawer");
    this.detailContentEl = document.getElementById("mapDetailContent");
    const closeBtn = document.getElementById("mapDetailCloseBtn");
    closeBtn?.addEventListener("click", () => this.closeDetailDrawer());
  },

  setupRealtimeSync() {
    if (this.socket || typeof io !== "function") return;

    this.socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"]
    });

    const refreshFromSocket = () => {
      this.refreshData({ forceFit: false });
    };

    this.socket.on("newDonation", refreshFromSocket);
    this.socket.on("donationStatusUpdated", refreshFromSocket);
    this.socket.on("donationClaimed", refreshFromSocket);
    this.socket.on("connect_error", (error) => {
      console.warn("Socket connection error:", error?.message || error);
    });
  },

  async bootstrapUserLocation(options = {}) {
    const recenter = options.recenter === true;
    const showMarker = options.showMarker !== false;
    const notifyOnError = options.notifyOnError === true;

    if (!this.map || !navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude);
          const lng = Number(position.coords.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            resolve(null);
            return;
          }

          this.userLocation = { lat, lng };

          if (recenter) {
            this.map.setView([lat, lng], 11);
            this.hasAutoFitted = true;
          }

          if (showMarker) {
            this.renderUserLocationMarker();
          }

          resolve(this.userLocation);
        },
        (error) => {
          if (notifyOnError && typeof ui !== "undefined") {
            ui.showAlert("Unable to access your location.", "warning");
          }
          console.warn("Geolocation unavailable:", error?.message || error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 60000
        }
      );
    });
  },

  renderUserLocationMarker() {
    if (!this.map || !this.userLocation) return;

    const latLng = [this.userLocation.lat, this.userLocation.lng];
    if (this.userLocationMarker) {
      this.userLocationMarker.setLatLng(latLng);
      return;
    }

    this.userLocationMarker = L.circleMarker(latLng, {
      radius: 7,
      color: "#2563eb",
      fillColor: "#3b82f6",
      fillOpacity: 0.9,
      weight: 2
    })
      .addTo(this.map)
      .bindPopup("Your location");
  },

  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const toRadians = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  setMapInteractivity(enabled) {
    if (!this.map) return;
    this.interactionEnabled = Boolean(enabled);

    if (this.map.dragging) {
      this.interactionEnabled ? this.map.dragging.enable() : this.map.dragging.disable();
    }
    if (this.map.touchZoom) {
      this.interactionEnabled ? this.map.touchZoom.enable() : this.map.touchZoom.disable();
    }
    if (this.map.doubleClickZoom) {
      this.interactionEnabled
        ? this.map.doubleClickZoom.enable()
        : this.map.doubleClickZoom.disable();
    }
    if (this.map.scrollWheelZoom) {
      this.interactionEnabled
        ? this.map.scrollWheelZoom.enable()
        : this.map.scrollWheelZoom.disable();
    }
    if (this.map.boxZoom) {
      this.interactionEnabled ? this.map.boxZoom.enable() : this.map.boxZoom.disable();
    }
    if (this.map.keyboard) {
      this.interactionEnabled ? this.map.keyboard.enable() : this.map.keyboard.disable();
    }
    if (this.map.tap) {
      this.interactionEnabled ? this.map.tap.enable() : this.map.tap.disable();
    }

    this.updateInteractionButton();
  },

  toggleInteraction() {
    this.setMapInteractivity(!this.interactionEnabled);
  },

  updateInteractionButton() {
    const interactionBtn = document.getElementById("interactionToggleBtn");
    const statusLabel = document.getElementById("mapInteractionStatus");
    if (!interactionBtn) return;

    const icon = interactionBtn.querySelector("i");
    const text = interactionBtn.querySelector("span");

    if (this.interactionEnabled) {
      interactionBtn.setAttribute("title", "Lock map interaction");
      interactionBtn.classList.add("text-orange-600");
      if (icon) {
        icon.classList.remove("fa-lock");
        icon.classList.add("fa-lock-open");
      }
      if (text) {
        text.textContent = "Lock Map";
      }
      if (statusLabel) {
        statusLabel.innerHTML = '<i class="fas fa-lock-open text-orange-500 text-xs mr-1"></i> Map interactive';
      }
      return;
    }

    interactionBtn.setAttribute("title", "Enable map interaction");
    interactionBtn.classList.remove("text-orange-600");
    if (icon) {
      icon.classList.remove("fa-lock-open");
      icon.classList.add("fa-lock");
    }
    if (text) {
      text.textContent = "Enable Map";
    }
    if (statusLabel) {
      statusLabel.innerHTML = '<i class="fas fa-lock text-gray-500 text-xs mr-1"></i> Map locked';
    }
  },

  startAutoRefresh() {
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer);
    }

    this.refreshTimer = window.setInterval(() => {
      this.refreshData({ forceFit: false });
    }, MAP_REFRESH_INTERVAL_MS);
  },

  async refreshData(options = {}) {
    const forceFit = options.forceFit === true;
    if (this.refreshInFlight) return;
    this.refreshInFlight = true;

    try {
      this.donations = await this.fetchDonationsForRole();
      this.updateHeroMetrics();
      this.renderMarkers({ forceFit });
      this.updateLastUpdated();
    } catch (error) {
      console.error("Map load error:", error);
      this.showAlert("Unable to load map data right now.", "error");
    } finally {
      this.refreshInFlight = false;
    }
  },

  extractDonationCollection(response) {
    if (Array.isArray(response?.data?.donations)) return response.data.donations;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.donations)) return response.donations;
    return [];
  },

  async fetchPublicDonations(limit = 300) {
    const response = await donationService.getPublicMap({ limit });
    return this.extractDonationCollection(response);
  },

  async fetchDonationsForRole() {
    if (this.role === "public") {
      return this.fetchPublicDonations(300);
    }

    try {
      if (this.role === "volunteer") {
        const response = await donationService.getVolunteerAvailable();
        return this.extractDonationCollection(response);
      }

      if (this.role === "ngo") {
        const [claimableResponse, ownResponse] = await Promise.all([
          donationService.getNgoAvailable(),
          donationService.getAll({ limit: 300 })
        ]);

        const claimable = this.extractDonationCollection(claimableResponse);
        const own = this.extractDonationCollection(ownResponse);
        const merged = new Map();

        [...claimable, ...own].forEach((donation) => {
          const id = this.getDonationId(donation);
          if (id) merged.set(id, donation);
        });

        return Array.from(merged.values());
      }

      const response = await donationService.getAll({ limit: 300 });
      return this.extractDonationCollection(response);
    } catch (error) {
      const errorMessage = String(error?.message || "").toLowerCase();
      const isAccessError =
        errorMessage.includes("not authorized") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("forbidden") ||
        errorMessage.includes("access");

      if (!isAccessError) {
        throw error;
      }

      console.warn("Role-scoped map fetch failed. Falling back to public feed:", error?.message || error);
      this.role = "public";
      this.refreshRolePresentation();
      this.showAlert("Showing public map feed due to role-restricted data access.", "warning");
      return this.fetchPublicDonations(300);
    }
  },

  getDonationId(donation) {
    return String(donation?._id || donation?.id || "");
  },

  getFilteredDonations() {
    let filtered = this.donations;

    if (this.role === "volunteer" && this.urgencyFilter !== "all") {
      filtered = filtered.filter((donation) => {
        const score = Number(donation?.priorityScore) || 0;
        const bucket = getPriorityMeta(score).bucket;
        return bucket === this.urgencyFilter;
      });
    }

    if (this.radiusFilterKm !== "all" && this.userLocation) {
      const maxRadius = Number(this.radiusFilterKm);
      if (Number.isFinite(maxRadius) && maxRadius > 0) {
        filtered = filtered.filter((donation, index) => {
          const location = this.resolveDonationLocation(donation, index);
          if (!location) return false;

          const distance = this.calculateDistanceKm(
            this.userLocation.lat,
            this.userLocation.lng,
            location.lat,
            location.lng
          );
          return distance <= maxRadius;
        });
      }
    }

    if (this.searchQuery) {
      filtered = filtered.filter((donation) => this.matchesSearchQuery(donation));
    }

    return filtered;
  },

  matchesSearchQuery(donation) {
    const query = this.searchQuery;
    if (!query) return true;

    const foodName = String(donation?.foodItems?.[0]?.name || "").toLowerCase();
    const city = String(donation?.pickupAddress?.city || "").toLowerCase();
    const donorName = String(
      donation?.donor?.organization?.name ||
      `${donation?.donor?.firstName || ""} ${donation?.donor?.lastName || ""}`
    )
      .trim()
      .toLowerCase();

    return foodName.includes(query) || city.includes(query) || donorName.includes(query);
  },

  createDonationMarkerIcon(priority, isSelected = false) {
    const markerClasses = ["map-donation-marker", priority.className];
    if (isSelected) markerClasses.push("is-selected");

    return L.divIcon({
      className: "map-donation-icon",
      html: `<span class="${markerClasses.join(" ")}"></span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -12]
    });
  },

  createClusterIcon(cluster) {
    const count = cluster.getChildCount();
    const tone = count >= 15 ? "critical" : count >= 7 ? "medium" : "low";

    return L.divIcon({
      className: "map-cluster-shell",
      html: `
        <div class="map-cluster-badge map-cluster-${tone}">
          <span>${count}</span>
        </div>
      `,
      iconSize: [46, 46],
      iconAnchor: [23, 23]
    });
  },

  renderMarkers(options = {}) {
    const forceFit = options.forceFit === true;
    this.clearMarkers();

    const visibleDonations = this.getFilteredDonations();
    this.updateVisibleCount(visibleDonations.length);
    const bounds = [];
    const heatPoints = [];

    visibleDonations.forEach((donation, index) => {
      const location = this.resolveDonationLocation(donation, index);
      if (!location) return;

      const donationId = this.getDonationId(donation);
      const score = Number(donation?.priorityScore) || 0;
      const priority = getPriorityMeta(score);
      const marker = L.marker([location.lat, location.lng], {
        icon: this.createDonationMarkerIcon(priority, donationId === this.selectedDonationId),
        keyboard: false
      });

      marker.bindPopup(this.buildPopupHtml(donation), {
        className: "custom-popup"
      });

      marker.on("click", () => {
        if (donationId) {
          this.selectedDonationId = donationId;
        }
        this.openDetailDrawer(donation);
      });

      this.markerLayer.addLayer(marker);
      const intensity = Math.max(0.2, Math.min(1, (score || 20) / 100));
      heatPoints.push([location.lat, location.lng, intensity]);
      this.markers.push(marker);
      bounds.push([location.lat, location.lng]);
    });

    if (this.selectedDonationId) {
      const activeDonation = visibleDonations.find(
        (donation) => this.getDonationId(donation) === this.selectedDonationId
      );
      if (activeDonation) {
        this.openDetailDrawer(activeDonation);
      } else {
        this.closeDetailDrawer();
      }
    }

    this.renderHeatmapLayer(heatPoints);

    if (bounds.length) {
      if (forceFit || !this.hasAutoFitted) {
        this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
        this.hasAutoFitted = true;
      }
    } else if (forceFit || !this.hasAutoFitted) {
      this.map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
      this.hasAutoFitted = true;
    }
  },

  updateVisibleCount(count) {
    const countEl = document.getElementById("visibleDonationsCount");
    if (!countEl) return;
    countEl.textContent = `${count} visible`;
  },

  updateHeroMetrics() {
    const districtEl = document.getElementById("heroDistrictCount");
    const activeEl = document.getElementById("heroActiveCount");
    const cities = new Set();

    this.donations.forEach((donation) => {
      const city = String(donation?.pickupAddress?.city || "")
        .trim()
        .toLowerCase();
      if (city) cities.add(city);
    });

    if (districtEl) {
      districtEl.textContent = `${cities.size || 0} Districts`;
    }

    if (activeEl) {
      activeEl.textContent = `${this.donations.length} Live Donations`;
    }
  },

  renderHeatmapLayer(points = []) {
    if (!this.map) return;

    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.heatLayer = null;
    }

    if (!this.heatmapEnabled) return;
    if (typeof L.heatLayer !== "function") return;
    if (!points.length) return;

    this.heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 18,
      minOpacity: 0.35,
      maxZoom: 14,
      gradient: {
        0.3: "#22c55e",
        0.6: "#f97316",
        1.0: "#ef4444"
      }
    }).addTo(this.map);
  },

  toggleHeatmap() {
    this.heatmapEnabled = !this.heatmapEnabled;
    this.updateHeatmapButton();
    this.renderMarkers({ forceFit: false });
  },

  updateHeatmapButton() {
    const btn = document.getElementById("heatmapToggleBtn");
    if (!btn) return;

    const icon = btn.querySelector("i");
    const text = btn.querySelector("span");

    if (this.heatmapEnabled) {
      btn.classList.add("text-orange-600");
      btn.setAttribute("title", "Disable heatmap");
      if (icon) {
        icon.classList.remove("fa-fire");
        icon.classList.add("fa-fire-flame-curved");
      }
      if (text) {
        text.textContent = "Heatmap On";
      }
      return;
    }

    btn.classList.remove("text-orange-600");
    btn.setAttribute("title", "Enable heatmap");
    if (icon) {
      icon.classList.remove("fa-fire-flame-curved");
      icon.classList.add("fa-fire");
    }
    if (text) {
      text.textContent = "Heatmap Off";
    }
  },

  buildPopupHtml(donation) {
    const donationId = this.getDonationId(donation);
    const foodName = this.escapeHtml(donation?.foodItems?.[0]?.name || "Food Donation");
    const city = this.escapeHtml(donation?.pickupAddress?.city || "Unknown city");
    const status = this.escapeHtml(this.formatStatus(donation?.status || "pending"));
    const quantity = this.escapeHtml(donation?.foodItems?.[0]?.quantity || "Not specified");
    const servings = Number(donation?.impact?.estimatedServings) || 0;
    const score = Number(donation?.priorityScore) || 0;
    const priority = getPriorityMeta(score);
    const pickupTime = this.escapeHtml(this.formatDateTime(donation?.pickupTime));
    const donorName = this.escapeHtml(donation?.donor?.organization?.name || `${donation?.donor?.firstName || ''} ${donation?.donor?.lastName || ''}`.trim() || 'Anonymous');
    const claimedNgo = donation?.claimedBy?.ngo;
    const ngoName = this.escapeHtml(
      claimedNgo?.organization?.name ||
      `${claimedNgo?.firstName || ""} ${claimedNgo?.lastName || ""}`.trim()
    );
    const actionButton = this.getPopupActionButton(donation, donationId);

    return `
      <div class="map-popup-card">
        <p class="map-popup-title">${foodName}</p>
        <p class="map-popup-line">Donor: ${donorName}</p>
        ${ngoName ? `<p class="map-popup-line">Claimed By: ${ngoName}</p>` : ''}
        <p class="map-popup-line">City: ${city}</p>
        <p class="map-popup-line">Status: ${status}</p>
        <p class="map-popup-line">Quantity: ${quantity}</p>
        <p class="map-popup-line">Servings: ${servings}</p>
        <p class="map-popup-line">Pickup: ${pickupTime}</p>
        <span class="map-popup-priority ${priority.className}">
          ${priority.label} (${score})
        </span>
        ${actionButton}
      </div>
    `;
  },

  getPopupActionButton(donation, donationId) {
    const action = this.getActionDescriptor(donation, donationId);
    if (!action) return "";

    return `
      <button class="map-popup-action" onclick="${action.handler}">
        ${action.label}
      </button>
    `;
  },

  getActionDescriptor(donation, donationId) {
    if (!donationId) return null;

    if (this.role === "volunteer" && donation?.status === "pending") {
      return {
        label: "Accept Pickup",
        handler: `MapModule.acceptPickup('${donationId}')`
      };
    }

    if (this.role === "ngo" && donation?.status === "pending" && !donation?.claimedBy) {
      return {
        label: "Claim Donation",
        handler: `MapModule.claimDonation('${donationId}')`
      };
    }

    return null;
  },

  getDrawerActionButton(donation, donationId) {
    const action = this.getActionDescriptor(donation, donationId);
    if (!action) return "";

    return `
      <button class="map-detail-action" onclick="${action.handler}">
        ${action.label}
        <i class="fas fa-arrow-right"></i>
      </button>
    `;
  },

  buildDetailHtml(donation) {
    const donationId = this.getDonationId(donation);
    const foodName = this.escapeHtml(donation?.foodItems?.[0]?.name || "Food Donation");
    const city = this.escapeHtml(donation?.pickupAddress?.city || "Unknown city");
    const status = this.escapeHtml(this.formatStatus(donation?.status || "pending"));
    const quantity = this.escapeHtml(donation?.foodItems?.[0]?.quantity || "Not specified");
    const servings = Number(donation?.impact?.estimatedServings) || 0;
    const score = Number(donation?.priorityScore) || 0;
    const priority = getPriorityMeta(score);
    const pickupTime = this.escapeHtml(this.formatDateTime(donation?.pickupTime));
    const donorName = this.escapeHtml(
      donation?.donor?.organization?.name ||
      `${donation?.donor?.firstName || ""} ${donation?.donor?.lastName || ""}`.trim() ||
      "Anonymous"
    );
    const claimedNgo = donation?.claimedBy?.ngo;
    const ngoName = this.escapeHtml(
      claimedNgo?.organization?.name ||
      `${claimedNgo?.firstName || ""} ${claimedNgo?.lastName || ""}`.trim()
    );
    const actionButton = this.getDrawerActionButton(donation, donationId);

    return `
      <div class="map-detail-head">
        <p class="map-detail-kicker">Selected Donation</p>
        <p class="map-detail-title">${foodName}</p>
        <span class="map-detail-priority ${priority.className}">
          ${priority.label} (${score})
        </span>
      </div>
      <div class="map-detail-grid">
        <div class="map-detail-row">
          <span class="map-detail-label">Donor</span>
          <span class="map-detail-value">${donorName}</span>
        </div>
        ${ngoName ? `
          <div class="map-detail-row">
            <span class="map-detail-label">Claimed By</span>
            <span class="map-detail-value">${ngoName}</span>
          </div>
        ` : ""}
        <div class="map-detail-row">
          <span class="map-detail-label">City</span>
          <span class="map-detail-value">${city}</span>
        </div>
        <div class="map-detail-row">
          <span class="map-detail-label">Status</span>
          <span class="map-detail-value">${status}</span>
        </div>
        <div class="map-detail-row">
          <span class="map-detail-label">Quantity</span>
          <span class="map-detail-value">${quantity}</span>
        </div>
        <div class="map-detail-row">
          <span class="map-detail-label">Servings</span>
          <span class="map-detail-value">${servings}</span>
        </div>
        <div class="map-detail-row">
          <span class="map-detail-label">Pickup</span>
          <span class="map-detail-value">${pickupTime}</span>
        </div>
      </div>
      ${actionButton}
    `;
  },

  openDetailDrawer(donation) {
    if (!this.detailDrawerEl || !this.detailContentEl || !donation) return;

    const donationId = this.getDonationId(donation);
    if (donationId) {
      this.selectedDonationId = donationId;
    }

    this.detailContentEl.innerHTML = this.buildDetailHtml(donation);
    this.detailDrawerEl.classList.add("is-open");
    this.detailDrawerEl.setAttribute("aria-hidden", "false");
  },

  closeDetailDrawer() {
    this.selectedDonationId = "";
    if (!this.detailDrawerEl || !this.detailContentEl) return;

    this.detailDrawerEl.classList.remove("is-open");
    this.detailDrawerEl.setAttribute("aria-hidden", "true");
    this.detailContentEl.innerHTML =
      '<p class="map-detail-empty">Select a marker to view donation details.</p>';
  },

  isDetailDrawerOpen() {
    return this.detailDrawerEl?.classList.contains("is-open") === true;
  },

  resolveDonationLocation(donation, index) {
    const pickupAddress = donation?.pickupAddress || {};
    const coordinate = pickupAddress?.coordinates || {};
    const geoCoordinates = Array.isArray(pickupAddress?.location?.coordinates)
      ? pickupAddress.location.coordinates
      : [];

    const geoLng = Number(geoCoordinates[0]);
    const geoLat = Number(geoCoordinates[1]);
    if (Number.isFinite(geoLat) && Number.isFinite(geoLng)) {
      return { lat: geoLat, lng: geoLng };
    }

    const lat = Number(coordinate?.lat ?? pickupAddress?.latitude ?? pickupAddress?.lat);
    const lng = Number(
      coordinate?.lng ?? pickupAddress?.longitude ?? pickupAddress?.lon ?? pickupAddress?.lng
    );

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    const cityKey = this.normalizeCity(pickupAddress?.city);
    if (cityKey && CITY_COORDINATES[cityKey]) {
      const [cityLat, cityLng] = CITY_COORDINATES[cityKey];
      return { lat: cityLat, lng: cityLng };
    }

    const jitter = this.getJitterBySeed(this.getDonationId(donation) || String(index));
    return {
      lat: DEFAULT_MAP_CENTER[0] + jitter.lat,
      lng: DEFAULT_MAP_CENTER[1] + jitter.lng
    };
  },

  normalizeCity(city) {
    return String(city || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
  },

  getJitterBySeed(seed) {
    const hash = String(seed).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      lat: ((hash % 25) - 12) / 600,
      lng: ((hash % 31) - 15) / 600
    };
  },

  async acceptPickup(donationId) {
    if (this.role !== "volunteer") {
      this.showAlert("Only volunteer accounts can accept pickups.", "warning");
      return;
    }

    await this.runAction(async () => {
      await donationService.acceptVolunteerPickup(donationId);
    }, "Pickup accepted.");
  },

  async claimDonation(donationId) {
    if (this.role !== "ngo") {
      this.showAlert("Only NGO accounts can claim donations.", "warning");
      return;
    }

    await this.runAction(async () => {
      await donationService.claimDonation(donationId);
    }, "Donation claimed.");
  },

  async markDelivered(donationId) {
    await this.runAction(async () => {
      await donationService.updateStatus(donationId, "closed");
    }, "Donation marked as closed.");
  },

  async runAction(action, successMessage) {
    if (!this.isAuthenticated()) {
      sessionStorage.setItem("redirectAfterLogin", window.location.href);
      this.showAlert("Please log in with your account to perform this action.", "info");
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 450);
      return;
    }

    if (this.actionInFlight) return;

    this.actionInFlight = true;

    try {
      await action();
      this.showAlert(successMessage, "success");
      await this.refreshData({ forceFit: true });
    } catch (error) {
      console.error("Map action failed:", error);
      this.showAlert(error.message || "Action failed.", "error");
    } finally {
      this.actionInFlight = false;
    }
  },

  clearMarkers() {
    if (this.markerLayer && typeof this.markerLayer.clearLayers === "function") {
      this.markerLayer.clearLayers();
    } else {
      this.markers.forEach((marker) => {
        this.markerLayer.removeLayer(marker);
      });
    }
    this.markers = [];
  },

  setupExpandButton() {
    const expandBtn = document.getElementById("expandMapBtn");
    const mapWrapper = document.getElementById("mapWrapper");
    const mapOverlay = document.getElementById("mapOverlay");

    this.syncNavOffset();
    if (mapWrapper) {
      mapWrapper.classList.remove("expanded");
    }
    mapOverlay?.classList.add("hidden");
    document.body.classList.remove("map-expanded");

    expandBtn?.addEventListener("click", () => this.toggleExpand());
    mapOverlay?.addEventListener("click", () => {
      if (this.isExpanded) this.toggleExpand();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      if (this.isDetailDrawerOpen()) {
        this.closeDetailDrawer();
        return;
      }

      if (this.isExpanded) {
        this.toggleExpand();
      }
    });

    window.addEventListener("resize", () => {
      this.syncNavOffset();
    });
  },

  toggleExpand() {
    const mapWrapper = document.getElementById("mapWrapper");
    const mapOverlay = document.getElementById("mapOverlay");
    const expandBtn = document.getElementById("expandMapBtn");
    const expandIcon = expandBtn?.querySelector("i");

    if (!mapWrapper) return;

    this.syncNavOffset();
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      mapWrapper.classList.add("expanded");
      mapOverlay?.classList.remove("hidden");
      document.body.classList.add("map-expanded");
      if (expandIcon) {
        expandIcon.classList.remove("fa-expand");
        expandIcon.classList.add("fa-compress");
      }
      expandBtn?.setAttribute("title", "Collapse Map");
    } else {
      mapWrapper.classList.remove("expanded");
      mapOverlay?.classList.add("hidden");
      document.body.classList.remove("map-expanded");
      if (expandIcon) {
        expandIcon.classList.remove("fa-compress");
        expandIcon.classList.add("fa-expand");
      }
      expandBtn?.setAttribute("title", "Expand Map");
    }

    setTimeout(() => {
      this.map.invalidateSize();
    }, 280);
  },

  resetView() {
    if (!this.map) return;
    this.hasAutoFitted = false;
    if (this.userLocation) {
      this.map.setView([this.userLocation.lat, this.userLocation.lng], 11);
      return;
    }
    this.map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
  },

  locateUser() {
    this.bootstrapUserLocation({
      recenter: true,
      showMarker: true,
      notifyOnError: true
    }).then(() => {
      this.renderMarkers({ forceFit: true });
    });
  },

  updateLastUpdated() {
    const label = document.getElementById("mapLastUpdated");
    if (!label) return;

    const now = new Date();
    label.textContent = `Last updated: ${now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    })}`;
  },

  syncNavOffset() {
    const navbar = document.getElementById("navbar");
    const navHeight = navbar?.offsetHeight || 64;
    document.documentElement.style.setProperty("--live-map-nav-height", `${navHeight}px`);
  },

  formatStatus(status) {
    return String(status || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  },

  formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not scheduled";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  },

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("map")) {
    MapModule.init();
  }
});

window.MapModule = MapModule;
