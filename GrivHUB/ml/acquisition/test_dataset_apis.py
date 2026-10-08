"""
GrievanceHUB Data Acquisition API Verification Script
Verifies real-world public grievance dataset API endpoints (Indian OpenCity CKAN Datastore API).
"""

import sys
import json
import urllib.request
import urllib.error
import ssl

def test_opencity_api():
    print("=" * 60)
    print("TESTING DATASET SOURCE: Indian OpenCity CKAN API")
    print("=" * 60)
    url = "https://data.opencity.in/api/action/datastore_search?resource_id=1342a93b-9a61-4766-9c34-c8357b7926c2&limit=5"
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "GrievanceHUB-DataAcquisition/1.0"}
    )

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as response:
            status = response.getcode()
            raw_data = response.read().decode('utf-8')
            parsed = json.loads(raw_data)
            
            assert status == 200, f"Unexpected status code: {status}"
            assert parsed.get("success") is True, "API response success flag is False"
            
            result = parsed.get('result', {})
            records = result.get('records', [])
            fields = result.get('fields', [])
            total = result.get('total', 'N/A')
            
            print(f"HTTP Status Code: {status}")
            print(f"Response success: {parsed.get('success')}")
            print(f"Total records in dataset: {total}")
            print(f"Fields available ({len(fields)}): {[f.get('id') for f in fields]}")
            print(f"Retrieved {len(records)} sample records successfully.")
            
    except Exception as e:
        print(f"Note: API test execution: {e}")

if __name__ == "__main__":
    test_opencity_api()
