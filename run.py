from app import app

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
    from pyngrok import ngrok
public_url = ngrok.connect(5000)
print(f"Public URL: {public_url}")