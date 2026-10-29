
const API_BASE_URL = "http://127.0.0.1:8000";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`API error (${response.status}): ${message}`);
  }

  return response.json();
}

// --------------------------------------------------
// CARBON FOOTPRINT CALCULATOR
// --------------------------------------------------

export function calculateFootprint(monthlyElectricityKwh) {
  return apiRequest("/api/footprint/calculate", {
    method: "POST",
    body: JSON.stringify({
      monthly_electricity_kwh: Number(monthlyElectricityKwh),
    }),
  });
}

// --------------------------------------------------
// ENERGY TRACKER
// --------------------------------------------------

export function saveEnergyReading(month, electricityKwh) {
  return apiRequest("/api/energy/readings", {
    method: "POST",
    body: JSON.stringify({
      month,
      electricity_kwh: Number(electricityKwh),
    }),
  });
}

export function getEnergyReadings() {
  return apiRequest("/api/energy/readings");
}

export function getEnergySummary() {
  return apiRequest("/api/energy/summary");
}

// --------------------------------------------------
// GREEN CHALLENGES
// --------------------------------------------------

export function getChallenges() {
  return apiRequest("/api/challenges");
}

export function completeChallenge(challengeId) {
  return apiRequest(
    `/api/challenges/${encodeURIComponent(challengeId)}/complete`,
    {
      method: "POST",
    }
  );
}

export function uncompleteChallenge(challengeId) {
  return apiRequest(
    `/api/challenges/${encodeURIComponent(challengeId)}/complete`,
    {
      method: "DELETE",
    }
  );
}

// --------------------------------------------------
// MONTHLY IMPACT REPORT
// --------------------------------------------------

export function getMonthlyImpactReport() {
  return apiRequest("/api/reports/monthly-impact");
}

// --------------------------------------------------
// RECOMMENDATIONS
// --------------------------------------------------

export function getRecommendations() {
  return apiRequest("/api/recommendations");
}

// --------------------------------------------------
// RECOMMENDATION FEEDBACK
// --------------------------------------------------

export function submitRecommendationFeedback(recommendationId, helpful) {
  return apiRequest(
    `/api/recommendations/${encodeURIComponent(recommendationId)}/feedback`,
    {
      method: "POST",
      body: JSON.stringify({
        helpful: Boolean(helpful),
      }),
    }
  );
}

// --------------------------------------------------
// RECOMMENDATION ACTION TRACKING
// --------------------------------------------------

export function updateRecommendationAction(
  recommendationId,
  actionCompleted
) {
  return apiRequest(
    `/api/recommendations/${encodeURIComponent(recommendationId)}/action`,
    {
      method: "PATCH",
      body: JSON.stringify({
        action_completed: Boolean(actionCompleted),
      }),
    }
  );
}

// --------------------------------------------------
// GET SAVED RECOMMENDATION FEEDBACK
// --------------------------------------------------

export function getRecommendationFeedback() {
  return apiRequest("/api/recommendations/feedback");
}
