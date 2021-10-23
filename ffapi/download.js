const fs = require('fs');
const http = require('http');

module.exports = {
  exec
}
// download.exec("http://192.168.170.104:3000/download/toTransfer.bin",__dirname+"/downloaded.bin", (success, err)=>{console.log(success, err)})

function exec(url, dest, cb) {
  dest = process.env.INPUT_DIR+'/'+dest
  const file = fs.createWriteStream(dest);

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