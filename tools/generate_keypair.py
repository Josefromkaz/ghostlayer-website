from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

def generate_key_pair():
    print("Generating RSA 2048-bit key pair...")
    
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    # Save Private Key (Keep this SECRET!)
    with open("tools/private_key.pem", "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ))
    print("Saved: tools/private_key.pem")

    # Save Public Key (This goes into the app)
    public_key = private_key.public_key()
    with open("tools/public_key.pem", "wb") as f:
        f.write(public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ))
    print("Saved: tools/public_key.pem")

if __name__ == "__main__":
    generate_key_pair()
