# UT registration API

- Uses get and post requests with query params, works using forms basically no scripts
  - `searchCheck()` runs on main form submit, changes endpoint depending on command
  - `validateForm()` only on acknowledgement page, checks to see if box checked
-

Example Add Course Request
---

```
https://utdirect.utexas.edu/registration/registration.WBX?s_ccyys=20219&s_student_eid=&s_nonce=6AF77094C124A64548E0AC700718D7DDD5F9F239&s_unique_search=11380&s_unique=11380&s_request=STADD&s_unique_add=&s_unique_drop=+&s_swap_unique_drop=+&s_swap_unique_add=&s_submit=Submit
```

Endpoint:
`https://utdirect.utexas.edu/registration/`

Query Params:
```
's_ccyys' => '20219',
's_student_eid' => '',
's_nonce' => '6AF77094C124A64548E0AC700718D7DDD5F9F239',
's_unique_search' => '11380',
's_unique' => '11380',
's_request' => 'STADD',
's_unique_add' => '',
's_unique_drop' => ' ',
's_swap_unique_drop' => ' ',
's_swap_unique_add' => '',
's_submit' => 'Submit'
```

Security
---
- standard auth headers / cookies need to be set,
  - SC cookie is updated in response headers, should be updating this like a normal browser agent but it doesn't matter too much
- **nonce thing**
  - need a unique 160 bit hex string in the `s_nonce` param
  - unfortunately cannot generate nonce yourself (no secret hash fn), it seems like server creates them and adds them to a list, then ships them to user (which kind of defeats the purpose of a nonce but theres SSL so whatever)
  - expectedly, nonces are not hyper-unique to any request. Any nonce you get can be used for any request
    - you can get a nonce from the `chooseSemester.WBX` page which is open before registration period, so just spam it and keep a bunch of nonces in a stack
      - TODO: test limits of generating nonce, prob a max num limit, don't really need alot tho


Request Details
---
> **Note:** The programmers thought it would be funny if each command used its own special combination of endpoint and request method. endpoint is usually `https://utdirect.utexas.edu/registration/registration.WBX` with exceptions below

value of **s_request**
- Main Registration Page **(use GET request)** 
  - `STGAC`: SEARCH for another section of the same course. 
    - endpoint: `https://utdirect.utexas.edu/registration/searchClasses.WBX`
  - `STADD`: REGISTER for or ADD
  - `STDRP`: DROP 
  - `STSWP`: DROP DEPENDENT UPON successfully ADDING
  - `STAWL`: ADD to waitlist
  - `STCPF`: CHANGE to or from PASS/FAIL or CREDIT/NO CREDIT basis
  - `STGOF`: ?????? get optional fees or something, idk ive never seen it
    - endpoint: `https://utdirect.utexas.edu/registration/optionalFees.WBX`
- Other **(use POST request)**
  - `STGAR`: *clicked button to begin registration at https://utdirect.utexas.edu/registration/chooseSemester.WBX*
    - endpoint is still `registration.WBX`
  - `STUOF`: *single time acknowledgement (first registration every semester)*
    - endpoint: `https://utdirect.utexas.edu/registration/confirmEmailAddress.WBX`


value of **s_ccyys** aka semester code
 - `#####` 5 digit number, first 4 digits = year
 - last digit is semester code:
   - `2` Spring
   - `6` Summer
   - `9` Fall
