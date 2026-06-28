from pyngrok import ngrok
import subprocess
import time

# REPLACE THIS with your actual token from ngrok dashboard
AUTH_TOKEN = "3Fki7ncpuebBT19w7D5uX2Isg2v_5Dm9hUdnpwec8UzBcAUDG"  # 👈 Put YOUR actual token here

# Set the authtoken
ngrok.set_auth_token(AUTH_TOKEN)

# Start Flask app (assuming it's running on port 5000)
subprocess.Popen(["python", "app.py"])
time.sleep(3)  # Wait for Flask to start

# Create ngrok tunnel
public_url = ngrok.connect(5000)
print(f"🌐 Public URL: {public_url}")
print("Share this link with your family and friends!")
print("Press Ctrl+C to stop")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Shutting down...")
    ngrok.disconnect(public_url)
    ngrok.kill()