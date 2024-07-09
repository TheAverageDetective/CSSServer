import {readFileSync, writeFileSync} from "fs"
import * as express from "express"
import {resolve} from "path"

const cssParser = require("css")

const stringified = (data : Object) : string => JSON.stringify(data, null, 4)
const log = console.log


function createCSSServer (cssFilePath : string) : Express.Application {

    const cssData : {
        stylesheet : {rules : Array<{
            type : string,
            selectors : Array<string>,
            declarations : Array<{
                type : "declaration" | "comment",
                property : string,
                value : string,
                position : {
                    start : {"line" : number, end : number},
                    end : {"line" : number, end : number}
                }
            }>
        }>}
    } =  cssParser.parse(readFileSync(cssFilePath).toString())

    writeFileSync(cssFilePath + ".json", stringified(cssData.stylesheet.rules))


    const server = express()


    const rules = cssData.stylesheet.rules
    const serverName = "server"
    const serverConfig = {port : 8080, name : ""}


    // Do some setup
    var selector = ""

    for (var i = 0; i < rules.length; i++) {
        selector = rules[i].selectors[0].replace(/\s/ig, "").replace(serverName, "").toLowerCase()
        rules[i].selectors[0] = selector

        for (var j = 0; j < rules[i].declarations.length; j++){
            if (rules[i].declarations[j].type == "comment") continue;
            rules[i].declarations[j].property = rules[i].declarations[j].property.toLowerCase()
            rules[i].declarations[j].value = rules[i].declarations[j].value.trim()
        }

    }



    // Now do the main thing
    const serverRouteHandlers = {}

    for (var i = 0; i < rules.length; i++) {
        selector = rules[i].selectors[0]
        if (selector.startsWith(":config")){
            for (var declaration of rules[i].declarations){
                if (declaration.property == "port") serverConfig.port = parseInt(declaration.value);
                else if (declaration.property == "name") serverConfig.name = declaration.value
            }
        }

        else if (selector.startsWith(":get")) {
            var route = "/" + selector.split(".").slice(1).join("/") || "/"
            //console.log(route)
            serverRouteHandlers[route] = defineRouteHandler(rules[i].declarations)
        }

        else if (selector.startsWith(":post")) {
            var route = "/" + selector.split(".").slice(1).join("/") || "/"
            //console.log(route)
            serverRouteHandlers[route] = defineRouteHandler(rules[i].declarations)
        }


    }

    //server.get("/abc", (req, res)=>{})

    function defineRouteHandler (declarations : Array<any>) : Array<any> {
        var code : Array<{
            type : "text" | "status" | "file",
            data : {text? : string, status? : string | number, filePath? : string}
        }> = []        // Code will be put here then evaluated

        function text (input : string) : void {code.push({type : "text", data : {text : input}})}
        function status (input : string) : void {code.push({type : "status", data : {status : parseInt(input)}})}
        function file (input : string) : void {code.push({type : "file", data : {filePath : input}})}

        for (var declaration of declarations){
            console.log(declaration.value)
            if (declaration.property == "send"){
                // If we could do some parsing, we can avoid using eval here.
                // But I'm lazy to make a parser for now.
                if (/^text\(|^status\(|^file\(/i.test(declaration.value)) eval(declaration.value);
            }
        }

        return code
    }

    server.get("/abc", ()=>log("x"))
    server.get("/favicon.ico", (req, res)=>res.end())

    const routes = Object.keys(serverRouteHandlers)

    server.all("*", (req, res)=>{
        var route = req.path
        //log(route)
        if (routes.indexOf(route) === -1) { res.sendStatus(404); return;}

        if (req.method == "GET" || req.method == "POST") {
            var handler = serverRouteHandlers[route]
            if (handler[0].type === "text") res.send(handler[0].data.text);
            else if (handler[0].type === "status") res.sendStatus(handler[0].data.status);
            else if (handler[0].type === "file") res.sendFile( resolve(handler[0].data.filePath));
        }
    })


    server._router.stack.forEach(e => log (e.regexp));

    server.listen(serverConfig.port, ()=>{log("Server running on port " + serverConfig.port)})

    return server
}


export {createCSSServer}