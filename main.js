const electron = require('electron');
const ejse = require('ejs-electron')
const app = electron.app;

const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');
const fse = require('fs-extra');

let config = require('./config.json');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let unityVersions;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 600,
    height: 300,
    'min-width': 500,
    'min-height': 200,
    'accept-first-mouse': true,
    'title-bar-style': 'hidden'
  });
  getUnityVersions().then((versions) => {
    unityVersions = versions;
    ejse.data('versions', unityVersions);
    mainWindow.loadURL('file://' + __dirname + '/index.ejs');
  });
  

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
//   if (process.platform !== 'darwin') {
    app.quit()
//   }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


function getUnityVersions() {
  return new Promise((resolve, reject) => {
    let unityVersion = new Object();
    let unityFolders = fse.readdirSync(config.unitypath);
    let promises = [];
  
    for (let i = 0; i < unityFolders.length; i++) {
      if (process.platform == 'darwin') {
        promises.push(
          readVersionOSX(path.join(config.unitypath, unityFolders[i], 'Unity.app')).then(({version, path}) => {
            unityVersion[version] = path;
          }).catch((err) => {
            if (err !== 'File does not exist') {
              console.log(err);
            }
          })
        );
      } 
    }
    Promise.all(promises).then(() => {
      resolve(unityVersion);
    })
  })
}

function readVersionOSX(path) {
  return new Promise((resolve, reject) => {
    const exec = require('child_process').exec;
    if (fse.existsSync(path)) {
      let child = exec('mdls "' + path + '"', (err, stdout, stderr) => {
        if (!err) {
          let version = processResult(stdout);
          resolve({version, path});
        } else {
          reject(err);
        }
      });
    } else {
      reject('File does not exist');
    }
  }) 
}

function readVersionWin(path) {
  
}


function processResult(stdout) {  
  let lines = stdout.toString().split('\n');
  let results = new Array();
  for (let i = 0; i < lines.length; i++) {
    let parts = lines[i].split('=');
    if (parts[0].includes('kMDItemVersion')) {
      let version = parts[1].replace(' "Unity version ', '')
      version = version.replace('"', '');
      return version;
    }
  }
};

function loadUnity(id) {
  const exec = require('child_process').exec;
  if (fse.existsSync(unityVersions[id])) {
    let child = exec('open "' + unityVersions[id] + '"', (err, stdout, stderr) => {
      if (!err) {
        let version = processResult(stdout);
        
      } else {
        console.log(err);
      }
    });
  } else {
    console.log("oh no");
  }
}

exports.loadUnity = loadUnity;