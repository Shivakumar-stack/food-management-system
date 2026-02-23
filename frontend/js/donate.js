(() => {
  const TEMPLATE_STORAGE_KEY = "foodbridge_donation_template_v1";
  const DRAFT_STORAGE_KEY = "foodbridge_donation_draft_v1";
  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
  const DONATION_ALLOWED_ROLES = new Set(["donor", "admin"]);
  const categoryOptions = [
    { value: "cooked", label: "Cooked Food" },
    { value: "raw", label: "Raw Ingredients" },
    { value: "packaged", label: "Packaged" },
    { value: "baked", label: "Baked Goods" },
    { value: "beverages", label: "Beverages" },
    { value: "dairy", label: "Dairy" },
    { value: "fruits", label: "Fruits" },
    { value: "vegetables", label: "Vegetables" },
    { value: "other", label: "Other" }
  ];

  let currentStep = 1;
  const elements = {};
  const restrictionPopupState = { open: false, activeConfig: null, lastTrigger: null };

  function getFieldValue(field) {
    return String(field?.value || "").trim();
  }

  function getLocalDateInputValue(date) {
    const safeDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return safeDate.toISOString().slice(0, 16);
  }

  function getMinPickupDate() {
    const minDate = new Date();
    minDate.setMinutes(0, 0, 0);
    minDate.setHours(minDate.getHours() + 1);
    return minDate;
  }

  function setPickupMinTime() {
    if (!elements.pickupTimeInput) return;
    const minDate = getMinPickupDate();
    const minValue = getLocalDateInputValue(minDate);
    elements.pickupTimeInput.setAttribute("min", minValue);
    if (!elements.pickupTimeInput.value) return;
    const selectedDate = new Date(elements.pickupTimeInput.value);
    if (Number.isNaN(selectedDate.getTime()) || selectedDate < minDate) {
      elements.pickupTimeInput.value = minValue;
    }
  }

  function buildCategoryOptions(selectedValue = "") {
    const options = ['<option value="">Category</option>'];
    categoryOptions.forEach((option) => {
      const selected = option.value === selectedValue ? "selected" : "";
      options.push(`<option value="${option.value}" ${selected}>${option.label}</option>`);
    });
    return options.join("");
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildFoodItemRow(item = {}) {
    const row = document.createElement("div");
    row.className = "food-item-row bg-gray-50 rounded-xl p-4 border border-gray-200 relative";
    row.innerHTML = `
      <button type="button" class="remove-item absolute top-2 right-2 w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center">
        <i class="fas fa-times"></i>
      </button>
      <div class="grid gap-3 pr-10">
        <div>
          <input type="text" class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors text-sm" placeholder="Item name (e.g., Rice, Bread)" required value="${escapeAttribute(item.name || "")}">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <select class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors text-sm" required>${buildCategoryOptions(item.category || "")}</select>
          <input type="text" class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors text-sm" placeholder="Quantity (e.g., 5 kg)" required value="${escapeAttribute(item.quantity || "")}">
        </div>
      </div>
    `;
    return row;
  }

  function getFoodRows() {
    return Array.from(elements.foodItemsContainer?.querySelectorAll(".food-item-row") || []);
  }

  function reindexFoodRows() {
    const rows = getFoodRows();
    rows.forEach((row, index) => {
      const [nameInput, quantityInput] = row.querySelectorAll("input");
      const categorySelect = row.querySelector("select");
      if (nameInput) nameInput.name = `foodItems[${index}][name]`;
      if (categorySelect) categorySelect.name = `foodItems[${index}][category]`;
      if (quantityInput) quantityInput.name = `foodItems[${index}][quantity]`;
    });
    updateRemoveButtons();
  }

  function updateRemoveButtons() {
    const rows = getFoodRows();
    const isSingleRow = rows.length <= 1;
    rows.forEach((row) => {
      const removeBtn = row.querySelector(".remove-item");
      if (!removeBtn) return;
      removeBtn.classList.toggle("hidden", isSingleRow);
      removeBtn.disabled = isSingleRow;
    });
  }

  function estimateServingsFromQuantity(quantity) {
    const text = String(quantity || "").toLowerCase();
    const matches = text.match(/(\d+(\.\d+)?)/g);
    if (!matches) return 0;
    const value = Number.parseFloat(matches[0]);
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (/kg|kilogram/.test(text)) return Math.round(value * 8);
    if (/(^|\s)g(ram)?(\s|$)/.test(text)) return Math.round((value / 1000) * 8);
    if (/l(itre|iter)?/.test(text)) return Math.round(value * 5);
    if (/ml/.test(text)) return Math.round((value / 1000) * 5);
    if (/tray|box|pack|packet|bag/.test(text)) return Math.round(value * 10);
    if (/plate|meal|serving|portion/.test(text)) return Math.round(value);
    return Math.round(value * 4);
  }

  function getFoodItems({ strict = false } = {}) {
    return getFoodRows().map((row) => {
      const [nameInput, quantityInput] = row.querySelectorAll("input");
      const categorySelect = row.querySelector("select");
      const name = getFieldValue(nameInput);
      const category = getFieldValue(categorySelect);
      const quantity = getFieldValue(quantityInput);
      const hasAnyValue = Boolean(name || category || quantity);
      if (!hasAnyValue) return null;
      if (strict && (!name || !category || !quantity)) return null;
      return { name, category, quantity };
    }).filter(Boolean);
  }

  function calculateEstimatedServings(foodItems = []) {
    const estimated = foodItems.reduce((total, item) => total + estimateServingsFromQuantity(item.quantity), 0);
    if (estimated > 0) return estimated;
    return Math.max(foodItems.length * 5, 0);
  }

  function updateImpactPreview() {
    if (!elements.impactMealsPreview || !elements.impactItemsPreview || !elements.impactPolicyHint) return;
    const items = getFoodItems({ strict: false });
    const servings = calculateEstimatedServings(items);
    elements.impactItemsPreview.textContent = String(items.length);
    elements.impactMealsPreview.textContent = String(servings);
    if (!items.length) {
      elements.impactPolicyHint.textContent = "Add food items to preview impact and improve volunteer matching.";
      return;
    }
    if (servings > 300) {
      elements.impactPolicyHint.textContent = "Large donation detected. Verified donors receive faster large-load assignment and flexible limits.";
      return;
    }
    if (servings > 120) {
      elements.impactPolicyHint.textContent = "Medium-large donation. Verification unlocks higher daily limits and priority pickup routing.";
      return;
    }
    elements.impactPolicyHint.textContent = "Great! Clear quantities help us optimize matching and reduce pickup delays.";
  }

  function setStep(step) {
    currentStep = step === 2 ? 2 : 1;
    const isStep1 = currentStep === 1;
    const isStep2 = currentStep === 2;
    if (elements.step1) elements.step1.classList.toggle("hidden", !isStep1);
    if (elements.step2) elements.step2.classList.toggle("hidden", !isStep2);
    if (elements.stepLabel) elements.stepLabel.textContent = `Step ${currentStep} of 2`;
    if (elements.stepProgress) elements.stepProgress.classList.toggle("w-full", isStep2);
    if (elements.stepProgress) elements.stepProgress.classList.toggle("w-1/2", isStep1);
    setTabState(elements.stepTab1, isStep1);
    setTabState(elements.stepTab2, isStep2);
  }

  function setTabState(tabButton, isActive) {
    if (!tabButton) return;
    tabButton.classList.toggle("bg-orange-50", isActive);
    tabButton.classList.toggle("text-orange-700", isActive);
    tabButton.classList.toggle("border-orange-200", isActive);
    tabButton.classList.toggle("bg-gray-50", !isActive);
    tabButton.classList.toggle("text-gray-500", !isActive);
    tabButton.classList.toggle("border-gray-200", !isActive);
  }

  function validateStepOne() {
    const rows = getFoodRows();
    let hasValidItem = false;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const [nameInput, quantityInput] = row.querySelectorAll("input");
      const categorySelect = row.querySelector("select");
      const name = getFieldValue(nameInput);
      const category = getFieldValue(categorySelect);
      const quantity = getFieldValue(quantityInput);
      const hasAnyValue = Boolean(name || category || quantity);
      const shouldValidate = index === 0 || hasAnyValue;
      if (!shouldValidate) continue;
      if (!name) { nameInput?.focus(); nameInput?.reportValidity(); return false; }
      if (!category) { categorySelect?.focus(); categorySelect?.reportValidity(); return false; }
      if (!quantity) { quantityInput?.focus(); quantityInput?.reportValidity(); return false; }
      hasValidItem = true;
    }
    if (!hasValidItem) {
      ui.showAlert("Add at least one complete food item before continuing.", "warning", elements.alertContainer);
      return false;
    }
    return true;
  }

  function validateStepTwo() {
    const requiredFields = Array.from(elements.step2?.querySelectorAll("input[required], select[required], textarea[required]") || []);
    for (const field of requiredFields) {
      if (!field.checkValidity()) {
        field.focus();
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  function saveTemplate(items = getFoodItems({ strict: true })) {
    if (!items.length) return;
    const payload = { savedAt: new Date().toISOString(), foodItems: items.slice(0, 15) };
    try { localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(payload)); } catch (error) { console.warn("Unable to store donation template:", error); }
  }

  function loadTemplate() {
    try {
      const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.foodItems) || parsed.foodItems.length === 0) return null;
      return parsed.foodItems;
    } catch (error) {
      console.warn("Unable to parse donation template:", error);
      return null;
    }
  }

  function applyFoodItems(items) {
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    elements.foodItemsContainer.innerHTML = "";
    if (!safeItems.length) {
      elements.foodItemsContainer.appendChild(buildFoodItemRow());
    } else {
      safeItems.forEach((item) => { elements.foodItemsContainer.appendChild(buildFoodItemRow(item)); });
    }
    reindexFoodRows();
    updateImpactPreview();
  }

  function highlightPickupSlot(activeButton = null) {
    elements.pickupSlotButtons.forEach((button) => {
      const isActive = button === activeButton;
      button.classList.toggle("bg-orange-500", isActive);
      button.classList.toggle("text-white", isActive);
      button.classList.toggle("border-orange-500", isActive);
      button.classList.toggle("text-orange-700", !isActive);
      button.classList.toggle("border-orange-200", !isActive);
    });
  }

  function setPickupFromSlot(button) {
    if (!elements.pickupTimeInput || !button) return;
    const minDate = getMinPickupDate();
    const targetDate = new Date(minDate);
    const offsetHours = Number.parseInt(button.dataset.offsetHours || "", 10);
    const slot = button.dataset.slot || "";
    if (Number.isFinite(offsetHours)) {
      targetDate.setHours(targetDate.getHours() + Math.max(offsetHours - 1, 0));
    } else if (slot === "tomorrow-morning") {
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(10, 0, 0, 0);
    }
    if (targetDate < minDate) targetDate.setTime(minDate.getTime());
    elements.pickupTimeInput.value = getLocalDateInputValue(targetDate);
    highlightPickupSlot(button);
  }

  function addFoodItem() {
    elements.foodItemsContainer.appendChild(buildFoodItemRow());
    reindexFoodRows();
    updateImpactPreview();
  }

  function removeFoodItem(removeButton) {
    const row = removeButton?.closest(".food-item-row");
    if (!row) return;
    row.remove();
    if (!getFoodRows().length) elements.foodItemsContainer.appendChild(buildFoodItemRow());
    reindexFoodRows();
    updateImpactPreview();
  }

  function resetFormState() {
    elements.form?.reset();
    applyFoodItems([]);
    setPickupMinTime();
    setStep(1);
    highlightPickupSlot(null);
    if (elements.alertContainer) elements.alertContainer.innerHTML = "";
  }

  function getAuthContext() {
    const hasAuthService = typeof authService !== "undefined";
    const isLoggedIn = hasAuthService && authService.isLoggedIn();
    const user = isLoggedIn ? authService.getUser() || null : null;
    const role = String(user?.role || "").toLowerCase();
    return { hasAuthService, isLoggedIn, user, role };
  }

  function isDonationActionAllowed() {
    const auth = getAuthContext();
    if (!auth.isLoggedIn) return { allowed: false, type: "guest", ...auth };
    if (!DONATION_ALLOWED_ROLES.has(auth.role)) return { allowed: false, type: "role", ...auth };
    return { allowed: true, type: "", ...auth };
  }

  function formatRoleLabel(role) {
    const map = { donor: "donor", admin: "admin", volunteer: "volunteer", ngo: "NGO" };
    return map[String(role || "").toLowerCase()] || "user";
  }

  function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.classList.contains("hidden"));
  }

  function getDraftPayload() {
    if (!elements.form) return null;
    const payload = {
      savedAt: Date.now(),
      step: currentStep,
      foodItems: getFoodItems({ strict: false }),
      pickupAddress: {
        street: getFieldValue(elements.form.querySelector('[name="pickupAddress[street]"]')),
        city: getFieldValue(elements.form.querySelector('[name="pickupAddress[city]"]')),
        state: getFieldValue(elements.form.querySelector('[name="pickupAddress[state]"]')),
        zipCode: getFieldValue(elements.form.querySelector('[name="pickupAddress[zipCode]"]'))
      },
      pickupTime: getFieldValue(elements.pickupTimeInput),
      notes: getFieldValue(elements.form.querySelector('[name="notes"]'))
    };

    const hasData =
      payload.foodItems.length > 0 ||
      payload.pickupAddress.street ||
      payload.pickupAddress.city ||
      payload.pickupAddress.zipCode ||
      payload.pickupTime ||
      payload.notes;
    return hasData ? payload : null;
  }

  function saveDraft() {
    const payload = getDraftPayload();
    if (!payload) return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Unable to save donation draft:", error);
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.warn("Unable to clear donation draft:", error);
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const savedAt = Number(parsed?.savedAt);
      if (!Number.isFinite(savedAt)) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return null;
      }
      if (Date.now() - savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (error) {
      console.warn("Unable to load donation draft:", error);
      return null;
    }
  }

  function applyDraft(draft) {
    if (!draft || typeof draft !== "object") return false;
    const safeItems = Array.isArray(draft.foodItems) ? draft.foodItems : [];
    if (safeItems.length) applyFoodItems(safeItems);

    const pickupAddress = draft.pickupAddress || {};
    const fieldMap = {
      '[name="pickupAddress[street]"]': pickupAddress.street,
      '[name="pickupAddress[city]"]': pickupAddress.city,
      '[name="pickupAddress[state]"]': pickupAddress.state,
      '[name="pickupAddress[zipCode]"]': pickupAddress.zipCode,
      '[name="notes"]': draft.notes
    };

    Object.entries(fieldMap).forEach(([selector, value]) => {
      const field = elements.form?.querySelector(selector);
      if (!field || !value) return;
      field.value = value;
    });

    if (elements.pickupTimeInput && draft.pickupTime) {
      elements.pickupTimeInput.value = draft.pickupTime;
    }

    setPickupMinTime();
    updateImpactPreview();
    setStep(Number(draft.step) === 2 ? 2 : 1);
    highlightPickupSlot(null);
    return true;
  }

  function restoreDraftIfAvailable() {
    const draft = loadDraft();
    if (!draft) return;
    if (!applyDraft(draft)) return;
    ui.showAlert("Recovered your saved donation draft from this device.", "info", elements.alertContainer);
  }

  function redirectWithDraft(targetPath) {
    saveDraft();
    sessionStorage.setItem("redirectAfterLogin", "donate.html");
    window.location.href = targetPath;
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function buildPolicyMessage(error) {
    const base = String(error?.message || "Your current donor policy limits this submission.");
    const details = error?.details || {};
    const policy = details?.policy || {};
    const parts = [base];
    if (Number.isFinite(policy.maxItems)) parts.push(`Max items for your tier: ${policy.maxItems}.`);
    if (Number.isFinite(policy.maxDailyDonations)) parts.push(`Daily limit: ${policy.maxDailyDonations} donation(s).`);
    if (details?.nextAllowedAt) {
      const nextWindow = formatDateTime(details.nextAllowedAt);
      if (nextWindow) parts.push(`You can submit again after ${nextWindow}.`);
    }
    return parts.join(" ");
  }

  function getRestrictionPopupConfig(type, context = {}) {
    if (type === "guest") {
      const actionLabel = context.actionLabel || "continue";
      return {
        iconClass: "fas fa-user-lock text-xl",
        title: `Log in to ${actionLabel}`,
        message: "You can browse and fill the form in guest mode, but a connected user account is required to continue.",
        primaryLabel: "Log In",
        primaryHref: "login.html",
        onPrimary: () => redirectWithDraft("login.html"),
        secondaryLabel: "Create Donor Account",
        secondaryHref: "signup.html?role=donor",
        onSecondary: () => redirectWithDraft("signup.html?role=donor"),
        dismissLabel: "Continue Browsing"
      };
    }

    if (type === "role") {
      return {
        iconClass: "fas fa-id-card text-xl",
        title: "Donor Access Required",
        message: `You are signed in as ${formatRoleLabel(context.role)}. Only donor or admin accounts can ${context.actionLabel || "perform this action"} on this page.`,
        primaryLabel: "Go to Dashboard",
        primaryHref: "dashboard.html",
        secondaryLabel: "Create Donor Account",
        secondaryHref: "signup.html?role=donor",
        onSecondary: () => redirectWithDraft("signup.html?role=donor"),
        dismissLabel: "Continue Browsing"
      };
    }

    return {
      iconClass: "fas fa-circle-exclamation text-xl",
      title: "Donation Limit Reached",
      message: buildPolicyMessage(context.error),
      primaryLabel: "Review My Donations",
      primaryHref: "my-donations.html",
      secondaryLabel: "Update Draft",
      secondaryHref: "#",
      onSecondary: () => closeRestrictionPopup(),
      dismissLabel: "Close"
    };
  }

  function openRestrictionPopup(config, trigger = null) {
    if (!elements.authOverlay || !elements.restrictionDialog || !config) return;
    restrictionPopupState.activeConfig = config;
    restrictionPopupState.lastTrigger = trigger || document.activeElement;
    restrictionPopupState.open = true;

    if (elements.restrictionTitle) elements.restrictionTitle.textContent = config.title || "Restricted action";
    if (elements.restrictionMessage) {
      elements.restrictionMessage.textContent = config.message || "Please connect your account to continue.";
    }
    if (elements.restrictionIcon) elements.restrictionIcon.className = config.iconClass || "fas fa-lock text-xl";

    if (elements.authPrimaryAction) {
      elements.authPrimaryAction.textContent = config.primaryLabel || "Continue";
      elements.authPrimaryAction.href = config.primaryHref || "#";
    }

    if (elements.authSecondaryAction) {
      const hasSecondary = Boolean(config.secondaryLabel);
      elements.authSecondaryAction.classList.toggle("hidden", !hasSecondary);
      if (hasSecondary) {
        elements.authSecondaryAction.textContent = config.secondaryLabel;
        elements.authSecondaryAction.href = config.secondaryHref || "#";
      }
    }

    if (elements.authDismissAction) {
      elements.authDismissAction.textContent = config.dismissLabel || "Close";
    }

    elements.authOverlay.classList.remove("hidden");
    elements.authOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");

    window.setTimeout(() => {
      const focusables = getFocusableElements(elements.restrictionDialog);
      if (focusables.length) focusables[0].focus();
      else elements.restrictionDialog.focus();
    }, 20);
  }

  function closeRestrictionPopup() {
    if (!elements.authOverlay) return;
    elements.authOverlay.classList.add("hidden");
    elements.authOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    restrictionPopupState.open = false;
    restrictionPopupState.activeConfig = null;
    const lastTrigger = restrictionPopupState.lastTrigger;
    if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
    restrictionPopupState.lastTrigger = null;
  }

  function handleRestrictionAction(event, actionType) {
    const config = restrictionPopupState.activeConfig;
    if (!config) return;
    if (actionType === "primary" && typeof config.onPrimary === "function") {
      event.preventDefault();
      config.onPrimary();
      return;
    }
    if (actionType === "secondary" && typeof config.onSecondary === "function") {
      event.preventDefault();
      config.onSecondary();
      return;
    }
    closeRestrictionPopup();
  }

  function trapPopupFocus(event) {
    if (!restrictionPopupState.open || event.key !== "Tab") return;
    const focusables = getFocusableElements(elements.restrictionDialog);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function bindRestrictionPopupEvents() {
    elements.authOverlayClose?.addEventListener("click", closeRestrictionPopup);
    elements.authDismissAction?.addEventListener("click", closeRestrictionPopup);

    elements.authOverlay?.addEventListener("click", (event) => {
      if (event.target === elements.authOverlay) closeRestrictionPopup();
    });

    elements.authPrimaryAction?.addEventListener("click", (event) => {
      handleRestrictionAction(event, "primary");
    });

    elements.authSecondaryAction?.addEventListener("click", (event) => {
      handleRestrictionAction(event, "secondary");
    });

    document.addEventListener("keydown", (event) => {
      if (!restrictionPopupState.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRestrictionPopup();
        return;
      }
      trapPopupFocus(event);
    });
  }

  function ensureActionAccess(actionLabel, triggerElement = null) {
    const access = isDonationActionAllowed();
    if (access.allowed) return true;
    openRestrictionPopup(
      getRestrictionPopupConfig(access.type, { actionLabel, role: access.role }),
      triggerElement
    );
    return false;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!ensureActionAccess("submit donation", event.submitter || elements.submitBtn)) return;

    if (!validateStepOne()) {
      setStep(1);
      return;
    }

    setStep(2);
    if (!validateStepTwo()) return;

    const submitBtn = elements.submitBtn;
    ui.setButtonLoading(submitBtn, true);

    const foodItems = getFoodItems({ strict: true });
    const donationData = {
      foodItems,
      pickupAddress: {
        street: getFieldValue(elements.form.querySelector('[name="pickupAddress[street]"]')),
        city: getFieldValue(elements.form.querySelector('[name="pickupAddress[city]"]')),
        state: getFieldValue(elements.form.querySelector('[name="pickupAddress[state]"]')),
        zipCode: getFieldValue(elements.form.querySelector('[name="pickupAddress[zipCode]"]'))
      },
      pickupTime: getFieldValue(elements.pickupTimeInput),
      notes: getFieldValue(elements.form.querySelector('[name="notes"]')),
      impact: { estimatedServings: calculateEstimatedServings(foodItems) }
    };

    try {
      await donationService.create(donationData);
      saveTemplate(foodItems);
      clearDraft();
      elements.successModal?.classList.remove("hidden");
      resetFormState();
    } catch (error) {
      console.error("Donation submission error:", error);
      if (error?.code === "DONOR_POLICY_LIMIT") {
        openRestrictionPopup(getRestrictionPopupConfig("policy", { error }), submitBtn);
      }
      ui.showAlert(
        error?.message || "Failed to submit donation. Please try again.",
        error?.code === "DONOR_POLICY_LIMIT" ? "warning" : "error",
        elements.alertContainer
      );
    } finally {
      ui.setButtonLoading(submitBtn, false);
    }
  }

  function bindEvents() {
    elements.addFoodItemBtn?.addEventListener("click", addFoodItem);

    elements.foodItemsContainer?.addEventListener("click", (event) => {
      const removeButton = event.target.closest(".remove-item");
      if (removeButton) removeFoodItem(removeButton);
    });

    elements.foodItemsContainer?.addEventListener("input", updateImpactPreview);
    elements.foodItemsContainer?.addEventListener("change", updateImpactPreview);

    elements.nextToStep2Btn?.addEventListener("click", (event) => {
      if (!ensureActionAccess("continue to pickup details", event.currentTarget)) return;
      if (!validateStepOne()) return;
      saveTemplate(getFoodItems({ strict: true }));
      setStep(2);
    });

    elements.backToStep1Btn?.addEventListener("click", () => setStep(1));
    elements.stepTab1?.addEventListener("click", () => setStep(1));
    elements.stepTab2?.addEventListener("click", (event) => {
      if (!ensureActionAccess("continue to pickup details", event.currentTarget)) return;
      if (!validateStepOne()) return;
      setStep(2);
    });

    elements.loadTemplateBtn?.addEventListener("click", (event) => {
      if (!ensureActionAccess("load your saved template", event.currentTarget)) return;
      const template = loadTemplate();
      if (!template) {
        ui.showAlert("No saved template found yet. Submit one donation to reuse details.", "info", elements.alertContainer);
        return;
      }
      applyFoodItems(template);
      ui.showAlert("Saved template loaded successfully.", "success", elements.alertContainer);
    });

    elements.pickupSlotButtons.forEach((button) => {
      button.addEventListener("click", () => setPickupFromSlot(button));
    });

    elements.pickupTimeInput?.addEventListener("change", () => {
      highlightPickupSlot(null);
    });

    elements.form?.addEventListener("submit", handleSubmit);

    elements.successModal?.addEventListener("click", (event) => {
      if (event.target.id === "successModal") {
        elements.successModal.classList.add("hidden");
      }
    });
  }

  function cacheElements() {
    elements.form = document.getElementById("donationForm");
    elements.alertContainer = document.getElementById("alertContainer");
    elements.successModal = document.getElementById("successModal");
    elements.foodItemsContainer = document.getElementById("foodItemsContainer");
    elements.addFoodItemBtn = document.getElementById("addFoodItem");
    elements.loadTemplateBtn = document.getElementById("loadTemplateBtn");
    elements.nextToStep2Btn = document.getElementById("nextToStep2");
    elements.backToStep1Btn = document.getElementById("backToStep1");
    elements.submitBtn = document.getElementById("submitBtn");
    elements.stepLabel = document.getElementById("formStepLabel");
    elements.stepProgress = document.getElementById("formStepProgress");
    elements.stepTab1 = document.getElementById("stepTab1");
    elements.stepTab2 = document.getElementById("stepTab2");
    elements.step1 = document.getElementById("donationStep1");
    elements.step2 = document.getElementById("donationStep2");
    elements.pickupTimeInput = document.getElementById("pickupTimeInput");
    elements.pickupSlotButtons = Array.from(document.querySelectorAll(".pickup-slot-btn"));
    elements.impactMealsPreview = document.getElementById("impactMealsPreview");
    elements.impactItemsPreview = document.getElementById("impactItemsPreview");
    elements.impactPolicyHint = document.getElementById("impactPolicyHint");

    elements.authOverlay = document.getElementById("authOverlay");
    elements.restrictionDialog = document.getElementById("donationRestrictionDialog");
    elements.restrictionTitle = document.getElementById("donationRestrictionTitle");
    elements.restrictionMessage = document.getElementById("donationRestrictionMessage");
    elements.restrictionIcon = document.getElementById("donationRestrictionIcon");
    elements.authPrimaryAction = document.getElementById("authPrimaryAction");
    elements.authSecondaryAction = document.getElementById("authSecondaryAction");
    elements.authDismissAction = document.getElementById("authDismissAction");
    elements.authOverlayClose = document.getElementById("authOverlayClose");
  }

  function initFormRows() {
    const existingRows = getFoodRows();
    if (!existingRows.length) {
      elements.foodItemsContainer?.appendChild(buildFoodItemRow());
      reindexFoodRows();
      return;
    }
    const initialItems = getFoodItems({ strict: false });
    applyFoodItems(initialItems);
  }

  function init() {
    cacheElements();
    if (!elements.form || !elements.foodItemsContainer) return;
    initFormRows();
    setPickupMinTime();
    updateImpactPreview();
    setStep(1);
    bindRestrictionPopupEvents();
    restoreDraftIfAvailable();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
