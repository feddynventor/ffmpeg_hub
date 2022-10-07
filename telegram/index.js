const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT;
const bot = new TelegramBot(token, {polling: true});

const authorized = []
console.log("ENV VARS:", token, process.env.HOST_IP)

const http = require('request')

bot.on('message', (msg) => {
    console.log(msg.from.id,msg.from.first_name)
    // if (!authorized.includes(msg.from.id)) return
    if ((!msg.video && !msg.document)) return
    if (!!msg.document && !msg.document.mime_type.includes("video")) return

    // https://api.telegram.org/botXXX/getFile?file_id=ZZZ
    // https://api.telegram.org/file/botXXX/videos/file_0.mp4
    // https://stackoverflow.com/a/32679930

    http.get("https://api.telegram.org/bot"+token+"/getFile?file_id="+(!!msg.video?msg.video.file_id:msg.document.file_id), {json: true}, (err, res, body)=>{
	if (!body.result) return
        console.log(body.ok, "https://api.telegram.org/file/bot"+token+"/"+body.result.file_path)
        // {"ok":true,"result":{"file_id":"ZZZ","file_unique_id":"","file_size":13863945,"file_path":"videos/file_0.mp4"}}

        http.post({
            headers: {'content-type' : 'application/json'},
            url:     'http://'+process.env.HOST_IP+':3000/new',
            body:    `{"actions":[{"action":"download","source":"http://`+process.env.HOST_IP+`:3000/files/assets/stacco.mp4"},{"action":"download","source":"http://`+process.env.HOST_IP+`:3000/files/assets/logo_sport.png"},{"action":"download","source":"https://api.telegram.org/file/bot`+token+`/`+body.result.file_path+`"},{"action":"watermark","video":3,"logo":2},{"action":"scale","width":"1280","heigth":"720"},{"action":"concat","video":1,"outputLast":true}]}`
        }, function(error, response, body){
            let taskid = JSON.parse(body).id;
            bot.sendMessage(msg.from.id, `${msg.from.first_name} aggiunto job #${taskid}`)

            let checker = setInterval(()=>{
                http.get("http://"+process.env.HOST_IP+":3000/status/"+taskid, {json: true}, (err, res, body)=>{
                    if (body.status==null) return
                    if (body.status==false)
                        bot.sendMessage(msg.from.id, `Video #${taskid} codifica non riuscita ${body.log}`)
                    else
                        bot.sendVideo(msg.from.id, require('fs').readFileSync(body.status[body.status.length-1]))

                    clearInterval(checker)
                    return
                })
            }, 10000)
        });
    })

// bot.sendMessage(chatId, 'Received your message');
});
