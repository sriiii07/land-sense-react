import urllib.request, urllib.parse, urllib.error

url = 'http://127.0.0.1:8001/api/auth/login'
data = urllib.parse.urlencode({'username':'anil.kumar@ddma.kerala.gov.in','password':'admin123'}).encode()
req = urllib.request.Request(url, data=data, headers={'Content-Type':'application/x-www-form-urlencoded'})
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print('STATUS', resp.status)
        print(resp.read().decode())
except urllib.error.HTTPError as err:
    print('STATUS', err.code)
    try:
        print(err.read().decode())
    except Exception:
        pass
except Exception as exc:
    print('EXC', type(exc).__name__, exc)
