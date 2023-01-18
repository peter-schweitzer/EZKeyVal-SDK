# EZKeyVal SDK

this is the SDK for easily use [EZKeyVal](https://github.com/peter-schweitzer/EZKeyVal) an a node.js backend application.

The SDK simplifies the use of EZKeyVal by handling the http(s) traffic with a corresponding EZKeyVal server.

## usage

```js
const { EZKeyValSDK } = require('ezkeyval-sdk');

//the constructor takes
//  first the host (where the EZKeyVal server is hosted)
//  and the route (the route is configured in the config.json file of the EZKeyVal server)
const sdk = new EZKeyValSDK('localhost:1337', '/route/of/the/EZKeyVal/server');

const keyProxy = sdk.init('key');
const key2Proxy = sdk.init('key2');

// the value will be undefined if the key-value pair does not exist yet
console.log("get the value associated with 'key'", keyProxy.value);

//set the value associated with 'key2'
key2Proxy.value = 'some value';

//set the value associated with 'key'
keyProxy.value = 42069;
```
