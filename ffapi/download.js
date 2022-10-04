const fs = require('fs');

module.exports = {
  exec, exists, dockerExec
}
// download.exec("http://192.168.170.104:3000/download/toTransfer.bin",__dirname+"/downloaded.bin", (success, err)=>{console.log(success, err)})

function dockerExec(url, dest, cb) {
  if (exists(dest))
    return cb(true, 1);  //file salvato

  require("./dockerLayer").createContainer("mwendler/wget",
    `--no-check-certificate -O ${dest} -- ${url}`, 
    (res)=>{
      if (res) cb(true)
      else cb(false)
    }
  )
}

function exec(url, dest, cb) {
  // dest = process.env.INPUT_DIR+'/'+dest
  if (exists(dest))
    return cb(true, 1);  //file salvato

  const file = fs.createWriteStream(dest);

  const http = (url.includes("https")?require('https'):require('http'));
  const request = http.get(url, {timeout:3000}, (response) => {
      if (response.statusCode !== 200)
        return cb(false, response.statusCode);
      else {
        response.pipe(file);
        return cb(true, 0)  //file in ricezione
      }
  });
  request.on('timeout', () => {
    return cb(false, 0)
  });

  // close() is async, call cb after close completes
  file.on('finish', function(){
    fs.close(fs.openSync(dest), (err) => {
      if (err)
        return cb(false, 1);
      else {
        return cb(true, 1);  //file salvato
      }
    });
  });

  // check for request error too
  request.on('error', (err) => {
      fs.unlink(dest, ()=>cb(false, "Request"));
      return cb(false,err.message);
  });

  file.on('error', (err) => { // Handle errors
      fs.unlink(dest, ()=>cb(false, "File")); // Delete the file async. (But we don't check the result) 
      return cb(false,err.message);
  });
};


function exec2(url, dest, resolve, reject) {
  const file = fs.createWriteStream(dest);
  try {
    const request = http.get(url, {timeout:3000}, (response) => {
        if (response.statusCode !== 200)
          reject(response.statusCode);
        else {
          response.pipe(file);
          //return cb(true, 0)  //file in ricezione
        }
    });
  } catch (error) {
    reject(0);
  }
  request.on('timeout', () => {
    reject(0)
  });

  // close() is async, call cb after close completes
  file.on('finish', function(){
    fs.close(fs.openSync(dest), (err) => {
      if (err)
        reject(1);
      else {
        resolve();  //file salvato
      }
    });
  });

  // check for request error too
  request.on('error', (err) => {
    //fs.unlink(dest, ()=>cb(false, "Request"));
    reject(err.message);
  });

  file.on('error', (err) => { // Handle errors
    fs.unlink(dest, ()=>cb(false, "File")); // Delete the file async. (But we don't check the result) 
    reject(err.message);
  });
};

function exists(path){
  fs.stat(path, function(err, stat) {
    if (err == null) {
      return true;
    } else if (err.code === 'ENOENT') {
      return false;
    } else {
      return false;
    }
  });
}