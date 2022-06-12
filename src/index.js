#!/usr/bin/env node
const http = require('http')
const https = require('https')
const path = require('path')
const url = require('url')
const fs = require('fs')
const net = require('net')
const { hostname } = require('os')
const httpServer = http.createServer()
const httpPort = 7700
const httpsPort = 7770
const httpsProxyOptions = {
    key: fs.readFileSync(path.join(__dirname,'key.pem')),
    cert: fs.readFileSync(path.join(__dirname,'cert.pem'))
}
const httpsProxyServer = https.createServer(httpsProxyOptions)

//读取本地文件
const readLoacalFile = (req, res) => {
    //当前执行命令的目录
    const basePath = process.cwd()
    //请求url
    const pathObj = url.parse(req.url, true)
    const pathname = pathObj.pathname === '/' ? '/index.html' : pathObj.pathname
    //文件路径
    const filePath = path.join(basePath, pathname)
    //异步读取文件数据
    fs.readFile(filePath, 'binary', (err, data) => {
        //防止读取文件报错时服务器崩掉
        if (err) {
            res.writeHead(404, "Not Found")
            res.end()
        } else {
            res.writeHead(200, '0k')
            res.write(data, 'binary')
            res.end()
        }
    })
}

//建立连接
const connect = (req, socket)=>{
    let proxySocket = net.connect(httpsPort,()=>{
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        proxySocket.pipe(socket)
    }).on('error',()=>{
        socket.end()
    })
    socket.pipe(proxySocket)
}

//走http转发
const config = {
    "www.bin11.com": "localhost:8080",
    "192.168.31.247:5000": "192.168.31.247:5001"
}

httpServer.on('request', (req, res) => {
    const { href, host, pathname, hash, search } = new URL(req.url)
    const { method, headers } = req

    let url = href
    let [StateUrl, ResouceUrl] = Object.keys(config)

    //如果访问的是静态资源 直接从本地文件读取
    if (StateUrl.indexOf(host) != -1) {
        readLoacalFile(req, res)
    } else if (ResouceUrl.indexOf(host) != -1) {
        url = 'http://' + config[host]
    }
    const newUrl = new URL(url)
    const { hostname, protocol, port } = newUrl
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
    // delete options.headers['accept-encoding']
    const proxyRequest = http.request(options, proxyRes => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers)
        proxyRes.pipe(res)
    })
    req.pipe(proxyRequest)
    //防止请求错误时程序崩掉
    proxyRequest.on('error', (err)=>{
        res.end()
    })
})

httpServer.on('connect', connect)

httpServer.listen(httpPort,()=>{
    console.log(`请配置代理地址为: http://${hostname}:${httpPort}`)
})

//走https转发
httpsProxyServer.on('request',(req,res)=>{
    console.log('httpsProxyServer',req.headers.host, req.url)
    const httpsHref = `https://${req.headers.host}${req.url}`
    const {protocol, pathname, hash, search, hostname, port } = new URL(httpsHref)
    const { method, headers } = req
    let options = {
        protocol,
        hostname,
        method,
        port: port || 443,
        path: pathname + hash + search,
        headers: {
            ...headers,
        }
    }
    const httpsProxyRequest = https.request(options, proxyRes => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers)
        proxyRes.pipe(res)
    })
    req.pipe(httpsProxyRequest)
    //防止请求错误时程序崩掉
    httpsProxyRequest.on('error', (err) => {
        res.end()
    })
})

httpsProxyServer.listen(httpsPort,()=>{
    console.log(`请配置代理地址为: http://${hostname}:${httpsPort}`)
})