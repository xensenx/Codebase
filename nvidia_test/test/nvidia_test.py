import requests

# 1. Replace with your actual NVIDIA NIM API key
API_KEY = "NVIDIA_NIM _API_key"

# NVIDIA's OpenAI-compatible base URL for the API catalog
URL = "https://integrate.api.nvidia.com/v1/models"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

def list_nvidia_models():
    try:
        print("Fetching available models from NVIDIA NIM...\n")
        response = requests.get(URL, headers=headers)
        response.raise_for_status()  # Check for HTTP errors
        
        data = response.json()
        models = data.get("data", [])
        
        # Print a formatted table header
        print(f"{'Model ID':<50} | {'Owned By'}")
        print("-" * 65)
        
        # Loop through and print each model
        for model in models:
            model_id = model.get("id", "Unknown")
            owned_by = model.get("owned_by", "Unknown")
            print(f"{model_id:<50} | {owned_by}")
            
        print(f"\nTotal models found: {len(models)}")
        
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch models: {e}")

if __name__ == "__main__":
    list_nvidia_models()
