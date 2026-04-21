import sys
import subprocess

try:
    import requests
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'requests'])
    import requests

BASE_URL = "http://localhost:8000/api"

def run_tests():
    print("Testing Auth Signup...")
    signup_res = requests.post(f"{BASE_URL}/auth/signup", json={
        "email": "testuserx@example.com",
        "name": "Test User",
        "password": "password123"
    })
    print("Signup Status:", signup_res.status_code, signup_res.text)

    print("\nTesting Auth Login...")
    login_res = requests.post(f"{BASE_URL}/auth/login", data={
        "username": "testuserx@example.com",
        "password": "password123"
    })
    print("Login Status:", login_res.status_code, login_res.text)
    
    if login_res.status_code != 200:
        print("Login failed, aborting further tests.")
        return
        
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\nTesting Create Subject...")
    subj_res = requests.post(f"{BASE_URL}/attendance/subjects", json={
        "name": "Machine Learning",
        "target_percentage": 75.0
    }, headers=headers)
    print("Create Subject Status:", subj_res.status_code, subj_res.text)
    
    if subj_res.status_code != 200:
        subj_id = requests.get(f"{BASE_URL}/attendance/subjects", headers=headers).json()[0]["id"]
    else:
        subj_id = subj_res.json()["id"]
    
    print("\nTesting Mark Attendance...")
    mark_res = requests.post(f"{BASE_URL}/attendance/mark?subject_id={subj_id}", json={
        "date": "2026-04-06",
        "status": "present"
    }, headers=headers)
    print("Mark Status:", mark_res.status_code, mark_res.text)
    
    print("\nTesting Predictions...")
    pred_res = requests.get(f"{BASE_URL}/predict/{subj_id}?upcoming_leaves=0", headers=headers)
    print("Prediction Status:", pred_res.status_code, pred_res.text)

if __name__ == "__main__":
    run_tests()
