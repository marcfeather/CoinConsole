"use strict";

//Check whether or not the client is in mobile and adjust the filter-toggle icon based on the width of the device
window.onresize = positionFilterToggleIcon;

var queryString = getUrlParams();

var websocketPort = 3004;

var information = document.getElementById('information'),
    filterbar = document.getElementById('filterbar'),
    filter = document.getElementById('filter'),
    toggleFilterIcon = document.getElementById('filter-toggle-icon'),
    sort = document.getElementById('sort'),

    numberOfCurrencies = document.getElementById('total-currencies'),
    totalMarketCap = document.getElementById('total-market-cap'),
    totalTradeVolume = document.getElementById('total-volume'),
    bitcoinDominance = document.getElementById('btc-dominance'),

    coinconsoleWelcome = '<div class="get-started"><h2>Click a button on the filter to select which currencies you want to display on your dashboard.</h2></div>';

//connect to the websocket server on page load
var socket = io.connect('//' + window.location.hostname + ':' + websocketPort),
    globalData,
    tickerData;

//initiate the page
socket.on('init', function(){
  createFilterList(tickerData);
  createSortList(tickerData);

  function createSortList(o){
    sort.innerHTML = '';
    var html = '',
        info = Object.keys(o[0]),
        asyncLoop = 0;

    var sortDefault = ((queryString.sort) ? queryString.sort : 'rank');

    //add each sort option to the dropdown
    for (var option in info){
      asyncLoop += 1;
      if (info[option].toString().toLowerCase() === sortDefault) {
        var html = html + '<option selected="selected" value="' + info[option] + '">' + info[option] + '</option>';
        ((asyncLoop === info.length) ? sort.innerHTML = html : html);
      } else {
        var html = html + '<option value="' + info[option] + '">' + info[option] + '</option>';
        ((asyncLoop === info.length) ? sort.innerHTML = html : html);
      }
    }
  }
});

//listen for new data (for "global" data in the header)
socket.on('refreshGlobal', function(data){
  globalData = JSON.parse(data);

  updateGlobal(globalData);

  function updateGlobal(o){
    numberOfCurrencies.innerHTML = o.active_currencies + " Active Currencies";
    totalMarketCap.innerHTML = "$" + o.total_market_cap_usd.formatMoney(0, ".", ",") + " Market Cap";
    totalTradeVolume.innerHTML = "$" + o.total_24h_volume_usd.formatMoney(0, ".", ",") + " Trade Volume";
    bitcoinDominance.innerHTML = o.bitcoin_percentage_of_market_cap + "% Bitcoin Dominance";
  }
});

//listen for new data (for coin information)
socket.on('refreshTicker', function(data){
  tickerData = JSON.parse(data);

  convertTickerData();

  function convertTickerData() {
    for (var ticker in tickerData) {
      if (typeof tickerData[ticker] === "object") {
        for (var key in tickerData[ticker]) {
          if (! isNaN(parseFloat(tickerData[ticker][key])) && key !== "symbol") {
            tickerData[ticker][key] = parseFloat(tickerData[ticker][key]);
          }
        }
      }
    }
  }

  updateInformation(displayList);
});

function createFilterList(a){
  filter.innerHTML = '';
  var html = '',
      asyncLoop = 0;
  for (var coin in a) {
    if (a[coin].symbol) {
      asyncLoop += 1;
      var coinName = a[coin].symbol;
      html = html + createFilterItem(coinName);
      ((asyncLoop === a.length) ? filter.innerHTML = html : html);
    }
  }
}

function filterSearch(term){
  if (term == ''){
    //reset the filter if the search term is empty
    createFilterList(tickerData);
  } else {
    //search the available coins for the term and rerender the filter
    searchArray(tickerData, term, "name").then(function(resultName){
      searchArray(tickerData, term, "symbol").then(function(resultSymbol){
        var results = resultName.concat(resultSymbol).unique();
        createFilterList(results);
      });
    });
  }
}

function clearSearch(e){
  if (document.getElementById(e)) {
    document.getElementById(e).value = '';
    createFilterList(tickerData);
  }
}

//make a filter checkbox
function createFilterItem(s){
  var result = '<li class="no-margin no-dot btn btn-blue" onClick="toggleCoin(this.innerHTML.toLowerCase());">' + s + '</li>';
  return result;
}

//toggle the filter list
var untoggled = false; //default is toggled

toggleFilter();

function toggleFilter(){
  if (! untoggled){
    //show the filter
    filterbar.style.flexBasis = "320px";
    untoggled = true;
    positionFilterToggleIcon();
  } else if (untoggled){
    //hide the filter
    filterbar.style.flexBasis = "0";
    untoggled = false;
    positionFilterToggleIcon();
  }
}

function positionFilterToggleIcon(){
  if (! untoggled){
    //Change rotation if on a mobile device
    ((! checkMobile()) ? toggleFilterIcon.style.transform = "rotate(0deg)" : toggleFilterIcon.style.transform = "rotate(90deg)");
  } else if (untoggled){
    //Change rotation if on a mobile device
    ((! checkMobile()) ? toggleFilterIcon.style.transform = "rotate(180deg)" : toggleFilterIcon.style.transform = "rotate(270deg)");
  }
}

