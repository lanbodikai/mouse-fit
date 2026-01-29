import os
import sys

import requests


def main() -> int:
    base_url = os.getenv("MOUSEFIT_API_BASE", "https://api.mousefit.pro").rstrip("/")
    origin = os.getenv("MOUSEFIT_ORIGIN", "https://mousefit.pro")
    url = f"{base_url}/api/health"

    resp = requests.get(url, headers={"Origin": origin}, timeout=30)
    print("GET", url)
    print("Origin:", origin)
    print("Status:", resp.status_code)
    print("Access-Control-Allow-Origin:", resp.headers.get("Access-Control-Allow-Origin"))
    print("Access-Control-Allow-Credentials:", resp.headers.get("Access-Control-Allow-Credentials"))
    return 0


if __name__ == "__main__":
    sys.exit(main())

