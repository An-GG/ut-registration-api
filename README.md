# ut-registration-api

> Check out the notes I wrote for myself while reverse engineering this API here: https://gist.github.com/An-GG/9ef0bfb88744a8183ec3d5faf1a39471 

Optimized interface for UT Austin's registration client written in TypeScript.

This interface is a one-to-one translation of [all the endpoints I have encountered and documented](https://gist.github.com/An-GG/9ef0bfb88744a8183ec3d5faf1a39471) with minor convenience abstractions.

- **Zero browser overhead:** Registration methods are implemented as pure fetch GET/POST requests and consist of only a single outgoing transaction, so you don't need to wait for the server to respond before you begin making requests. 
- **Parallelize requests:** Stockpile many nonces in advance and use them all at once, even if the server is unresponsive.


## Install

Add to your project:
```sh
$ npm i ut-registration-api
```

## Example

```js
let { chromeProgrammaticAuthentication, UT_DIRECT_URL } = require('ut-auth-utils')
let { RegistrationSession } = require('ut-registration-api')

async function main() {
    
    let cookies_from_authenticated_session = await chromeProgrammaticAuthentication('UT EID', 'password', UT_DIRECT_URL);
    let session = new RegistrationSession(2022, 'Spring', cookies_from_authenticated_session);

    // Need to get some nonces initially.
    // By default, this will collect 20 nonces. Nonces should repopulate after the server responds to requests.
    await session.collectMaxNonces();

    // Single time acknowledgement is required only once for each semester.
    // This is the page that asks you to check the box next to:
    // 'I acknowledge that the courses for which I am registering are consistent with my degree plan.'
    await session.singleTimeAcknowledgement();

    await session.addCourse(11111);
}
main();
```
> **NOTE:** Registration methods throw an error when they are unsuccessful. Assume method calls that don't throw completed successfully.

When running the example (with a valid EID/password), `addCourse` throws because `11111` isn't a valid course number.
```
$ node example.js
.../node_modules/ut-registration-api/dist/api.js:390
                throw new Error(r.dom('span.error').parent().text());
Error:         
        Add was unsuccessful because:
                The unique number entered is not a valid number.
                (Code:0095)
...
```

### What is `cookies_from_authenticated_session` ??

`RegistrationSession` cannot authenticate you using your EID/password directly because this is non-trivially complicated. Instead, you must provide cookies from an already authenticated session.

**Recomended Way To Get Gookies**: [ut-auth-utils](https://github.com/An-GG/ut-auth-utils) is used in the example. This package allows you to authenticate into a domain protected by the UT SSO service using your EID/password, either programmatically or through an automated Chrome window, and returns the authenticated session's cookies.


## TypeScript Usage

```ts
import { RegistrationSession } from 'ut-registration-api'

let session = new RegistrationSession(2022, 'Spring', cookies_from_authenticated_session);
await session.collectMaxNonces();
await session.singleTimeAcknowledgement();

await session.addCourse(11111);
```

## API

### Class: RegistrationSession


#### Constructors

- [constructor](#constructor)

#### Registration Methods
- [addCourse](#addcourse)
- [beginRegistration](#beginregistration)
- [dropCourse](#dropcourse)
- [joinWaitlist](#joinwaitlist)
- [searchForAnotherSection](#searchforanothersection)
- [singleTimeAcknowledgement](#singletimeacknowledgement)
- [swapCourses](#swapcourses)
- [toggleCourseGradingBasis](#togglecoursegradingbasis)

#### Methods
- [collectMaxNonces](#collectmaxnonces)
- [collectNonce](#collectnonce)
- [getClassListing](#getclasslisting)
- [getRIS](#getris)

### constructor

• **new RegistrationSession**(`year`, `semester`, `init_cookies?`, `opts?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `year` | `number` |
| `semester` | ``"Spring"`` \| ``"Summer"`` \| ``"Fall"`` |
| `init_cookies?` | `Map`<`string`, `string`\> |
| `opts?` | `Partial`<{ `max_nonce_count`: `number` ; `min_nonce_count`: `number`  }\> |

#### Defined in

[api.ts:17](https://github.com/An-GG/ut-registration-api/blob/master/src/api.ts#L17)

### Methods

___

### addCourse

▸ **addCourse**(`unique_course_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Add course.

#### Parameters

| Name | Type |
| :------ | :------ |
| `unique_course_id` | `number` |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

#### Defined in

[api.ts:60](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L60)

___

### beginRegistration

▸ **beginRegistration**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Equivalent to choosing the target semester among the available semesters at 'registration/chooseSemester.WBX'
Not really required, you can call the other methods without calling this. Useful to get current state.

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

#### Defined in

[api.ts:40](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L40)

___

### collectMaxNonces

▸ **collectMaxNonces**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }[]\>

Collects many nonces (as many as max_nonce_count) simultaneously.

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }[]\>

#### Defined in

[api.ts:188](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L188)

___

### collectNonce

▸ **collectNonce**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A unique server-generated nonce is required alongside each request, which can only be used once. These are normally embedded in the HTML form content
returned after every request, but acquiring a nonce this way makes things unnecessarily slow because we have to wait for the server to respond.
Fortunately, we can collect many nonces before making a single request from the chooseSemester.WBX page and use them whenever we want.

This method fetches a single nonce and appends it to the list of available nonces.

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

#### Defined in

[api.ts:175](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L175)

___

### dropCourse

▸ **dropCourse**(`unique_course_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Drop course.

#### Parameters

| Name | Type |
| :------ | :------ |
| `unique_course_id` | `number` |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

#### Defined in

[api.ts:72](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L72)

___

### getClassListing

▸ **getClassListing**(): `Promise`<{}[]\>

Get class listing from the class listing page.

#### Returns

`Promise`<{}[]\>

#### Defined in

[api.ts:267](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L267)

___

### getRIS

▸ **getRIS**(`prevent_throw_on_parse_error?`): Promise>

Get registration information from the RIS page. If `prevent_throw_on_parse_error` is true, method will return even if there were parsing errors. Use `encountered_errors` to detect if returned values may be inaccurate. 

#### Parameters

| Name | Type |
| :------ | :------ |
| `prevent_throw_on_parse_error?` | `boolean` |

#### Returns
```ts
Promise<{
    bars: {
        bars_cleared: boolean;
        _raw_elements: Cheerio<Element>;
        _raw_text: string;
    };
    schedule: {
        times: {
            start: Date;
            stop: Date;
        }[];
        _raw_elements: Cheerio<Element>;
        _raw_times: string[];
    };
    encountered_errors: Error[];
    _raw_ris_fetch_result: {
        body?: string
        dom?: CheerioAPI
        r: Response
    }
}>
```
#### Defined in

[api.ts:202](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L202)
___

### joinWaitlist

▸ **joinWaitlist**(`unique_course_id`, `optional_swap_course_id?`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Join course waitlist.

#### Parameters

| Name | Type |
| :------ | :------ |
| `unique_course_id` | `number` |
| `optional_swap_course_id?` | `number` |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

#### Defined in

[api.ts:96](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L96)

___

### searchForAnotherSection

▸ **searchForAnotherSection**(`unique_course_id`): `Promise`<{ [unique_id: string]: `any`[];  }\>

Get all other sections that are open (not waitlisted) for a given course_id. Will never return the given course_id as a result, even if the given course is open.
'SEARCH for another section of the same course'

#### Parameters

| Name | Type |
| :------ | :------ |
| `unique_course_id` | `number` |

#### Returns

`Promise`<{ [unique_id: string]: `any`[];  }\>

#### Defined in

[api.ts:125](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L125)

___

### singleTimeAcknowledgement

▸ **singleTimeAcknowledgement**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Submits the form at 'registration/confirmEmailAddress.WBX' with the acknowledge box ticked.
'I acknowledge that the courses for which I am registering are consistent with my degree plan.'

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

#### Defined in

[api.ts:48](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L48)

___

### swapCourses

▸ **swapCourses**(`drop_unique_id`, `add_unique_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Swap courses, aka 'DROP DEPENDENT UPON successfully ADDING'.

#### Parameters

| Name | Type |
| :------ | :------ |
| `drop_unique_id` | `number` |
| `add_unique_id` | `number` |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

#### Defined in

[api.ts:84](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L84)

___

### toggleCourseGradingBasis

▸ **toggleCourseGradingBasis**(`unique_course_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Toggle course grading basis, aka 'CHANGE to or from PASS/FAIL or CREDIT/NO CREDIT basis'

#### Parameters

| Name | Type |
| :------ | :------ |
| `unique_course_id` | `number` |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

#### Defined in

[api.ts:110](https://github.com/An-GG/ut-registration-api/blob/f6a960f/src/api.ts#L110)
