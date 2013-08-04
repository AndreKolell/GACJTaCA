# Google Analytics Customer Journey Tracking and Conversion Attribution (GACJTaCA)

GACJTaCA is a small and compact piece of JavaScript build on top of Google Analytics. It adds basic customer journey tracking and conversion attribution functionality to Google Analytics with only four lines of code!

GACJTaCA stores detailed information about all campaigns and traffic sources (direct, organic, affiliate, ppc, etc.) a visitor used during his (browser's) lifetime to visit your website in the browser's local storage (or in a simple cookie as a fallback). This campaign history (customer journey) can then be used for various kinds of conversion attribution and de-duplication (first cookie wins, last cookie wins, equal distribution, etc.).


## How does GACJTaCA work and how can I use it?

Google Analytics uses a cookie named __utmz to store information about where a visitor came from for his most recent visit (we will call these traffic sources simply "campaigns" as Google does, although a campaign can be all kinds of traffic sources). Various campaigns are recognized by Google Analytics out of the box (direct traffic, organic traffic from search engines like Google or Bing, referral traffic from Facebook an other sites, etc.) but some campaigns, especially advertising campaigns, should be set up individually to gain better insights about advertising performance (see [Custom Campaigns in Google Analytics](https://support.google.com/analytics/answer/1033863?hl=en&ref_topic=1032998)).

Whenever a new visit happens, the visitor's __umtz cookie is being updated with information about the campaign the visitor came from. GACJTaCA keeps track of all of these visits and its related campaigns in the browser's local storage or in a simple cookie named _utmgacjtaca as a fallback (e.g. for IE 7). The history of all campaigns a visitor had used to enter a website is often called "customer journey".


### How to implement GACJTaCA for Customer Journey Tracking

To use GACJTaCA, upload gacjtaca.js (after having it minified) to your web space and alter Google Analytics JavaScript:

    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', 'UA-98765432-1']);
    _gaq.push(['_trackPageview']);

    // Callbacks are being executed after GACJTaCA has been initialized
    var gacjtaca_callbacks = gacjtaca_callbacks || [];

    // Execute GACJTaCA after Google Analytics has processed the current visit
    _gaq.push(function() {
      var gacjtaca = document.createElement('script'); gacjtaca.type = 'text/javascript';
      gacjtaca.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + 'gacjtaca.local/gacjtaca.js'; // -minified
      var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(gacjtaca, s);
    });

    (function() {
      var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
      ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
      var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();


### How to access a Customer's Journey (campaign clicks)

GACJTaCA is available as a JavaScript object named `_gacjtaca` in the global namespace after Analytics has finished its initial work. The `_gacjtaca` object and can be queried to obtain all, the first, the last or a (filtered) list of campaigns in chronological order within a customizable time period. These campaigns can be used to assign credit only to the first or to the last campaign or however you like it (first cookie wins, last cookie wins, etc.).

The _gacjtaca object provides the following methods:

| Method | Return value of Method |
| ------ | ---------------------- |
| _gacjtaca.get(filter) | entire (filtered) journey as a chronologically ordered list |
| _gacjtaca.getFirst(filter) | first campaign of the journey that fulfills the filter's criteria |
| _gacjtaca.getLast(filter) | last campaign of the journey that fulfills the filter's criteria |
| _gacjtaca.has(filter) | true when there is a campaign in the journey that fulfills the filter's criteria |

The `filter` param allows to focus on specific campaigns and ignore others. To give a simplified example: Your aim is to de-duplicate Google AdWords, Criteo and affilinet conversions and you want to assign credit to the last campaign (click) that happened before the conversion took place (the well known "last cookie wins" approach). You do not care about other campaigns such as direct or organic traffic in your de-duplication strategy. This would lead to the following filter (assuming you have previously filled the utm_source param with "affilinet" and "criteo" respectively):

    [{'source': 'google', 'medium': 'cpc'}, {'source': 'criteo'}, {'source': 'affilinet'}]

When you want to ignore all campaigns (clicks) that are older than 30 days, you could specify:

    var today = new Date();
    {'source': 'criteo', 'timestamp': today.getTime() - 30*24*60*60*1000}

All filters (Google AdWords, Criteo, affilinet) are concatenated with OR and all criteria (source, medium, timestamp) are concatenated with AND. Therefore organic traffic from Google would be excluded by the filter above, as its medium would not be "cpc" (although its source would be "google"). Where _gacjtaca's provided Methods aren't enough, simply call _gacjtaca.get() and filter the returned list however you need to.


### About GACJTaCA's campaign object

A campaign object in GACJTaCA is a slightly modified copy of the visitor's last visit, which is stored in his __utmz cookie. GACJTaCA's campaign object has the following attributes:

| Attribute | Filter | Description |
| --------- | ------ | ----------- |
| timestamp | greater than specified value | Time of visit (client-based Unix-timestamp) |
| session | not available | Session number of this visitor |
| campaignNumber | not available | Campaign number of this visitor |
| source | equals value | utm_source, but maps "(none)" and "(not set)" to empty string and is set to "google" if utmgclid exists (AdWords auto-tagging) |
| content | equals value | utm_content, but maps "(none)" and "(not set)" to empty string |
| campaign | equals value | utm_campaign, but maps "(none)" and "(not set)" to empty string |
| medium | equals value | utm_medium, but maps "(none)" and "(not set)" to empty string and is set to "cpc" if utmgclid exists (AdWords auto-tagging) |
| term | equals value | utm_term, but maps "(none)" and "(not set)" to empty string |


### How to implement Conversion Attribution (De-Duplication) with GACJTaCA

To implement de-duplication and therewith avoid assigning the same conversion to multiple marketing channels, you would use some code similar to (uses jQuery):

    <script type="text/javascript">
      gacjtaca_callbacks.push(function() {
        var filter = [{'source': 'google', 'medium': 'cpc'}, {'source': 'criteo'}, {'source': 'affilinet'}];
        var last_campaign = _gacjtaca.getLast(filter);

        // Last cookie wins!
        if (last_campaign != null && typeof(last_campaign) == 'object') {
          if (last_campaign.source == 'google') {
            var google_conversion_id = 1234567890;
            var google_conversion_language = "de";
            var google_conversion_format = "1";
            var google_conversion_color = "666666";
            var google_conversion_value = 10;
            var google_conversion_label = "8O01CKjHqwQQoKIZ2gM";
            $.getScript('https://www.googleadservices.com/pagead/conversion.js');
          } else if(last_campaign.source == 'criteo') {
            document.write('<img src="https://sslwidget.criteo.com/pdf/display.js?p1=' + escape('v=2&wi=7719269&t=XXX&s=1&i1=1&p1=XXX&q1=1') + '&t1=transaction&resptype=gif" width="1" height="1" />');
          } else if(last_campaign.source == 'affilinet') {
            document.write('<img src="http://partners.webmasterplan.com/registersale.asp?site=XXX&order=XXX&mode=ppl&ltype=1" width="1" height="1">');
          }
        }
      });
    </script>

The customer's journey cannot only be utilized for de-duplication; you can use it for placing all kinds of tags when and where ever you want.


## Questions, Bugs & Improvements

If this documentation doesn't answer your questions, you found a bug, or you just want to get in touch, either create an issue here on github or shoot me an email (gacjtaca@gmail.com).


## Prerequisites

* You must use Google Analytics with asynchronous tracking code.
* JSON mus be available (use [https://github.com/douglascrockford/JSON-js](https://github.com/douglascrockford/JSON-js)).
* Leave enough space in the browser's localStorage and cookies (you can configure this in `max_local_storage_length` and `max_cookie_length`).


## Limitations

* When Google Analytics changes its core behaviour (which is very unlikely), GACJTaCA must be updated.
* Without JavaScript, no journey will be recorded and no conversion tags will be triggered.
* There is a maximum of campaigns that can be stored within localStorage and cookies (older campaigns will be dropped when the configured limits are reached).
* The customer's journey is only available at the client (but you can push it asynchronously to your server whenever you like *after* Google Analytics has processed the latest visit).
* There is no cross-device/cross-browser-tracking so far.


## The MIT License (MIT)

Copyright (c) 2013 André Kolell

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
