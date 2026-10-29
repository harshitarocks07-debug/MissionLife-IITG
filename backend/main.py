from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

import models
from database import Base, engine, get_db


# --------------------------------------------------
# DATABASE INITIALIZATION
# --------------------------------------------------

Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="MissionLiFE Impact API",
    description=(
        "API for tracking sustainability, energy usage, "
        "green challenges, personalized recommendations, "
        "and environmental impact."
    ),
    version="1.1.0",
)


# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# CONSTANTS
# --------------------------------------------------

EMISSION_FACTOR = 0.7  # Illustrative kg CO2 per kWh


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class FootprintRequest(BaseModel):
    monthly_electricity_kwh: float = Field(
        ...,
        ge=0,
        description="Monthly electricity consumption in kWh",
    )


class EnergyReadingRequest(BaseModel):
    month: str = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Month in YYYY-MM format",
    )

    electricity_kwh: float = Field(
        ...,
        ge=0,
        description="Monthly electricity consumption in kWh",
    )


class RecommendationFeedbackRequest(BaseModel):
    helpful: bool


class ActionTrackingRequest(BaseModel):
    action_completed: bool


# --------------------------------------------------
# GREEN CHALLENGES
# These are gamified activities, not personalized insights.
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

    emissions_kg = electricity_kwh * EMISSION_FACTOR

    return {
        "monthly_electricity_kwh": electricity_kwh,
        "emission_factor_kg_per_kwh": EMISSION_FACTOR,
        "estimated_monthly_emissions_kg_co2": round(
            emissions_kg, 2
        ),
        "carbon_footprint_kg": round(emissions_kg, 2),
        "recommendations": [],
        "note": (
            "Personalized recommendations are generated separately "
            "using saved monthly energy readings."
        ),
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
        .filter(
            models.EnergyReading.month == request.month
        )
        .first()
    )

    if existing_reading:
        existing_reading.electricity_kwh = (
            request.electricity_kwh
        )
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
            reading.electricity_kwh * EMISSION_FACTOR,
            2,
        ),
    }


# --------------------------------------------------
# GET ALL ENERGY READINGS
# --------------------------------------------------

@app.get("/api/energy/readings")
def get_energy_readings(
    db: Session = Depends(get_db),
):
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
                    reading.electricity_kwh * EMISSION_FACTOR,
                    2,
                ),
                "created_at": (
                    reading.created_at.isoformat()
                    if reading.created_at
                    else None
                ),
            }
            for reading in readings
        ],
        "count": len(readings),
    }


# --------------------------------------------------
# ENERGY TRACKER SUMMARY
# --------------------------------------------------

@app.get("/api/energy/summary")
def get_energy_summary(
    db: Session = Depends(get_db),
):
    readings = (
        db.query(models.EnergyReading)
        .order_by(models.EnergyReading.month.asc())
        .all()
    )

    if not readings:
        return {
            "total_readings": 0,
            "first_month": None,
            "first_electricity_kwh": None,
            "latest_month": None,
            "latest_electricity_kwh": 0,
            "latest_carbon_footprint_kg": 0,
            "footprint_reduction_percent": None,
        }

    first_reading = readings[0]
    latest_reading = readings[-1]

    first_emissions = (
        first_reading.electricity_kwh * EMISSION_FACTOR
    )
    latest_emissions = (
        latest_reading.electricity_kwh * EMISSION_FACTOR
    )

    if len(readings) < 2 or first_emissions <= 0:
        reduction_percent = None
    else:
        reduction_percent = round(
            (
                (first_emissions - latest_emissions)
                / first_emissions
            ) * 100,
            2,
        )

    return {
        "total_readings": len(readings),
        "first_month": first_reading.month,
        "first_electricity_kwh": (
            first_reading.electricity_kwh
        ),
        "latest_month": latest_reading.month,
        "latest_electricity_kwh": (
            latest_reading.electricity_kwh
        ),
        "latest_carbon_footprint_kg": round(
            latest_emissions, 2
        ),
        "footprint_reduction_percent": reduction_percent,
    }


# --------------------------------------------------
# GREEN CHALLENGES: GET STATUS AND POINTS
# --------------------------------------------------

