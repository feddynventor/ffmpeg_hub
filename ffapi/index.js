const express = require("express");
const app = express();
const docker = require("./dockerLayer.js")
const downloader = require("./download.js")
const worker = require("promise-sequence")

console.log("ENV VARS:", process.env.INPUT_DIR, process.env.OUTPUT_DIR, process.env.COMPOSE_PROJECT_NAME);

/**
 * File server
 */
app.use('/files/input', express.static(process.env.INPUT_DIR || '/tmp/ffapi_input'));
app.use('/files/output', express.static(process.env.OUTPUT_DIR || '/tmp/ffapi_output'));
app.use('/files/assets', express.static('/opt/assets'));

var list = {}

// Plugin JSON Body
app.use(express.json())

app.post("/new", async (req, res) => {
    let id = (req.body.id)?req.body.id:(require("js-sha1"))(JSON.stringify(req.body)).substr(0,10);
    let input_files = req.body.actions
    .filter((element) => element.action=="download" || element.action=="peek")
    .map((element, index)=> {
        if (element.action == "download") return process.env.INPUT_DIR+'/'+id+'_input'+index+element.source.substr(element.source.lastIndexOf('.')).toLowerCase()
        else return element.file
    });

    let workload = {
        id,
        sources: req.body.actions
        .filter((element) => element.action=="download")
        .map((element)=> element.source)
    }
    let promises = req.body.actions
        .filter(e => e.action!=="peek")
        .map((element, index) => {
            // if (downloader.exists(`${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`)){
            //     return async () => new Promise((resolve)=>{resolve(`${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`)})
            // } NOT WORKINGw
            switch (element.action) {
                case "download":
                    return async () => new Promise((resolve, reject) => {
                        // resolve()
                        // console.log(element.source,input_files[index])
                        // downloader.exec(
                        downloader.dockerExec(
                            element.source,
                            input_files[index], 
                            (success, msg)=>{
                                if (success) resolve(input_files[index])
                                else reject(msg)
                        })
                    })
                case "peek": break;
                case "compress":
                    return async () => new Promise((resolve, reject)=>{
                        res.writeContinue()
                        docker.createContainer("jrottenberg/ffmpeg",
                        (!!element.video)?
                        `-y -hide_banner -loglevel warning -i ${process.env.INPUT_DIR}/${id}_input${element.video-1}.mp4 -vcodec libx264`+((element.bitrate)?` -b:v ${element.bitrate}k`:``)+` ${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`:
                        `-y -hide_banner -loglevel warning -i ${process.env.OUTPUT_DIR}/${id}_stage${index-1}.mp4 -vcodec libx264`+((element.bitrate)?` -b:v ${element.bitrate}k`:``)+` ${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`,
                        (ok, info, log)=>{
                            if (ok && info[0].StatusCode == 0){
                                resolve(`${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`)
                            } else {
                                reject(log)
                            }
                        })
                    })
                case "scale":
                    return async () => new Promise((resolve, reject)=>{
                        res.writeContinue()
                        docker.createContainer("jrottenberg/ffmpeg",
                        (!!element.video)?
                        `-y -hide_banner -loglevel warning -i ${process.env.INPUT_DIR}/${id}_input${element.video-1}.mp4 -vf scale=w=${element.width}:h=${element.heigth} -vcodec libx264`+((element.bitrate)?` -b:v ${element.bitrate}k`:``)+` ${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`:
                        `-y -hide_banner -loglevel warning -i ${process.env.OUTPUT_DIR}/${id}_stage${index-1}.mp4 -vf scale=w=${element.width}:h=${element.heigth} -vcodec libx264`+((element.bitrate)?` -b:v ${element.bitrate}k`:``)+` ${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`,
                        (ok, info, log)=>{
                            if (ok && info[0].StatusCode == 0){
                                resolve(`${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`)
                            } else {
                                reject(log)
                            }
                        })
                    })
                case "watermark":
                    return async () => new Promise((resolve, reject)=>{
                        // let this_stage_input = `${process.env.INPUT_DIR}/${id}_stage${index-1}.mp4`  //passaggio precedente
                        // if (element.input!=0) //recupera output passaggio precedente
                        // this_stage_input = `${process.env.INPUT_DIR}/${id}_input${element.input-1}.mp4`  //indice parametro

                        res.writeContinue()
                        docker.createContainer("jrottenberg/ffmpeg",
                        (!!element.video)?
                        `-y -hide_banner -loglevel warning -i ${process.env.INPUT_DIR}/${id}_input${element.video-1}.mp4 -i ${process.env.INPUT_DIR}/${id}_input${element.logo-1}.png -filter_complex [1][0]scale2ref[i][m];[m][i]overlay=format=auto,format=yuv420p[v] -map [v] -map 0:a -vcodec libx264`+((element.bitrate)?` -b:v ${element.bitrate}k`:``)+` ${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`:
                        `-y -hide_banner -loglevel warning -i ${process.env.OUTPUT_DIR}/${id}_stage${index-1}.mp4 -i ${process.env.INPUT_DIR}/${id}_input${element.logo-1}.png -filter_complex [1][0]scale2ref[i][m];[m][i]overlay=format=auto,format=yuv420p[v] -map [v] -map 0:a -vcodec libx264`+((element.bitrate)?` -b:v ${element.bitrate}k`:``)+` ${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`,
                        (ok, info, log)=>{
                            if (ok && info[0].StatusCode == 0){
                                resolve(`${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`)
                            } else {
                                reject(log)
                            }
                        })
                    })
                case "concat":
                    return async () => new Promise((resolve, reject)=>{
                        res.writeContinue()
                        docker.createContainer("jrottenberg/ffmpeg",
                        (!!element.outputLast)?
                        `-y -hide_banner -loglevel warning -i ${process.env.INPUT_DIR}/${id}_input${element.video-1}.mp4 -i ${process.env.OUTPUT_DIR}/${id}_stage${index-1}.mp4 -filter_complex [0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a] -map [v] -map [a] -vcodec libx264`+((element.bitrate)?` -b:v ${element.bitrate}k`:``)+` ${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`:
                        `-y -hide_banner -loglevel warning -i ${process.env.OUTPUT_DIR}/${id}_stage${index-1}.mp4 -i ${process.env.INPUT_DIR}/${id}_input${element.video-1}.mp4 -filter_complex [0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a] -map [v] -map [a] -vcodec libx264`+((element.bitrate)?` -b:v ${element.bitrate}k`:``)+` ${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`,
                        (ok, info, log)=>{
                            if (ok && info[0].StatusCode == 0){
                                resolve(`${process.env.OUTPUT_DIR}/${id}_stage${index}.mp4`)
                            } else {
                                reject(log)
                            }
                        })
                    })

                default:
                    break;
            }
        })
    
    res.status(200).send(workload);
    list[id] = {status:null,date:Date.now()};

    worker(promises).then(
        (result)=>{
            console.log(id,true,result)
            list[id] = {status:result,date:Date.now()};
        },
        (msg)=>{
            console.log(id,false,msg)
            list[id] = {status:false,date:Date.now(),log:msg};
        }
    )
})

app.get("/status", (req, res)=>{
    res.send(list)
})
app.get("/status/:id", (req, res)=>{
    res.send(list[req.params.id])
    console.log(list[req.params.id])
})

app.get("/files/list", async (req, res) => {
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
app.get("/files/delete/:filename", async (req, res) => {
    const fs = require('fs');
    try {
        fs.unlink(
        (req.params.filename.includes("_input")?
        (process.env.INPUT_DIR+'/'+req.params.filename):
        (process.env.OUTPUT_DIR+'/'+req.params.filename)),
            (err)=>{
                if (err) res.send({error: err})
                else res.send({success: true})
            })
    } catch (err) {
        res.send({error: err})
    }
})

app.listen(3000, () => {
   console.log(`Server is running on PORT: ${3000}`);
});
