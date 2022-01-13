import repl from 'repl';
import fetch from 'node-fetch';
import cheerio, { CheerioAPI } from 'cheerio';
import { RegistrationSession } from './api.js';
import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cred = readFileSync(__dirname+'/../credential').toString().split('\n');

const REPL_ON = true;
var g = {} as any;





let ses = new RegistrationSession(2022, 'Spring');
/*new RegistrationSession(2022, 'Spring', new Map([
    [
        '_shibsession_64656661756c7468747470733a2f2f75746469726563742e7574657861732e6564752f73686962626f6c657468',
        '_4c815ad4d2e5fea704b6f01be22f1b64'
    ],
    [
        'ut_persist', 
        '1879484608.47873.0000'
    ]
]));
*/

let page;
let reg: CheerioAPI[]= [];

let r = await ses.chromeProgrammaticAuthentication(cred[0], cred[1]);

reg.push(cheerio.load(readFileSync('/Users/ankushgirotra/Downloads/ut-registration-api/Registration_files/Registration.html').toString()));
for (let i = 1; i <= 5; i++) {
    reg.push(cheerio.load(readFileSync('/Users/ankushgirotra/Downloads/ut-registration-api/Registration_files/Registration ('+i+').html').toString()));
}

g = {
    ses,
    cheerio,
    fetch,
    reg,
    clear:()=>{setTimeout(console.clear, 50)},
    page,
    r
}
async function SETUP_REPL() {
    if(REPL_ON) {
        let r = repl.start({ useGlobal:true });
        Object.assign(r.context, g);
    }
}


SETUP_REPL();

