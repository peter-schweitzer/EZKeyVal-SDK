const https = require('https');
const { log: LOG, warn: WRN, error: ERR } = console;

class EZKeyValSDK {
  /**
   * @param {string} host
   * @param {string} uri
   */
  constructor(host, uri) {
    if (host === undefined) throw 'NO HOST given';
    this.m_host = host;
    this.m_uri = uri;
  }

  init(key) {
    if (key === null) return new Promise.reject('no key specified');
    if (typeof key !== 'string' || !key || key.includes('?')) return new Promise.reject('key is not a valid string');

    /**
     * @returns {Promise<any>}
     */
    function GET() {
      return new Promise((resolve, reject) => {
        https
          .request({ host: this.m_host, route: this.m_uri + key, method: 'GET' }, (res) => {
            LOG('response code:', res.statusCode);

            let buff = '';

            res.on('data', (d) => {
              buff += d;
            });

            res.on('end', () => {
              try {
                resolve(JSON.parse(buff));
              } catch (err) {
                ERR(err);
                reject('invalid json-response');
              }
            });
          })
          .on('error', (err) => {
            reject(err);
          });
      });
    }

    /**
     * @param {any} value null => reject (use DELETE)
     * @returns {Promise<number>}
     */
    function PUT(value = null) {
      if (value === null) return new Promise.reject('no valid value specified');
      const data = JSON.stringify({ value });

      return new Promise((resolve, reject) => {
        const req = https.request(
          { host: this.m_host, route: this.m_uri + key, method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } },
          (res) => {
            res.on('error', (err) => {
              reject(err);
            });

            LOG('response code:', res.statusCode);
            resolve(res.statusCode);
          },
        );
        req.write(data);
        req.end();
      });
    }

    /**
     * @returns {Promise<number>}
     */
    function DELETE() {
      const options = { host: this.m_host, route: this.m_uri + key, method: 'DELETE' };
      return new Promise((resolve, reject) => {
        https
          .request(options, (res) => {
            LOG('response code:', res.statusCode);
            resolve(res.statusCode);
          })
          .on('error', (err) => {
            reject(err);
          });
      });
    }

    return new Proxy(
      {
        value: null,
        get value() {
          this.value = GET();
          return this.value;
        },
        set value(v) {
          this.value = v;
          PUT(v).then(LOG, ERR);
        },
      },
      {
        async deleteProperty(obj, prop) {
          if (prop !== 'value') return;
          LOG(`delete: ${await DELETE()}`);
          obj.value = null;
        },
      },
    );
  }
}

module.exports = { EZKeyValSDK };
