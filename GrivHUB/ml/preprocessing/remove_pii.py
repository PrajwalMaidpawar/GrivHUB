import re
from typing import Tuple, Dict

# PII Regex Patterns
# 1. Email pattern
EMAIL_REGEX = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    re.IGNORECASE
)

# 2. Indian 10-digit mobile / Phone numbers (with optional +91, 0, or formatted with hyphens/spaces)
# and US standard 10-digit phone formats (e.g., (123) 456-7890, 123-456-7890, 123 456 7890)
PHONE_PATTERNS = [
    # Indian +91 or standard 10-digit starting with 6-9
    re.compile(r'(?:\+91[\-\s]?)?[6-9]\d{9}\b'),
    # Standard formatted phone: (xxx) xxx-xxxx or xxx-xxx-xxxx
    re.compile(r'\b(?:\+1[\-\s]?)?\(?\d{3}\)?[\-\s]\d{3}[\-\s]\d{4}\b'),
    # General 10-digit standalone phone when preceded by keywords like mob, phone, call, tel, contact
    re.compile(r'(?:phone|mob|mobile|contact|tel|call)[\s:]*(\d{10})\b', re.IGNORECASE)
]

# 3. Aadhaar number pattern: 12 digits (4-4-4 or continuous 12 digits preceded by aadhaar/uidai keyword)
AADHAAR_PATTERNS = [
    re.compile(r'\b[2-9]\d{3}\s\d{4}\s\d{4}\b'), # Standard 4 4 4 spaced format
    re.compile(r'(?:aadhaar|uidai|aadhar)[\s:]*(\d{12})\b', re.IGNORECASE)
]

# 4. Indian PAN card format (5 uppercase letters, 4 digits, 1 uppercase letter)
PAN_REGEX = re.compile(r'\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b')


def scrub_pii(text: str) -> Tuple[str, Dict[str, int]]:
    """
    Detects and scrubs Personally Identifiable Information (PII) from input text.
    Replaces detected entities with standard tokens: [EMAIL], [PHONE], [AADHAAR], [GOVT_ID].
    
    Returns:
        scrubbed_text (str): Cleaned string with tokens.
        stats (dict): Counts of detected and scrubbed PII entities.
    """
    if not text or not isinstance(text, str):
        return "", {"email_count": 0, "phone_count": 0, "aadhaar_count": 0, "pan_count": 0, "total_pii": 0}
        
    stats = {
        "email_count": 0,
        "phone_count": 0,
        "aadhaar_count": 0,
        "pan_count": 0,
        "total_pii": 0
    }
    
    scrubbed = text
    
    # 1. Scrub Email
    email_matches = EMAIL_REGEX.findall(scrubbed)
    if email_matches:
        stats["email_count"] += len(email_matches)
        scrubbed = EMAIL_REGEX.sub("[EMAIL]", scrubbed)
        
    # 2. Scrub Aadhaar
    for pattern in AADHAAR_PATTERNS:
        matches = pattern.findall(scrubbed)
        if matches:
            stats["aadhaar_count"] += len(matches)
            scrubbed = pattern.sub("[AADHAAR]", scrubbed)
            
    # 3. Scrub PAN / Govt ID
    pan_matches = PAN_REGEX.findall(scrubbed)
    if pan_matches:
        stats["pan_count"] += len(pan_matches)
        scrubbed = PAN_REGEX.sub("[GOVT_ID]", scrubbed)
        
    # 4. Scrub Phone Numbers
    for pattern in PHONE_PATTERNS:
        matches = pattern.findall(scrubbed)
        if matches:
            stats["phone_count"] += len(matches)
            scrubbed = pattern.sub("[PHONE]", scrubbed)
            
    stats["total_pii"] = (
        stats["email_count"] + 
        stats["phone_count"] + 
        stats["aadhaar_count"] + 
        stats["pan_count"]
    )
    
    return scrubbed, stats
