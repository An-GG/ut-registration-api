# ut-registration-api

Optimized interface for UT Austin's registration client written in TypeScript.

This interface is a one-to-one translation of [all the endpoints I have encountered and documented](https://gist.github.com/An-GG/9ef0bfb88744a8183ec3d5faf1a39471) with minor convenience abstractions.

- **Zero browser overhead:** Registration methods are implemented as pure fetch GET/POST requests and consist of only a single outgoing transaction, so you don't need to wait for the server to respond before you begin making requests. 
- **Parallelize requests:** Stockpile many nonces in advance and use them all at once, even if the server is unresponsive.


## Install

Add to your project:
```sh
$ npm i @an-gg/ut-registration-api
```

## Usage

```ts
import { RegistrationSession } from '@an-gg/ut-registration-api'

let session = new RegistrationSession(2022, 'Spring', cookies_from_authenticated_session);

// Need to get some nonces initially. By default, this will collect 20 nonces. Nonces should repopulate after the server responds to requests.
await session.collectMaxNonces();

// Single time acknowledgement is required only once for each semester.
// This is the page that asks you to check the box next to:
// 'I acknowledge that the courses for which I am registering are consistent with my degree plan.'
await session.singleTimeAcknowledgement();

await session.addCourse(12345);
```

### What is **cookies_from_authenticated_session** ?

`RegistrationSession` cannot authenticate you using your EID/password because this is non-trivially complicated. Instead, you must provide cookies from an already authenticated session, for example from your browser.

You can also use [@an-gg/ut-auth-utils](https://github.com/An-GG/ut-auth-utils), which allows you to authenticate using your EID/password and returns the authenticated session's cookies for a given domain (in this case it's [https://utdirect.utexas.edu]()). 

### Example

```ts
import { chromeProgrammaticAuthentication, UT_DIRECT_URL } from '@an-gg/ut-auth-utils'
let cookies = await chromeProgrammaticAuthentication('UT EID', 'password', UT_DIRECT_URL);

// RegistrationSession constructor takes slightly different format
let cookies_from_authenticated_session = new Map<string, string>();
cookies.forEach(c=>cookies_from_authenticated_session.set(c.name, c.value));
```

## API

### Class: RegistrationSession


#### Constructors

- [constructor](#constructor)

#### Methods
- [addCourse](#addcourse)
- [beginRegistration](#beginregistration)
- [collectMaxNonces](#collectmaxnonces)
- [collectNonce](#collectnonce)
- [dropCourse](#dropcourse)
- [joinWaitlist](#joinwaitlist)
- [searchForAnotherSection](#searchforanothersection)
- [singleTimeAcknowledgement](#singletimeacknowledgement)
- [swapCourses](#swapcourses)
- [toggleCourseGradingBasis](#togglecoursegradingbasis)

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

[api.ts:57](https://github.com/An-GG/ut-registration-api/blob/master/src/api.ts#L57)

___

### beginRegistration

▸ **beginRegistration**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Equivalent to choosing the target semester among the available semesters at 'registration/chooseSemester.WBX'
Not really required, you can call the other methods without calling this. Useful to get current state.

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

#### Defined in

[api.ts:37](https://github.com/An-GG/ut-registration-api/blob/master/src/api.ts#L37)

___

### collectMaxNonces

▸ **collectMaxNonces**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }[]\>

Collects many nonces (as many as max_nonce_count) simultaneously.

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }[]\>

#### Defined in

[api.ts:185](https://github.com/An-GG/ut-registration-api/blob/master/src/api.ts#L185)

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

[api.ts:172](https://github.com/An-GG/ut-registration-api/blob/master/src/api.ts#L172)

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

[api.ts:69](https://github.com/An-GG/ut-registration-api/blob/master/src/api.ts#L69)

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

[api.ts:93](https://github.com/An-GG/ut-registration-api/blob/master/src/api.ts#L93)

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

[api.ts:122](https://github.com/An-GG/ut-registration-api/blob/master/src/api.ts#L122)

___

### singleTimeAcknowledgement

▸ **singleTimeAcknowledgement**(): `Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

Submits the form at 'registration/confirmEmailAddress.WBX' with the acknowledge box ticked.
'I acknowledge that the courses for which I am registering are consistent with my degree plan.'

#### Returns

`Promise`<{ `body?`: `string` ; `dom?`: `CheerioAPI` ; `r`: `Response`  }\>

#### Defined in

[api.ts:45](https://github.com/An-GG/ut-registration-api/blob/master/src/api.ts#L45)

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

[api.ts:81](https://github.com/An-GG/ut-registration-api/blob/master/src/api.ts#L81)

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

[api.ts:107](https://github.com/An-GG/ut-registration-api/blob/master/src/api.ts#L107)
