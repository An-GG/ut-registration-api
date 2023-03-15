import fetch from 'node-fetch';
import { Response } from 'node-fetch';
import cheerio, { CheerioAPI } from 'cheerio';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { chromeGUIAuthentication } from 'ut-auth-utils';

/**
 * Class representing an active browser session connected to UT Direct, a web application used for course registration at the University of Texas at Austin.
 * @class RegistrationSession
 */
export class RegistrationSession {

    private ut_direct_url = 'https://utdirect.utexas.edu/';
    private cookies:Map<string, string> = new Map();

    private min_nonce_count = 10;
    private max_nonce_count = 20;
    private new_nonces: string[] = [];
    private used_nonces_count: number = 0;

    private cookie_file = "/tmp/utreg-cookiejar.json";
    private disable_cookie_file = false;

    private sem_codes: {[k in Request.Semester]:number}  = { 'Spring': 2, 'Summer': 6, 'Fall': 9 }
    private year: number;
    private semester: Request.Semester;
    private ccyys: string;

    /**
     * Create a new registration session.
     * @constructor
     * @param {number} year - Year of the semester.
     * @param {Request.Semester} semester - Semester (Spring, Summer, or Fall).
     * @param {Request.Cookie[]} init_cookies - Setup these cookies in the session.
     * @param {RegistrationSessionOptions} [opts] - Optional configuration options.
     *  `cookie_storage_dir` - specify a file to store and load cookies from, so that cookies can persist between program runs. Default is `/tmp/utreg-cookiejar.json`
     *  configure max/min stored nonce count
     */
    constructor(year: number, semester: Request.Semester, init_cookies?: Request.Cookie[], opts?:Partial<RegistrationSessionOptions>) {
        this.year = year;
        this.semester = semester;
        this.ccyys = year + '' + this.sem_codes[semester];

        
        opts = opts ? opts : {};
        for (let k of Object.keys(opts as RegistrationSessionOptions)) {
            (this as any)[k] = (opts as any)[k]
        }


        if (init_cookies) {
            init_cookies.forEach(c=>this.cookies.set(c.name, c.value));
        }
        if (existsSync(this.cookie_file) && !this.disable_cookie_file) {
            let old_cookies = JSON.parse(readFileSync(this.cookie_file).toString()) as Request.Cookie[]
            old_cookies.forEach(c=>this.cookies.set(c.name, c.value));
        }
    }

    /**
     * Login to UT Direct through a graphical Chromium window to get session cookies.
     * If your cookies are recent, you shouldn't have to do anything.
     */
    public async login() {
        let cookie_set = Array.from(this.cookies).map((v) => { return { name:v[0], value:v[1] }});
        let new_cookies = await chromeGUIAuthentication(this.ut_direct_url, cookie_set);
        new_cookies.forEach(c=>this.cookies.set(c.name, c.value));
    }

    /**
     * Explicitly logout - meaning delete this sessions cookies, AND delete the cookie file.
     * 
     * Normally you shouldn't call this, just exit from your script (this will persist your cookies). 
     * Call this if you want to deauthorize the current session and force a full sign-in the next time 
     * you login().
     */
    public async logout() {
        this.cookies = new Map();
        rmSync(this.cookie_file);
    }

    /**
     * Begins the registration process by selecting the target semester among the available semesters.
     * Not required to call, but useful for getting the current state.
     * @returns {Request.FetchResponse} A promise containing the server response.
     */
    public beginRegistration() {
        return this._req('STGAR', 'POST', 'form', 'registration/registration.WBX', {});
    }