@app.get("/api/challenges")
def get_challenges(
    db: Session = Depends(get_db),
):
    completed_records = (
        db.query(models.ChallengeCompletion).all()
    )

    completed_ids = {
        record.challenge_id
        for record in completed_records
    }

    challenges = [
        {
            **challenge,
            "completed": challenge["id"] in completed_ids,
        }
        for challenge in GREEN_CHALLENGES
    ]

    completed_count = sum(
        1
        for challenge in challenges
        if challenge["completed"]
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
            models.ChallengeCompletion.challenge_id
            == challenge_id
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
            models.ChallengeCompletion.challenge_id
            == challenge_id
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


# --------------------------------------------------
# PERSONALIZED RECOMMENDATION ENGINE
#
# Unlike Green Challenges, these recommendations are
# generated from the user's saved energy history.
# --------------------------------------------------

@app.get("/api/recommendations")
def get_personalized_recommendations(
    db: Session = Depends(get_db),
):
    readings = (
        db.query(models.EnergyReading)
        .order_by(models.EnergyReading.month.asc())
        .all()
    )

    recommendations = []

    # CASE 1: There are no readings yet.
    if not readings:
        recommendations.append({
            "id": "start-energy-tracking",
            "title": "Build your energy baseline",
            "description": (
                "Save your monthly electricity consumption to "
                "establish a baseline and unlock personalized "
                "energy analysis."
            ),
            "reason": (
                "There are no saved readings from which to "
                "calculate an energy trend."
            ),
            "category": "Data collection",
            "priority": "high",
            "current_value_kwh": None,
            "target_value_kwh": None,
        })

        return {
            "recommendations": recommendations,
            "data_points": 0,
            "source": "energy_readings",
        }

    latest = readings[-1]
    latest_kwh = float(latest.electricity_kwh)
    latest_emissions = latest_kwh * EMISSION_FACTOR

    # CASE 2: Compare the latest two saved months.
    if len(readings) >= 2:
        previous = readings[-2]
        previous_kwh = float(previous.electricity_kwh)

        if previous_kwh > 0:
            change_pct = (
                (latest_kwh - previous_kwh)
                / previous_kwh
            ) * 100

            # Electricity use increased by at least 10%.
            if change_pct >= 10:
                recommendations.append({
                    "id": "investigate-energy-increase",
                    "title": "Investigate rising electricity use",
                    "description": (
                        f"Your usage increased from "
                        f"{previous_kwh:g} kWh in {previous.month} "
                        f"to {latest_kwh:g} kWh in {latest.month} "
                        f"({change_pct:.1f}%). Review your energy "
                        "history and check whether appliance usage, "
                        "air-conditioning, or operating hours changed."
                    ),
                    "reason": (
                        "The latest reading is at least 10% "
                        "higher than the previous saved reading."
                    ),
                    "category": "Energy trend",
                    "priority": (
                        "high" if change_pct >= 25 else "medium"
                    ),
                    "current_value_kwh": round(latest_kwh, 2),
                    "previous_value_kwh": round(
                        previous_kwh, 2
                    ),
                    "change_percent": round(change_pct, 2),
                    "target_value_kwh": round(
                        previous_kwh, 2
                    ),
                })

            # Electricity use decreased by at least 10%.
            elif change_pct <= -10:
                recommendations.append({
                    "id": "maintain-energy-progress",
                    "title": "Maintain your energy reduction",
                    "description": (
                        f"Your usage decreased from "
                        f"{previous_kwh:g} kWh in {previous.month} "
                        f"to {latest_kwh:g} kWh in {latest.month} "
                        f"({abs(change_pct):.1f}% lower). Continue "
                        "the practices that may have contributed "
                        "to this reduction."
                    ),
                    "reason": (
                        "The latest reading is at least 10% "
                        "lower than the previous saved reading."
                    ),
                    "category": "Energy trend",
                    "priority": "low",
                    "current_value_kwh": round(latest_kwh, 2),
                    "previous_value_kwh": round(
                        previous_kwh, 2
                    ),
                    "change_percent": round(change_pct, 2),
                    "target_value_kwh": round(
                        previous_kwh, 2
                    ),
                })

            else:
                recommendations.append({
                    "id": "monitor-energy-stability",
                    "title": "Monitor your energy baseline",
                    "description": (
                        f"Your latest reading is {latest_kwh:g} "
                        f"kWh, compared with {previous_kwh:g} kWh "
                        f"previously. The change is {change_pct:+.1f}%. "
                        "Continue recording monthly usage to identify "
                        "longer-term patterns."
                    ),
                    "reason": (
                        "The difference between the two latest "
                        "readings is less than 10%."
                    ),
                    "category": "Energy trend",
                    "priority": "low",
                    "current_value_kwh": round(latest_kwh, 2),
                    "previous_value_kwh": round(
                        previous_kwh, 2
                    ),
                    "change_percent": round(change_pct, 2),
                    "target_value_kwh": None,
                })

    # CASE 3: Generate a measurable target from the latest reading.
    target_kwh = round(latest_kwh * 0.90, 2)
    potential_savings_kwh = round(
        latest_kwh - target_kwh, 2
    )
    potential_savings_co2 = round(
        potential_savings_kwh * EMISSION_FACTOR, 2
    )

    recommendations.append({
        "id": "monthly-energy-target",
        "title": "Set a measurable monthly energy target",
        "description": (
            f"Your latest reading is {latest_kwh:g} kWh for "
            f"{latest.month}. Consider aiming for approximately "
            f"{target_kwh:g} kWh next month, a 10% reduction. "
            f"If achieved, that would reduce estimated emissions "
            f"by about {potential_savings_co2:g} kg CO2."
        ),
        "reason": (
            f"The latest reading corresponds to approximately "
            f"{latest_emissions:.1f} kg CO2 using the dashboard's "
            "illustrative emission factor."
        ),
        "category": "Monthly target",
        "priority": "medium",
        "current_value_kwh": round(latest_kwh, 2),
        "target_value_kwh": target_kwh,
        "potential_savings_kwh": potential_savings_kwh,
        "potential_savings_kg_co2": potential_savings_co2,
    })

    # CASE 4: Flag high consumption for further investigation.
    # 200 kWh is a dashboard heuristic, not a universal standard.
    if latest_kwh > 200:
        recommendations.append({
            "id": "review-high-consumption",
            "title": "Review high-consumption appliances",
            "description": (
                f"Your latest recorded usage is {latest_kwh:g} "
                f"kWh for {latest.month}. Review high-load devices "
                "such as air-conditioning, water heating, and "
                "other appliances to identify feasible savings."
            ),
            "reason": (
                "The dashboard uses 200 kWh/month as an "
                "illustrative prompt threshold, not a universal "
                "benchmark for every household."
            ),
            "category": "Consumption review",
            "priority": "medium",
            "current_value_kwh": round(latest_kwh, 2),
            "target_value_kwh": target_kwh,
        })

    return {
        "recommendations": recommendations,
        "data_points": len(readings),
        "latest_month": latest.month,
        "latest_electricity_kwh": round(latest_kwh, 2),
        "latest_emissions_kg_co2": round(
            latest_emissions, 2
        ),
        "source": "energy_readings",
    }


# --------------------------------------------------
# SAVE RECOMMENDATION FEEDBACK
# --------------------------------------------------

@app.post(
    "/api/recommendations/{recommendation_id}/feedback"
)
def save_recommendation_feedback(
    recommendation_id: str,
    request: RecommendationFeedbackRequest,
    db: Session = Depends(get_db),
):
    if not recommendation_id.strip():
        raise HTTPException(
            status_code=400,
            detail="Recommendation ID cannot be empty",
        )

    feedback = (
        db.query(models.RecommendationFeedback)
        .filter(
            models.RecommendationFeedback.recommendation_id
            == recommendation_id
        )
        .order_by(
            desc(models.RecommendationFeedback.created_at)
        )
        .first()
    )

    if feedback:
        feedback.helpful = request.helpful
    else:
        feedback = models.RecommendationFeedback(
            recommendation_id=recommendation_id,
            helpful=request.helpful,
            action_completed=False,
        )
        db.add(feedback)

    db.commit()
    db.refresh(feedback)

    return {
        "message": "Recommendation feedback saved",
        "recommendation_id": feedback.recommendation_id,
        "helpful": feedback.helpful,
        "action_completed": feedback.action_completed,
    }


# --------------------------------------------------
# UPDATE RECOMMENDATION ACTION STATUS
# --------------------------------------------------

@app.patch(
    "/api/recommendations/{recommendation_id}/action"
)
def update_recommendation_action(
    recommendation_id: str,
    request: ActionTrackingRequest,
    db: Session = Depends(get_db),
):
    if not recommendation_id.strip():
        raise HTTPException(
            status_code=400,
            detail="Recommendation ID cannot be empty",
        )

    feedback = (
        db.query(models.RecommendationFeedback)
        .filter(
            models.RecommendationFeedback.recommendation_id
            == recommendation_id
        )
        .order_by(
            desc(models.RecommendationFeedback.created_at)
        )
        .first()
    )

    if feedback is None:
        feedback = models.RecommendationFeedback(
            recommendation_id=recommendation_id,
            helpful=None,
            action_completed=request.action_completed,
        )
        db.add(feedback)
    else:
        feedback.action_completed = request.action_completed

    db.commit()
    db.refresh(feedback)

    return {
        "message": "Action tracking updated",
        "recommendation_id": feedback.recommendation_id,
        "action_completed": feedback.action_completed,
    }


# --------------------------------------------------
# GET SAVED RECOMMENDATION FEEDBACK
# --------------------------------------------------

@app.get("/api/recommendations/feedback")
def get_recommendation_feedback(
    db: Session = Depends(get_db),
):
    records = (
        db.query(models.RecommendationFeedback)
        .order_by(
            desc(models.RecommendationFeedback.created_at)
        )
        .all()
    )

    return {
        "feedback": [
            {
                "id": record.id,
                "recommendation_id": record.recommendation_id,
                "helpful": record.helpful,
                "action_completed": record.action_completed,
                "created_at": (
                    record.created_at.isoformat()
                    if record.created_at
                    else None
                ),
                "updated_at": (
                    record.updated_at.isoformat()
                    if record.updated_at
                    else None
                ),
            }
            for record in records
        ],
        "count": len(records),
    }


# --------------------------------------------------
# MONTHLY IMPACT REPORT
# --------------------------------------------------

@app.get("/api/reports/monthly-impact")
def get_monthly_impact_report(
    db: Session = Depends(get_db),
):
    readings = (
        db.query(models.EnergyReading)
        .order_by(models.EnergyReading.month.asc())
        .all()
    )

    if not readings:
        return {
            "message": (
                "No energy readings available yet. Save monthly "
                "readings to generate an impact report."
            ),
            "reading_count": 0,
            "total_electricity_kwh": 0,
            "total_estimated_emissions_kg_co2": 0,
            "monthly_readings": [],
        }

    monthly_readings = [
        {
            "month": reading.month,
            "electricity_kwh": round(
                float(reading.electricity_kwh), 2
            ),
            "estimated_emissions_kg_co2": round(
                float(reading.electricity_kwh)
                * EMISSION_FACTOR,
                2,
            ),
        }
        for reading in readings
    ]

    first = monthly_readings[0]
    latest = monthly_readings[-1]

    change_percent = None

    if (
        first["electricity_kwh"] > 0
        and len(monthly_readings) > 1
    ):
        change_percent = round(
            (
                latest["electricity_kwh"]
                - first["electricity_kwh"]
            )
            / first["electricity_kwh"]
            * 100,
            2,
        )

    return {
        "message": (
            "Monthly impact report generated from saved energy readings."
        ),
        "reading_count": len(monthly_readings),
        "first_month": first["month"],
        "latest_month": latest["month"],
        "total_electricity_kwh": round(
            sum(
                item["electricity_kwh"]
                for item in monthly_readings
            ),
            2,
        ),
        "total_estimated_emissions_kg_co2": round(
            sum(
                item["estimated_emissions_kg_co2"]
                for item in monthly_readings
            ),
            2,
        ),
        "change_from_first_to_latest_percent": change_percent,
        "monthly_readings": monthly_readings,
    }