import urllib.request, urllib.parse, urllib.error, json

checks = [
    ("Frontend", "http://127.0.0.1:5175/"),
    ("Backend health", "http://127.0.0.1:8001/api/health"),
]

for name, url in checks:
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            status = r.getcode()
            body = r.read(1024).decode(errors='replace')
            print(f"{name}: {status}")
            print(body[:200].replace('\n',' '))
    except urllib.error.HTTPError as e:
        print(f"{name}: HTTP {e.code}")
        try:
            print(e.read().decode())
        except:
            pass
    except Exception as exc:
        print(f"{name}: ERROR {type(exc).__name__} {exc}")

# Also try login to ensure API auth works
login_url = 'http://127.0.0.1:8001/api/auth/login'
data = urllib.parse.urlencode({'username':'anil.kumar@ddma.kerala.gov.in','password':'admin123'}).encode()
req = urllib.request.Request(login_url, data=data, headers={'Content-Type':'application/x-www-form-urlencoded'})
try:
    with urllib.request.urlopen(req, timeout=5) as r:
        print('Login: ', r.getcode())
        print(r.read().decode()[:300].replace('\n',' '))
except urllib.error.HTTPError as e:
    print('Login: HTTP', e.code)
    try:
        print(e.read().decode())
    except:
        pass
except Exception as exc:
    print('Login: ERROR', type(exc).__name__, exc)
