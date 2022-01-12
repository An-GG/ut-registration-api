import repl from 'repl';
import fetch from 'node-fetch';
import cheerio, { CheerioAPI } from 'cheerio';
import { RegistrationSession } from './api.js';
import { readFileSync } from 'fs';

const REPL_ON = true;
var g = {} as any;

let ses = new RegistrationSession(2022, 'Spring', new Map([
    [
        '_shibsession_64656661756c7468747470733a2f2f75746469726563742e7574657861732e6564752f73686962626f6c657468',
        '_f769e6ddf5ec09d939f93d2b48bb02c3'
    ],
    [
        'ut_persist', 
        '1896261824.47873.0000'
    ]
]));
await ses.collectMaxNonces();

let utdredir = await fetch('https://utdirect.utexas.edu', { redirect: 'manual' });
let utdurl = new URL(utdredir.headers.get('location'));
utdurl.searchParams.set('RelayState', 'https://127.0.0.1/');
console.log(utdurl.toString());
// reg.forEach((nod)=>{console.log(nod('#regform').serialize().split('&'))});   
let reg: CheerioAPI[]= [];

reg.push(cheerio.load(readFileSync('/Users/ankushgirotra/Downloads/ut-registration-api/Registration_files/Registration.html').toString()));
for (let i = 1; i <= 5; i++) {
    reg.push(cheerio.load(readFileSync('/Users/ankushgirotra/Downloads/ut-registration-api/Registration_files/Registration ('+i+').html').toString()));
}

g = {
    ses,
    cheerio,
    fetch,
    reg,
    clear:()=>{setTimeout(console.clear, 50)}
}
async function SETUP_REPL() {
    if(REPL_ON) {
        let r = repl.start({ useGlobal:true });
        Object.assign(r.context, g);
    }
}


SETUP_REPL();

