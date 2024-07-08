"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCSSServer = createCSSServer;
var fs_1 = require("fs");
var express = require("express");
var path_1 = require("path");
var cssParser = require("css");
var stringified = function (data) { return JSON.stringify(data, null, 4); };
var log = console.log;
function createCSSServer(cssFilePath) {
    var cssData = cssParser.parse((0, fs_1.readFileSync)(cssFilePath).toString());
    (0, fs_1.writeFileSync)(cssFilePath + ".json", stringified(cssData.stylesheet.rules));
    var server = express();
    var rules = cssData.stylesheet.rules;
    var serverName = "server";
    var serverConfig = { port: 8080, name: "" };
    // Do some setup
    var selector = "";
    for (var i = 0; i < rules.length; i++) {
        selector = rules[i].selectors[0].replace(/\s/ig, "").replace(serverName, "").toLowerCase();
        rules[i].selectors[0] = selector;
        for (var j = 0; j < rules[i].declarations.length; j++) {
            if (rules[i].declarations[j].type == "comment")
                continue;
            rules[i].declarations[j].property = rules[i].declarations[j].property.toLowerCase();
            rules[i].declarations[j].value = rules[i].declarations[j].value.trim();
        }
    }
    // Now do the main thing
    var serverRouteHandlers = {};
    for (var i = 0; i < rules.length; i++) {
        selector = rules[i].selectors[0];
        if (selector.startsWith(":config")) {
            for (var _i = 0, _a = rules[i].declarations; _i < _a.length; _i++) {
                var declaration = _a[_i];
                if (declaration.property == "port")
                    serverConfig.port = parseInt(declaration.value);
                else if (declaration.property == "name")
                    serverConfig.name = declaration.value;
            }
        }
        else if (selector.startsWith(":get")) {
            var route = "/" + selector.split(".").slice(1).join("/") || "/";
            console.log(route);
            serverRouteHandlers[route] = defineRouteHandler(rules[i].declarations);
        }
        else if (selector.startsWith(":post")) {
            var route = "/" + selector.split(".").slice(1).join("/") || "/";
            console.log(route);
            serverRouteHandlers[route] = defineRouteHandler(rules[i].declarations);
        }
    }
    //server.get("/abc", (req, res)=>{})
    function defineRouteHandler(declarations) {
        var code = []; // Code will be put here then evaluated
        function text(input) { code.push({ type: "text", data: { text: input } }); }
        function status(input) { code.push({ type: "status", data: { status: parseInt(input) } }); }
        function file(input) { code.push({ type: "file", data: { filePath: input } }); }
        for (var _i = 0, declarations_1 = declarations; _i < declarations_1.length; _i++) {
            var declaration = declarations_1[_i];
            console.log(declaration.value);
            if (declaration.property == "send") {
                // If we could do some parsing, we can avoid using eval here.
                // But I'm lazy to make a parser for now.
                if (/^text\(|^status\(|^file\(/i.test(declaration.value))
                    eval(declaration.value);
            }
        }
        return code;
    }
    server.get("/abc", function () { return log("x"); });
    server.get("/favicon.ico", function (req, res) { return res.end(); });
    var routes = Object.keys(serverRouteHandlers);
    server.all("*", function (req, res) {
        var route = req.path;
        log(route);
        if (routes.indexOf(route) === -1) {
            res.sendStatus(404);
            return;
        }
        if (req.method == "GET" || req.method == "POST") {
            var handler = serverRouteHandlers[route];
            if (handler[0].type === "text")
                res.send(handler[0].data.text);
            else if (handler[0].type === "status")
                res.sendStatus(handler[0].data.status);
            else if (handler[0].type === "file")
                res.sendFile((0, path_1.resolve)(handler[0].data.filePath));
        }
    });
    server._router.stack.forEach(function (e) { return log(e.regexp); });
    server.listen(serverConfig.port, function () { log("Server running on port " + serverConfig.port); });
    return server;
}
