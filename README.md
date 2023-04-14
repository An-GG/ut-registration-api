# ut-registration-api

Optimized interface for UT Austin's registration client written in TypeScript.

> Check out the notes I wrote for myself while reverse engineering this API here: https://gist.github.com/An-GG/9ef0bfb88744a8183ec3d5faf1a39471 

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
let { RegistrationSession } = require('ut-registration-api')

async function main() {
    
    let session = new RegistrationSession(2023, 'Spring');
    await session.login();

    let ris = await session.getRIS();

    // Single time acknowledgement is required only once for each semester.
    // This is the page that asks you to check the box next to:
    // 'I acknowledge that the courses for which I am registering are consistent with my degree plan.'
    //
    // You need to call this manually at least once each semester, or requests will silently fail.
    await session.singleTimeAcknowledgement();

    await session.addCourse(11111);
}
main();
```
> **NOTE:** Registration methods throw an error when they are unsuccessful. Assume method calls that don't throw completed successfully.

When running the example, `addCourse` throws because `11111` isn't a valid course number.
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

~~`RegistrationSession` cannot authenticate you using your EID/password directly because this is non-trivially complicated. Instead, you must provide cookies from an already authenticated session.~~

> **Update:** This package now incorporates `ut-auth-utils`, and can create an authenticated session to fetch cookies on its own. The `login()` method will launch a Chromium window to login with your EID / password graphically. 

Session cookies are saved to `/tmp` by default, so you shouldn't need to login manually every time.


## TypeScript Usage

```ts
import { RegistrationSession } from 'ut-registration-api'

async function main() {
    let session = new RegistrationSession(2023, 'Spring');
    await session.login();

    let ris = await session.getRIS();
    let classes = await session.getClassListing();
}
main();
```

# API

# Class: RegistrationSession

Class representing an active browser session connected to UT Direct, a web application used for course registration at the University of Texas at Austin.

## Table of contents

### Constructors

- [constructor](README.md#constructor)

### Methods

- [addCourse](README.md#addcourse)
- [beginRegistration](README.md#beginregistration)
- [collectMaxNonces](README.md#collectmaxnonces)
- [collectNonce](README.md#collectnonce)
- [dropCourse](README.md#dropcourse)
- [getClassListing](README.md#getclasslisting)
- [getRIS](README.md#getris)
- [joinWaitlist](README.md#joinwaitlist)
- [login](README.md#login)
- [logout](README.md#logout)
- [searchForAnotherSection](README.md#searchforanothersection)
- [singleTimeAcknowledgement](README.md#singletimeacknowledgement)
- [swapCourses](README.md#swapcourses)
- [toggleCourseGradingBasis](README.md#togglecoursegradingbasis)

## Constructors

### constructor

• **new RegistrationSession**(`year`, `semester`, `init_cookies?`, `opts?`)

Create a new registration session.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `year` | `number` | Year of the semester. |
| `semester` | [`Semester`](../modules/Request.md#semester) | Semester (Spring, Summer, or Fall). |
| `init_cookies?` | [`Cookie`](../modules/Request.md#cookie)[] | Setup these cookies in the session. |
| `opts?` | `Partial`<[`RegistrationSessionOptions`](../modules.md#registrationsessionoptions)\> | Optional configuration options. `cookie_storage_dir` - specify a file to store and load cookies from, so that cookies can persist between program runs. Default is `/tmp/utreg-cookiejar.json` configure max/min stored nonce count |

#### Defined in

[api.ts:33](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L33)

## Methods

### addCourse

▸ **addCourse**(`unique_course_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Adds a course to your schedule.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unique_course_id` | `number` | {number} The unique course identifier. |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:104](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L104)

___

### beginRegistration

▸ **beginRegistration**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Begins the registration process by selecting the target semester among the available semesters.
Not required to call, but useful for getting the current state.

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:78](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L78)

___

### collectMaxNonces

▸ **collectMaxNonces**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }[]\>

Collects many nonces (as many as max_nonce_count) simultaneously, and stores them for later use.

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }[]\>

A set of promises containing the server responses.

#### Defined in

[api.ts:249](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L249)

___

### collectNonce

▸ **collectNonce**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

This method fetches a single nonce and appends it to the list of available nonces.

A unique server-generated nonce is required alongside each request, which can only be used once. These are normally embedded in the HTML form content 
returned after every request, but acquiring a nonce this way makes things unnecessarily slow because we have to wait for the server to respond.
Fortunately, we can collect many nonces before making a single request from the chooseSemester.WBX page and use them whenever we want.

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:235](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L235)

___

### dropCourse

▸ **dropCourse**(`unique_course_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Drops a course from your schedule.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unique_course_id` | `number` | {number} The unique course identifier. |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:118](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L118)

___

### getClassListing

▸ **getClassListing**(): `Promise`<{}[]\>

Get class listing from the class listing page.

#### Returns

`Promise`<{}[]\>

- A promise resolving to an array of class listings.

#### Defined in

[api.ts:372](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L372)

___

### getRIS

▸ **getRIS**(`prevent_throw_on_parse_error?`): `Promise`<{ `start`: `Date` ; `stop`: `Date`  }[]\>

Retrieves registration schedule.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `prevent_throw_on_parse_error?` | `boolean` | {boolean} [optional] Set to true to prevent throwing errors when parsing registration times. |

#### Returns

`Promise`<{ `start`: `Date` ; `stop`: `Date`  }[]\>

A promise containing an array of registration start and stop times as Date objects.

#### Defined in

[api.ts:265](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L265)

___

### joinWaitlist

▸ **joinWaitlist**(`unique_course_id`, `optional_swap_course_id?`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Joins the waitlist for a course.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unique_course_id` | `number` | {number} The unique course identifier. |
| `optional_swap_course_id?` | `number` | {number} [optional] The unique course identifier of the course to be swapped if a seat becomes available. |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:149](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L149)

