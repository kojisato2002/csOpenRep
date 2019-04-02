/*
 * Whithings and kintone cooperation script
 *
 * Copyright (c) 2019 Cybozu
 *
 * Licensed under the MIT License
 */

(function () {

  // immutable const variables (下記行は原則不変)
  const withingsGetMeasure = "https://wbsapi.withings.net/measure";

  // script const variables from kintone
  const kintone_API_token = "ここに「アプリの設定」で取得したtokenを記載します"
  const useDomainName = "利用するドメイン名のみを記載します(例 hogehoge.cybozu.com)";
  const tgtKintoneAppId = "作成したkintoneのアプリケーションIDを記載します";

  // script const variables from Withings
  const client_inform = "「Withings APIを利用するには」で取得したクライアントIDを記載します";
  const client_secret = "「Withings APIを利用するには」で取得したコンシューマーシークレットを記載します";
  const access_token  = "「access token(アクセストークン) の取得」で取得したアクセストークンを記載します"; 
  const refresh_token = "「access token(アクセストークン) の取得」で取得したリフレッシュトークンを記載します";


  const kintone = require('kintone-nodejs-sdk');

  var start_y = process.argv[2];
  var start_m = process.argv[3] - 1;
  var start_d = process.argv[4];
  var end_y = process.argv[5];
  var end_m = process.argv[6] - 1;
  var end_d = process.argv[7];
  var startUnixDate = Date.UTC(start_y, start_m, start_d, 0, 0, 0) / 1000;
  var endUnixDate = Date.UTC(end_y, end_m, end_d, 0, 0, 0) / 1000;

  strMsg = start_y + "/" + (start_m + 1) + "/" + start_d + " - ";
  strMsg = strMsg + end_y + "/" + (end_m + 1) + "/" + end_d;

  console.log("Paramaters " + strMsg);

  getWithings();

  function getWithings() {
    var webclient = require("request");
    var sendBody = {};
    sendBody.url = withingsGetMeasure;
    sendBody.qs = {};
    sendBody.qs.action = "getmeas";
    sendBody.qs.access_token = access_token;
    sendBody.qs.meastype = "1,6";
    sendBody.qs.category = "1";
    sendBody.qs.offset = "0";
    sendBody.qs.startdate = startUnixDate;
    sendBody.qs.enddate = endUnixDate;

    webclient.get(sendBody, function(error, response, body) {
      if (error) {
        console.log('Error: ' + error.message);
        return;
      }
      parseJsonData(body);
    });
  }

  function parseJsonData(body) {
    var arr = JSON.parse(body);
    if(arr.status != "0") {
      console.log(body);
      return;
    }

    var records = [];
    for(var i = 0; i < arr.body.measuregrps.length; i++) {
    	records[i] = {};
      records[i].grpid = {};
      records[i].grpid.value = arr.body.measuregrps[i].grpid;
      records[i].attrib = {};
      records[i].attrib.value = arr.body.measuregrps[i].attrib;
    
      wrkTimeStamp = arr.body.measuregrps[i].date * 1000;
      var timeStamp = new Date(wrkTimeStamp);
      records[i].date_time = {};
      records[i].date_time.value = timeStamp.toISOString();

      records[i].category = {};
      records[i].category.value = arr.body.measuregrps[i].category;
      records[i].deviceid = {};
      records[i].deviceid.value = arr.body.measuregrps[i].deviceid;

      for(var j = 0; j < arr.body.measuregrps[i].measures.length; j++) {
        var calcValue = arr.body.measuregrps[i].measures[j].value;
        var calcUnit = arr.body.measuregrps[i].measures[j].unit;
        if(calcUnit < 0) {
          calcUnit = Math.abs(arr.body.measuregrps[i].measures[j].unit);
          calcValue = calcValue / (Math.pow(10, calcUnit));
        } else {
          calcValue = calcValue * (Math.pow(10, calcUnit));
        }
        switch(arr.body.measuregrps[i].measures[j].type) {
          case 1:  // 体重の処理
            records[i].measures_value = {};
            records[i].measures_value.value = calcValue;
            break;
          case 6:  // 体脂肪率の処理
            records[i].Fat_Ratio = {};
            records[i].Fat_Ratio.value = calcValue;
            break;
          default:
            break;
        }
      }
	  }
    sendKintoneBySDK(records);
  };

  function sendKintoneBySDK(records) {
    let kintoneAuth = new kintone.Auth();
    kintoneAuth.setApiToken(kintone_api_token);
    let kintoneConnection = new kintone.Connection(useDomainName, kintoneAuth);
    let kintoneRecord = new kintone.Record(kintoneConnection);
    kintoneRecord.addRecords(tgtKintoneAppId, records)
      .then((rsp) => {
        console.log("Successfully registered " + rsp.ids.length + " data.");
      })
      .catch((err) => {
        console.log(err.get()); // This SDK return err with KintoneAPIExeption
      });
  } 

})();