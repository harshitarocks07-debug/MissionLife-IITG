
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

import models
from database import Base, engine, get_db


# Initialize database tables
Base.metadata.create_all(bind=engine)


# Initialize FastAPI
app = FastAPI(
    title="MissionLiFE Impact API",
    description="API for tracking sustainability, energy usage, and green challenges.",
    version="1.0.0",
)


# CORS configuration for React + Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class FootprintRequest(BaseModel):
    monthly_electricity_kwh: float = Field(
        ..., ge=0, description="Monthly electricity consumption in kWh"
    )


class EnergyReadingRequest(BaseModel):
    month: str = Field(
        ..., min_length=7, max_length=7, description="Month in YYYY-MM format"
    )
    electricity_kwh: float = Field(
        ..., ge=0, description="Monthly electricity consumption in kWh"
    )


# --------------------------------------------------
# GREEN CHALLENGES CATALOG
# --------------------------------------------------

GREEN_CHALLENGES = [
    {
        "id": "switch-off-lights",
        "title": "Switch off unused lights",
        "points": 20,
    },
    {
        "id": "use-natural-daylight",
        "title": "Use natural daylight",
        "points": 25,
    },
    {
        "id": "reduce-single-use-plastic",
        "title": "Reduce single-use plastic",
        "points": 30,
    },
]


# --------------------------------------------------
# BASIC ENDPOINTS
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "MissionLiFE Impact API is running",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }


# --------------------------------------------------
# CARBON FOOTPRINT CALCULATOR
# --------------------------------------------------

@app.post("/api/footprint/calculate")
def calculate_footprint(request: FootprintRequest):
    electricity_kwh = request.monthly_electricity_kwh

    # Illustrative electricity emission factor.
    # Replace with an appropriate official factor before production use.
    emission_factor = 0.7

    emissions_kg = electricity_kwh * emission_factor

    recommendations = []

    if electricity_kwh > 200:
        recommendations.append(
            "Consider reducing air-conditioner usage and "
            "switching to energy-efficient appliances."
        )

    if electricity_kwh > 100:
        recommendations.append(
            "Switch off unused electrical appliances and lights."
        )

    if electricity_kwh <= 100:
        recommendations.append(
            "Your electricity consumption is relatively low. "
            "Continue conserving energy."
        )

    return {
        "monthly_electricity_kwh": electricity_kwh,
        "emission_factor_kg_per_kwh": emission_factor,
        "carbon_footprint_kg": round(emissions_kg, 2),
        "recommendations": recommendations,
    }


# --------------------------------------------------
# SAVE OR UPDATE MONTHLY ENERGY READING
# --------------------------------------------------

@app.post("/api/energy/readings")
def save_energy_reading(
    request: EnergyReadingRequest,
    db: Session = Depends(get_db),
):
    try:
        datetime.strptime(request.month, "%Y-%m")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid month format. Use YYYY-MM.",
        )

    existing_reading = (
        db.query(models.EnergyReading)
        .filter(models.EnergyReading.month == request.month)
        .first()
    )

    if existing_reading:
        existing_reading.electricity_kwh = request.electricity_kwh
        reading = existing_reading
        message = "Energy reading updated successfully"
    else:
        reading = models.EnergyReading(
            month=request.month,
            electricity_kwh=request.electricity_kwh,
        )
        db.add(reading)
        message = "Energy reading saved successfully"

    db.commit()
    db.refresh(reading)

    return {
        "message": message,
        "id": reading.id,
        "month": reading.month,
        "electricity_kwh": reading.electricity_kwh,
        "carbon_footprint_kg": round(
            reading.electricity_kwh * 0.7, 2
        ),
    }


# --------------------------------------------------
# GET ALL ENERGY READINGS
# --------------------------------------------------

@app.get("/api/energy/readings")
def get_energy_readings(db: Session = Depends(get_db)):
    readings = (
        db.query(models.EnergyReading)
        .order_by(desc(models.EnergyReading.month))
        .all()
    )

    return {
        "readings": [
            {
                "id": reading.id,
                "month": reading.month,
                "electricity_kwh": reading.electricity_kwh,
                "carbon_footprint_kg": round(
                    reading.electricity_kwh * 0.7, 2
                ),
                "created_at": reading.created_at.isoformat()
                if reading.created_at
                else None,
            }
            for reading in readings
        ],
        "count": len(readings),
    }