    /**
     * Submits the acknowledgment form (that shows up only the first time you enter registration each semester) 
     * stating that 'I acknowledge that the courses for which I am registering are consistent with my degree plan.'
     *
     * Submitting this form is technically the only thing you need to wait on before requesting course add/drops.
     * 
     * I have a vague feeling that the server is probably too lazy to confirm you submitted this form, and that you don't need to 
     * actually submit this before making real requests, but I've never tried doing that.   `¯\_(ツ)_/¯`
     * @returns {Request.FetchResponse} A promise containing the server response.
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
     * Adds a course to your schedule.
     * @param unique_course_id {number} The unique course identifier.
     * @returns {Request.FetchResponse} A promise containing the server response.
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
     * Drops a course from your schedule.
     * @param unique_course_id {number} The unique course identifier.
     * @returns {Request.FetchResponse} A promise containing the server response.
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
     * Swaps courses with the condition of dropping one course only if adding the other is successful.
     * aka 'DROP DEPENDENT UPON successfully ADDING'.
     * @param drop_unique_id {number} The unique course identifier of the course to be dropped.
     * @param add_unique_id {number} The unique course identifier of the course to be added.
     * @returns {Request.FetchResponse} A promise containing the server response.
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
     * Joins the waitlist for a course.
     * @param unique_course_id {number} The unique course identifier.
     * @param optional_swap_course_id {number} [optional] The unique course identifier of the course to be swapped if a seat becomes available.
     * @returns {Request.FetchResponse} A promise containing the server response.
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
     * Toggles the grading basis for a course (e.g., change between Pass/Fail and Credit/No Credit).
     * aka 'CHANGE to or from PASS/FAIL or CREDIT/NO CREDIT basis'
     * @param unique_course_id {number} The unique course identifier.
     * @returns {Request.FetchResponse} A promise containing the server response.
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
     * Searches for other open sections of the same course.
     * aka 'SEARCH for another section of the same course'
     * Gets all other sections that are open (not waitlisted) for a given course_id. Will never return the given course_id as a result, even if the given course is open.
     * @param unique_course_id {number} The unique course identifier.
     * @returns {Request.FetchResponse} A promise containing the server response.
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

    /**
     * This method fetches a single nonce and appends it to the list of available nonces.
     * 
     * A unique server-generated nonce is required alongside each request, which can only be used once. These are normally embedded in the HTML form content 
     * returned after every request, but acquiring a nonce this way makes things unnecessarily slow because we have to wait for the server to respond.
     * Fortunately, we can collect many nonces before making a single request from the chooseSemester.WBX page and use them whenever we want.
     * @returns {Request.FetchResponse} A promise containing the server response.
     */
    public async collectNonce() {
        let n_before = this.new_nonces.length + this.used_nonces_count;
        let r = await this._fetch('https://utdirect.utexas.edu/registration/chooseSemester.WBX', {});
        let n_after = this.new_nonces.length + this.used_nonces_count;
        if (!(n_after > n_before)) {
            throw new Error(`Nonce count did not increase. \n\tn_before: ${n_before}\n\tn_after: ${n_after}\n`);
        };
        return r;
    }

    /**
     * Collects many nonces (as many as max_nonce_count) simultaneously. 
     * @returns {Request.FetchResponse} A set of promises containing the server responses.
     */
    public async collectMaxNonces() {
        let waiters = [];
        for (let i = 0; i < this.max_nonce_count - this.new_nonces.length; i++) {
            waiters.push(this.collectNonce());
        }
        return await Promise.all(waiters);
    }

    
    /** Extra Utility Methods */

    /**
     * Retrieves registration information from the RIS page.
     * @param prevent_throw_on_parse_error {boolean} [optional] Set to true to prevent throwing errors when parsing registration times.
     * @returns {Promise<ReturnType<typeof this['getRIS']>>} A promise containing registration information, including schedule and bars status.
     */
    public async getRIS(prevent_throw_on_parse_error?: boolean) {
        let res = await this._fetch( this.ut_direct_url + 'registrar/ris.WBX', {
            body: `ccyys=${this.ccyys}&seq_num=0`,
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            }
        });
        let encountered_errors: Error[] = [];

        let schedule_elements = res
            .dom('a[name=reg]')
            .nextUntil('.textblock')
            .last()
            .next()
            .children()
            .not('.textblock');
        let times_raw = schedule_elements
            .text()
            .split('\n')
            .join('')
            .trim()
            .split('|')
            .map(t => t.trim());

        // Attempt to parse registration times
        let times: {start:Date, stop:Date}[] = [];
        for (let t of times_raw) {
            try {
                let parsed_times = this._parse_ris_daterange(t);
                times.push(...parsed_times);
            } catch(e) {
                if (!prevent_throw_on_parse_error) {
                    throw e;
                } else {
                    encountered_errors.push(e);
                }
            }
        }

        // Attempt to parse registration bars
        let bars_elements = res
            .dom('div.textblock.barlist')
        
        let bars_cleared = bars_elements.text().trim() == 'You have no bars at this time.';

