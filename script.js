const eventProfiles = {
  Birthday: {
    budget: {
      "Food & drinks": 0.42,
      Decor: 0.2,
      Photography: 0.12,
      "Venue & activities": 0.16,
      Contingency: 0.1,
    },
    minimumPerGuest: 700,
    ideas: [
      "Set up a simple cake-and-photo moment instead of decorating every area.",
      "Choose one shared activity, such as a music playlist or party games.",
    ],
    vendors: ["Cake baker", "Small-event decorator", "Photographer"],
  },
  Wedding: {
    budget: {
      "Food & drinks": 0.35,
      Decor: 0.28,
      Photography: 0.14,
      "Venue & logistics": 0.15,
      Contingency: 0.08,
    },
    minimumPerGuest: 2500,
    ideas: [
      "Prioritize the ceremony backdrop and reuse its flowers for the reception.",
      "Ask venues for an itemized package quote before booking outside vendors.",
    ],
    vendors: [
      "Venue coordinator",
      "Caterer",
      "Florist or decorator",
      "Photographer",
    ],
  },
  "Community Fest": {
    budget: {
      "Food & drinks": 0.28,
      "Decor & signage": 0.2,
      Photography: 0.1,
      "Venue, sound & permits": 0.3,
      Contingency: 0.12,
    },
    minimumPerGuest: 500,
    ideas: [
      "Invite local groups to host activity stalls and share setup costs.",
      "Keep a clear sound schedule and a weather backup for outdoor activities.",
    ],
    vendors: [
      "Venue or grounds contact",
      "Sound supplier",
      "Food-stall operators",
    ],
  },
  "Corporate Party": {
    budget: {
      "Food & drinks": 0.38,
      "Decor & AV": 0.18,
      Photography: 0.15,
      "Venue & logistics": 0.2,
      Contingency: 0.09,
    },
    minimumPerGuest: 1200,
    ideas: [
      "Keep speeches and awards short, with a timed run-of-show.",
      "Use a simple branded welcome or photo area instead of extensive decor.",
    ],
    vendors: ["Venue coordinator", "Caterer", "AV technician", "Photographer"],
  },
};

const form = document.getElementById("planner-form");
const button = document.getElementById("generatebutton");
const output = document.getElementById("output");
const errorMessage = document.getElementById("form-error");
const dateInput = document.getElementById("date");

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

