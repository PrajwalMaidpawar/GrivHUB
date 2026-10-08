import json
import glob
import csv
from collections import Counter

def analyze_and_map_categories():
    # 1. Load Indian OpenCity
    ind_records = []
    for f in sorted(glob.glob("ml/datasets/raw/indian_opencity/batch_*.json")):
        with open(f, 'r', encoding='utf-8') as fp:
            ind_records.extend(json.load(fp))
            
    # 2. Load NYC 311
    nyc_records = []
    for f in sorted(glob.glob("ml/datasets/raw/nyc_311/nyc311_*.json")):
        with open(f, 'r', encoding='utf-8') as fp:
            nyc_records.extend(json.load(fp))
            
    total_ind = len(ind_records)
    total_nyc = len(nyc_records)
    
    # Analyze Indian Categories & Sub-Categories
    # In OpenCity: Category is high-level dept/domain, Sub Category is problem
    ind_combined_counts = Counter()
    ind_cat_counts = Counter()
    for r in ind_records:
        cat = r.get('Category') or 'UNKNOWN'
        sub = r.get('Sub Category') or 'UNKNOWN'
        ind_cat_counts[cat] += 1
        ind_combined_counts[f"{cat} -> {sub}"] += 1
        
    print(f"Total Unique Indian Categories: {len(ind_cat_counts)}")
    print(f"Total Unique Indian Category->SubCategory pairs: {len(ind_combined_counts)}")
    
    # Analyze NYC Categories (complaint_type + descriptor)
    nyc_complaint_type_counts = Counter(r.get('complaint_type', 'UNKNOWN') for r in nyc_records)
    nyc_combined_counts = Counter(f"{r.get('agency', 'UNK')} | {r.get('complaint_type', 'UNK')} -> {r.get('descriptor', 'UNK')}" for r in nyc_records)
    
    print(f"Total Unique NYC Complaint Types: {len(nyc_complaint_type_counts)}")
    print(f"Total Unique NYC Agency|ComplaintType->Descriptor pairs: {len(nyc_combined_counts)}")
    
    # Build complete mapping dictionaries and CSV export
    csv_rows = []
    
    # Map Indian Categories / Sub-categories
    # Rules:
    # 1. Water Supply
    # 2. Roads and Infrastructure
    # 3. Sanitation and Waste Management
    # 4. Drainage and Sewage
    # 5. Street Lighting and Electrical Infrastructure
    # 6. Parks and Environment
    # 7. Transportation and Traffic Infrastructure
    # 8. General Civic Services
    
    indian_mapping = {}
    for cat_sub, count in ind_combined_counts.most_common():
        cat, sub = cat_sub.split(" -> ", 1)
        pct = round((count / total_ind) * 100, 2)
        
        target_cat = None
        status = "AMBIGUOUS"
        reason = ""
        
        c_lower = cat.lower()
        s_lower = sub.lower()
        
        if "electrical" in c_lower:
            if "street light" in s_lower or "light" in s_lower or "lamp" in s_lower or "pole" in s_lower:
                target_cat = "Street Lighting and Electrical Infrastructure"
                status = "DIRECT MATCH"
                reason = "Streetlight failure and electrical utility maintenance"
            elif "wire" in s_lower or "cable" in s_lower:
                target_cat = "Street Lighting and Electrical Infrastructure"
                status = "DIRECT MATCH"
                reason = "Exposed electrical infrastructure / wiring issue"
            else:
                target_cat = "Street Lighting and Electrical Infrastructure"
                status = "POSSIBLE MATCH"
                reason = "General municipal electrical grievance"
                
        elif "solid waste" in c_lower or "sanitation" in c_lower:
            if any(k in s_lower for k in ["garbage", "dump", "vehicle not arrived", "dead animal", "sweeping", "waste", "litter"]):
                target_cat = "Sanitation and Waste Management"
                status = "DIRECT MATCH"
                reason = "Solid waste collection, street sweeping, dumping, or dead animal disposal"
            elif "toilet" in s_lower:
                target_cat = "General Civic Services"
                status = "DIRECT MATCH"
                reason = "Public convenience / toilet facility cleanliness"
            else:
                target_cat = "Sanitation and Waste Management"
                status = "POSSIBLE MATCH"
                reason = "Sanitation & waste related municipal issue"
                
        elif "road maintenance" in c_lower or "road infrastructure" in c_lower:
            if any(k in s_lower for k in ["pothole", "footpath", "asphalting", "road", "pavement", "curb", "median"]):
                target_cat = "Roads and Infrastructure"
                status = "DIRECT MATCH"
                reason = "Road surface degradation, pothole, or footpath defect"
            elif "drain" in s_lower or "gutter" in s_lower:
                target_cat = "Drainage and Sewage"
                status = "DIRECT MATCH"
                reason = "Roadside storm drain / gutter maintenance"
            elif "encroachment" in s_lower:
                target_cat = "Roads and Infrastructure"
                status = "POSSIBLE MATCH"
                reason = "Footpath/road obstruction by encroachment"
            else:
                target_cat = "Roads and Infrastructure"
                status = "POSSIBLE MATCH"
                reason = "Municipal engineering road infrastructure maintenance"
                
        elif "storm  water drain" in c_lower or "storm water drain" in c_lower or "swd" in c_lower:
            target_cat = "Drainage and Sewage"
            status = "DIRECT MATCH"
            reason = "Stormwater drain, desilting, sewer overflow, or culvert issue"
            
        elif "forest" in c_lower or "lakes" in c_lower or "parks and play grounds" in c_lower or "environment" in c_lower:
            if any(k in s_lower for k in ["tree", "branch", "park", "lake", "garden", "playground"]):
                target_cat = "Parks and Environment"
                status = "DIRECT MATCH"
                reason = "Fallen tree removal, branch pruning, park maintenance, or lake preservation"
            else:
                target_cat = "Parks and Environment"
                status = "POSSIBLE MATCH"
                reason = "Urban greenery, lake or park infrastructure"
                
        elif "water supply" in c_lower or "bwssb" in c_lower or "water" in c_lower:
            target_cat = "Water Supply"
            status = "DIRECT MATCH"
            reason = "Drinking water supply, pipeline defect, or water pressure issue"
            
        elif "traffic" in c_lower:
            if any(k in s_lower for k in ["signal", "sign", "speed breaker", "traffic", "junction"]):
                target_cat = "Transportation and Traffic Infrastructure"
                status = "DIRECT MATCH"
                reason = "Traffic control equipment, signal repair, or speed breaker"
            else:
                target_cat = "Transportation and Traffic Infrastructure"
                status = "POSSIBLE MATCH"
                reason = "Traffic management facility"
                
        elif "veterinary" in c_lower:
            if any(k in s_lower for k in ["dog", "animal", "cattle", "bite", "rescue", "vaccination"]):
                target_cat = "General Civic Services"
                status = "DIRECT MATCH"
                reason = "Stray animal control, dog menace, animal welfare"
            else:
                target_cat = "General Civic Services"
                status = "POSSIBLE MATCH"
                reason = "Municipal veterinary service"
                
        elif "health dept" in c_lower:
            target_cat = "General Civic Services"
            status = "POSSIBLE MATCH"
            reason = "Public health, hygiene inspection, food safety"
            
        elif "e khata" in c_lower or "revenue" in c_lower or "town planning" in c_lower or "estate" in c_lower:
            target_cat = "General Civic Services"
            status = "POSSIBLE MATCH"
            reason = "Municipal documentation, property tax/khata records, civic administration"
            
        elif "advertisement" in c_lower:
            target_cat = "General Civic Services"
            status = "POSSIBLE MATCH"
            reason = "Illegal hoarding/flex banner removal"
            
        elif "indira canteen" in c_lower:
            target_cat = "General Civic Services"
            status = "POSSIBLE MATCH"
            reason = "Civic public dining facility"
            
        elif "optical fiber cables" in c_lower or "ofc" in c_lower:
            target_cat = "Roads and Infrastructure"
            status = "POSSIBLE MATCH"
            reason = "Road digging/cable hazard on street"
            
        else:
            target_cat = None
            status = "EXCLUDED"
            reason = "Unclear/unsupported municipal jurisdiction or unspecified category"
            
        indian_mapping[cat_sub] = {
            "source_category": cat,
            "source_subcategory": sub,
            "count": count,
            "percentage": pct,
            "target_category": target_cat,
            "status": status,
            "reason": reason
        }
        
        csv_rows.append([
            "Indian OpenCity (BBMP Sahaaya)",
            cat_sub,
            count,
            pct,
            target_cat if target_cat else "N/A",
            status,
            reason
        ])

    # Map NYC Complaint Types
    nyc_mapping = {}
    for comp_type, count in nyc_complaint_type_counts.most_common():
        pct = round((count / total_nyc) * 100, 2)
        ct_lower = comp_type.lower()
        
        target_cat = None
        status = "AMBIGUOUS"
        reason = ""
        
        if "water" in ct_lower:
            if "hot water" in ct_lower or "heat" in ct_lower:
                target_cat = None
                status = "EXCLUDED"
                reason = "Private residential tenant-landlord heating dispute (HPD)"
            elif any(k in ct_lower for k in ["system", "maintenance", "quality", "leak", "hydrant", "meter"]):
                target_cat = "Water Supply"
                status = "DIRECT MATCH"
                reason = "Public water distribution, pipeline maintenance, water quality"
            else:
                target_cat = "Water Supply"
                status = "POSSIBLE MATCH"
                reason = "Municipal water service request"
                
        elif "street condition" in ct_lower or "sidewalk condition" in ct_lower or "highway condition" in ct_lower or "curb condition" in ct_lower or "bridge condition" in ct_lower:
            target_cat = "Roads and Infrastructure"
            status = "DIRECT MATCH"
            reason = "Potholes, pavement cracking, roadway degradation, sidewalk cave-in"
            
        elif "sanitation condition" in ct_lower or "dirty condition" in ct_lower or "missed collection" in ct_lower or "illegal dumping" in ct_lower or "dead animal" in ct_lower or "overflowing litter" in ct_lower or "sweeping" in ct_lower or "graffiti" in ct_lower:
            target_cat = "Sanitation and Waste Management"
            status = "DIRECT MATCH"
            reason = "Trash accumulation, missed garbage pickup, illegal dumping, street cleanliness"
            
        elif "sewer" in ct_lower or "catch basin" in ct_lower:
            target_cat = "Drainage and Sewage"
            status = "DIRECT MATCH"
            reason = "Clogged storm basin, sewer backup, manhole issue, street flooding"
            
        elif "street light condition" in ct_lower or "street light out" in ct_lower or "electrical" in ct_lower:
            target_cat = "Street Lighting and Electrical Infrastructure"
            status = "DIRECT MATCH"
            reason = "Streetlight failure, dark stretch, exposed electrical wiring"
            
        elif "damaged tree" in ct_lower or "overgrown tree" in ct_lower or "dead tree" in ct_lower or "tree condition" in ct_lower or "new tree request" in ct_lower or "maintenance or facility" in ct_lower:
            target_cat = "Parks and Environment"
            status = "DIRECT MATCH"
            reason = "Fallen tree, dangerous branch, public park or playground maintenance"
            
        elif "traffic signal condition" in ct_lower or "street sign" in ct_lower or "bus stop shelter" in ct_lower or "traffic" in ct_lower:
            target_cat = "Transportation and Traffic Infrastructure"
            status = "DIRECT MATCH"
            reason = "Traffic signal malfunction, damaged signage, transit shelter"
            
        elif "blocked driveway" in ct_lower or "illegal parking" in ct_lower or "derelict vehicle" in ct_lower or "abandoned vehicle" in ct_lower or "derelict vehicles" in ct_lower:
            target_cat = "Transportation and Traffic Infrastructure"
            status = "POSSIBLE MATCH"
            reason = "Vehicular street obstruction / right-of-way blockage"
            
        elif "rodent" in ct_lower or "public toilet" in ct_lower or "animal" in ct_lower or "pest" in ct_lower or "noise - commercial" in ct_lower or "noise - park" in ct_lower:
            target_cat = "General Civic Services"
            status = "POSSIBLE MATCH"
            reason = "Public nuisance, rodent infestation, environmental health inspection"
            
        elif "noise - residential" in ct_lower or "noise - street" in ct_lower or "noise - helicopter" in ct_lower or "noise - vehicle" in ct_lower:
            target_cat = None
            status = "EXCLUDED"
            reason = "Domestic/police disturbance complaint, outside core municipal utility remit"
            
        elif any(k in ct_lower for k in ["paint/plaster", "flooring/stairs", "door/window", "appliance", "plumbing", "elevator", "general construction", "indoor sewage", "unsanitary condition"]):
            target_cat = None
            status = "EXCLUDED"
            reason = "Private residential apartment maintenance / landlord code violation (HPD)"
            
        elif "encampment" in ct_lower or "homeless" in ct_lower:
            target_cat = None
            status = "EXCLUDED"
            reason = "Social service / homeless outreach dispatch (DHS)"
            
        else:
            target_cat = None
            status = "EXCLUDED"
            reason = "Non-municipal or specialized agency remit"
            
        nyc_mapping[comp_type] = {
            "source_complaint_type": comp_type,
            "count": count,
            "percentage": pct,
            "target_category": target_cat,
            "status": status,
            "reason": reason
        }
        
        csv_rows.append([
            "NYC 311 (SODA OpenData)",
            comp_type,
            count,
            pct,
            target_cat if target_cat else "N/A",
            status,
            reason
        ])

    # Write CSV output
    with open("ml/reports/source_category_analysis.csv", "w", newline="", encoding="utf-8") as fp:
        writer = csv.writer(fp)
        writer.writerow(["Source Dataset", "Source Category", "Record Count", "Percentage (%)", "Proposed GrievanceHUB Category", "Mapping Status", "Reason / Description"])
        writer.writerows(csv_rows)
        
    print(f"Saved {len(csv_rows)} category analysis records to ml/reports/source_category_analysis.csv")

    # Write JSON mapping files
    with open("ml/mappings/indian_category_mapping.json", "w", encoding="utf-8") as fp:
        json.dump(indian_mapping, fp, indent=2, ensure_ascii=False)
        
    with open("ml/mappings/nyc_category_mapping.json", "w", encoding="utf-8") as fp:
        json.dump(nyc_mapping, fp, indent=2, ensure_ascii=False)
        
    print("Saved ml/mappings/indian_category_mapping.json and ml/mappings/nyc_category_mapping.json")

if __name__ == "__main__":
    analyze_and_map_categories()
