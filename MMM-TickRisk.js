/* MagicMirror Module: MMM-TickRisk
 * Displays the Fordham Tri-State Tick Risk Index (1–10)
 * Fetching is done in node_helper.js to avoid CORS restrictions.
 */

Module.register("MMM-TickRisk", {

  defaults: {
    updateInterval:  6 * 60 * 60 * 1000, // Re-fetch every 6 hours (score is weekly)
    showIcon:        true,                // Show tick icon next to score
    showLabel:       true,                // Show "Fordham Tick Risk" header
    showDescription: true,               // Show Low/Moderate/High/Very High text
    showLastUpdated: false,              // Show timestamp of last fetch
    colorize:        true,               // Color score green→yellow→orange→red
    iconType:        "emoji",            // "emoji" (🕷️) or "fa" (Font Awesome fa-bug)
    animateOnUpdate: true,               // Pulse score when value changes
  },

  SOURCE_URL: "https://www.fordham.edu/about/campuses/the-louis-calder-center/research/indices/fordham-tri-state-tick-risk/",

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  start() {
    Log.info("[MMM-TickRisk] Starting");
    this.score = null;
    this.lastUpdated = null;
    this.fetchError = null;
    this.triggerPulse = false;
    this.scheduleUpdate();
  },

  getStyles() {
    return ["MMM-TickRisk.css"];
  },

  // ─── Socket communication with node_helper ───────────────────────────────────

  scheduleUpdate() {
    this.requestFetch();
    setInterval(() => this.requestFetch(), this.config.updateInterval);
  },

  requestFetch() {
    this.sendSocketNotification("TICKRISK_FETCH", { url: this.SOURCE_URL });
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "TICKRISK_RESULT") {
      const changed = payload.score !== this.score;
      this.score = payload.score;
      this.lastUpdated = new Date();
      this.fetchError = null;
      if (changed && this.config.animateOnUpdate) this.triggerPulse = true;
      this.updateDom();
    } else if (notification === "TICKRISK_ERROR") {
      Log.error(`[MMM-TickRisk] ${payload}`);
      this.fetchError = payload;
      this.updateDom();
    }
  },

  // ─── DOM ────────────────────────────────────────────────────────────────────

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-tickrisk-wrapper";

    if (this.fetchError && this.score === null) {
      wrapper.innerHTML = `<div class="mmm-tickrisk-error">⚠ Tick Risk unavailable</div>`;
      return wrapper;
    }

    if (this.score === null) {
      wrapper.innerHTML = `<div class="mmm-tickrisk-loading dimmed small">Loading tick risk…</div>`;
      return wrapper;
    }

    if (this.config.showLabel) {
      const label = document.createElement("div");
      label.className = "mmm-tickrisk-label dimmed small";
      label.textContent = "Fordham Tick Risk";
      wrapper.appendChild(label);
    }

    const row = document.createElement("div");
    row.className = "mmm-tickrisk-row";

    if (this.config.showIcon) {
      const icon = document.createElement("span");
      icon.className = "mmm-tickrisk-icon";
      icon.innerHTML = this.config.iconType === "fa"
        ? `<i class="fa fa-bug"></i>`
        : "🕷️";
      row.appendChild(icon);
    }

    const scoreEl = document.createElement("span");
    scoreEl.className = `mmm-tickrisk-score ${this.config.colorize ? this.riskClass(this.score) : ""}`;
    if (this.triggerPulse) {
      scoreEl.classList.add("mmm-tickrisk-pulse");
      this.triggerPulse = false;
    }
    scoreEl.textContent = `${this.score}`;
    row.appendChild(scoreEl);

    const outOf = document.createElement("span");
    outOf.className = "mmm-tickrisk-outof dimmed";
    outOf.textContent = "/10";
    row.appendChild(outOf);

    wrapper.appendChild(row);

    if (this.config.showDescription) {
      const desc = document.createElement("div");
      desc.className = `mmm-tickrisk-desc small ${this.config.colorize ? this.riskClass(this.score) : ""}`;
      desc.textContent = this.riskLabel(this.score);
      wrapper.appendChild(desc);
    }

    if (this.config.showLastUpdated && this.lastUpdated) {
      const ts = document.createElement("div");
      ts.className = "mmm-tickrisk-ts xsmall dimmed";
      ts.textContent = `Updated: ${this.lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      wrapper.appendChild(ts);
    }

    return wrapper;
  },

  // ─── Helpers ────────────────────────────────────────────────────────────────

  riskClass(score) {
    if (score <= 2) return "mmm-tickrisk-low";
    if (score <= 4) return "mmm-tickrisk-moderate";
    if (score <= 7) return "mmm-tickrisk-high";
    return "mmm-tickrisk-veryhigh";
  },

  riskLabel(score) {
    if (score <= 2) return "Low Risk";
    if (score <= 4) return "Moderate Risk";
    if (score <= 7) return "High Risk";
    return "Very High Risk";
  },
});