function checkMobile(){
  return ((window.innerWidth <= 768) ? true : false);
}

//toggle coin data on and off
var displayList;
getUrlDisplayList(); //grab the coins from the url bar

function getUrlDisplayList() {
  ((queryString.display) ? displayList = queryString.display.toLowerCase().split(",") : displayList = []);
}

function toggleTop(){
  toggleReset();
  searchArray(tickerData, 200, "rank", true)
  .then(function(topTwoHundredData){
    for (var coin in topTwoHundredData) {
      if (topTwoHundredData[coin].symbol) {
        displayList.push(topTwoHundredData[coin].symbol);
      }
    }
  }).then(function(){
    updateInformation(displayList);
    window.location.search = window.location.search;
  });
}

function toggleReset(){
  displayList = [];
  updateInformation(displayList);
}

function toggleCoin(coin){
  //check if the coin is currently on the display
  searchArray(displayList, coin).then(function(result){
    if (result == false) {
      //if it's not, add it and rerender
      displayList.push(coin);
      updateInformation(displayList);
    } else {
      //if it is, remove it and rerender
      var index = displayList.indexOf(coin);
      displayList.splice(index, 1);
      updateInformation(displayList);
    }
  });
}

var reverseSort = false;

function toggleReverse() {
  ((reverseSort) ? reverseSort = false : reverseSort = true);
  updateInformation(displayList);
}

