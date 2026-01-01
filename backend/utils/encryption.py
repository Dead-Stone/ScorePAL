"""
Encryption utilities for ScorePAL
Handles secure storage of API keys and sensitive data
"""

import os
import base64
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

class EncryptionManager:
    """Manages encryption and decryption of sensitive data"""
    
    def __init__(self, master_key: str = None):
        """Initialize encryption manager with master key"""
        if master_key is None:
            master_key = os.environ.get('SCOREPAL_ENCRYPTION_KEY', 'default-key-change-in-production')
        
        # Generate a key from the master key
        self.master_key = master_key.encode()
        self._fernet = self._create_fernet()
    
    def _create_fernet(self) -> Fernet:
        """Create Fernet instance from master key"""
        # Use a fixed salt for deterministic key generation
        # In production, consider using a random salt stored securely
        salt = b'scorepal_salt_12345'  # 16 bytes
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key))
        return Fernet(key)
    
    def encrypt(self, data: str) -> str:
        """Encrypt a string and return base64 encoded result"""
        try:
            encrypted_data = self._fernet.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt base64 encoded data and return original string"""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self._fernet.decrypt(encrypted_bytes)
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise
    
    def is_encrypted(self, data: str) -> bool:
        """Check if data appears to be encrypted"""
        try:
            # Try to decode as base64 and decrypt
            decoded_data = base64.urlsafe_b64decode(data.encode())
            self._fernet.decrypt(decoded_data)
            return True
        except:
            return False

# Global encryption manager instance
encryption_manager = EncryptionManager()

# Convenience functions for API key encryption
def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key for storage"""
    return encryption_manager.encrypt(api_key)

def decrypt_api_key(encrypted_api_key: str) -> str:
    """Decrypt an API key for use"""
    return encryption_manager.decrypt(encrypted_api_key)

def mask_api_key(api_key: str, show_chars: int = 4) -> str:
    """Mask an API key for display purposes"""
    if not api_key or len(api_key) <= show_chars * 2:
        return "*" * len(api_key) if api_key else ""
    
    return f"{api_key[:show_chars]}{'*' * (len(api_key) - show_chars * 2)}{api_key[-show_chars:]}" 