const allowedFileExtensions = [ 'txt', 'pd' ];
const forbiddenFileNames = [ '.DS_Store', 'Thumbs.db' ];

function scanFiles(item, files) {
  return new Promise((resolve, reject) => {
    if (item.isDirectory) {
      item.createReader().readEntries(entries => {
        const promises = [];
        entries.forEach(entry => {
          promises.push(scanFiles(entry, files));
        });
        Promise.all(promises)
          .then(() => { resolve(); })
          .catch(e => console.error(e));
      });
    } else {
      item.file(f => {
        files.push(f);
        resolve();
      }, e => console.error(e));
    }
  });
}

function sendFiles(socket, files) {
  droppedFiles = [];
  let projectName = null;
  let foundMain = false;

  for (var i = 0; i < files.length; ++i) {
    const { name, webkitRelativePath } = files[i];
    const ext = name.split('.').pop();

    if (forbiddenFileNames.indexOf(name) === -1 &&
        allowedFileExtensions.indexOf(ext) !== -1) {
      droppedFiles.push(files[i]);

      const splitPath = webkitRelativePath.split('/');
      
      if (projectName === null) {
        projectName = splitPath[0];
      }

      if (!foundMain
          && splitPath.length == 2
          && splitPath[0] === projectName
          && splitPath[1] === 'main.pd') {
        foundMain = true;
      }
    }
  }

  if (!foundMain) {
    alert('valid projects must contain a top-level "main.pd" file');
    return;
  }

  var cnt = 0;
  for (var i = 0; i < droppedFiles.length; i++) {
    const { name, webkitRelativePath } = droppedFiles[i];
    
    droppedFiles[i] = {
      name,
      path: webkitRelativePath,
      contents: null,
    };

    var reader = new FileReader();
    reader.index = i;

    reader.addEventListener('load', function(e) {
      e.preventDefault();
      console.log('reading stuff');
      droppedFiles[e.target.index].contents = `${e.target.result}`;
      cnt++;
      if (cnt === droppedFiles.length) {
        sendSocketMsg(socket, 'add', droppedFiles);
      }
    }, false);

    reader.readAsText(files[i], i);
  }
};

function sendSocketMsg(socket, msg, data) {
  socket.send(JSON.stringify({ msg, data }));
}

window.onload = function() {
  let droppedFiles;

  const $version = document.querySelector('#version-info');
  const $dropElement = document.querySelector('#drop-element');
  const $filesBtn = document.querySelector('#upload-btn');
  const $projectSelector = document.querySelector('#projects-list');
  const $removeSelectedProject = document.querySelector('#remove-selected-project');
  const $loadSelectedProject = document.querySelector('#load-selected-project');

  //====================== PREVENT DROP ON WHOLE PAGE ========================//

  window.addEventListener('dragover', function(e) {
    if (e.target.id != 'drop-zone') {
      e.preventDefault();
      console.log('dropped dragover :)');
    }
  }, false);

  window.addEventListener('drop', function(e) {
    if (e.target.id != 'drop-zone') {
      e.preventDefault();
      console.log('dropped drop :)');
    }
  }, false);

  //============================= WEBSOCKETS =================================//

  console.log(`ws://${location.host}`)
  const socket = new WebSocket(`ws://${location.host.split(':')[0]}:8080`);
  socket.binaryType = 'arraybuffer';
  
  socket.addEventListener('open', event => {
    sendSocketMsg(socket, 'Hello, server !');
  });

  socket.addEventListener('message', event => {
    const { msg, data } = JSON.parse(event.data);

    switch (msg) {
      case 'version':
        $version.innerHTML = `v${data}`;
        break;
      case 'projects-list':
        {
          const currentProject = $projectSelector.value;

          while ($projectSelector.firstChild) {
            $projectSelector.removeChild($projectSelector.firstChild);
          }
    
          for (var i = 0; i < data.length; i++) {
            var opt = document.createElement('option');
            opt.value = data[i];
            opt.innerHTML = data[i];
            $projectSelector.appendChild(opt);
          }
          
          $projectSelector.value = currentProject;
        }
        break;
      case 'config':
        {
          const { currentProject } = data;
          $projectSelector.value = currentProject;
        }
        break;
      default:
        break;
    }
  });

  //========================= DROP ZONE MANAGEMENT ===========================//

  $dropElement.addEventListener('dragenter', function(e) {
    e.preventDefault();
    $dropElement.classList.add('over');
  }, false);

  $dropElement.addEventListener('dragleave', function(e) {
    e.preventDefault();
    $dropElement.classList.remove('over');
  }, false);

  $dropElement.addEventListener('dragover', function(e) {
    e.preventDefault();
  }, false);

  $dropElement.addEventListener('drop', function(e) {
    e.preventDefault();
    $dropElement.classList.remove('over');
    // console.log(e.target + ' loaded some files :\n');
    let { items } = e.dataTransfer;

    for (let i = 0; i < items.length; ++i) {
      let item = items[i].webkitGetAsEntry();
      if (item && item.isDirectory) {
        let files = [];
        scanFiles(item, files).then(() => {
          // console.log('files loaded, sending files');
          sendFiles(socket, files);
        }).catch(e => console.error(e));
      }
    }
  }, false);

  $filesBtn.addEventListener('change', function(e) {
    // console.log(e.target + ' loaded some files :\n');
    sendFiles(socket, e.target.files);
  }, false);

  $loadSelectedProject.addEventListener('click', function(e) {
    sendSocketMsg(socket, 'load', $projectSelector.value);
  });

  $removeSelectedProject.addEventListener('click', function() {
    sendSocketMsg(socket, 'remove', $projectSelector.value);
  });
};