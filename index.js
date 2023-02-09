const { log: LOG, warn: WRN, error: ERR } = console;

class EZKeyValSDK {
  /**@type {Object<string, any>}*/
  #cache = {};

  /**@type {string}*/
  #host;
  /**@type {string}*/
  #uri;

  /**
   * @param {string} host
   * @param {string} uri
   * @param {number} syncInterval in ms
   */
  constructor(host, uri, syncInterval = 0) {
    if (host === undefined) throw 'NO HOST GIVEN';
    this.#host = host;
    this.#uri = uri;

    if (!!syncInterval)
      setInterval(() => {
        for (const key in this.#cache) this.#get(key);
      }, syncInterval);
  }

  /**
   * @param {string} key
   */
  async #get(key) {
    const res = await fetch(`${this.#host}${this.#uri}/${key}`, { method: 'GET' });
    try {
      this.#cache[key] = await res.json();
    } catch (e) {
      if (res.status !== 200) ERR(e);
    }
  }

  /**
   * @param {string} key
   * @param {any} value null => noop
   * @returns {void}
   */
  async #put(key, value = null) {
    if (value === null) return void LOG('no valid value specified');
    const data = JSON.stringify(value);

    try {
      await fetch(`${this.#host}${this.#uri}/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Content-Length': `${Buffer.byteLength(data)}` },
        body: data,
      });
    } catch (e) {
      ERR(e);
    }
  }

  #del(key) {
    try {
      fetch(`${this.#host}${this.#uri}/${key}`, { method: 'DELETE' });
    } catch (e) {
      ERR(e);
    }
  }

  /**
   * @param {string} key
   * @returns {ErrorOr<SDKProxy>}
   */
  async init(key = null) {
    if (key === null) return { err: 'no key specified', data: null };
    if (typeof key !== 'string' || !key || key.includes('?')) return { err: 'key is not a valid string', data: null };

    if (!this.#cache.hasOwnProperty(key)) await this.#get(key);

    const cache = this.#cache;
    const put = (key, val) => {
      this.#put(key, val);
    };
    const del = (key) => {
      this.#del(key);
    };

    const proxy = new Proxy(
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
          del(obj.key);
        },
      },
    );

    return { err: null, data: proxy };
  }

  /**
   * @returns {ErrorOr<string[]>}
   */
  async keys() {
    try {
      return { err: null, data: await (await fetch(`${this.#host}/keys`, { method: 'GET' })).json() };
    } catch ({ name, message, stack }) {
      return { err: `${name}:\n${message}\n\n${stack}`, data: null };
    }
  }
}

module.exports = { EZKeyValSDK };

/**
 * @typedef {{err: string?, data: T?}} ErrorOr<T>
 * @template T
 */

/**
 * @typedef {Object} SDKProxy
 * @property {any} value
 */
