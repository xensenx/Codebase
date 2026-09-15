import base64
import getpass
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# ==========================================
# CONFIGURATION
# ==========================================
# Paste the output from encryptor.py here:
ENCRYPTED_PAYLOAD = b""
SALT = b""

# Set your hint and output filename here:
HINT = "My hint goes here."
OUTPUT_FILENAME = "unlocked_data.json"

def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=600000,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))

def main():
    print("--- 🔒 SECURE JSON VAULT ---")
    wants_hint = input("Do you want a hint? (y/n): ").strip().lower()
    
    if wants_hint == 'y':
        print(f"\n💡 Hint: {HINT}\n")
        
    password = getpass.getpass("Enter password to decrypt: ")
    
    try:
        key = derive_key(password, SALT)
        f = Fernet(key)
        
        # Attempt to decrypt the payload
        decrypted_data = f.decrypt(ENCRYPTED_PAYLOAD)
        
        # If successful, write the output file in binary mode
        with open(OUTPUT_FILENAME, 'wb') as out_file:
            out_file.write(decrypted_data)
            
        print(f"\n🟢 ACCESS GRANTED. Your JSON file has been extracted to: {OUTPUT_FILENAME}")
        
    except InvalidToken:
        print("\n🔴 ACCESS DENIED. Incorrect password or corrupted payload.")
    except Exception as e:
        print(f"\n⚠️ An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()