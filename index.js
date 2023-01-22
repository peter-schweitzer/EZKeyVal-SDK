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

  async init(key) {
    if (key === null) return new Promise.reject('no key specified');
    if (typeof key !== 'string' || !key || key.includes('?')) return new Promise.reject('key is not a valid string');

    const cache = this.#cache;
    const put = this.#put;
    const del = this.#del;

    this.#get(key);

    return new Promise.resolve(
      new Proxy(
        { key },
        {
          async deleteProperty(obj, prop) {
            if (prop !== 'value') return;
            delete cache[obj.key];
            del();
          },

          get(obj, prop) {
            if (prop !== 'value') return undefined;
            return cache[obj.key];
          },

          set(obj, prop, v) {
            if (prop !== 'value') return;
            cache[obj.key] = v;
            put(obj.key, v);
          },
        },
      ),
    );
  }
}

module.exports = { EZKeyValSDK };
