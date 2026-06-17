# MMM-TickRisk

A [MagicMirror²](https://magicmirror.builders/) module that displays the **Fordham Tri-State Tick Risk Index** — a weekly 1–10 score estimating the risk of being bitten by a deer tick in the NY/CT/NJ tri-state area.

Source: [Fordham Louis Calder Center](https://www.fordham.edu/about/campuses/the-louis-calder-center/research/indices/fordham-tri-state-tick-risk/)

---

## Screenshot

```
FORDHAM TICK RISK
🕷️  8 /10
    High Risk
```
*(score is colored orange/red/yellow/green depending on value)*

---

## Installation

```bash
cd ~/MagicMirror/modules
cp -r /path/to/MMM-TickRisk .
```

No npm dependencies — pure vanilla JS.

---

## Configuration

Add to your `config/config.js`:

```js
{
  module: "MMM-TickRisk",
  position: "top_right",   // any MM position
  config: {
    // All options below are optional — these are the defaults:
    updateInterval:   21600000,  // ms between re-fetches (default: 6 hours)
    showIcon:         true,      // show 🕷️ icon next to the score
    showLabel:        true,      // show "Fordham Tick Risk" header label
    showDescription:  true,      // show risk level text (Low / Moderate / High / Very High)
    showLastUpdated:  false,     // show timestamp of last successful fetch
    colorize:         true,      // color the score green→yellow→orange→red
    iconType:         "emoji",   // "emoji" for 🕷️, or "fa" for Font Awesome bug icon
    animateOnUpdate:  true,      // brief pulse animation when score changes
  }
},
```

### Config options

| Option | Type | Default | Description |
|---|---|---|---|
| `updateInterval` | `number` (ms) | `21600000` | How often to re-fetch. The index is updated weekly, so 6 hours is more than sufficient. |
| `showIcon` | `boolean` | `true` | Show a tick icon next to the score. |
| `iconType` | `"emoji"` \| `"fa"` | `"emoji"` | `"emoji"` uses 🕷️. `"fa"` uses Font Awesome's `fa-bug` (requires FA to be loaded). |
| `showLabel` | `boolean` | `true` | Show "Fordham Tick Risk" label above the score. |
| `showDescription` | `boolean` | `true` | Show a text label: Low / Moderate / High / Very High Risk. |
| `showLastUpdated` | `boolean` | `false` | Show the time of the last successful data fetch below the score. |
| `colorize` | `boolean` | `true` | Color the score and description by risk level (green / yellow / orange / red). |
| `animateOnUpdate` | `boolean` | `true` | Briefly pulse the score number when the value changes. |

### Risk level color bands

| Score | Level | Color |
|---|---|---|
| 1–2 | Low | 🟢 Green |
| 3–4 | Moderate | 🟡 Yellow |
| 5–7 | High | 🟠 Orange |
| 8–10 | Very High | 🔴 Red |

---

## Notes

- The module fetches the Fordham page **directly from the browser** (client-side), so no Node helper is needed.
- If the page is unreachable, the last known score is kept until the next successful fetch.
- The index is only published for the tri-state area (southern NY, CT, northern NJ).
