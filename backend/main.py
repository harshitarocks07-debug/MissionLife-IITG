
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="MissionLiFE-Impact API",
    description="Sustainability and energy conservation platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FootprintRequest(BaseModel):
    monthly_electricity_kwh: float = Field(gt=0, le=100000)


@app.get("/")
def root():
    return {
        "message": "MissionLiFE-Impact API is running",
        "status": "success",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/api/footprint/calculate")
def calculate_footprint(data: FootprintRequest):
    # Illustrative factor only. Replace with an appropriate,
    # documented electricity emissions factor for the target region.
    emission_factor = 0.7

    emissions = data.monthly_electricity_kwh * emission_factor

    recommendations = []

    if data.monthly_electricity_kwh >= 200:
        recommendations.append(
            "Review air-conditioning settings and high-consumption appliances."
        )

    recommendations.append(
        "Switch off unused lights and appliances."
    )
    recommendations.append(
        "Choose energy-efficient appliances when replacing old equipment."
    )

    return {
        "monthly_electricity_kwh": data.monthly_electricity_kwh,
        "estimated_monthly_emissions_kg_co2": round(emissions, 2),
        "emission_factor_kg_co2_per_kwh": emission_factor,
        "recommendations": recommendations,
        "note": "Illustrative estimate, not an official emissions assessment.",
    }
