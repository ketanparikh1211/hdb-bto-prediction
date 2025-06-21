from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Town(Base):
    __tablename__ = 'towns'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    transactions = relationship('ResaleTransaction', back_populates='town')

class ResaleTransaction(Base):
    __tablename__ = 'resale_transactions'
    id = Column(Integer, primary_key=True, index=True)
    town_id = Column(Integer, ForeignKey('towns.id'))
    flat_type = Column(String, index=True)
    flat_model = Column(String)
    floor_area_sqm = Column(Float)
    storey_low = Column(Integer)
    storey_high = Column(Integer)
    lease_commence_year = Column(Integer)
    tx_year = Column(Integer)
    tx_month = Column(Integer)
    resale_price = Column(Integer)

    town = relationship('Town', back_populates='transactions')