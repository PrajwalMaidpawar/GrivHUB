import json
import urllib.request
import ssl
from collections import Counter

def inspect_opencity():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    # Query 200 records from OpenCity to inspect unique categories and sub categories
    url = "https://data.opencity.in/api/action/datastore_search?resource_id=1342a93b-9a61-4766-9c34-c8357b7926c2&limit=200"
    req = urllib.request.Request(url, headers={"User-Agent": "GrievanceHUB-DataAcquisition/1.0"})
    
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        records = data['result']['records']
        total = data['result']['total']
        
        cats = Counter(r.get('Category') for r in records)
        subcats = Counter(f"{r.get('Category')} -> {r.get('Sub Category')}" for r in records)
        wards = Counter(r.get('Ward Name') for r in records)
        statuses = Counter(r.get('Grievance Status') for r in records)
        
        print("--- OPENCITY CATEGORIES (Sample 200) ---")
        for k, v in cats.items():
            print(f"  {k}: {v}")
            
        print("\n--- OPENCITY TOP SUB-CATEGORIES ---")
        for k, v in subcats.most_common(15):
            print(f"  {k}: {v}")

        return {
            "total_records": total,
            "categories": dict(cats),
            "top_subcats": dict(subcats.most_common(20)),
            "statuses": dict(statuses),
            "sample_wards": list(wards.keys())[:10]
        }

def inspect_nyc_311():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    # Query 200 records from NYC 311 SODA API
    url = "https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=200&$select=complaint_type,descriptor,agency,agency_name,status"
    req = urllib.request.Request(url, headers={"User-Agent": "GrievanceHUB-DataAcquisition/1.0"})
    
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        records = json.loads(resp.read().decode('utf-8'))
        
        complaint_types = Counter(r.get('complaint_type') for r in records)
        agencies = Counter(r.get('agency') for r in records)
        
        print("\n--- NYC 311 TOP COMPLAINT TYPES (Sample 200) ---")
        for k, v in complaint_types.most_common(15):
            print(f"  {k}: {v}")
            
        print("\n--- NYC 311 AGENCIES (Sample 200) ---")
        for k, v in agencies.items():
            print(f"  {k}: {v}")
            
        return {
            "complaint_types": dict(complaint_types.most_common(25)),
            "agencies": dict(agencies)
        }

if __name__ == "__main__":
    oc_info = inspect_opencity()
    nyc_info = inspect_nyc_311()
    
    with open("ml/reports/categories_inspection.json", "w") as f:
        json.dump({"opencity": oc_info, "nyc_311": nyc_info}, f, indent=2)
    print("\nSaved detailed category inspection to ml/reports/categories_inspection.json")
