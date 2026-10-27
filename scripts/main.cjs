const { app, BrowserWindow } = require('electron');
app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    autoHideMenuBar: true
  });
  win.loadURL('https://purple-creator--kamilowiczbrawn.replit.app/');
});
