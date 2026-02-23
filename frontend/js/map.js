/**
 * FoodBridge - Map Module
 * Handles all map-related functionality with Karnataka focus
 * Structure allows easy expansion to other states
 */


// Map State Management

const MapModule = {
  map: null,
  markers: [],
  isExpanded: false,
  currentState: 'karnataka', // Default state
  
  // Karnataka district data with coordinates
  karnatakaData: {
    center: [15.3173, 75.7139], // Karnataka center
    zoom: 7,
    districts: [
      {
        id: 'bangalore',
        name: 'Bangalore Urban',
        lat: 12.9716,
        lng: 77.5946,
        type: 'donor',
        title: 'Taj West End - Bangalore',
        description: '50 meals available for pickup',
        meals: 50,
        contact: 'Rahul: +91 98765 43210'
      },
      {
        id: 'mysore',
        name: 'Mysore',
        lat: 12.2958,
        lng: 76.6394,
        type: 'donor',
        title: 'Radisson Blu - Mysore',
        description: '30 meals - Vegetarian thali',
        meals: 30,
        contact: 'Priya: +91 98765 43211'
      },
      {
        id: 'hubli',
        name: 'Hubli-Dharwad',
        lat: 15.3647,
        lng: 75.1240,
        type: 'ngo',
        title: 'Akshaya Patra - Hubli',
        description: 'NGO Distribution Center',
        meals: 0,
        contact: 'Contact: 0836-225XXXX'
      },
      {
        id: 'mangalore',
        name: 'Mangalore',
        lat: 12.9141,
        lng: 74.8560,
        type: 'donor',
        title: 'The Ocean Pearl - Mangalore',
        description: '25 meals - Mixed cuisine',
        meals: 25,
        contact: 'Kumar: +91 98765 43212'
      },
      {
        id: 'belgaum',
        name: 'Belgaum',
        lat: 15.8497,
        lng: 74.4977,
        type: 'volunteer',
        title: 'Volunteer: Amit Sharma',
        description: 'Available for pickup in Belgaum area',
        meals: 0,
        contact: 'Amit: +91 98765 43213'
      },
      {
        id: 'gulbarga',
        name: 'Kalaburagi',
        lat: 17.3297,
        lng: 76.8343,
        type: 'ngo',
        title: 'Rotary Club Food Bank',
        description: 'Community Food Distribution',
        meals: 0,
        contact: 'Contact: 08472-25XXXX'
      },
      {
        id: 'davanagere',
        name: 'Davanagere',
        lat: 14.4644,
        lng: 75.9218,
        type: 'donor',
        title: 'Hotel Mayura - Davanagere',
        description: '40 meals - Breakfast items',
        meals: 40,
        contact: 'Suresh: +91 98765 43214'
      },
      {
        id: 'shimoga',
        name: 'Shivamogga',
        lat: 13.9299,
        lng: 75.5681,
        type: 'volunteer',
        title: 'Volunteer: Meera Patel',
        description: 'Active volunteer - Shivamogga region',
        meals: 0,
        contact: 'Meera: +91 98765 43215'
      }
    ]
  },
  
  // State boundaries for future expansion
  stateBoundaries: {
    karnataka: {
      north: 18.5,
      south: 11.5,
      east: 78.0,
      west: 74.0
    }
  },

  
  // Initialize Map
  
  init(containerId = 'map') {
    const mapContainer = document.getElementById(containerId);
    if (!mapContainer) {
      console.error('Map container not found:', containerId);
      return;
    }

    // Initialize Leaflet map centered on Karnataka
    this.map = L.map(containerId).setView(
      this.karnatakaData.center, 
      this.karnatakaData.zoom
    );

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(this.map);

    // Add Karnataka markers
    this.addKarnatakaMarkers();

    // Setup expand/collapse functionality
    this.setupExpandButton();

  },

  
  // Add Karnataka Markers Only
  
  addKarnatakaMarkers() {
    // Clear existing markers
    this.clearMarkers();

    // Add markers for Karnataka districts only
    this.karnatakaData.districts.forEach(district => {
      // Verify coordinates are within Karnataka boundaries
      if (this.isWithinKarnataka(district.lat, district.lng)) {
        this.addMarker(district);
      }
    });

  },

  
  // Check if coordinates are within Karnataka
  
  isWithinKarnataka(lat, lng) {
    const bounds = this.stateBoundaries.karnataka;
    return (
      lat >= bounds.south && 
      lat <= bounds.north && 
      lng >= bounds.west && 
      lng <= bounds.east
    );
  },

  
  // Add Single Marker with Popup
  
  addMarker(data) {
    const { lat, lng, type, title, description, meals, contact } = data;

    // Get icon configuration based on type
    const iconConfig = this.getMarkerIcon(type);

    // Create custom icon
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-pin" style="
          background: ${iconConfig.color};
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          <i class="fas ${iconConfig.icon} text-white text-sm"></i>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });

    // Create marker
    const marker = L.marker([lat, lng], { icon: customIcon })
      .addTo(this.map)
      .bindPopup(this.createPopupContent(data), {
        maxWidth: 280,
        className: 'custom-popup'
      });

    // Store marker reference
    this.markers.push({
      marker,
      data,
      id: data.id
    });

    return marker;
  },

  
  // Get Marker Icon Configuration
  
  getMarkerIcon(type) {
    const icons = {
      donor: { color: '#f97316', icon: 'fa-hand-holding-heart', label: 'Donor' },
      ngo: { color: '#f59e0b', icon: 'fa-building', label: 'NGO' },
      volunteer: { color: '#ff6b4a', icon: 'fa-truck', label: 'Volunteer' },
      delivered: { color: '#10b981', icon: 'fa-check', label: 'Delivered' }
    };
    return icons[type] || icons.donor;
  },

  
  // Create Popup Content
  
  createPopupContent(data) {
    const { type, title, description, meals, contact, name } = data;
    const iconConfig = this.getMarkerIcon(type);

    return `
      <div class="p-3 min-w-[220px]">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: ${iconConfig.color}">
            <i class="fas ${iconConfig.icon} text-white text-xs"></i>
          </div>
          <span class="text-xs font-medium text-gray-500 uppercase">${iconConfig.label}</span>
        </div>
        <h4 class="font-bold text-gray-900 mb-1">${title}</h4>
        <p class="text-sm text-gray-600 mb-2">${description}</p>
        ${meals > 0 ? `<p class="text-sm font-medium text-orange-600 mb-2"><i class="fas fa-utensils"></i> ${meals} meals available</p>` : ''}
        <div class="pt-2 border-t border-gray-100">
          <p class="text-xs text-gray-500"><i class="fas fa-map-marker-alt"></i> ${name}</p>
          ${contact ? `<p class="text-xs text-gray-500 mt-1"><i class="fas fa-phone"></i> ${contact}</p>` : ''}
        </div>
      </div>
    `;
  },

  
  // Clear All Markers
  
  clearMarkers() {
    this.markers.forEach(({ marker }) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  },

  
  // Setup Expand/Collapse Button
  
  setupExpandButton() {
    const expandBtn = document.getElementById('expandMapBtn');
    const mapWrapper = document.getElementById('mapWrapper');
    const mapOverlay = document.getElementById('mapOverlay');

    if (!expandBtn || !mapWrapper) return;

    expandBtn.addEventListener('click', () => {
      this.toggleExpand();
    });

    // Close on overlay click
    if (mapOverlay) {
      mapOverlay.addEventListener('click', () => {
        if (this.isExpanded) {
          this.toggleExpand();
        }
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isExpanded) {
        this.toggleExpand();
      }
    });
  },

  
  // Toggle Expand/Collapse
  
  toggleExpand() {
    const mapWrapper = document.getElementById('mapWrapper');
    const mapOverlay = document.getElementById('mapOverlay');
    const expandBtn = document.getElementById('expandMapBtn');
    const expandIcon = expandBtn?.querySelector('i');

    if (!mapWrapper) return;

    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      // Expand to fullscreen
      mapWrapper.classList.add('fixed', 'inset-0', 'z-[1000]', 'rounded-none');
      mapWrapper.classList.remove('relative', 'rounded-2xl', 'shadow-lg');
      
      if (mapOverlay) {
        mapOverlay.classList.remove('hidden');
      }
      
      if (expandIcon) {
        expandIcon.classList.remove('fa-expand');
        expandIcon.classList.add('fa-compress');
      }
      
      // Update button tooltip
      expandBtn?.setAttribute('title', 'Collapse Map');
      
      // Invalidate map size after transition
      setTimeout(() => {
        this.map.invalidateSize();
      }, 300);
      
    } else {
      // Collapse to bordered view
      mapWrapper.classList.remove('fixed', 'inset-0', 'z-[1000]', 'rounded-none');
      mapWrapper.classList.add('relative', 'rounded-2xl', 'shadow-lg');
      
      if (mapOverlay) {
        mapOverlay.classList.add('hidden');
      }
      
      if (expandIcon) {
        expandIcon.classList.remove('fa-compress');
        expandIcon.classList.add('fa-expand');
      }
      
      // Update button tooltip
      expandBtn?.setAttribute('title', 'Expand Map');
      
      // Invalidate map size after transition
      setTimeout(() => {
        this.map.invalidateSize();
      }, 300);
    }
  },

  
  // Reset Map View
  
  resetView() {
    if (this.map) {
      this.map.setView(this.karnatakaData.center, this.karnatakaData.zoom);
    }
  },

  
  // Locate User
  
  locateUser() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Check if user is in Karnataka
        if (this.isWithinKarnataka(latitude, longitude)) {
          this.map.setView([latitude, longitude], 13);
          
          // Add user location marker
          L.marker([latitude, longitude])
            .addTo(this.map)
            .bindPopup('Your Location')
            .openPopup();
        } else {
          alert('You are currently outside Karnataka. Showing Karnataka view.');
          this.resetView();
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to retrieve your location. Please check your browser permissions.');
      }
    );
  },

  
  // Filter Markers by Type
  
  filterByType(type) {
    this.markers.forEach(({ marker, data }) => {
      if (type === 'all' || data.type === type) {
        marker.addTo(this.map);
      } else {
        this.map.removeLayer(marker);
      }
    });
  },

  
  // Get Active Stats
  
  getStats() {
    const donors = this.markers.filter(m => m.data.type === 'donor').length;
    const ngos = this.markers.filter(m => m.data.type === 'ngo').length;
    const volunteers = this.markers.filter(m => m.data.type === 'volunteer').length;
    const totalMeals = this.markers
      .filter(m => m.data.type === 'donor')
      .reduce((sum, m) => sum + (m.data.meals || 0), 0);

    return { donors, ngos, volunteers, totalMeals };
  },

  
  // Future: Add New State (Extensibility)
  
  addState(stateName, stateData) {
    // This method allows adding new states in the future
    // Example usage:
    // MapModule.addState('tamilnadu', tamilnaduData);
  }
};


// Initialize on DOM Ready

document.addEventListener('DOMContentLoaded', () => {
  if (typeof authService !== 'undefined' && !authService.isLoggedIn()) {
    return;
  }

  // Check if map container exists
  if (document.getElementById('map')) {
    MapModule.init();
  }
});

// Export for global access
window.MapModule = MapModule;
