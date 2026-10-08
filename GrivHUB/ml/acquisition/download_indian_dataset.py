import os
import json
import time
import urllib.request
import urllib.error
import ssl
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

OUTPUT_DIR = "ml/datasets/raw/indian_opencity"
PROGRESS_FILE = "ml/reports/indian_opencity_download_progress.json"
METADATA_FILE = "ml/reports/indian_opencity_metadata.json"
RESOURCE_ID = "1342a93b-9a61-4766-9c34-c8357b7926c2"
BASE_URL = "https://data.opencity.in/api/action/datastore_search"

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

    url = f"{BASE_URL}?resource_id={RESOURCE_ID}&limit={batch_size}&offset={offset}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "GrievanceHUB-DataAcquisition/1.0"}
    )

    for attempt in range(1, max_retries + 1):
        try:
            logging.info(f"Requesting batch at offset {offset} (batch size {batch_size}, attempt {attempt})...")
            with urllib.request.urlopen(req, context=ctx, timeout=45) as response:
                if response.getcode() == 200:
                    raw_data = response.read().decode('utf-8')
                    parsed = json.loads(raw_data)
                    if parsed.get('success'):
                        records = parsed['result'].get('records', [])
                        total = parsed['result'].get('total', 126974)
                        return records, total
                    else:
                        logging.warning(f"API response success=False at offset {offset}")
        except Exception as e:
            logging.error(f"Error on attempt {attempt} for offset {offset}: {e}")
            time.sleep(2 * attempt)
            
    return None, None

def run_download(target_records=10000, batch_size=2000):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs("ml/reports", exist_ok=True)

    progress = get_progress()
    logging.info(f"Starting Indian OpenCity Download. Current progress: {progress}")

    all_downloaded_count = progress['total_downloaded']
    offset = progress['offset']
    total_in_dataset = 126974

    while all_downloaded_count < target_records:
        current_limit = min(batch_size, target_records - all_downloaded_count)
        records, total = download_batch(offset, batch_size=current_limit)
        
        if total:
            total_in_dataset = total
            
        if not records:
            logging.error(f"Failed to fetch batch at offset {offset}. Pausing download.")
            break

        batch_filename = os.path.join(OUTPUT_DIR, f"batch_offset_{offset}_{len(records)}.json")
        with open(batch_filename, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        offset += len(records)
        all_downloaded_count += len(records)
        progress['offset'] = offset
        progress['total_downloaded'] = all_downloaded_count
        progress['batches_completed'] += 1
        progress['is_completed'] = (all_downloaded_count >= target_records) or (offset >= total_in_dataset)

        save_progress(progress)
        logging.info(f"Saved batch: {len(records)} records to {batch_filename}. Total so far: {all_downloaded_count}/{target_records}")

        if len(records) < current_limit or offset >= total_in_dataset:
            logging.info("Reached end of dataset.")
            break

        time.sleep(0.5) # Gentle rate-limit spacing

    # Generate metadata
    metadata = {
        "dataset_name": "Bruhat Bengaluru Mahanagara Palike (BBMP Sahaaya) Civic Grievances",
        "source_organization": "OpenCity.in / CivicDataLab",
        "api_endpoint": BASE_URL,
        "resource_id": RESOURCE_ID,
        "download_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_records_in_resource": total_in_dataset,
        "records_downloaded": all_downloaded_count,
        "download_method": "Incremental Paginated JSON via CKAN datastore_search",
        "batch_size": batch_size,
        "storage_directory": OUTPUT_DIR,
        "fields_acquired": [
            "_id", "Complaint ID", "Category", "Sub Category", "Grievance Date",
            "Ward Name", "Grievance Status", "Staff Remarks", "Staff Name"
        ]
    }

    with open(METADATA_FILE, 'w') as f:
        json.dump(metadata, f, indent=2)
    logging.info(f"Metadata saved to {METADATA_FILE}")

if __name__ == "__main__":
    # Acquire a verified 10,000 real record slice from the Indian OpenCity municipal corpus
    run_download(target_records=10000, batch_size=2000)
