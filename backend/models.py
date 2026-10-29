from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
)

from database import Base


# --------------------------------------------------
# ENERGY READINGS
# --------------------------------------------------

class EnergyReading(Base):
    __tablename__ = "energy_readings"

    id = Column(Integer, primary_key=True, index=True)

    month = Column(
        String,
        nullable=False,
        unique=True,
        index=True,
    )

    electricity_kwh = Column(
        Float,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )


# --------------------------------------------------
# GREEN CHALLENGE COMPLETIONS
# --------------------------------------------------

class ChallengeCompletion(Base):
    __tablename__ = "challenge_completions"

    id = Column(Integer, primary_key=True, index=True)

    challenge_id = Column(
        String,
        nullable=False,
        unique=True,
        index=True,
    )

    title = Column(
        String,
        nullable=False,
    )

    points = Column(
        Integer,
        nullable=False,
        default=0,
    )

    completed_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )


# --------------------------------------------------
# RECOMMENDATION FEEDBACK AND ACTION TRACKING
# --------------------------------------------------

class RecommendationFeedback(Base):
    __tablename__ = "recommendation_feedback"

    id = Column(Integer, primary_key=True, index=True)

    recommendation_id = Column(
        String,
        nullable=False,
        index=True,
    )

    helpful = Column(
        Boolean,
        nullable=True,
    )

    action_completed = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )