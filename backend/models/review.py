import uuid
from sqlalchemy import (
    Column, Integer, Boolean, Text, ForeignKey, DateTime, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), unique=True, nullable=False)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    reviewee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    gig_id = Column(UUID(as_uuid=True), ForeignKey("gigs.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    communication_rating = Column(Integer, nullable=False)
    quality_rating = Column(Integer, nullable=False)
    deadline_rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    seller_reply = Column(Text, nullable=True)
    is_buyer_review = Column(Boolean, nullable=False)  # TRUE = buyer reviewing seller
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    order = relationship("Order", back_populates="review")
    reviewer = relationship("User", back_populates="given_reviews", foreign_keys=[reviewer_id])
    reviewee = relationship("User", back_populates="received_reviews", foreign_keys=[reviewee_id])
    gig = relationship("Gig", back_populates="reviews")
