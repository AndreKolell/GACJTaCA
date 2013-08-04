/**
 * GACJTaCA v0.1
 * Google Analytics Customer Journey Tracking and Conversion Attribution
 *
 * Copyright (c) 2013 André Kolell
 *
 * Licensed under the MIT license.
 */
var _gacjtaca = function () {

  // ----------------- BEGIN MODULE SCOPE VARIABLES -----------------
  var
    configMap = {
      max_local_storage_length : 20000,
      max_cookie_length        : 2000
    },
    cj = [],
    loadJourney, saveJourney, keepMaxLength, readCookie, writeCookie,
    getCurrentCampaignFromUtmzCookie,
    makeCampaign,
    filterJourney, get, getFirst, getLast, has,
    initModule
  ;
  // ------------------ END MODULE SCOPE VARIABLES ------------------

  // -------------------- BEGIN UTILITY METHODS ---------------------
  // Begin utility method /loadJourney/
  // Purpose: Load existing Journey from localStorage or __utmgacjtaca-Cookie (Fallback)
  loadJourney = function() {
    var cjRawObjects;
    try {
      cjRawObjects = JSON.parse(
        (typeof(Storage) !== 'undefined' && typeof(localStorage.gacjtaca) !== 'undefined') ?
          localStorage.gacjtaca : readCookie('__utmgacjtaca')
      );

      for (var i in cjRawObjects) {
        var campaign;
        campaign = makeCampaign(cjRawObjects[i]);
        if (typeof (campaign) == 'object') {
          cj.push(campaign);
        }
      }
    } catch (e) { }
  };
  // End utility method /loadJourney/

  // Begin utility method /saveJourney/
  // Purpose: Save Journey in localStorage or __utmgacjtaca-Cookie (Fallback)
  saveJourney = function() {
    if (typeof(Storage) !== 'undefined') {
      localStorage.gacjtaca = keepMaxLength(configMap.max_local_storage_length);
    } else {
      writeCookie('__utmgacjtaca', keepMaxLength(configMap.max_cookie_length));
    }
  };
  // End utility method /saveJourney/

  // Begin utility method /keepMaxLength/
  // Purpose: Keep configured max. Length by removing first campaign to not pollute localStorage or __utmgacjtaca-Cookie
  keepMaxLength = function(maxLength) {
    var json, cjEncoded = [];
    for (var i in cj) {
      cjEncoded.push(cj[i].encode());
    }
    json = JSON.stringify(cjEncoded);
    if (json.length > maxLength) {
      cj.shift();
      return keepMaxLength(maxLength);
    } else {
      return json;
    }
  }
  // End utility method /keepMaxLength/

  // Begin utility method /readCookie/
  readCookie = function(cookieName) {
    var nameEQ = cookieName + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while(c.charAt(0) == ' ') c = c.substring(1, c.length);
      if(c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };
  // End utility method /readCookie/

  // Begin utility method /writeCookie/
  writeCookie = function(cookieName, cookieContent) {
      var date = new Date();
      date.setMonth(date.getMonth() + 12);
      document.cookie = cookieName + '=' + cookieContent + ';expires=' + date.toGMTString() + ';path=/';
  };
  // End utility method /writeCookie/
  // --------------------- END UTILITY METHODS ----------------------

  // -------------------- BEGIN PRIVATE METHODS ---------------------
  // Begin private method /getCurrentCampaignFromUtmzCookie/
  getCurrentCampaignFromUtmzCookie = function () {
    var values = {}, utmzCookie;

    utmzCookie = readCookie('__utmz');
    if (utmzCookie) {
      var z = utmzCookie.split('.');
      if (z.length >= 4) {
        var session = z[2];
        var campaign_number = z[3];
        var y = z[4].split('|');
        for (var i = 0; i < y.length; i++) {
            var pair = y[i].split('=');
            values[pair[0]] = pair[1];
        }

        return makeCampaign({
          session        : parseInt(session),
          campaignNumber : parseInt(campaign_number),
          source         : (values.utmgclid) ? 'google' : values.utmcsr,
          medium         : (values.utmgclid) ? 'cpc'    : values.utmcmd,
          campaign       : values.utmccn,
          content        : values.utmcct,
          term           : values.utmctr
        });
      }
    }
    return null;
  };
  // End private method /getCurrentCampaignFromUtmzCookie/

  // Begin private method /filterJourney/
  // Purpose: Filter the Journey based on provided Criteria
  // Arguments:
  //   * filter - optional Object to filter the Journey
  // Returns:
  //   * object - ordered containing the (successfully filtered) Journey
  //   * false - an invalid Filter has been provided
  filterJourney = function (fl) {
    var filteredJourney = [];
    // TODO: This is very bad Style.
    next_campaign:
      for (var c in cj) {
        for (var f in fl) {

          // Exit, if this is an invalid Filter
          for (var n in fl[f]) {
            if (n != 'timestamp' && n != 'source' && n != 'content' && n != 'campaign'
                 && n != 'medium' && n != 'term') {
                return false;
            }
          }

          if ((!fl[f]['timestamp'] || cj[c]['timestamp'] > fl[f]['timestamp'])
              && (!fl[f]['source'] || cj[c]['source'] == fl[f]['source'])
              && (!fl[f]['content'] || cj[c]['content'] == fl[f]['content'])
              && (!fl[f]['campaign'] || cj[c]['campaign'] == fl[f]['campaign'])
              && (!fl[f]['medium'] || cj[c]['medium'] == fl[f]['medium'])
              && (!fl[f]['term'] || cj[c]['term'] == fl[f]['term'])) {
              filteredJourney.push(cj[c]);
            continue next_campaign;
          }
        }
      }
    return filteredJourney;
  };
  // End private method /filterJourney/

  // Begin method /makeCampaign/
  // Purpose: Creating a Campaign-Object from various Params
  // Arguments:
  //   * cObj - either a String like "1337613483|6|5|google|organic|%28organic%29||%28not%2520provided%29"
  //            or an Object like {timestamp: 1337613483, session: 6, campaignNumber: 5, ...}
  // Returns:
  //   * object - a Campaign
  //   * false - the provided Touchpoint was invalid and could not be processed
  makeCampaign = function(cObj) {
    var campaign = {
      encode: function() {
        return this.timestamp + '|' + this.session + '|' + this.campaignNumber + '|' +
          ((this.source) ? encodeURI(this.source) : '') + '|' +
          ((this.medium) ? encodeURI(this.medium) : '') + '|' +
          ((this.campaign) ? encodeURI(this.campaign) : '') + '|' +
          ((this.content) ? encodeURI(this.content) : '') + '|' +
          ((this.term) ? encodeURI(this.term) : '');
      },
      decode: function( encodedCampaign ) {
        var values = encodedCampaign.split('|');
        return {
          timestamp      : parseInt(values[0]),
          session        : parseInt(values[1]),
          campaignNumber : parseInt(values[2]),
          source         : decodeURI(values[3]),
          medium         : decodeURI(values[4]),
          campaign       : decodeURI(values[5]),
          content        : decodeURI(values[6]),
          term           : decodeURI(values[7])
        };
      }
    };

    if(typeof(cObj) == 'string') {
      cObj = campaign.decode(cObj);
    }

    if (!cObj.session || !cObj.campaignNumber ||
        (!cObj.source && !cObj.medium && !cObj.campaign && !cObj.content && !cObj.term)) {
      return false;
    } else {
      campaign.timestamp      = (cObj.timestamp) ? cObj.timestamp : Math.round(+new Date() / 1000);
      campaign.session        = parseInt(cObj.session);
      campaign.campaignNumber = parseInt(cObj.campaignNumber);
      campaign.source         = cObj.source;
      campaign.medium         = cObj.medium;
      campaign.campaign       = cObj.campaign;
      campaign.content        = cObj.content;
      campaign.term           = cObj.term;
    };

    return campaign;
  };
  // End method /makeCampaign/

  // Begin method /initModule/
  // Purpose: Loads the Journey and adds the current Campaign if it hasn't been added before
  initModule = function () {

    // Load existing Journey into Module variable cj
    loadJourney();

    // Add current Campaign to Journey if it hasn't been added before
    var utmzCampaign = getCurrentCampaignFromUtmzCookie();

    if (utmzCampaign && (cj.length == 0 || utmzCampaign.campaignNumber > cj[cj.length - 1].campaignNumber)) {
      cj.push(utmzCampaign);
      saveJourney();
    }
  };
  // End method /initModule/
  // --------------------- END PRIVATE METHODS ----------------------

  // -------------------- BEGIN PUBLIC METHODS ----------------------
  // Begin method /get/
  // Purpose: Getting the (filtered) Journey
  // Arguments:
  //   * filter - optional Object to filter the Journey
  // Returns:
  //   * object - ordered List containing the (successfully filtered) Journey
  //   * false - an invalid Filter has been provided
  get = function(filter) {
    return (typeof(filter) == 'object') ? filterJourney(filter) : cj;
  };
  // End method /get/

  // Begin method /getFirst/
  // Purpose: Getting the first Touchpoint of the (filtered) Journey
  // Arguments:
  //   * filter - optional Object to filter the Journey
  // Returns:
  //   * Campaign - the first Touchpoint of the (successfully filtered) Journey
  //   * null - the Journey contains no Campaign (that fulfill the Filter's Criteria)
  //   * false - an invalid Filter has been provided
  getFirst = function(filter) {
    var f_cj = (typeof(filter) == 'object') ? filterJourney(filter) : cj;
    if (f_cj === false) {
      return false;
    } else if (f_cj.length > 0) {
      return f_cj[0];
    } else {
      return null;
    }
  };
  // End method /getFirst/

  // Begin method /getLast/
  // Purpose: Getting the last Touchpoint of the (filtered) Journey
  // Arguments:
  //   * filter - optional Object to filter the Journey
  // Returns:
  //   * Campaign - the last Touchpoint of the (successfully filtered) Journey
  //   * null - the Journey contains no Campaign (that fulfill the Filter's Criteria)
  //   * false - an invalid Filter has been provided
  getLast = function(filter) {
    var filteredJourney;
    filteredJourney = (typeof(filter) == 'object') ? filterJourney(filter) : cj;
    if (filteredJourney === false) {
      return false;
    } else if (filteredJourney.length > 0) {
      return filteredJourney[filteredJourney.length - 1];
    } else {
      return null;
    }
  };
  // End method /getLast/

  // Begin method /has/
  // Purpose: Checks whether the optional Filter matches
  // Arguments:
  //   * filter - optional Object to filter the Journey
  // Returns:
  //   * true - the Journey contains Touchpoints (that fulfill the Filter's Criteria)
  //   * false - the Journey contains no Toichpoints (that fulfill the Filter's Criteria) or the filter is invalid
  has = function (filter) {
    return ((typeof(filter) == 'object') ? filterJourney(filter) : cj).length > 0;
  };
  // End method /has/

  initModule();

  return {
      get      : get,
      getFirst : getFirst,
      getLast  : getLast,
      has      : has
  };
// ---------------------- END PUBLIC METHODS ------------------------
}();

for (var i = 0; i < gacjtaca_callbacks.length; i++) {
  gacjtaca_callbacks[i]();
  gacjtaca_callbacks = {
    'push': function(callback) {
      callback();
    }
  }
}
