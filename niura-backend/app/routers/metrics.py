from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from .. import models, schemas
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/metrics", tags=["metrics"])

@router.post("/", response_model=schemas.Metric)
async def create_metric(
    metric: schemas.MetricCreate, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save a new EEG metric reading
    """
    # Create new metric
    db_metric = models.Metric(
        user_id=current_user.id,
        stress=metric.stress,
        focus=metric.focus,
        mental_readiness=metric.mental_readiness
    )
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric

@router.get("/", response_model=List[schemas.Metric])
async def get_all_metrics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """
    Get all metrics for the current user with pagination
    """
    return db.query(models.Metric).filter(
        models.Metric.user_id == current_user.id
    ).offset(skip).limit(limit).all()

@router.get("/today", response_model=List[schemas.Metric])
async def get_today_metrics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get today's metrics for the current user
    """
    today = datetime.utcnow().date()
    tomorrow = today + timedelta(days=1)
    
    return db.query(models.Metric).filter(
        models.Metric.user_id == current_user.id,
        models.Metric.timestamp >= today,
        models.Metric.timestamp < tomorrow
    ).order_by(models.Metric.timestamp.asc()).all()

@router.get("/range", response_model=List[schemas.Metric])
async def get_metrics_in_range(
    start_date: datetime,
    end_date: datetime,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get metrics within a date range for the current user
    """
    return db.query(models.Metric).filter(
        models.Metric.user_id == current_user.id,
        models.Metric.timestamp >= start_date,
        models.Metric.timestamp <= end_date
    ).order_by(models.Metric.timestamp.asc()).all()

@router.get("/average", response_model=schemas.MetricBase)
async def get_average_metrics(
    start_date: datetime = None,
    end_date: datetime = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get average metrics within date range (or all time if not specified)
    """
    query = db.query(
        models.Metric.user_id,
        db.func.avg(models.Metric.stress).label("stress"),
        db.func.avg(models.Metric.focus).label("focus"),
        db.func.avg(models.Metric.mental_readiness).label("mental_readiness")
    ).filter(models.Metric.user_id == current_user.id)
    
    if start_date:
        query = query.filter(models.Metric.timestamp >= start_date)
    if end_date:
        query = query.filter(models.Metric.timestamp <= end_date)
    
    result = query.group_by(models.Metric.user_id).first()
    
    if not result:
        return {
            "stress": 0.0,
            "focus": 0.0,
            "mental_readiness": 0.0
        }
    
    return {
        "stress": float(result.stress),
        "focus": float(result.focus),
        "mental_readiness": float(result.mental_readiness)
    } 