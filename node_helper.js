/* node_helper.js for MMM-TickRisk
 * Server-side fetch — no CORS restrictions apply here.
 * Carries cookies across redirects to satisfy Fordham's CAS gateway flow.
 */

const NodeHelper = require("node_helper");
const https = require("https");
const http = require("http");

module.exports = NodeHelper.create({

  start() {
    console.log("[MMM-TickRisk] Node helper started");
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "TICKRISK_FETCH") {
      console.log(`[MMM-TickRisk] Received fetch request for: ${payload.url}`);
      this.fetchScore(payload.url, 0, {});
    }
  },

  fetchScore(url, redirectCount, cookieJar) {
    console.log(`[MMM-TickRisk] Fetching (redirect #${redirectCount}): ${url}`);

    if (redirectCount > 10) {
      console.error("[MMM-TickRisk] Aborting — exceeded 10 redirects");
      this.sendSocketNotification("TICKRISK_ERROR", "Too many redirects");
      return;
    }

    const lib = url.startsWith("https") ? https : http;

    // Build Cookie header from jar
    const cookieHeader = Object.entries(cookieJar)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MagicMirror)",
        "Accept": "text/html,application/xhtml+xml",
        ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
      }
    };

    lib.get(url, options, (res) => {
      console.log(`[MMM-TickRisk] Response: HTTP ${res.statusCode} from ${url}`);

      // Merge any Set-Cookie headers into the jar
      const setCookie = res.headers["set-cookie"] || [];
      setCookie.forEach(raw => {
        // Each entry looks like "name=value; Path=/; Secure; ..."
        const pair = raw.split(";")[0].trim();
        const eq = pair.indexOf("=");
        if (eq > 0) {
          const name = pair.slice(0, eq);
          const value = pair.slice(eq + 1);
          cookieJar[name] = value;
          console.log(`[MMM-TickRisk] Cookie stored: ${name}`);
        }
      });

      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const next = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        console.log(`[MMM-TickRisk] Redirecting to: ${next}`);
        this.fetchScore(next, redirectCount + 1, cookieJar);
        return;
      }

      if (res.statusCode !== 200) {
        const msg = `HTTP ${res.statusCode}`;
        console.error(`[MMM-TickRisk] Error: ${msg}`);
        this.sendSocketNotification("TICKRISK_ERROR", msg);
        return;
      }

      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        console.log(`[MMM-TickRisk] Page received, size: ${body.length} bytes`);
        const score = this.parseScore(body);
        if (score !== null) {
          console.log(`[MMM-TickRisk] Parsed score: ${score}`);
          this.sendSocketNotification("TICKRISK_RESULT", { score });
        } else {
          const snippet = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500);
          console.error(`[MMM-TickRisk] Could not find score in page. Text snippet:\n  ${snippet}`);
          this.sendSocketNotification("TICKRISK_ERROR", "Score not found in page");
        }
      });

    }).on("error", err => {
      console.error(`[MMM-TickRisk] Request error: ${err.message}`);
      console.error(err.stack);
      this.sendSocketNotification("TICKRISK_ERROR", err.message);
    });
  },

  parseScore(html) {
    const patterns = [
      /tick\s*(?:index|risk)[^0-9]{0,80}?(\d{1,2})\s*(?:out\s*of\s*10|\/\s*10)?/i,
      /(\d{1,2})\s*(?:out\s*of\s*10|\/\s*10)/i,
      /<(?:span|div|p|h[1-6]|strong)[^>]*>\s*(\d{1,2})\s*<\/(?:span|div|p|h[1-6]|strong)>/i,
    ];

    for (const [i, pattern] of patterns.entries()) {
      const match = html.match(pattern);
      if (match) {
        const val = parseInt(match[1], 10);
        console.log(`[MMM-TickRisk] Pattern ${i + 1} matched: "${match[0].trim()}" → ${val}`);
        if (val >= 1 && val <= 10) return val;
        console.warn(`[MMM-TickRisk] Value ${val} out of range 1–10, skipping`);
      } else {
        console.log(`[MMM-TickRisk] Pattern ${i + 1} no match`);
      }
    }

    console.log("[MMM-TickRisk] Trying plaintext fallback pattern");
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const fallback = text.match(/(?:index|risk)[^0-9]{0,60}?(\b\d{1,2}\b)/i);
    if (fallback) {
      const val = parseInt(fallback[1], 10);
      console.log(`[MMM-TickRisk] Fallback matched: "${fallback[0].trim()}" → ${val}`);
      if (val >= 1 && val <= 10) return val;
      console.warn(`[MMM-TickRisk] Fallback value ${val} out of range 1–10, skipping`);
    } else {
      console.log("[MMM-TickRisk] Fallback pattern no match");
    }

    return null;
  },
});