        return {
            bars: {
                bars_cleared,
                _raw_elements: bars_elements,
                _raw_text: bars_elements.text() 
            },
            schedule: {
                times: times,
                _raw_elements: schedule_elements,
                _raw_times: times_raw
            },
            encountered_errors,
            _raw_ris_fetch_result: res,
        };
    }

    /**
     * Get class listing from the class listing page.
     * @returns {Promise<any[]>} - A promise resolving to an array of class listings.
     */
    public async getClassListing() {
        let res = await this._fetch(this.ut_direct_url + 'registration/classlist.WBX?sem=' + this.ccyys, {});
        let headers = this._ch(res.dom, 'table th').map(elm=>elm.text());
        let rows = this._ch(res.dom, 'table tr[valign=top]').map(elm=>{
            let tds = this._ch(elm, 'td');
            while (tds.length > headers.length) { tds.pop(); }
            let out:{ [k in string]:string } = {}
            let i = 0;
            for (let td of tds) {
                out[headers[i]]=td.text()
                i++;
            }
            return out;
        });
        return rows;
    }

    /**
     * Take a nonce from the `new_nonces` array, or throw an error if it's empty.
     * @returns {string} - A nonce.
     * @throws {Error} - If there are no nonces left in the `new_nonces` array.
     * @internal
     */
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

    /**
     * Helper function for cheerio.
     * @param {CheerioAPI} ch - Cheerio API instance.
     * @param {string} sel - Selector string.
     * @returns {Array<Cheerio>} - Array of cheerio instances.
     * @internal
     */
    private _ch(ch:CheerioAPI, sel:string) {
        return ch(sel).toArray().map((n)=>{return cheerio.load(n)})
    }

    /**
     * Parse the given cookie string and add it to the `cookies` map.
     * @param {string} cs - Cookie string.
     * @internal
     */
    private _parse_cookie_string(cs: string) {
        let seperated_cs = cs.split(', ');
        for (let single_cs of seperated_cs) {
            let single_cs_vars = single_cs.split('; ').map((ck)=>ck.split('='));
            // first var is k/v
            this.cookies.set(single_cs_vars[0][0], single_cs_vars[0][1]);
            if (!this.disable_cookie_file) { writeFileSync(this.cookie_file, JSON.stringify(this.cookies)) }
        }
    }

    /**
     * Generate a cookie string from the `cookies` map.
     * @returns {string} - The generated cookie string.
     * @internal
     */
    private _make_cookie_string() {
        return Array.from(this.cookies).map(c=>c[0]+'='+c[1]).join('; ');
    }

    /**
     * Parse the RIS date range string.
     * @param {string} s - RIS date range string.
     * @returns {Array<{start: Date, stop: Date}>} - An array of start and stop date objects.
     * @throws {Error} - If the given string cannot be parsed correctly.
     * @internal
     */
    private _parse_ris_daterange(s:string) {
            if (s.length == 0) { return []; }
            let _seperated = s.split(',');
            if (_seperated.length != 2) { throw new Error('Something went wrong while parsing RIS schedule. \n\n'+s); }
            let regdays = _seperated[0].split('-').map(rg=>rg.trim());
            let timewindow = _seperated[1].split('-').map(tw=>tw.trim());
            if (timewindow.length != 2) { throw new Error('Something went wrong while parsing RIS schedule. \n\n'+s); }
            
            // Manual Cleanup
            // If regdays has an end date, if the end date doesn't include a space (so probably only a number), append the month from the start date
            // If regdays only has start, push the start date as end date
            if (regdays.length == 2) {
                if (!regdays[1].includes(' ')) {
                    let monthstr = regdays[0].split(' ')[0];
                    regdays[1] = monthstr + ' ' + regdays[1];
                }
            } else { regdays.push(regdays[0]); }

            // Add year to reg dates
            // If spring semester, then check if month is September or later. If it is, year is 1 less than Semester year. 
            regdays = regdays.map((rg) => {
                let d = new Date(rg);
                let y = this.year;
                if (this.semester == 'Spring') {
                    if (d.getMonth() >= 7) {
                        y -= 1;
                    }
                }
                return rg + ' ' + y;
            });

            // If the end time is 'Midnight' replace with 11:59 PM
            if (timewindow[1] == 'Midnight') {
                timewindow[1] = '11:59 PM';
            }

            // If a time doesn't include ':' then add it
            timewindow = timewindow.map(tw => {
                if (!tw.includes(':')) {
                    return tw.split(' ').join(':00 ');
                } else {
                    return tw;
                }
            });

            let current = new Date(regdays[0]);
            let end_date = new Date(regdays[1]);

            let times: {start:Date, stop:Date}[] = [];
            while (current <= end_date) {
                let c_str = current.toISOString().split('T')[0];
                times.push({
                    start: new Date(timewindow[0] + ' ' + c_str),
                    stop:  new Date(timewindow[1] + ' ' + c_str),
                });
                current.setDate(current.getDate() + 1);
            }
            return times;
    }

    /**
     * Fetch a resource using the provided URL and options.
     * @param {Parameters<typeof fetch>[0]} url - The URL to fetch.
     * @param {Parameters<typeof fetch>[1]} opts - Fetch options.
     * @returns {Promise<{r: Response, body?: string, dom?: CheerioAPI}>} - A promise resolving to an object containing the response, body (if any), and Cheerio DOM (if any).
     * @throws {Error} - If the response status code is not 200.
     * @internal
     */
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

     /**
     * Send a request to the specified endpoint with the given parameters.
     * @param {Request.Code} code - The request code.
     * @param {'POST' | 'GET'} method - The HTTP method to use.
     * @param {'form' | 'url'} param_mode - Parameter mode, either 'form' or 'url'.
     * @param {Request.Endpoint} ep - The endpoint to send the request to.
     * @param {Request.Params} params - The request parameters.
     * @returns {Promise<{r: Response, body?: string, dom?: CheerioAPI}>} - A promise resolving to an object containing the response, body (if any), and Cheerio DOM (if any).
     * @throws {Error} - If the response contains an error message.
     * @internal
     */
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

    export type Semester = 'Spring' | 'Summer' | 'Fall'

    export type Cookie = { name:string, value:string, [k:string]:any }

    export type FetchResponse = ReturnType<RegistrationSession["_fetch"]>
}

export type RegistrationSessionOptions = {
    max_nonce_count:number,
    min_nonce_count:number,
    cookie_file:string,
    disable_cookie_false:boolean
}

