module.exports = {
  createContainer
}

var Docker = require('dockerode')
var docker = new Docker({host: '10.0.0.9', port: 2375}); //defaults to http

var stdStream = require('stream');

// var container = docker.getImage('f363a624c7b2');
// container.inspect(function (err, data) {
//   console.log(err, data);
// });

// docker.createContainer({Image: 'ubuntu', Cmd: ['/bin/bash'], name: 'ubuntu-test'}, function (err, container) {
//   container.start(function (err, data) {
//     console.log(err,data)
//   });
// });

// docker.pull('ubuntu', function (err, stream) {
//   // console.log(err, stream);
// });

async function createContainer(image, command, cb){
  let logStream = new stdStream.PassThrough();
  let result = ""
  logStream.on('data', function(chunk){
    // console.log("\n"+chunk.toString('utf8'))
    result += "\n"+chunk.toString('utf8')
  });

  docker.run('feddynventor/'+image, ['bash','-c',command], logStream, {
    "HostConfig": {
      // "Devices": [
      //   {
      //     "PathOnHost": "/dev/video0",
      //     "PathInContainer": "/dev/video0",
      //     "CgroupPermissions": "rwm"
      //   },
      //   {
      //     "PathOnHost": "/dev/video1",
      //     "PathInContainer": "/dev/video1",
      //     "CgroupPermissions": "rwm"
      //   }
      // ],
      "Runtime": "nvidia",
      "Mounts": [
        {
          "Target":   process.env.INPUT_DIR,
          "Source":   process.env.COMPOSE_PROJECT_NAME+"_input",
          "Type":     "volume", 
          "ReadOnly": false
        },
        {
          "Target":   process.env.OUTPUT_DIR,
          "Source":   process.env.COMPOSE_PROJECT_NAME+"_output",
          "Type":     "volume", 
          "ReadOnly": false
        }
      ]
    }
  }).then(function(data) {
    let output = data[0];
    let container = data[1];
    console.log("EXITED w/code", output.StatusCode);
    cb(true, data, result);
    return container.remove();
  }).then(function(data) {
    console.log('Container cleaned');
  }).catch(function(err) {
    console.log("ERROR", err);
    cb(false, null, result);
  });
}

// docker.run('feddynventor/ffmpeg-watermarker', ['/bin/bash','-c','ffmpeg'], logStream, {
//   "HostConfig": {
//     "Devices": [
//       {
//         "PathOnHost": "/dev/video0",
//         "PathInContainer": "/dev/video0",
//         "CgroupPermissions": "rwm"
//       },
//       {
//         "PathOnHost": "/dev/video1",
//         "PathInContainer": "/dev/video1",
//         "CgroupPermissions": "rwm"
//       }
//     ]
//   }
// }).then(function(data) {
//   let output = data[0];
//   let container = data[1];
//   console.log(output.StatusCode);
//   return container.remove();
// }).then(function(data) {
//   console.log('container removed');
// }).catch(function(err) {
//   console.log(err);
// });

// docker.createContainer({
//   Image: 'ubuntu:latest',
//   AttachStdin: false,
//   AttachStdout: true,
//   AttachStderr: true,
//   Tty: true,
//   Cmd: ['/bin/bash', '-c', 'ls /dev'],
//   OpenStdin: false,
//   StdinOnce: false
// }).then(function(container) {
//   console.log(container)
//   return container.start();
// }).then(function(data) {
//   console.log(data)
// })