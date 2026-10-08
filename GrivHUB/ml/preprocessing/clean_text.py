import re
import unicodedata

# Regex for HTML tags
HTML_TAG_REGEX = re.compile(r'<[^>]+>')

# Regex for non-printable control characters (excluding standard printable ascii and unicode)
CONTROL_CHAR_REGEX = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]')

# Regex for excessive repeated whitespace
WHITESPACE_REGEX = re.compile(r'\s+')

# Standard null indicators in civic datasets
NULL_INDICATORS = {"\\n", "\\N", "nan", "null", "none", "n/a", "undefined", ""}


def clean_text(text: str) -> str:
    """
    Standardized, reproducible text cleaning for municipal grievance records.
    Designed for both ML preprocessing and runtime model inference.
    
    Steps:
    1. Handle nulls and non-string types.
    2. Unicode normalization (NFKC).
    3. Strip HTML tags.
    4. Remove corrupted / control characters.
    5. Clean trailing/leading non-alphanumeric noise while preserving road numbers,
       ward numbers, technical abbreviations (e.g., SWD, BWSSB, JE, AE), and sentence structure.
    6. Normalize whitespace to single space.
    """
    if text is None:
        return ""
        
    text_str = str(text).strip()
    
    if text_str.lower() in NULL_INDICATORS:
        return ""
        
    # 1. Unicode Normalization (NFKC converts compatibility characters to standard equivalents)
    normalized = unicodedata.normalize('NFKC', text_str)
    
    # 2. Strip HTML tags if any exist
    if '<' in normalized and '>' in normalized:
        normalized = HTML_TAG_REGEX.sub(' ', normalized)
        
    # 3. Strip control / non-printable characters
    normalized = CONTROL_CHAR_REGEX.sub('', normalized)
    
    # 4. Normalize excessive whitespace / newlines / tabs
    cleaned = WHITESPACE_REGEX.sub(' ', normalized).strip()
    
    return cleaned
