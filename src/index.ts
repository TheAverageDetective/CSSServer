import yargs from "yargs";
import {resolve} from "path"

import { createCSSServer } from "../server";

const log = console.log
const servers : Array<Express.Application> = []

const argv = yargs(process.argv).parse()
//log(argv)

var filename = resolve( argv._[0] )

servers.push(createCSSServer(filename))
