const request = require('request');

// SAMPLE CONFIG - where will this be moved to?
const config = {
  //workspace: '12359686868840',
  user: { // Aaron
    asanatoken: '55Strxxz.UQnSXscYPhso8DP0ruhP2ay',
    asanauserid: '17941980459421',
  }
};

module.exports = class AsanaApi {

  constructor() {
    //this.workspace = config.workspace; ?
    this.url = 'https://app.asana.com/api/1.0/';
    this.user = config.user;
    this.token = new Buffer(this.user.asanatoken+':').toString('base64');
    this.headers = { 'Authorization': 'Basic '+this.token };
  }


  get(url, params, callback) {
    request.get({
      url: this._formatUrl(url, params),
      headers: this.headers
    }, function(err, res, body) {
      var abody = JSON.parse(body);
      callback(err, abody.data);
    });
  }


  put(url, params, callback) {
    request.put({
      url: this._formatUrl(url, params),
      headers: this.headers
    }, function(err, res, body) {
      var abody = JSON.parse(body);
      callback(err, abody.data);
    });
  }


  post(url, params, callback) {
    request.post({
      url: this._formatUrl(url, params),
      headers: this.headers
    }, function(err, res, body) {
      var abody = JSON.parse(body);
      callback(err, abody.data);
    });
  }


  // Helper: Format a URL string for a request
  _formatUrl(aurl, params) {
    const urlstring = aurl.join('/');

    const paramarr = [];
    for(let key in params) {
      paramarr.push(key+'='+params[key]);
    }

    let reqstring = '';

    if(paramarr.length > 0) {
      const paramstring = paramarr.join('&');
      reqstring = this.url+urlstring + '?' + paramstring;
    } else {
      reqstring = this.url+urlstring;
    }
    return reqstring;
  }

};