# StreamVault FINAL - Private Video & Picture Archive

Only for: doomhel6@gmail.com and doomhel8@gmail.com

## Features
- Login (private - only your 2 accounts)
- Videos section: download any quality + original thumbnail
- Pictures section: paste image URL and save
- Play videos / View pictures in browser
- Save (download) to phone or PC
- Delete anytime
- Neon glow design
- Data hidden from public

## Install (Windows PowerShell)

```powershell
# 1. Extract ZIP to Desktop then:
cd C:\Users\doomh\Desktop\streamvault-real

# 2. Install yt-dlp
pip install -U yt-dlp

# 3. Install packages
npm install

# 4. Start
npm start
```

Open: http://localhost:3000

Login:
- Email: doomhel6@gmail.com  or  doomhel8@gmail.com
- Password: 00966504236461

## Make public (optional)
While running, open new PowerShell:
```powershell
cloudflared tunnel --url http://localhost:3000
```
Use the trycloudflare.com link from any browser/phone.