dateInput.min = localDateString(new Date());

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function formatRupees(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getLocalPlan(data) {
  const profile = eventProfiles[data.type];
  const names = Object.keys(profile.budget);
  const budget = {};
  names.slice(0, -1).forEach((name) => {
    budget[name] = Math.floor(data.budget * profile.budget[name]);
  });
  budget[names[names.length - 1]] =
    data.budget -
    Object.values(budget).reduce((total, amount) => total + amount, 0);

  const eventDate = new Date(`${data.date}T00:00:00`);
  const today = new Date(`${localDateString(new Date())}T00:00:00`);
  const daysLeft = Math.round((eventDate - today) / 86400000);
  let nextSteps;
  if (daysLeft > 30) {
    nextSteps = [
      "Confirm your guest list and shortlist venues.",
      "Request itemized quotes from the key vendors.",
      "Book the venue and the vendors with limited availability.",
    ];
  } else if (daysLeft > 7) {
    nextSteps = [
      "Confirm vendor bookings, guest count, and any dietary needs.",
      "Finalize the event schedule and transport or setup details.",
      "Keep the contingency amount available for last-minute changes.",
    ];
  } else {
    nextSteps = [
      "Reconfirm arrival times, final guest count, and vendor contacts.",
      "Prepare a simple event-day schedule and payment checklist.",
      "Avoid adding nonessential purchases at the last minute.",
    ];
  }

  return {
    event_type: data.type,
    theme: data.theme,
    location: data.location,
    event_date: data.date,
    guests: data.guests,
    total_budget: data.budget,
    amount_per_guest: Math.round(data.budget / data.guests),
    days_left: daysLeft,
    budget,
    ideas: [
      `Add ${data.theme} details to one focal area. ${profile.ideas[0]}`,
      profile.ideas[1],
    ],
    vendors: profile.vendors,
    next_steps: nextSteps,
    budget_note:
      data.budget / data.guests < profile.minimumPerGuest
        ? "This is a tight starting budget for this event type; consider simplifying the venue or decor, or adjusting the guest count."
        : "This budget is a planning estimate; compare local quotes before booking.",
  };
}

function renderPlan(plan, isLocalPlan) {
  const budgetItems = Object.entries(plan.budget)
    .map(
      ([category, amount]) => `
        <li class="budget-item">
          <span>${escapeHtml(category)}</span>
          <strong>${formatRupees(amount)}</strong>
        </li>
      `,
    )
    .join("");
  const ideas = plan.ideas
    .map((idea) => `<li>${escapeHtml(idea)}</li>`)
    .join("");
  const vendors = plan.vendors
    .map((vendor) => `<li>${escapeHtml(vendor)}</li>`)
    .join("");
  const nextSteps = plan.next_steps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");
  const date = new Date(`${plan.event_date}T00:00:00`).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" },
  );
  const location = escapeHtml(plan.location);
  const eventType = escapeHtml(plan.event_type);
  const theme = escapeHtml(plan.theme);

  output.innerHTML = `
    <article class="result-card">
      <div class="result-header">
        <div>
          <p class="eyebrow">YOUR EVENT PLAN</p>
          <h2>${eventType}, with a ${theme} feel</h2>
          <p class="event-meta">${date} <span>·</span> ${location} <span>·</span> ${plan.guests} guests</p>
        </div>
        <div class="countdown-badge">
          <strong>${plan.days_left}</strong>
          <span>${plan.days_left === 1 ? "day to go" : "days to go"}</span>
        </div>
      </div>

      <div class="budget-summary">
        <div>
          <span>Total budget</span>
          <strong>${formatRupees(plan.total_budget)}</strong>
        </div>
        <div>
          <span>Estimated per guest</span>
          <strong>${formatRupees(plan.amount_per_guest)}</strong>
        </div>
      </div>

      <h3>Suggested budget split</h3>
      <ul class="budget-grid">${budgetItems}</ul>
      <p class="budget-note">${escapeHtml(plan.budget_note)}</p>

      <div class="detail-grid">
        <section class="plan-section">
          <h3>Ideas for your celebration</h3>
          <ul>${ideas}</ul>
        </section>
        <section class="plan-section">
          <h3>Vendor categories to explore</h3>
          <p class="section-note">Suggestions only—not verified local listings.</p>
          <ul>${vendors}</ul>
        </section>
      </div>

      <section class="next-steps">
        <h3>Good next steps</h3>
        <ol>${nextSteps}</ol>
      </section>
      <p class="estimate-note">
        ${isLocalPlan ? "Generated in your browser" : "Generated from planning estimates"}
        · Costs vary by city, season, and vendor. Get local quotes before booking.
      </p>
    </article>
  `;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;
  errorMessage.textContent = "";

  const data = {
    type: document.getElementById("type").value,
    theme: document.getElementById("theme").value,
    budget: Number(document.getElementById("budget").value),
    guests: Number(document.getElementById("guests").value),
    location: document.getElementById("loc").value.trim(),
    date: dateInput.value,
  };

  if (!Number.isInteger(data.budget) || data.budget <= 0) {
    errorMessage.textContent =
      "Enter a budget greater than ₹0 in whole rupees.";
  } else if (!Number.isInteger(data.guests) || data.guests <= 0) {
    errorMessage.textContent = "Enter a guest count of at least 1.";
  } else if (!data.date || data.date < localDateString(new Date())) {
    errorMessage.textContent = "Choose today or a future date for your event.";
  } else if (!data.location) {
    errorMessage.textContent = "Enter the city or location for your event.";
  }

  if (errorMessage.textContent) {
    errorMessage.hidden = false;
    return;
  }

  button.disabled = true;
  button.innerHTML =
    '<span class="spinner" aria-hidden="true"></span> Building your plan…';
  output.innerHTML = "";

  try {
    let plan;
    let isLocalPlan = window.location.protocol === "file:";
    if (isLocalPlan) {
      plan = getLocalPlan(data);
    } else {
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (response.status === 404) {
          plan = getLocalPlan(data);
          isLocalPlan = true;
        } else {
          const responseText = await response.text();
          let result;
          try {
            result = responseText.trim() ? JSON.parse(responseText) : null;
          } catch {
            result = null;
          }

          if (!result || typeof result !== "object" || !result.budget) {
            plan = getLocalPlan(data);
            isLocalPlan = true;
          } else if (!response.ok) {
            throw new Error(
              result.error || "The planner could not generate your plan.",
            );
          } else {
            plan = result;
          }
        }
      } catch (error) {
        if (error instanceof TypeError) {
          plan = getLocalPlan(data);
          isLocalPlan = true;
        } else {
          throw error;
        }
      }
    }

    renderPlan(plan, isLocalPlan);
  } catch (error) {
    errorMessage.textContent =
      error.message ||
      "Something went wrong while creating your plan. Please try again.";
    errorMessage.hidden = false;
  } finally {
    button.disabled = false;
    button.innerHTML =
      '<span class="button-icon" aria-hidden="true">✦</span> Generate another plan';
  }
});
