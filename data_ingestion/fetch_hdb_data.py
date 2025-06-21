import requests
import pandas as pd

def fetch_resale_data(output_csv: str):
    """
    Fetch resale flat data from data.gov.sg and save to CSV.
    """
    # Example dataset endpoint
    url = 'https://data.gov.sg/api/action/datastore_search'
    resource_id = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc'  # Resale flat dataset

    all_records = []
    limit = 1000
    offset = 0
    while True:
        params = {'resource_id': resource_id, 'limit': limit, 'offset': offset}
        r = requests.get(url, params=params)
        r.raise_for_status()
        result = r.json()['result']
        records = result['records']
        if not records:
            break
        all_records.extend(records)
        offset += limit
    df = pd.DataFrame(all_records)
    df.to_csv(output_csv, index=False)
