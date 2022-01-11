const REPL_ON = true;


import { readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import repl from 'repl';
import * as nhp from 'node-html-parser'
import cheerio from 'cheerio'
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { duonative_set_iframe_src } from './duo.js';

let g = {} as any;

g.fetch = fetch;


type Oreo = {
    key: string,
    value: string,
    raw: { [k:string]:string|true }
};

let parseCookieString = (cs: string) => {
    return cs.split(', ').map((cs_str)=>{
        let ck_set = cs_str.split('; ').map((ck)=>ck.split('='));
        let kv_set = ck_set[0];
        let oreo: Oreo = {
            key: kv_set[0],
            value: kv_set[1],
            raw: {}
        }
        ck_set.forEach((other_kv_set)=>{ oreo.raw[other_kv_set[0]]=(other_kv_set[1] ? other_kv_set[1] : true) });
        return oreo;
    });
}

let makeCookieString = (oreos: Oreo[]) => {
    return oreos
        .map((oreo) => oreo.key+'='+oreo.value)
        .join('; ');
}


let res = await fetch('https://utdirect.utexas.edu', {
    redirect: "manual"
});


let utd_redirect = res.headers.get('location');
let utd_set_cookies = parseCookieString(res.headers.get('set-cookie'));

res = await fetch(utd_redirect, {
    redirect: "manual",
});



let login_redirect = res.headers.get('location');
let login_set_cookies = parseCookieString(res.headers.get('set-cookie'));

res = await fetch(login_redirect, {
    redirect: "manual",
    headers: {
        cookie: makeCookieString(login_set_cookies)
    }
});

let login_content = res.body.read().toString();
let login_dom = cheerio.load(login_content.replaceAll('noscript', 'div'));
let login_submit_btn = login_dom('input[value=Continue][type=submit]');
let login_form = login_submit_btn.parents().find('form'); 

login_redirect = (new URL(login_redirect)).origin + login_form.attr('action');
res = await fetch(login_redirect, {
    redirect: 'manual',
    body: login_form.serialize(),
    method: login_form.attr('method'),
    headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: makeCookieString(login_set_cookies)
    }
});

login_redirect = res.headers.get('location');
res = await fetch(login_redirect, {
    redirect: "manual",
    headers: {
        cookie: makeCookieString(login_set_cookies)
    }
});

login_content = res.body.read().toString();
login_dom = cheerio.load(login_content);
login_form = login_dom('form.loginForm');

// set credentials
let __filename = fileURLToPath(import.meta.url);
let __dirname = dirname(__filename);
const credential = readFileSync(resolve(__dirname, '../credential')).toString().split('\n');

login_form.find('#username')[0].attribs.value = credential[0];
login_form.find('#password')[0].attribs.value = credential[1];
login_form.find('#login-button > input')[0].attribs.type = 'hidden';


login_redirect = (new URL(login_redirect)).origin + login_form.attr('action');

res = await fetch(login_redirect, {
    redirect: 'manual',
    body: login_form.serialize(),
    method: login_form.attr('method'),
    headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: makeCookieString(login_set_cookies)
    }
});


login_redirect = res.headers.get('location');
res = await fetch(login_redirect, {
    redirect: "manual",
    headers: {
        cookie: makeCookieString(login_set_cookies)
    }
});


login_content = res.body.read().toString();
login_dom = cheerio.load(login_content);
let duo_iframe = login_dom("#duo_iframe")[0];
duonative_set_iframe_src(duo_iframe, (new URL(login_redirect)).origin);

console.log(duo_iframe.attribs.src);

async function runtest() {
    let res2 = await fetch(duo_iframe.attribs.src, {
        method: "GET",
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
        },
        redirect: "manual",
    });
    g.res2 = res2;

    setTimeout(()=>{

        console.log(res2.body.read().toString());
    }, 1000);
}
await runtest();
/*
login_content = res.body.read().toString();
login_dom = cheerio.load(login_content);
let duo_login_form = login_dom('#login-form')[0];
*/




g.login = {
    login_dom,
    login_form,
    login_content,
    login_redirect,
    login_submit_btn,
    login_set_cookies,
    duo_iframe,
//    duo_login_form
}

//res = await fetch("https://enterprise.login.utexas.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s1", {
//  "body": "shib_idp_ls_exception.shib_idp_session_ss=&shib_idp_ls_success.shib_idp_session_ss=true&shib_idp_ls_value.shib_idp_session_ss=&shib_idp_ls_exception.shib_idp_persistent_ss=&shib_idp_ls_success.shib_idp_persistent_ss=true&shib_idp_ls_value.shib_idp_persistent_ss=&shib_idp_ls_supported=true&_eventId_proceed=",
//  "method": "POST"
//});




// standard headers
let standard_headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    "content-type": "application/x-www-form-urlencoded",
    "pragma": "no-cache",
    "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"97\", \"Chromium\";v=\"97\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "upgrade-insecure-requests": "1",
    "cookie": "JSESSIONID=532680594C1115B9A3DF8C539FFE4639",
    "Referer": "https://enterprise.login.utexas.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s1",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}


g = {
    ...g,
    ...g.login,
    res,
    parseCookieString,
    cheerio
};

if(REPL_ON) {
    let r = repl.start({ useGlobal:true });
    Object.assign(r.context, g);
}

