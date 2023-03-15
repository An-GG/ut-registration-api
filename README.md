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
| `opts?` | `Partial`<[`RegistrationSessionOptions`](../modules.md#registrationsessionoptions)\> | - |

#### Defined in

[api.ts:38](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L38)

## Methods

### addCourse

▸ **addCourse**(`unique_course_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Adds a course to your schedule.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unique_course_id` | `number` | The unique course identifier. |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:92](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L92)

___

### beginRegistration

▸ **beginRegistration**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Begins the registration process by selecting the target semester among the available semesters.
Not required to call, but useful for getting the current state.

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:64](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L64)

___

### collectMaxNonces

▸ **collectMaxNonces**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }[]\>

Collects many nonces (as many as max_nonce_count) simultaneously.

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }[]\>

A set of promises containing the server responses.

#### Defined in

[api.ts:237](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L237)

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

[api.ts:223](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L223)

___

### dropCourse

▸ **dropCourse**(`unique_course_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Drops a course from your schedule.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unique_course_id` | `number` | The unique course identifier. |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:106](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L106)

___

### getClassListing

▸ **getClassListing**(): `Promise`<{}[]\>

Get class listing from the class listing page.

#### Returns

`Promise`<{}[]\>

- A promise resolving to an array of class listings.

#### Defined in

[api.ts:319](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L319)

___

### getRIS

▸ **getRIS**(`prevent_throw_on_parse_error?`): `Promise`<{ `_raw_ris_fetch_result`: { `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  } = res; `bars`: { `_raw_elements`: `Cheerio`<`Element`\> = bars\_elements; `_raw_text`: `string` ; `bars_cleared`: `boolean`  } ; `encountered_errors`: `Error`[] ; `schedule`: { `_raw_elements`: `Cheerio`<`Element`\> = schedule\_elements; `_raw_times`: `string`[] = times\_raw; `times`: { `start`: `Date` ; `stop`: `Date`  }[] = times }  }\>

Retrieves registration information from the RIS page.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `prevent_throw_on_parse_error?` | `boolean` | [optional] Set to true to prevent throwing errors when parsing registration times. |

#### Returns

`Promise`<{ `_raw_ris_fetch_result`: { `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  } = res; `bars`: { `_raw_elements`: `Cheerio`<`Element`\> = bars\_elements; `_raw_text`: `string` ; `bars_cleared`: `boolean`  } ; `encountered_errors`: `Error`[] ; `schedule`: { `_raw_elements`: `Cheerio`<`Element`\> = schedule\_elements; `_raw_times`: `string`[] = times\_raw; `times`: { `start`: `Date` ; `stop`: `Date`  }[] = times }  }\>

A promise containing registration information, including schedule and bars status.

#### Defined in

[api.ts:253](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L253)

___

### joinWaitlist

▸ **joinWaitlist**(`unique_course_id`, `optional_swap_course_id?`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Joins the waitlist for a course.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unique_course_id` | `number` | The unique course identifier. |
| `optional_swap_course_id?` | `number` | [optional] The unique course identifier of the course to be swapped if a seat becomes available. |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:137](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L137)

___

### searchForAnotherSection

▸ **searchForAnotherSection**(`unique_course_id`): `Promise`<{ [unique_id: string]: `any`[];  }\>

Searches for other open sections of the same course.
aka 'SEARCH for another section of the same course'
Gets all other sections that are open (not waitlisted) for a given course_id. Will never return the given course_id as a result, even if the given course is open.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unique_course_id` | `number` | The unique course identifier. |

#### Returns

`Promise`<{ [unique_id: string]: `any`[];  }\>

A promise containing the server response.

#### Defined in

[api.ts:172](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L172)

___

### singleTimeAcknowledgement

▸ **singleTimeAcknowledgement**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Submits the acknowledgment form (that shows up only the first time you enter registration each semester)
stating that 'I acknowledge that the courses for which I am registering are consistent with my degree plan.'

Submitting this form is technically the only thing you need to wait on before requesting course add/drops.

I have a vague feeling that the server is probably too lazy to confirm you submitted this form, and that you don't need to
actually submit this before making real requests, but I've never tried doing that.   `¯\_(ツ)_/¯`

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:78](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L78)

___

### swapCourses

▸ **swapCourses**(`drop_unique_id`, `add_unique_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Swaps courses with the condition of dropping one course only if adding the other is successful.
aka 'DROP DEPENDENT UPON successfully ADDING'.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `drop_unique_id` | `number` | The unique course identifier of the course to be dropped. |
| `add_unique_id` | `number` | The unique course identifier of the course to be added. |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:122](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L122)

___

### toggleCourseGradingBasis

▸ **toggleCourseGradingBasis**(`unique_course_id`): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Toggles the grading basis for a course (e.g., change between Pass/Fail and Credit/No Credit).
aka 'CHANGE to or from PASS/FAIL or CREDIT/NO CREDIT basis'

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unique_course_id` | `number` | The unique course identifier. |

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

A promise containing the server response.

#### Defined in

[api.ts:154](https://github.com/An-GG/ut-registration-api/blob/50f2226/src/api.ts#L154)
