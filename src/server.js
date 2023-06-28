const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const spawn = require('child_process').spawn;

const cwd = path.join(__dirname, '..');
const projectsFolder = path.join(cwd, 'projects');
const configFilename = path.join(__dirname, 'config.json');
const scriptFilename = path.join(__dirname, 'restart-pd.sh');

const pkg = require(path.join(cwd, 'package.json'));

let projectsList = [];
let config = {
  //loadedProject: null,
  defaultProject: null,
};
let loadedProject = null;

const port = process.env.PORT || 80;

// UTILITIES ///////////////////////////////////////////////////////////////////

const sendSocketMsg = (socket, msg, data) => {
  if (socket) { socket.send(JSON.stringify({ msg, data })); }
}

const ensureFolder = (folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    return false;
  }
  return true;
};

const updateAndNotifyProjectsList = (socket = null) => {
  projectsList = fs.readdirSync(projectsFolder).filter(file => {
    return (
      fs.statSync(path.join(projectsFolder, file)).isDirectory() &&
      fs.existsSync(path.join(projectsFolder, file, 'main.pd'))
    );
  });
  sendSocketMsg(socket, 'projects-list', projectsList);
}

const readConfigFromFile = () => {
  if (fs.existsSync(configFilename)) {
    config = JSON.parse(fs.readFileSync(configFilename));
  } else {
    writeConfigToFile();
  }
};

const writeConfigToFile = () => {
  fs.writeFileSync(configFilename, JSON.stringify(config, null, 2));
};

// subconfig must contain a subset of the above defined config object's fields
const updateAndNotifyConfig = (subconfig, socket = null) => {
  if (subconfig.hasOwnProperty('defaultProject')) {
    const { defaultProject } = subconfig;
    config.defaultProject = projectsList.indexOf(defaultProject) !== -1
                          ? defaultProject
                          : null;
  }
  sendSocketMsg(socket, 'config', config);
}

const updateAndNotifyLoadedProject = (projectName, socket = null) => {
  loadedProject = projectName;
  sendSocketMsg(socket, 'loaded', loadedProject); 
}

// FUNCTIONS TRIGGERED BY INCOMING SOCKET MESSAGES /////////////////////////////

const addProject = (project, socket = null) => {
  project.forEach(file => {
    const folderPath = path.join(projectsFolder, path.dirname(file.path));
    ensureFolder(folderPath);
    fs.writeFileSync(path.join(projectsFolder, file.path), file.contents);
  });
  updateAndNotifyProjectsList(socket);
};

const makeProjectDefault = (projectName, socket = null) => {
  config.defaultProject = projectName;
  writeConfigToFile();
  sendSocketMsg(socket, 'config', config);
};

const removeProject = (projectName, socket = null) => {
  fs.rmSync(path.join(projectsFolder, projectName), { recursive: true });
  updateAndNotifyProjectsList(socket);
  updateAndNotifyConfig(config, socket);
};

const loadProject = (projectName, socket = null) => {
  updateAndNotifyLoadedProject(projectName, socket);
  const mainPatchFilename = path.join(cwd, 'projects', projectName, 'main.pd');
  const pd = spawn(`${scriptFilename} ${mainPatchFilename}`, {
    stdio: 'inherit',
    shell: true,
  });
  pd.on('exit', (code, signal) => {
    if (code) {
      console.error('pd exited with code', code)
      updateAndNotifyLoadedProject(null, socket);
    } else if (signal) {
      console.error('pd was killed with signal', signal);
      updateAndNotifyLoadedProject(null, socket);
    } else {
      console.log('pd exited okay');
    }
  });
};

// INITIALIZATION //////////////////////////////////////////////////////////////

ensureFolder(projectsFolder);
updateAndNotifyProjectsList();
readConfigFromFile();
updateAndNotifyConfig(config);
writeConfigToFile();
if (config.defaultProject) {
  loadProject(config.defaultProject);
}

// WEBSOCKET COMMUNICATION /////////////////////////////////////////////////////

const wss = new WebSocketServer({
  port: 8080,
  maxPayload: Math.pow(2, 30), // max 1Go, should be enough, increase if needed
});

wss.on('connection', (ws) => {
  sendSocketMsg(ws, 'version', pkg.version);
  updateAndNotifyProjectsList(ws);
  readConfigFromFile();
  updateAndNotifyConfig(config, ws);
  sendSocketMsg(ws, 'loaded', loadedProject);

  ws.on('message', (message) => {
    try {
      const { msg, data } = JSON.parse(message);
      console.log(`received message ${msg}`);
      console.log(data);

      switch (msg) {
        case 'add':
          addProject(data, ws);
          break;
        case 'default':
          makeProjectDefault(data, ws);
          break;
        case 'remove':
          removeProject(data, ws);
          break;
        case 'load':
          loadProject(data, ws);
          break;
        default:
          break;
      }
    } catch(e) {
      console.error(e);
    }
  });
});

wss.on('close', () => { console.log('disconnected'); });

// SERVE STATIC WEBSITE AND START WEBSOCKET SERVER /////////////////////////////

app.use('/', express.static(path.join(cwd, 'public')));

http.listen(port, () => {
  console.log('listening on port ' + port);
});
