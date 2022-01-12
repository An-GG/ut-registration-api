import repl from 'repl';
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import { RegistrationSession } from './api.js';

const REPL_ON = true;
var g = {} as any;

let ses = new RegistrationSession(2022, 'Spring', new Map([
    [
        '_shibsession_64656661756c7468747470733a2f2f75746469726563742e7574657861732e6564752f73686962626f6c657468',
        '_6c816f50630e31241613ae39d6a5865a'
    ],
    [
        'ut_persist', 
        '1896261824.47873.0000'
    ]
]));
let ack = await ses._fetch(ses.ut_direct_url+'registration/confirmEmailAddress.WBX', {});

g = {
    ses,
    cheerio,
    ack
}
async function SETUP_REPL() {
    if(REPL_ON) {
        let r = repl.start({ useGlobal:true });
        Object.assign(r.context, g);
    }
}


SETUP_REPL();

