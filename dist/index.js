"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var yargs_1 = require("yargs");
var path_1 = require("path");
var server_1 = require("../server");
var log = console.log;
var servers = [];
var argv = (0, yargs_1.default)(process.argv).parse();
//log(argv)
var filename = (0, path_1.resolve)(argv._[0]);
servers.push((0, server_1.createCSSServer)(filename));