function updateURL(a){
  if (a.length && a.length > 0) {
    //create the new string
    var newSortParams = sort.value,
        newDisplayParams = a.toString().toLowerCase();

    ((sort.value === "" && queryString.sort) ? newSortParams = queryString.sort : newSortParams = 'rank';
    //put it up in the URL bar
    window.history.replaceState({ display: newDisplayParams }, "Dashboard of " + newDisplayParams, "/#sort=" + newSortParams + "&display=" + newDisplayParams);
  } else {
    //if there aren't any coins being displayed, the url should be set to root
    window.history.replaceState({ display: "" }, "a blank coinconsole", "/");
  }
}

function updateInformation(a){
  //send new parameters to the URL for sharing/bookmarking purposes
  updateURL(a);

  if (a.length && a.length != 0){
    //if the array passed in is legit, get each coin's information and display it
    selectInformationList().then(function(informationList){
      sortInformationList(informationList);
      renderInformationList(informationList);
    });
  } else {
    //fall back to default screen
    information.innerHTML = coinconsoleWelcome;
  }

  function selectInformationList(){
    return new Promise(function(resolve, reject){
      var asyncLoop = 0,
          coinInfoList = [];

      for (var coin in a) {
        asyncLoop += 1;
        selectCoinInfo(a[coin]).then(function(coinInfo){
          coinInfoList.push(coinInfo);
        });
        ((asyncLoop == a.length) ? resolve(coinInfoList) : asyncLoop);
      }
    });
  }

  function sortInformationList(a){
    var newUrlParams = getUrlParams();
    ((newUrlParams.sort) ? a.sortOn(newUrlParams.sort) : newUrlParams.sort); //get the sort option from the url bar
    ((reverseSort) ? a.reverse() : reverseSort); //check to see if the user wants the list reversed
  }

  function renderInformationList(a){
    var html = '',
        asyncLoop = 0;

    for (var coin in a) {
      if (typeof a[coin] == "object") {
        asyncLoop += 1;
        //create a box for each coin, put the information in it, and add it to the display
        createInformationListHTML(a[coin]).then(function(informationListHTML){
          html = html + informationListHTML;
          ((asyncLoop == a.length) ? displayInformationList(html) : asyncLoop);
        });
      }
    }
  }

  function displayInformationList(h) {
    //add the completed HTML to the display
    information.innerHTML = h;
  }
}

function selectCoinInfo(coin) {
  return new Promise(function(resolve, reject){
    //check tickerData for that coin's symbol
    for (var index in tickerData) {
      if (tickerData[index].symbol && tickerData[index].symbol !== "undefined" && typeof tickerData[index].symbol === 'string' && tickerData[index].symbol.toLowerCase() === coin){
        //if/when that coin's symbol is found, return all of that coin's information and stop searching
        resolve(tickerData[index]);
        break;
      }
    }
  });
}

function createInformationListHTML(o){
  return new Promise(function(resolve, reject){
    //make sure that the object's information is what we're looking for -- prevents blocking from incorrect url bar values
    if (o.name) {
      var title = o.name,
          symbol = o.symbol,
          priceUsd = parseFloat(o.price_usd),
          priceUsd = ((priceUsd > 1) ? priceUsd.formatMoney(2, ".", ",") : priceUsd = priceUsd.formatMoney(8, ".", ",")),
          priceBtc = parseFloat(o.price_btc).toFixed(8),
          volume = parseFloat(o["24h_volume_usd"]).formatMoney(0, ".", ","),
          marketCap = parseFloat(o.market_cap_usd).formatMoney(0, ".", ","),
          coinSupply = parseInt(o.total_supply).formatMoney(0, ".", ","),
          oneHour = parseFloat(o["percent_change_1h"]),
          twentyFourHour = parseFloat(o["percent_change_24h"]),
          sevenDay = parseFloat(o["percent_change_7d"]),
          rank = parseInt(o.rank);

      var oneHourChangeHTML = ((oneHour < 0) ? '<h4 class="no-margin one-hour negative">1H: ' + oneHour + "%</h4>" : '<h4 class="no-margin one-hour positive">1H: ' + oneHour + '%</h4>'),
          twentyFourHourChangeHTML = ((twentyFourHour < 0) ? '<h4 class="no-margin twenty-four-hour negative" style="padding: 0 7px;">24H: ' + twentyFourHour + '%</h4>' : '<h4 class="no-margin twenty-four-hour positive" style="padding: 0 7px;">24H: ' + twentyFourHour + '%</h4>'),
          sevenDayChangeHTML = ((sevenDay < 0) ? '<h4 class="no-margin seven-day negative">7D: ' + sevenDay + '%</h4></div>' : "<h4 class='no-margin seven-day positive'>7D: " + sevenDay + '%</h4>');

      var titleHTML = ((twentyFourHour < 0) ? '<h3 class="no-margin information-title negative">' + title + '<small class="rank"> #' + rank + '</small>' + '</h3>' : '<h3 class="no-margin information-title positive">' + title + '<small class="rank"> #' + rank + '</small>' + '</h3>');

      var priceUsdHTML = '<h4 class="no-margin">USD: $' + priceUsd + '</h4>',
          priceBtcHTML = '<h4 class="no-margin">BTC: ' + priceBtc + '</h4>',
          volumeHTML = '<h4 class="no-margin">Volume: $' + volume + '</h4>',
          marketCapHTML = '<h4 class="no-margin">Market Cap: $' + marketCap + '</h4>',
          coinSupplyHTML = '<h4 class="no-margin">Supply: ' + coinSupply + ' ' + symbol +'</h4>',
          result = '<li class="inline information-item"><div id=' + title + '">' + titleHTML + priceUsdHTML + priceBtcHTML + volumeHTML + marketCapHTML + coinSupplyHTML + '<div class="percent-changes no-padding">' + oneHourChangeHTML + twentyFourHourChangeHTML + sevenDayChangeHTML + '</div>' + '</div></li>';

      resolve(result);
    }
  });
}

function shareLink(){
  //future button function to share a link to that specific coinconsole
  //maybe some url shortening could be added to this function to make it... well... shorter
}

function searchArray(a, t, k, lt){
  return new Promise(function(resolve, reject){
    if (k) {
      if (typeof t === 'string') {
        resolve(a.filter(function(element) {
          return element[k].toString().toLowerCase().indexOf(t.toLowerCase()) > -1;
        }));
      } else {
        if (lt == true) {
          resolve(a.filter(function(element) {
            return element[k] <= t;
          }));
        } else {
          resolve(a.filter(function(element) {
            return element[k] >= t;
          }));
        }
      }
    } else {
      if (typeof t === 'string') {
        resolve(a.filter(function(element) {
          return element.toString().toLowerCase().indexOf(t.toLowerCase()) > -1;
        }));
      } else {
        if (lt == true) {
          resolve(a.filter(function(element) {
            return element <= t;
          }));
        } else {
          resolve(a.filter(function(element) {
            return element >= t;
          }));
        }
      }
    }
  });
}

function getUrlParams() {
 var query_string = {};
 //window.location.search for "?x=y" url params -- this requires us to refresh the page when changed, though
 var query = window.location.hash.substring(1);
 var params = query.split("&");
 for (var i=0; i<params.length; i++) {
   var pair = params[i].split("=");
       // If first entry with this name
   if (typeof query_string[pair[0]] === "undefined") {
     query_string[pair[0]] = decodeURIComponent(pair[1]);
       // If second entry with this name
   } else if (typeof query_string[pair[0]] === "string") {
     var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
     query_string[pair[0]] = arr;
       // If third or later entry with this name
   } else {
     query_string[pair[0]].push(decodeURIComponent(pair[1]));
   }
 }
 return query_string;
};

Number.prototype.formatMoney = function(c, d, t){
  var n = this,
      c = isNaN(c = Math.abs(c)) ? 2 : c,
      d = d == undefined ? "." : d,
      t = t == undefined ? "," : t,
      s = n < 0 ? "-" : "",
      i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
      j = (j = i.length) > 3 ? j % 3 : 0;
     return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

Array.prototype.unique = function() {
    return this.reduce(function(accum, current) {
        if (accum.indexOf(current) < 0) {
            accum.push(current);
        }
        return accum;
    }, []);
}

Array.prototype.sortOn = function(key){
  this.sort(function(a, b){
      if (a[key] < b[key]){
          return -1;
      } else if (a[key] > b[key]){
          return 1;
      }
      return 0;
  });
}