___

### login

▸ **login**(): `Promise`<`void`\>

Login to UT Direct through a graphical Chromium window to get session cookies.
If your cookies are recent, you shouldn't have to do anything.

Additionally fills up our nonce stash by calling collectMaxNonces()

#### Returns

`Promise`<`void`\>

#### Defined in

[api.ts:56](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L56)

___

### logout

▸ **logout**(): `Promise`<`void`\>

Explicitly logout - meaning delete this sessions cookies, AND delete the cookie file.

Normally you shouldn't call this, just exit from your script (this will persist your cookies). 
Call this if you want to deauthorize the current session and force a full sign-in the next time 
you login().

#### Returns

`Promise`<`void`\>

#### Defined in

[api.ts:68](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L68)

___

### searchForAnotherSection

▸ **searchForAnotherSection**(`unique_course_id`): `Promise`<{ `[unique_id: string]`: `any`[];  }\>

Searches for other open sections of the same course.
aka 'SEARCH for another section of the same course'
Gets all other sections that are open (not waitlisted) for a given course_id. Will never return the given course_id as a result, even if the given course is open.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unique_course_id` | `number` | {number} The unique course identifier. |

#### Returns

`Promise`<{ `[unique_id: string]`: `any`[];  }\>

A promise containing the server response.

#### Defined in

[api.ts:184](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L184)

___

### singleTimeAcknowledgement

▸ **singleTimeAcknowledgement**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Submits the acknowledgment form (that shows up only the first time you enter registration each semester) 
stating that 'I acknowledge that the courses for which I am registering are consistent with my degree plan.'

Submitting this form is technically the only thing you need to wait on before requesting course add/drops.

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:90](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L90)

___

### swapCourses

▸ **swapCourses**(`drop_unique_id`, `add_unique_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Swaps courses with the condition of dropping one course only if adding the other is successful.
aka 'DROP DEPENDENT UPON successfully ADDING'.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `drop_unique_id` | `number` | {number} The unique course identifier of the course to be dropped. |
| `add_unique_id` | `number` | {number} The unique course identifier of the course to be added. |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:134](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L134)

___

### toggleCourseGradingBasis

▸ **toggleCourseGradingBasis**(`unique_course_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Toggles the grading basis for a course (e.g., change between Pass/Fail and Credit/No Credit).
aka 'CHANGE to or from PASS/FAIL or CREDIT/NO CREDIT basis'

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unique_course_id` | `number` | {number} The unique course identifier. |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:166](https://github.com/An-GG/ut-registration-api/blob/f456d6e/src/api.ts#L166)
