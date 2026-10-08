"""
GrievanceHUB Analytics Serializers & Parameter Validators
Validates date range inputs, grouping arguments, export formats, and report types.
"""

import re
import datetime
from typing import Dict, Any, Optional, Tuple

class AnalyticsRequestValidator:
    """
    Validates incoming query parameters and filters for analytics requests.
    """

    @staticmethod
    def validate_date(date_str: Optional[str]) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validates date string format (YYYY-MM-DD or ISO 8601).
        Returns: (is_valid, normalized_date_str, error_message)
        """
        if not date_str:
            return True, None, None

        clean_str = date_str.strip()
        if not clean_str:
            return True, None, None

        # Check YYYY-MM-DD
        if re.match(r"^\d{4}-\d{2}-\d{2}$", clean_str):
            try:
                datetime.datetime.strptime(clean_str, "%Y-%m-%d")
                return True, clean_str, None
            except ValueError:
                return False, None, f"Invalid calendar date '{clean_str}'."

        # Check ISO format
        try:
            parsed = datetime.datetime.fromisoformat(clean_str.replace("Z", "+00:00"))
            return True, parsed.strftime("%Y-%m-%d"), None
        except Exception:
            return False, None, f"Invalid date format '{clean_str}'. Expected YYYY-MM-DD or ISO 8601."

    @staticmethod
    def validate_date_range(
        start_date: Optional[str],
        end_date: Optional[str]
    ) -> Tuple[bool, Optional[str], Optional[str], Optional[str]]:
        """
        Validates both start and end dates and ensures start_date <= end_date.
        """
        valid_s, norm_s, err_s = AnalyticsRequestValidator.validate_date(start_date)
        if not valid_s:
            return False, None, None, f"Invalid start_date: {err_s}"

        valid_e, norm_e, err_e = AnalyticsRequestValidator.validate_date(end_date)
        if not valid_e:
            return False, None, None, f"Invalid end_date: {err_e}"

        if norm_s and norm_e:
            if norm_s > norm_e:
                return False, None, None, f"start_date '{norm_s}' cannot be later than end_date '{norm_e}'."

        return True, norm_s, norm_e, None

    @staticmethod
    def validate_group_by(group_by: Optional[str]) -> str:
        """Normalizes and validates group_by parameter."""
        if not group_by:
            return "day"
        normalized = group_by.strip().lower()
        if normalized in {"day", "week", "month"}:
            return normalized
        return "day"

    @staticmethod
    def validate_export_format(format_str: Optional[str]) -> str:
        """Validates export format."""
        if not format_str:
            return "csv"
        norm = format_str.strip().lower()
        if norm in {"csv", "json"}:
            return norm
        return "csv"
