import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';
import { build_options, env } from './env';

/** @type {import('@sveltejs/kit').Server} */
const server = new Server(manifest);

const xff_depth = parseInt(env('XFF_DEPTH', build_options.xff_depth ?? 1));

const address_header = env('ADDRESS_HEADER', '').toLowerCase();
const protocol_header = env('PROTOCOL_HEADER', 'X-Forwarded-Proto').toLowerCase();
const host_header = env('HOST_HEADER', 'X-Forwarded-Host').toLowerCase();

/** @param {Request} req */
export default function handler(req){
    req.headers; // https://github.com/Jarred-Sumner/bun/issues/489
    let request = req;
    if (build_options.dynamic_origin ?? false) {
        let url = req.url;
        let path = url.slice(url.split("/",3).join("/").length);
        let origin = get_origin(req.headers);
        request = new Request(origin+path,req);
    }

    if (address_header && !request.headers.has(address_header)) {
		throw new Error(
			`Address header was specified with ${
				ENV_PREFIX + 'ADDRESS_HEADER'
			}=${address_header} but is absent from request`
		);
	}

    return server.respond(request,{
        getClientAddress(){
            if (address_header) {
                const value = /** @type {string} */ (request.headers.get(address_header)) || '';

                if (address_header === 'x-forwarded-for') {
                    const addresses = value.split(',');

                    if (xff_depth < 1) {
                        throw new Error(`${ENV_PREFIX + 'XFF_DEPTH'} must be a positive integer`);
                    }

                    if (xff_depth > addresses.length) {
                        throw new Error(
                            `${ENV_PREFIX + 'XFF_DEPTH'} is ${xff_depth}, but only found ${
                                addresses.length
                            } addresses`
                        );
                    }
                    return addresses[addresses.length - xff_depth].trim();
                }

                return value;
            }
            return "127.0.0.1";
        },
        platform:{
            foo(){
                console.log(this)
                return "bar";
            }
        }
    })
}

/**
 * @param {Headers} headers
 * @returns {string}
 */
function get_origin(headers) {
	const protocol = (protocol_header && headers.get(protocol_header)) || 'http';
	const host = headers.get(host_header);
	return `${protocol}://${host}`;
}