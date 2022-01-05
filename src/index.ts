import fetch from 'node-fetch';
import rp from 'repl';


let g = {} as any;

g.fetch = fetch;


let utd_res = await fetch('https://utdirect.utexas.edu');
let utd_src = utd_res.body.read().toString();
console.log(module);




