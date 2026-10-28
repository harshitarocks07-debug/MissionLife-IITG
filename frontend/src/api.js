
const API_BASE_URL = "http://127.0.0.1:8000";

export async function calculateFootprint(monthlyElectricityKwh) {
  const response = await fetch(
    `${API_BASE_URL}/api/footprint/calculate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        monthly_electricity_kwh: Number(monthlyElectricityKwh),
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Calculation failed: ${error}`);
  }

  return response.json();
}
