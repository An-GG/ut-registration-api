import repl from 'repl';
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import { RegistrationSession } from './api.js';

const REPL_ON = true;
var g = {} as any;

g.ses = new RegistrationSession(2022, 'Spring', new Map([
    ['_shibsession_64656661756c7468747470733a2f2f75746469726563742e7574657861732e6564752f73686962626f6c657468','_f7821ef1ae6e49d35e35d3f830cb7010'],
    ['ut_persist', '1896261824.47873.0000']
]));

g.cheerio = cheerio;

async function SETUP_REPL() {
    if(REPL_ON) {
        let r = repl.start({ useGlobal:true });
        Object.assign(r.context, g);
    }
}


SETUP_REPL();

