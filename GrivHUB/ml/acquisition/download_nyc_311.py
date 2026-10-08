import os
import json
import time
import urllib.request
import urllib.parse
import urllib.error
import ssl
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

OUTPUT_DIR = "ml/datasets/raw/nyc_311"
PROGRESS_FILE = "ml/reports/nyc_311_download_progress.json"
METADATA_FILE = "ml/reports/nyc_311_metadata.json"
BASE_URL = "https://data.cityofnewyork.us/resource/erm2-nwe9.json"

# Key municipal agencies covering water, roads, sanitation, sewer, lights, parks, traffic
TARGET_AGENCIES = ["DEP", "DSNY", "DOT", "DPR"]
SELECTED_COLUMNS = [
    "unique_key", "created_date", "agency", "agency_name",
    "complaint_type", "descriptor", "location_type",
    "incident_zip", "incident_address", "street_name",
    "city", "borough", "status", "resolution_description",
    "latitude", "longitude"
]

def get_progress():
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {"offset": 0, "total_downloaded": 0, "batches_completed": 0, "is_completed": False}

def save_progress(progress):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)

def download_batch(offset, batch_size=2000, max_retries=3):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    # SoQL Filter: Agencies IN ('DEP', 'DSNY', 'DOT', 'DPR')
    where_clause = "agency in('DEP','DSNY','DOT','DPR')"
    select_clause = ",".join(SELECTED_COLUMNS)
    
    params = {
        "$select": select_clause,
        "$where": where_clause,
        "$limit": batch_size,
        "$offset": offset,
        "$order": "created_date DESC"
    }
    
    url = f"{BASE_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "GrievanceHUB-DataAcquisition/1.0"}
    )

    for attempt in range(1, max_retries + 1):
        try:
            logging.info(f"Requesting NYC 311 batch at offset {offset} (batch size {batch_size}, attempt {attempt})...")
            with urllib.request.urlopen(req, context=ctx, timeout=45) as response:
                if response.getcode() == 200:
                    raw_data = response.read().decode('utf-8')
                    records = json.loads(raw_data)
                    return records
        except Exception as e:
            logging.error(f"Error on attempt {attempt} for NYC 311 offset {offset}: {e}")
            time.sleep(2 * attempt)
            
    return None

def run_download(target_records=10000, batch_size=2000):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs("ml/reports", exist_ok=True)

    progress = get_progress()
    logging.info(f"Starting NYC 311 Filtered Download. Current progress: {progress}")

    all_downloaded_count = progress['total_downloaded']
    offset = progress['offset']

    while all_downloaded_count < target_records:
        current_limit = min(batch_size, target_records - all_downloaded_count)
        records = download_batch(offset, batch_size=current_limit)
        
        if records is None:
            logging.error(f"Failed to fetch NYC 311 batch at offset {offset}. Pausing download.")
            break

        batch_filename = os.path.join(OUTPUT_DIR, f"nyc311_offset_{offset}_{len(records)}.json")
        with open(batch_filename, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        offset += len(records)
        all_downloaded_count += len(records)
        progress['offset'] = offset
        progress['total_downloaded'] = all_downloaded_count
        progress['batches_completed'] += 1
        progress['is_completed'] = (all_downloaded_count >= target_records)

        save_progress(progress)
        logging.info(f"Saved NYC 311 batch: {len(records)} records to {batch_filename}. Total so far: {all_downloaded_count}/{target_records}")

        if len(records) < current_limit:
            logging.info("Reached end of available records.")
            break

        time.sleep(0.5)

    metadata = {
        "dataset_name": "NYC 311 Service Requests (Targeted Municipal Agencies)",
        "source_organization": "NYC OpenData / City of New York",
        "api_endpoint": BASE_URL,
        "download_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "records_downloaded": all_downloaded_count,
        "download_method": "Incremental Paginated JSON via SODA API SoQL",
        "batch_size": batch_size,
        "selected_agencies": TARGET_AGENCIES,
        "storage_directory": OUTPUT_DIR,
        "fields_acquired": SELECTED_COLUMNS
    }

    with open(METADATA_FILE, 'w') as f:
        json.dump(metadata, f, indent=2)
    logging.info(f"Metadata saved to {METADATA_FILE}")

if __name__ == "__main__":
    run_download(target_records=10000, batch_size=2000)
