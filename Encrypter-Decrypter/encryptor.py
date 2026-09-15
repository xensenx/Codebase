import os
import base64
import getpass
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# --- SET YOUR JSON FILE PATH HERE ---
JSON_FILE_PATH = ""

def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=600000,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))

def main():
    if not os.path.exists(JSON_FILE_PATH):
        print(f"Error: File '{JSON_FILE_PATH}' not found.")
        return

    # Read the JSON file in binary mode
    with open(JSON_FILE_PATH, 'rb') as f:
        file_data = f.read()

    password = getpass.getpass("Enter a strong password to lock this JSON file: ")
    
    salt = os.urandom(16)
    key = derive_key(password, salt)
    
    f_obj = Fernet(key)
    encrypted_data = f_obj.encrypt(file_data)
    
    print("\n✅ Encryption Successful! Copy the following lines into your decryptor script:\n")
    print(f"ENCRYPTED_PAYLOAD = {encrypted_data}")
    print(f"SALT = {salt}")

if __name__ == "__main__":
    main()