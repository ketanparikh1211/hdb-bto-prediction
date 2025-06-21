from sqlalchemy.orm import Session
from database import models, db_connection

def load_dataframe_to_db(df, db: Session):
    # Upsert towns
    town_cache = {}
    for town_name in df['town'].unique():
        town = db.query(models.Town).filter_by(name=town_name).first()
        if not town:
            town = models.Town(name=town_name)
            db.add(town)
            db.flush()
        town_cache[town_name] = town.id

    # Insert transactions
    for _, row in df.iterrows():
        tx = models.ResaleTransaction(
            town_id=town_cache[row['town']],
            flat_type=row['flat_type'],
            flat_model=row['flat_model'],
            floor_area_sqm=row['floor_area_sqm'],
            storey_low=row['storey_low'],
            storey_high=row['storey_high'],
            lease_commence_year=row['lease_commence_year'],
            tx_year=row['tx_year'],
            tx_month=row['tx_month'],
            resale_price=row['resale_price']
        )
        db.add(tx)
    db.commit()

if __name__ == '__main__':
    # Example pipeline
    from data_ingestion.fetch_hdb_data import fetch_resale_data
    from data_ingestion.transform import transform_resale_csv
    import os

    csv_path = 'resale_data.csv'
    fetch_resale_data(csv_path)
    df = transform_resale_csv(csv_path)

    db = db_connection.SessionLocal()
    load_dataframe_to_db(df, db)
    db.close()