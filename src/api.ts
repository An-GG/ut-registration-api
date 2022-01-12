import fetch from 'node-fetch';
import { Response } from 'node-fetch';
import cheerio, { CheerioAPI } from 'cheerio';
import puppeteer from 'puppeteer-core';



export class RegistrationSession {

    ut_direct_url = 'https://utdirect.utexas.edu/';
    min_nonce_count = 10;
    max_nonce_count = 20;


    constructor(year: number, semester: 'Spring' | 'Summer' | 'Fall', init_cookies?: Map<string, string>, opts?:RegistrationSessionOptions) {
        let sem_codes = {
            'Spring': 2,
            'Summer': 6,
            'Fall': 9
        }
        this.ccyys = year + '' + sem_codes[semester];
        this.cookies = init_cookies ? init_cookies : this.cookies;
        
        opts = opts ? opts : {};
        for (let k of Object.keys(opts)) {
            let kk = k as keyof typeof opts;
            this[kk] = opts[kk];
        }
    }

    /**
     * Equivalent to choosing the target semester among the available semesters at 'registration/chooseSemester.WBX'
     *
     * TODO: check if this is necessary to do before submitting other requests
     * - prob required. if you don't select, it redirects you to chooseSemester (but i didn't see any local cookie/cache storing semester)
     * - also not sure if you need to do this before submitting singleTimeAcknowledgement
     */
    public beginRegistration() {
        return this._req('STGAR', 'POST', 'form', 'registration/registration.WBX', {});
    }

    /**
     * Submits the form at 'registration/confirmEmailAddress.WBX' with the acknowledge box ticked.
     * 'I acknowledge that the courses for which I am registering are consistent with my degree plan.'
     */
    public singleTimeAcknowledgement() {
        return this._req('STUOF', 'POST', 'form', 'registration/confirmEmailAddress.WBX', {
            's_sbec': 'T',
            's_af_unique': '',
            'ack_sw': 'Y',
            'ack_degr_plan': 'on' 
        });
    }

    /**
     * Add course.
     *
     * TODO: alot of these also have 'Submit' param which is just the submit button text, but idt that's needed
     */
    public addCourse(unique_course_id: number) {
        return this._req('STADD', 'GET', 'url', 'registration/registration.WBX', {
            's_unique_add':unique_course_id.toString(), 
            's_unique_drop':'+',     
            's_swap_unique_drop':'+',
            's_swap_unique_add':''
        });
    }

    /**
     * Drop course.
     */
    public dropCourse(unique_course_id: number) {
        return this._req('STDRP', 'GET', 'url', 'registration/registration.WBX', {
            's_unique_add':'', 
            's_unique_drop':unique_course_id.toString(),     
            's_swap_unique_drop':'+',
            's_swap_unique_add':''
        });
    }

    /**
     * Swap courses, aka 'DROP DEPENDENT UPON successfully ADDING'.
     */
    public swapCourses(drop_unique_id: number, add_unique_id: number) {
        return this._req('STSWP', 'GET', 'url', 'registration/registration.WBX', {
            's_unique_add':'',
            's_unique_drop':'+', 
            's_swap_unique_drop':drop_unique_id.toString(),
            's_swap_unique_add':add_unique_id.toString()  
        });
    }

    /**
     * Join course waitlist.
     */
    public joinWaitlist(unique_course_id: number, optional_swap_course_id?: number) {
        return this._req('STAWL', 'GET', 'url', 'registration/registration.WBX', {
            's_waitlist_unique':unique_course_id.toString(), 
            's_waitlist_swap_unique': optional_swap_course_id ? optional_swap_course_id.toString() : '+',
            's_unique_add':'',
            's_unique_drop':'+',         
            's_swap_unique_drop':'+',    
            's_swap_unique_add':''  
        });
    }

    /**
     * Toggle course grading basis, aka 'CHANGE to or from PASS/FAIL or CREDIT/NO CREDIT basis'
     */
    public toggleCourseGradingBasis(unique_course_id: number) {
        return this._req('STCPF', 'GET', 'url', 'registration/registration.WBX', {
            's_unique_add':'',
            's_unique_drop':'+',         
            's_swap_unique_drop':'+',    
            's_swap_unique_add':'',
            's_unique_pass_fail':unique_course_id.toString(),
        });
    }


    /**
     * Get all other sections that are open (not waitlisted) for a given course_id. Will never return the given course_id as a result, even if the given course is open.
     * 'SEARCH for another section of the same course'
     */
    public async searchForAnotherSection(unique_course_id: number) {
        let dom = (await this._req('STGAC', 'GET', 'url', 'registration/searchClasses.WBX', {
            's_unique_add':'',
            's_unique_drop':'+',         
            's_swap_unique_drop':'+',    
            's_swap_unique_add':'',
            's_unique_search': unique_course_id.toString(),
            's_unique': unique_course_id.toString()
        })).dom;
        
        let table_keys: {[k:string]:string} = {};
        let rows = this._ch(dom, 'table.searchTable tr');
        let th_row = rows.shift();
        
        let row_elms = this._ch(th_row, 'th[id]')
        for (let re of row_elms) {
            let k = re.root().children().attr('id');
            table_keys[k]=re.text();
        }

        let data_objs: {[unique_id:string]:any[]} = {};
        let current_uid:string;
        for (let r of rows) {
            let tds = this._ch(r, 'td[headers]');
            let kv_obj = {} as any;
            for (let td of tds) {
                let kn = td.root().children().attr('headers');
                let k = table_keys[kn];
                kv_obj[k] = td.root().contents().text();
            }
            if (Object.keys(kv_obj).includes('Unique')) {
                current_uid = kv_obj['Unique'];
            }
            if (data_objs[current_uid] == undefined) {
                data_objs[current_uid] = [];
            }

            data_objs[current_uid].push(kv_obj);
        }

        return data_objs;
    }

    private _ch(ch:CheerioAPI, sel:string) {
        return ch(sel).toArray().map((n)=>{return cheerio.load(n)})
    }
    public async chromeGUIAuthentication() {
        let chrome = await puppeteer.launch({
            channel: 'chrome',
            headless: false,
            defaultViewport: null
        });
        let page = await chrome.newPage();
        await page.goto(this.ut_direct_url);
        await page.on('framenavigated', async (event)=>{
            console.log(page.url());
            console.log(await page.cookies());
        });
        return page;
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

    async _fetch(url: Parameters<typeof fetch>[0], opts: Parameters<typeof fetch>[1]): Promise<{r:Response, body?:string, dom?: CheerioAPI}> {
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
            throw new Error(r.dom('span.error').parent().text());
        }
        return r;
    }



}

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
        | 's_unique_pass_fail'
        | 's_waitlist_unique'
        | 's_waitlist_swap_unique'
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

/**
 *  TODO 
 *  - test if collecting many nonces causes earlier ones to invalidate
 *      - what we know: when reg period is closed you don't need valid nonce to get same response 
 *  
 *  To build
 *  - elegant way to import your session cookies
 *  * remaining request methods
 *  - launch at precise time
 *      - scrape reg time?
 **/
