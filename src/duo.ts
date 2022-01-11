import { Element } from 'cheerio'
// snippets from duo src

function throwError(s:string, s2?:string) {
    if (s2)
        console.log(s2);
    throw new Error(s);
}

function hyphenize(str: string) {
    return str.replace(/([a-z])([A-Z])/, '$1-$2').toLowerCase();
}

function getDataAttribute(element: Element, name: string) {
    return element.attribs[('data-' + hyphenize(name))];
}



/**
 * Parse the sig_request parameter, throwing errors if the token contains
 * a server error or if the token is invalid.
 *
 * @param {String} sig Request token
 */
function parseSigRequest(sig:string) {
    if (!sig) {
        // nothing to do
        return;
    }

    // see if the token contains an error, throwing it if it does
    if (sig.indexOf('ERR|') === 0) {
        throwError(sig.split('|')[1]);
    }

    // validate the token
    if (sig.indexOf(':') === -1 || sig.split(':').length !== 2) {
        throwError(
            'Duo was given a bad token.  This might indicate a configuration ' +
                'problem with one of Duo\'s client libraries.',
            'https://www.duosecurity.com/docs/duoweb#first-steps'
        );
    }

    var sigParts = sig.split(':');

    // hang on to the token, and the parsed duo and app sigs
    let sigRequest = sig;
    let duoSig = sigParts[0];
    let appSig = sigParts[1];

    return {
        sigRequest: sig,
        duoSig: sigParts[0],
        appSig: sigParts[1]
    };
}



/**
 * Point the iframe at Duo, then wait for it to postMessage back to us.
 */
function ready(iframe: Element, origin: string) {
    let host;
    let duoSig;
    let appSig;
    let postAction = '';
    let postArgument = 'sig_response';

    if (!host) {
        host = getDataAttribute(iframe, 'host');

        if (!host) {
            throwError(
                'No API hostname is given for Duo to use.  Be sure to pass ' +
                    'a `host` parameter to Duo.init, or through the `data-host` ' +
                    'attribute on the iframe element.',
                'https://www.duosecurity.com/docs/duoweb#3.-show-the-iframe'
            );
        }
    }

    if (!duoSig || !appSig) {
        let sig = parseSigRequest(getDataAttribute(iframe, 'sigRequest'));
        appSig = sig.appSig;
        duoSig = sig.duoSig;            

        if (!duoSig || !appSig) {
            throwError(
                'No valid signed request is given.  Be sure to give the ' +
                    '`sig_request` parameter to Duo.init, or use the ' +
                    '`data-sig-request` attribute on the iframe element.',
                'https://www.duosecurity.com/docs/duoweb#3.-show-the-iframe'
            );
        }
    }

    // if postAction/Argument are defaults, see if they are specified
    // as data attributes on the iframe
    if (postAction === '') {
        postAction = getDataAttribute(iframe, 'postAction') || postAction;
    }

    if (postArgument === 'sig_response') {
        postArgument = getDataAttribute(iframe, 'postArgument') || postArgument;
    }

    // point the iframe at Duo
    iframe.attribs.src = [
        'https://', host, '/frame/web/v1/auth?tx=', duoSig,
        '&parent=', encodeURIComponent(origin),
        '&v=2.6'
    ].join('');

    // listen for the 'message' event
    // onMessage(onReceivedMessage);
}








export { ready as duonative_set_iframe_src };
