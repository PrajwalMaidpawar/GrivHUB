import json
import urllib.request
import ssl
from collections import Counter

def check_text_fields():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    url = "https://data.opencity.in/api/action/datastore_search?resource_id=1342a93b-9a61-4766-9c34-c8357b7926c2&limit=50&offset=500"
    req = urllib.request.Request(url, headers={"User-Agent": "GrievanceHUB-DataAcquisition/1.0"})
    
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        records = data['result']['records']
        print("Sample OpenCity Records with full details:")
        for r in records[:5]:
            print(json.dumps(r, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    check_text_fields()
