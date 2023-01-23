const https = require('https');
const { log: LOG, warn: WRN, error: ERR } = console;

class EZKeyValSDK {
  /**@type {Object.<string, any>}*/
  #cache = {};

  /**@type {string}*/
  #m_host = '';
  /**@type {string}*/
  #m_uri = '';

  /**
   * @param {string} host
   * @param {string} uri
   * @param {number} syncInterval in ms
   */
  constructor(host, uri, syncInterval = 0) {
    if (host === undefined) throw 'NO HOST GIVEN';
    this.#m_host = host;
    this.#m_uri = uri;

    if (!!syncInterval)
      setInterval(() => {
        for (const key in this.#cache) this.#get(key);
      }, syncInterval);
  }

  /**
   * @param {string} key
   * @returns {void}
   */
  #get(key) {
    https
      .request({ host: this.#m_host, route: `${this.#m_uri}/${key}`, method: 'GET' }, (res) => {
        let buff = '';

        res.on('data', (d) => {
          buff += d;
        });

        res.on('end', () => {
          try {
            this.#cache[key] = JSON.parse(buff);
          } catch (e) {
            ERR(e);
          }
        });
      })
      .on('error', (e) => {
        ERR(e);
      });
  }

  /**
   * @param {any} value null => noop
   * @returns {void}
   */
  #put(value = null) {
    if (value === null) return void LOG('no valid value specified');
    const data = JSON.stringify(value);

    const req = https.request(
      { host: this.#m_host, route: `${this.#m_uri}/${key}`, method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } },
      (res) => {
        res.on('error', (e) => {
          ERR(e);
        });
      },
    );
    req.write(data, ERR);
    req.end();
  }

  #del(key) {
    const options = { host: this.m_host, route: `${this.m_uri}/${key}`, method: 'DELETE' };
    https
      .request(options, (res) => {
        LOG('DELETE response code:', res.statusCode);
      })
      .on('error', (e) => {
        ERR(e);
      });
  }

  /**
   * @param {string} key
   * @returns {ErrorOrProxy}
   */
  init(key) {
    if (key === null) return { err: 'no key specified', proxy: null };
    if (typeof key !== 'string' || !key || key.includes('?')) return { err: 'key is not a valid string', proxy: null };

    this.#get(key);

    const cache = this.#cache;
    const put = this.#put;
    const del = this.#del;

    resolve(
      new Proxy(
        { key },
        {
          get(obj, prop) {
            if (prop !== 'value') return undefined;
            return cache[obj.key];
          },

          set(obj, prop, v) {
            if (prop !== 'value') return;
            cache[obj.key] = v;
            put(obj.key, v);
          },

          deleteProperty(obj, prop) {
            if (prop !== 'value') return;
            delete cache[obj.key];
            del();
          },
        },
      ),
    );
  }
}

module.exports = { EZKeyValSDK };

/**
 * @typedef {Object} ErrorOrProxy
 * @property {string?} err
 * @property {SDKProxy?} proxy
 *
 * @typedef {Object} SDKProxy
 * @property {any} value
 */
