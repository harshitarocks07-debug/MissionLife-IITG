
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Integer,
    String,
    UniqueConstraint,
)

from database import Base


class EnergyReading(Base):
    __tablename__ = "energy_readings"

    id = Column(Integer, primary_key=True, index=True)

    # Format: YYYY-MM, for example 2026-10.
    month = Column(String(7), nullable=False, unique=True, index=True)

    electricity_kwh = Column(Float, nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )


class ChallengeCompletion(Base):
    __tablename__ = "challenge_completions"

    id = Column(Integer, primary_key=True, index=True)

    # Use a stable identifier, such as "switch-off-lights".
    challenge_id = Column(String(100), nullable=False, unique=True)

    title = Column(String(200), nullable=False)

    points = Column(Integer, nullable=False, default=0)

    completed_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
