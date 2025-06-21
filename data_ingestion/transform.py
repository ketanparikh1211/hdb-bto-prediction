import pandas as pd

def transform_resale_csv(input_csv: str) -> pd.DataFrame:
    """
    Read a raw resale CSV and transform into the cleaned format:
    - Renames columns
    - Parses sale month/year
    - Splits storey_range
    - Selects only required fields
    """
    df = pd.read_csv(input_csv)

    # Rename relevant columns
    df = df.rename(columns={
        'month': 'month',  # format YYYY-MM
        'town': 'town',
        'flat_type': 'flat_type',
        'flat_model': 'flat_model',
        'floor_area_sqm': 'floor_area_sqm',
        'storey_range': 'storey_range',
        'lease_commence_date': 'lease_commence_year',
        'resale_price': 'resale_price'
    })

    # Parse sale month and year from the 'month' column (format 'YYYY-MM')
    month_split = df['month'].str.split('-', expand=True)
    df['tx_year'] = month_split.iloc[:, 0].astype(int)
    df['tx_month'] = month_split.iloc[:, 1].astype(int)

    # Split storey_range into numeric low/high
    df['storey_range'] = df['storey_range'].str.replace(' TO ', '-', regex=False)
    storey_split = df['storey_range'].str.split('-', expand=True)
    df['storey_low'] = storey_split.iloc[:, 0].astype(int)
    df['storey_high'] = storey_split.iloc[:, 1].astype(int)

    # Select and order the final columns
    df = df[
        ['town', 'flat_type', 'flat_model', 'floor_area_sqm',
         'storey_low', 'storey_high', 'lease_commence_year',
         'tx_year', 'tx_month', 'resale_price']
    ]

    return df