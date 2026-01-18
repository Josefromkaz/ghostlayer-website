import sys
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization

def generate_license(license_type, expiration_date, user_id):
    """
    Generates a signed license key.
    Format: TYPE-DATE-USERID-SIGNATURE
    """
    # 1. Prepare data payload
    payload = f"{license_type}-{expiration_date}-{user_id}"
    
    # 2. Load Private Key
    try:
        with open("tools/private_key.pem", "rb") as key_file:
            private_key = serialization.load_pem_private_key(
                key_file.read(),
                password=None
            )
    except FileNotFoundError:
        print("Error: tools/private_key.pem not found. Run generate_keypair.py first.")
        return

    # 3. Sign the payload
    signature = private_key.sign(
        payload.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256()
    )

    # 4. Encode signature
    signature_b64 = base64.urlsafe_b64encode(signature).decode('utf-8')

    # 5. Combine
    # Use '.' as separator because signature (Base64UrlSafe) can contain '-'
    full_license = f"{payload}.{signature_b64}"
    
    print("\n--- GENERATED LICENSE ---")
    print(full_license)
    print("-------------------------\\n")
    return full_license

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python generate_license.py <TYPE> <YYYYMMDD> <USER_ID>")
        print("Example: python tools/generate_license.py PRO 20251231 USER123")
    else:
        generate_license(sys.argv[1], sys.argv[2], sys.argv[3])
