import { httpslocalhost } from 'https-localhost';
import * as https from 'https';

async function main() {
        const certs = await httpslocalhost.getCerts()
        const server = https.createServer({
                ...certs,
                
        }, (req, res)=>{
                // set response header
                res.writeHead(200, { 'Content-Type': 'text/html' }); 

                // set response content    
                res.write('<html><body><p>This is home Page.</p></body></html>');
                res.end();
        }).listen(53100);
}
main();
