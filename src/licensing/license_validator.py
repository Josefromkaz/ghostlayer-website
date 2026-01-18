import base64
import logging
import re
from datetime import datetime
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from src.licensing.keys import PUBLIC_KEY_PEM

logger = logging.getLogger(__name__)

class LicenseValidator:
    @staticmethod
    def validate(license_key: str) -> dict:
        """
        Validates the license key format, signature, and expiration.
        Returns a dict with status and details.
        
        Return format:
        {
            "valid": bool,
            "type": str (FREE/PRO/TRIAL),
            "expiration": str (YYYYMMDD),
            "user_id": str,
            "reason": str (optional error message)
        }
        """
        if not license_key:
            return {"valid": False, "reason": "Empty key"}

        # 1. Split Signature (Rightmost part)
        # We use '.' as separator because signature (Base64UrlSafe) can contain '-'
        try:
            payload, signature_b64 = license_key.strip().rsplit('.', 1)
        except ValueError:
             return {"valid": False, "reason": "Invalid format (no signature separator)"}

        # 2. Verify Signature
        try:
            public_key = serialization.load_pem_public_key(PUBLIC_KEY_PEM)
            signature = base64.urlsafe_b64decode(signature_b64)
            
            public_key.verify(
                signature,
                payload.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
        except Exception as e:
            logger.warning(f"License signature verification failed: {e}")
            return {"valid": False, "reason": "Invalid signature"}

        # 3. Parse Payload (Type-Date-User)
        # Regex to find Date (YYYYMMDD) in the middle
        # Matches: Group 1 (Type), Group 2 (Date), Group 3 (User)
        match = re.match(r"^(.*)-(\d{8})-(.*)$", payload)
        if not match:
             return {"valid": False, "reason": "Invalid payload format"}
        
        license_type = match.group(1)
        expiration_date = match.group(2)
        user_id = match.group(3)

        # 4. Verify Expiration
        try:
            exp_date = datetime.strptime(expiration_date, "%Y%m%d")
            # Set time to end of day to be generous
            exp_date = exp_date.replace(hour=23, minute=59, second=59)
            
            if exp_date < datetime.now():
                return {
                    "valid": False, 
                    "reason": "Expired", 
                    "type": license_type, 
                    "expiration": expiration_date
                }
        except ValueError:
             return {"valid": False, "reason": "Invalid date format"}

        return {
            "valid": True,
            "type": license_type,
            "expiration": expiration_date,
            "user_id": user_id
        }
