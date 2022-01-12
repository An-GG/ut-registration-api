import fetch from 'node-fetch';
import { Response } from 'node-fetch';
import cheerio, { CheerioAPI } from 'cheerio';



export namespace Request {
    
    export type Endpoint = 
        'registration/registration.WBX' 
        | 'registration/searchClasses.WBX' 
        | 'registration/confirmEmailAddress.WBX'

    export type ParamKeys = 
        's_ccyys' 
        | 's_student_eid' 
        | 's_nonce' 
        | 's_unique_search' 
        | 's_unique' 
        | 's_request' 
        | 's_unique_add' 
        | 's_unique_drop' 
        | 's_swap_unique_drop' 
        | 's_swap_unique_add' 
        | 's_submit'
        | 's_sbec'
        | 's_af_unique'
        | 'ack_sw'
        | 'ack_degr_plan'

    export type ManagedParamKeys =
        's_ccyys'
        | 's_nonce'
        | 's_request'
        | 's_student_eid'

    export type FilteredParamKeys = Exclude<ParamKeys, ManagedParamKeys>

    export type Params = Partial< { [k in FilteredParamKeys]: string; } >;

    export type ManagedParams = { [k in ManagedParamKeys]: string; }

    export type Code =
        'STGAC'
        | 'STADD'
        | 'STDRP'
        | 'STSWP'
        | 'STAWL'
        | 'STCPF'
        | 'STGOF'
        | 'STGAR'
        | 'STUOF'
}

export type RegistrationSessionOptions = Partial<{
    max_nonce_count:number,
    min_nonce_count:number
}>

export class RegistrationSession {

    ut_direct_url = 'https://utdirect.utexas.edu/';
    min_nonce_count = 10;
    max_nonce_count = 20;


    constructor(year: number, semester: 'Spring' | 'Summer' | 'Fall', init_cookies: Map<string, string>, opts:RegistrationSessionOptions) {
        let sem_codes = {
            'Spring': 2,
            'Summer': 6,
            'Fall': 9
        }
        this.ccyys = year + '' + sem_codes[semester];
        this.cookies = init_cookies;
        for (let k of Object.keys(opts)) {
            let kk = k as keyof typeof opts;
            this[kk] = opts[kk];
        }
    }

    public beginRegistration() {
        return this._req('STGAR', 'POST', 'form', 'registration/registration.WBX', {});
    }



    cookies:Map<string, string> = new Map();
    ccyys: string;

    new_nonces: string[] = [];
    used_nonces_count: number = 0;
    pending_nonce_requests: Promise<any>[] = [];


    private _take_nonce() {
        if (this.new_nonces.length == 0) 
            throw new Error('Ran out of nonces!');
        if (this.new_nonces.length < this.min_nonce_count)
            console.log(`WARNING: # of unused nonces (${this.new_nonces.length}) is less than defined minimum ${this.min_nonce_count}!`);
        while (this.new_nonces.length > this.max_nonce_count)
            { this.new_nonces.shift(); this.used_nonces_count++; }

        this.used_nonces_count++;
        return this.new_nonces.shift();
    }

    private _parse_cookie_string(cs: string) {
        let seperated_cs = cs.split(', ');
        for (let single_cs of seperated_cs) {
            let single_cs_vars = single_cs.split('; ').map((ck)=>ck.split('='));
            // first var is k/v
            this.cookies.set(single_cs_vars[0][0], single_cs_vars[0][1]);
        }
    }

    private _make_cookie_string() {
        return Array.from(this.cookies).map(c=>c[0]+'='+c[1]).join('; ');
    }

    private async _fetch(url: Parameters<typeof fetch>[0], opts: Parameters<typeof fetch>[1]): Promise<{r:Response, body?:string, dom?: CheerioAPI}> {
        opts.headers = opts.headers ? opts.headers : {};
        (opts.headers as any)['cookie'] = this._make_cookie_string();
        let r = await fetch(url, opts);
        if (r.status != 200) {
            throw new Error('Response code is not 200.');
        }
        if (r.headers.has('set-cookie')) {
            this._parse_cookie_string(r.headers.get('set-cookie'));
        }
        let body = await r.text();
        if (body) {
            let dom = cheerio.load(body);
            let nonce_elms = dom('input[name=s_nonce][value]'); 
                // get every input elm whose 'name' attribute equals 's_nonce' and whose 'value' attribute exists
            
            if (nonce_elms.length > 0) {
                this.new_nonces.push(nonce_elms.attr('value'));
            }
            return { r, body, dom };
        }
        return { r };
    }

    private async _req(code: Request.Code, method: 'POST' | 'GET', param_mode: 'form' | 'url', ep: Request.Endpoint, params: Request.Params) {
        let managed_params: Request.ManagedParams = {
            s_ccyys: this.ccyys,
            s_nonce: this._take_nonce(),
            s_request: code,
            s_student_eid: ''
        }
        let final_params = {
            ...params,
            ...managed_params 
        } as any;
        let enc = encodeURIComponent;
        let encoded_params = Object.keys(final_params).map((k)=>enc(k)+'='+enc(final_params[k])).join('&');
       
        let url = this.ut_direct_url + ep;
        let opts: Parameters<typeof fetch>[1] = {
            method: method,
            redirect: 'manual',
            headers: {}
        } 

        if (param_mode == 'form') {
            opts.body = encoded_params;
            (opts.headers as any)['content-type'] = 'application/x-www-form-urlencoded';
        } else {
            url = url + '?' + encoded_params;
        }

        let r = await this._fetch(url, opts);
        
        if (r.dom('span.error').length > 0) {
            throw new Error(r.dom('span.error').text());
        }
        return r;
    }

    public async collectNonce() {
        let n_before = this.new_nonces.length + this.used_nonces_count;
        let r = await this._fetch('https://utdirect.utexas.edu/registration/chooseSemester.WBX', {});
        let n_after = this.new_nonces.length + this.used_nonces_count;
        if (!(n_after > n_before)) {
            throw new Error(`Nonce count did not increase. \n\tn_before: ${n_before}\n\tn_after: ${n_after}\n`);
        };
        return r;
    }

    public async collectMaxNonces() {
        let waiters = [];
        for (let i = 0; i < this.max_nonce_count - this.new_nonces.length; i++) {
            waiters.push(this.collectNonce());
        }
        return await Promise.all(waiters);
    }



}



/**
 *  TODO 
 *  - test if collecting many nonces causes earlier ones to invalidate
 *      - what we know: when reg period is closed you don't need valid nonce to get same response 
 *  
 *  To build
 *  - elegant way to import your session cookies
 *  - remaining request methods
 *  - launch at precise time
 *      - scrape reg time?
 **/
