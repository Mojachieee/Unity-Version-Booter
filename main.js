const electron = require('electron');
const ejse = require('ejs-electron')
const app = electron.app;

const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');
const fse = require('fs-extra');

let config = require('./config.json');

const targetString = {
  AndroidPlayer: 'Android',
  iOSSupport: 'iOS',
  WebGLSupport: 'WebGl',
  WindowsStandaloneSupport: 'Windows',
  MacStandaloneSupport: 'OSX',
  LinuxStandaloneSupport: 'Linux',
}

const targetMap = {
  Android: 'android',
  iOS: 'ios',
  WebGL: 'web',
  Windows: 'win64',
  OSX: 'osx',
  Linux: 'linux64',
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let unityVersions = [];
let projects;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 600,
    'min-width': 500,
    'min-height': 200,
    'accept-first-mouse': true,
    'title-bar-style': 'hidden'
  });
  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  if (!config || !config.unitypath || !config.projectspath) {
    // projects = getProjects();
    // ejse.data('data', {projects, config});
    mainWindow.loadURL('file://' + __dirname + '/initial.ejs');
    // console.log(mainWindow.webContents)
  } else {
    getUnityVersions().then((versions) => {
      unityVersions = versions;
      navigateProjects();
    }).catch(() => {
      console.log('Could not get unity versions')
      navigateProjects();
    });
  }
  

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

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


function getProjects() {
  let projects = new Array();
  if (fse.existsSync(config.projectspath)) {
    let projectFolders = fse.readdirSync(config.projectspath);
    
      for (let i = 0; i < projectFolders.length; i++) {
        if (fse.existsSync(path.join(config.projectspath, projectFolders[i], '/ProjectSettings/ProjectVersion.txt'))) {
          let version = fse.readFileSync(path.join(config.projectspath, projectFolders[i], '/ProjectSettings/ProjectVersion.txt')).toString();
          version = version.replace('m_EditorVersion: ', '');
          version = version.replace('\n', '');
          projects[projects.length] = {
            name: projectFolders[i],
            path: path.join(config.projectspath, projectFolders[i]),
            version: version
          }
        }
      }
  }
  return projects;
}

function getUnityVersions() {
  return new Promise((resolve, reject) => {
    if (fse.existsSync(config.unitypath)) {
      let unityVersion = new Object();
      let unityFolders = fse.readdirSync(config.unitypath);
      let promises = [];
    
      for (let i = 0; i < unityFolders.length; i++) {
        if (process.platform == 'darwin' && unityFolders[i] != ".DS_Store") {
          promises.push(
            readVersionOSX(path.join(config.unitypath, unityFolders[i], 'Unity.app')).then(({version, filepath}) => {
              unityVersion[version] = {
                file: filepath,
                targets: getPlaybackEngines(path.join(config.unitypath, unityFolders[i], "PlaybackEngines"))
              };
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
    } else {
      reject();
    }
  })
}

function readVersionOSX(filepath) {
  return new Promise((resolve, reject) => {
    const exec = require('child_process').exec;
    if (fse.existsSync(filepath)) {
      let child = exec('mdls "' + filepath + '"', (err, stdout, stderr) => {
        if (!err) {
          let version = processResult(stdout);
          resolve({version, filepath});
        } else {
          reject(err);
        }
      });
    } else {
      reject('File does not exist');
    }
  }) 
}

function getPlaybackEngines(filepath) {
  let playbackEngines = new Array();
  if (fse.existsSync(filepath)) {
    playbackEngines = fse.readdirSync(filepath);
  }
  let osTarget;
  if (process.platform == 'darwin') {
    osTarget = 'MacStandaloneSupport';
  } else if (process.platform == 'win32') {
    osTarget = 'WindowsStandaloneSupport';
  } else if (process.platform == 'linux') {
    osTarget = 'LinuxStandaloneSupport';
  }
  playbackEngines.push(osTarget);
  for (let i = 0; i < playbackEngines.length; i++) {
    playbackEngines[i] = targetString[playbackEngines[i]];
  }
  return playbackEngines;
}

function readVersionWin(filepath) {
  
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


function sortVersion(a, b) { 
  let aSplit = a.split('.');
  let bSplit = b.split('.');
  aSplit[0] = parseInt(aSplit[0]);
  bSplit[0] = parseInt(bSplit[0]);
  aSplit[1] = parseInt(aSplit[1]);
  bSplit[1] = parseInt(bSplit[1]);
  if (aSplit[0] > bSplit[0]) {
    return -1;
  } else if (aSplit[0] == bSplit[0]) {
    if (aSplit[1] > bSplit[1]) {
      return -1;
    } else if (aSplit[1] == bSplit[1]) {
      if (parseInt(aSplit[2].substring(0, 1)) > parseInt(bSplit[2].substring(0,1))) {
        return -1;
      }
    }
  }
  return 1;
}

function loadUnity(id, target, filepath) {
  console.log('loading');
  const exec = require('child_process').exec;
  if (unityVersions[id] != null) {
    if (fse.existsSync(unityVersions[id].file)) {
      let command = '"' + path.join(unityVersions[id].file, '/Contents/MacOS/Unity') + '"';
      if (targetMap[target]) {
        command += ' -BuildTarget ' + targetMap[target];
      }
      if (filepath) {
        command += ' -projectPath "' + filepath + '"';
      }
      command += ' &';
      let child = exec(command, (err, stdout, stderr) => {
        if (!err) {
          console.log(stdout);
        } else {
          console.log(err);
        }
      });
      return true;
    } else {
      console.log("oh no");
      return false;
    }
  }
  return false;
}

function changeSettings(setting, nav) {
  electron.dialog.showOpenDialog(mainWindow,{
    defaultPath: '~',
    properties: ['openDirectory']
  }, (filePaths) => {
    if (filePaths) {
      if (setting == 'versionSettings') {
        config.unitypath = filePaths[0];
      } else {
        config.projectspath = filePaths[0];
      }
  
      mainWindow.webContents.send('path', config);
      fse.writeFile('./config.json', JSON.stringify(config));
      if (setting == 'versionSettings') {
        getUnityVersions().then((versions) => {
          unityVersions = versions;
          if (nav) {
            navigateVersions();
          }
        }).catch(() => {
          console.log('Could not get unity versions')
        });
      } else {
        if (nav) {
          navigateProjects();
        }
      }
    }
  });
}

function navigateVersions() {
  let orderedVersions = Object.keys(unityVersions).sort(sortVersion);
  ejse.data('versions', {ordered: orderedVersions, targets: unityVersions, config});
  mainWindow.loadURL('file://' + __dirname + '/index.ejs');
}

function navigateProjects() {
  projects = getProjects();
  ejse.data('data', {projects, config});
  mainWindow.loadURL('file://' + __dirname + '/projects.ejs');
}

module.exports = {
  navigateProjects,
  navigateVersions,
  loadUnity,
  changeSettings
}