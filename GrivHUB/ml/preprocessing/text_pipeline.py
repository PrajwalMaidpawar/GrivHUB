"""
GrievanceHUB Unified Text Preprocessing Pipeline
Provides a standardized, reproducible text cleaning pipeline used identically across:
- Training
- Validation
- Testing
- Django Inference
"""

import unicodedata
import re
from typing import Optional, Union, List

# Common civic English stop words (standard minimalist set that avoids stripping civic terms)
MINIMAL_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
    "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves"
}

HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
WHITESPACE_PATTERN = re.compile(r"\s+")
# Tokenizer matching words, hyphens, alphanumeric identifiers (e.g., SWD, 14th, PMC, BBMP)
TOKEN_PATTERN = re.compile(r"(?u)\b\w\w+\b")

def clean_grievance_text(text: Optional[Union[str, float, int]], remove_stopwords: bool = False) -> str:
    """
    Standard text normalization function.
    - Handles null/None safely
    - Normalizes Unicode (NFKC)
    - Strips HTML tags
    - Replaces linebreaks/tabs with spaces
    - Normalizes excessive whitespace
    - Preserves meaningful civic tokens, road/ward numbers, and multilingual Unicode characters
    """
    if text is None:
        return ""
        
    text = str(text)
    if not text.strip():
        return ""
        
    # 1. Normalize Unicode
    text = unicodedata.normalize("NFKC", text)
    
    # 2. Strip HTML
    text = HTML_TAG_PATTERN.sub(" ", text)
    
    # 3. Clean carriage returns & control chars
    text = text.replace("\r", " ").replace("\n", " ").replace("\t", " ")
    
    # 4. Normalize Whitespace
    text = WHITESPACE_PATTERN.sub(" ", text).strip()
    
    if remove_stopwords:
        tokens = text.split()
        filtered = [t for t in tokens if t.lower() not in MINIMAL_STOPWORDS]
        text = " ".join(filtered)
        
    return text

def extract_tokens(text: str, ngram_range: tuple = (1, 1), lowercase: bool = True) -> List[str]:
    """
    Tokenizes normalized text into unigrams and n-grams.
    """
    if lowercase:
        text = text.lower()
        
    words = TOKEN_PATTERN.findall(text)
    min_n, max_n = ngram_range
    
    if max_n == 1:
        return words
        
    ngrams = []
    n_words = len(words)
    for n in range(min_n, max_n + 1):
        if n == 1:
            ngrams.extend(words)
        else:
            for i in range(n_words - n + 1):
                ngrams.append(" ".join(words[i:i + n]))
                
    return ngrams

if __name__ == "__main__":
    sample = "  <p>Sewage overflow near 4th Main Road, Ward-14! Call [PHONE] immediately.  </p>\n"
    print("Cleaned:", clean_grievance_text(sample))
    print("Tokens (1,2):", extract_tokens(clean_grievance_text(sample), ngram_range=(1, 2)))
