
const http = require('http')
const { hostname } = require('os')
const fs = require('fs')
const httpServer = http.createServer()


const config = {
    "www.bin11.com": "localhost:8080",
    "192.168.31.247:5000": "192.168.31.247:5001"
} 

const StateUrl = 'http://www.bin11.com/'
const ResouceUrl = 'http://192.168.31.247:5000'
// let config = JSON.parse(fs.readFileSync('./node-proxy/config.txt').toString())


httpServer.on('request',(req,res)=>{
    const {href,host,pathname,hash,search} = new URL(req.url)
    const {method, headers} = req

    let url = href
    if(StateUrl.indexOf(host) != -1 || ResouceUrl.indexOf(host) != -1){
        url = 'http://' + config[host]
    }
    const newUrl = new URL(url)
    const {hostname, protocol, port} = newUrl
     let options = {
        protocol,
        hostname,
        method,
        port: port || 80,
        path: pathname + hash + search,
        headers: {
            ...headers,
            host: hostname
        }
    }
    delete options.headers['accept-encoding']
    const proxyRequest = http.request(options,proxyRes=>{
        res.writeHead(proxyRes.statusCode,proxyRes.headers)
        proxyRes.pipe(res)
    })
    req.pipe(proxyRequest)
})

httpServer.listen(3003,()=>{
    console.log(`${hostname} server start 3003`)
})