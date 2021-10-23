const express = require("express");
const app = express();

console.log("ENV VARS:", process.env.INPUT_DIR, process.env.OUTPUT_DIR, process.env.COMPOSE_PROJECT_NAME);

/**
 * File server
 */
app.use('/files/input', express.static(process.env.INPUT_DIR || '/tmp/ffapi_input'));
app.use('/files/output', express.static(process.env.OUTPUT_DIR || '/tmp/ffapi_output'));

// Plugin JSON Body
app.use(express.json())

/**
 * url: endpoint HTTP del video
 */
app.post("/src/download", async (req, res) => {
    const dl = require("./download.js")
    await dl.exec(req.body.url, req.body.url.substr(req.body.url.lastIndexOf("/")+1), (ok, code)=>{
        if (ok && code === 0){
            res.writeContinue()
        } else {
            res.send({ok, code})
        }
    })
});

app.get("/convert/files/list", async (req, res) => {
    const fs = require('fs');
    let input_files = [], output_files = [];
    try {
        input_files = fs.readdirSync(process.env.INPUT_DIR || '/tmp/ffapi_input');
        output_files = fs.readdirSync(process.env.OUTPUT_DIR || '/tmp/ffapi_output');    
    } catch (error) {}

    res.send({
        input_files, output_files
    })
})
app.get("/convert/files/delete/:filename", async (req, res) => {
    const fs = require('fs');
    try {
        fs.unlink(req.params.filename)
        res.send({success: true})
    } catch (error) {
        res.send({error: true})
    }
})

/**
 * filename: nome file in input e in output
 * bitrate [optional]: bps in kbits per secondo
 */
app.post("/new/conversion", async(req, res) => {
    const docker = require("./dockerLayer.js")
    res.writeContinue()
    docker.createContainer("ffmpeg-cuda",
    `ffmpeg -y -c:v h264_cuvid -i ${process.env.INPUT_DIR}/${req.body.filename} -vcodec h264_nvenc`+((req.body.bitrate)?` -b:v ${req.body.bitrate}k`:``)+` ${process.env.OUTPUT_DIR}/${req.body.filename}`,
    (ok, info, log)=>{
        console.log(ok, info, log)
        if (ok && info[0].StatusCode == 0){
            res.status(200).send({success: true, details: log})
        } else {
            res.status(500).send({success: false, code: info[0].StatusCode, details: log})
        }
    })
})

/**
 * filename: nome file in input e in output
 * logoname: nome immagine da sovrapporre
 * bitrate [optional]: kpbs in uscita
 */
app.post("/new/watermark", async(req, res) => {
    const docker = require("./dockerLayer.js")
    res.writeContinue()
    docker.createContainer("ffmpeg-cuda",
    `ffmpeg -y -c:v h264_cuvid -i ${process.env.INPUT_DIR}/${req.body.filename} -i ${process.env.INPUT_DIR}/${req.body.logoname} -filter_complex "overlay=0:0" -vcodec h264_nvenc`+((req.body.bitrate)?` -b:v ${req.body.bitrate}k`:``)+` ${process.env.OUTPUT_DIR}/${req.body.filename}`,
    (ok, info, log)=>{
        console.log(ok, info, log)
        if (ok && info[0].StatusCode == 0){
            res.status(200).send({success: true, details: log})
        } else {
            res.status(500).send({success: false, code: info[0].StatusCode, details: log})
        }
    })
})


app.listen(3000, () => {
   console.log(`Server is running on PORT: ${3000}`);
});