# --------------------------------------------------
# ENERGY TRACKER SUMMARY
# --------------------------------------------------

@app.get("/api/energy/summary")
def get_energy_summary(db: Session = Depends(get_db)):
    readings = (
        db.query(models.EnergyReading)
        .order_by(models.EnergyReading.month.asc())
        .all()
    )

    if not readings:
        return {
            "total_readings": 0,
            "latest_month": None,
            "latest_electricity_kwh": 0,
            "latest_carbon_footprint_kg": 0,
            "footprint_reduction_percent": None,
        }

    first_reading = readings[0]
    latest_reading = readings[-1]

    first_emissions = first_reading.electricity_kwh * 0.7
    latest_emissions = latest_reading.electricity_kwh * 0.7

    if len(readings) < 2:
        reduction_percent = None
    elif first_emissions > 0:
        reduction_percent = round(
            (
                (first_emissions - latest_emissions)
                / first_emissions
            )
            * 100,
            2,
        )
    else:
        reduction_percent = None

    return {
        "total_readings": len(readings),
        "first_month": first_reading.month,
        "first_electricity_kwh": first_reading.electricity_kwh,
        "latest_month": latest_reading.month,
        "latest_electricity_kwh": latest_reading.electricity_kwh,
        "latest_carbon_footprint_kg": round(
            latest_emissions, 2
        ),
        "footprint_reduction_percent": reduction_percent,
    }


# --------------------------------------------------
# GREEN CHALLENGES: GET STATUS AND POINTS
# --------------------------------------------------

@app.get("/api/challenges")
def get_challenges(db: Session = Depends(get_db)):
    completed_records = (
        db.query(models.ChallengeCompletion).all()
    )

    completed_ids = {
        record.challenge_id for record in completed_records
    }

    challenges = [
        {
            **challenge,
            "completed": challenge["id"] in completed_ids,
        }
        for challenge in GREEN_CHALLENGES
    ]

    completed_count = sum(
        1 for challenge in challenges if challenge["completed"]
    )

    total_points = sum(
        challenge["points"]
        for challenge in challenges
        if challenge["completed"]
    )

    return {
        "challenges": challenges,
        "completed_count": completed_count,
        "total_points": total_points,
    }


# --------------------------------------------------
# GREEN CHALLENGES: MARK AS COMPLETED
# --------------------------------------------------

@app.post("/api/challenges/{challenge_id}/complete")
def complete_challenge(
    challenge_id: str,
    db: Session = Depends(get_db),
):
    challenge = next(
        (
            item
            for item in GREEN_CHALLENGES
            if item["id"] == challenge_id
        ),
        None,
    )

    if challenge is None:
        raise HTTPException(
            status_code=404,
            detail="Challenge not found",
        )

    existing = (
        db.query(models.ChallengeCompletion)
        .filter(
            models.ChallengeCompletion.challenge_id == challenge_id
        )
        .first()
    )

    if existing:
        return {
            "message": "Challenge already completed",
            "completed": True,
            "points": existing.points,
        }

    record = models.ChallengeCompletion(
        challenge_id=challenge["id"],
        title=challenge["title"],
        points=challenge["points"],
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Challenge completed successfully",
        "completed": True,
        "points": record.points,
    }


# --------------------------------------------------
# GREEN CHALLENGES: MARK AS INCOMPLETE
# --------------------------------------------------

@app.delete("/api/challenges/{challenge_id}/complete")
def uncomplete_challenge(
    challenge_id: str,
    db: Session = Depends(get_db),
):
    challenge = next(
        (
            item
            for item in GREEN_CHALLENGES
            if item["id"] == challenge_id
        ),
        None,
    )

    if challenge is None:
        raise HTTPException(
            status_code=404,
            detail="Challenge not found",
        )

    record = (
        db.query(models.ChallengeCompletion)
        .filter(
            models.ChallengeCompletion.challenge_id == challenge_id
        )
        .first()
    )

    if record is None:
        return {
            "message": "Challenge is not completed",
            "completed": False,
            "points_removed": 0,
        }

    points_removed = record.points

    db.delete(record)
    db.commit()

    return {
        "message": "Challenge marked as incomplete",
        "completed": False,
        "points_removed": points_removed,
    }
