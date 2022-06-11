#!/usr/bin/env node
const http = require('http')
const path = require('path')
const url = require('url')
const fs = require('fs')
const { hostname } = require('os')
const httpServer = http.createServer()

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
})

httpServer.listen(7700,()=>{
    console.log(`请配置代理地址为: http://${hostname}:${7700}`)
})


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