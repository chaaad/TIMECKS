const dBX= {
  clientId_str: "fizj6vrhaqvnlix",
  clientSecret_str: "k1jhpcjaavnwg7m",
  redirectUri_str: "https://chaaad.github.io/TIMECKS/",

  file_str: "alarms.json",

  badSave_flag: false,
  //.status_num,
  //.API
  //.accessToken_str, .refreshToken_str
  //.AUTH

  msg_err: function(err) {
    console.error(err.error || err);
  }, //msg_err()


  init: function() {
    dBX.BUT.logo_create();
    dBX.fPath_str= "/" +dBX.file_str;

    var usp= new URLSearchParams(window.location.search);
    var authCode_str= usp.get("code");

    if (authCode_str) { //hasRedirectedFromAuth
      TMXu.browserRemoveQuerystring(); //fn from main page
      dBX.AUTH= new Dropbox.DropboxAuth({clientId: dBX.clientId_str});
      dBX.AUTH.setCodeVerifier(window.sessionStorage.getItem("dbx_codeVerify_key"));
      window.sessionStorage.removeItem("dbx_codeVerify_key");
      dBX.AUTH.getAccessTokenFromCode(dBX.redirectUri_str, authCode_str)
        .then((response) => {
          dBX.accessToken_str= response.result.access_token;
          TMXu.ls("dbx_accessToken", dBX.accessToken_str); //fn from main page, ls set
          dBX.refreshToken_str= response.result.refresh_token;
          TMXu.ls("dbx_refreshToken", dBX.refreshToken_str); //fn from main page, ls set
          dBX.AUTH.setAccessToken(dBX.accessToken_str);
          dBX.API= new Dropbox.Dropbox({
            auth: dBX.AUTH
          });
          dBX.firstLoad("authRedirect");
        })
        .catch(function(err) {
          dBX.msg_err(err);
        })

    } else { //normal page

      var error_str= usp.get("error");
      //hasRedirectedFromAuth
      //error=access_denied
      //error_description=The+user+chose+not+to+give+your+app+access+to+their+Dropbox+account.
      if (error_str) {
        error_str= usp.get("error_description");
        if (error_str.includes("Dropbox")) {
          TMXu.browserRemoveQuerystring(); //fn from main page
          TMXu.ls("dbx_status", ""); //turn off dropbox-sync //fn from main page, ls set
        }
      }

      dBX.status_num= TMXu.ls("dbx_status") || 0; //fn from main page, ls get
      //0 n/a (or off), 1 disabled (paused), 9 on

      dBX.accessToken_str= TMXu.ls("dbx_accessToken"); //fn from main page, ls get
      dBX.refreshToken_str= TMXu.ls("dbx_refreshToken"); //fn from main page, ls get

      if (dBX.status_num > 1) dBX.enable();
      else dBX.BUT.logo_set();
    }
  }, //init()

  enable: function() {
    if (dBX.accessToken_str || dBX.refreshToken_str) dBX.initApi();
    else dBX.doAuth();
  }, //enable()

  changeStatus: function(status_n) {
    if (dBX.status_num == status_n) return; //-->

    //pause, 9 -> 1
    //disable 1or9 -> 0
    //enable, 0 -> 9
    //unpause, 1 -> 9

    if (status_n==9 && !dBX.API) dBX.enable();
    else dBX.setStatus(status_n);
  }, //changeStatus()

  setStatus: function(status_n) {
    dBX.status_num= status_n;
    TMXu.ls("dbx_status", status_n); //fn from main page, ls set
    dBX.BUT.logo_set();
  }, //setStatus()

  firstLoad: function(authRedirect_flag) {
    //loadFilesList
    dBX.API.filesListFolder({path: ""}) // C:\Users\chaaad\Dropbox\Apps\TIMECKS
      .then(response => { //success
        var files_arr= response.result.entries;

        dBX.setStatus(9);

        var alarmsDBX_str, alarmsDBX_arr;
        if (files_arr.find(file_item => file_item.name == dBX.file_str)) {
          dBX.downloadData(dBX.fPath_str, fileContent_str => { //get "alarms.json" from dropbox
//console.log("firstLoad->dBX.downloadData", dBX.fPath_str, "loaded");
//console.log(fileContent_str);
            dBX.BUT.logo_glow("cyan");

            alarmsDBX_arr= TMXu.parseJSON(fileContent_str); //fn from main page
            if (Array.isArray(alarmsDBX_arr)) {
              alarmsDBX_arr.sort((a, b) => a.id -b.id);
              alarmsDBX_str= JSON.stringify(alarmsDBX_arr);
            }
            compareThenChoose();
          });

        } else { //no dropbox "alarms.json" //would occur normally with user's very first use of timecks-dropbox-sync
          compareThenChoose();
        }

        function compareThenChoose() {
          var alarmsLS_str;
          var alarmsLS_arr= TMX.alarms_getDataArr(); //fn from main page
          alarmsLS_arr.sort((a, b) => a.id -b.id);
          alarmsLS_str= JSON.stringify(alarmsLS_arr);

          if (alarmsLS_str != alarmsDBX_str) { //different
            //instead of comparing objects, just compare the json strs, both were sorted same way before .stringify()
//console.log("dif", alarmsLS_arr,alarmsDBX_arr);
            if (!alarmsDBX_str) {
              chose("LS");

            } else {
              var html_str= "<div style='display:flex; '>"; //row div, flex will make children into columns
              addCol("Local", alarmsLS_arr);
              addCol("Cloud", alarmsDBX_arr);
              html_str+= '</div>'; //end row div

              function addCol(title_str, arr) {
                html_str+= "<div>"; //col
                html_str+= "<p>" +title_str +"</p>";
                arr.forEach(alO => {
                  html_str+= "● " +alO.n +"<br>";
                  html_str+= "<sup>" +alO.t +"</sup><br>";
                });
                html_str+= "</div>"; //end col
              }

              jm.boolean("<p>Difference found between:</p>" +html_str +"By default, the Cloud will be used. Note: the unused one will be overwritten.", false, { //fn from main page
                //jm custom cb object
                custButText: {OkBut:"Use Local", NoBut:"Use Cloud"},
                end_cb: resp => {
                  chose(resp ? "LS" : "DBX");
                }
              });
            }

            function chose(choice_key) {
              if (choice_key == "DBX") {
                TMX.alarms_start(alarmsDBX_arr); //clear, re-render alarms dom //fn from main page
                TMXu.ls("alarms", alarmsDBX_str); //direct save to //fn from main page, ls set

              } else { //if (choice_key == "LS") {
                tmx.hookers["alarmsSave"](alarmsLS_str); //direct save to dropbox
              }
            } //chose()

          } //is diff
        } //compareThenChoose()

        //if (authRedirect_flag) { } //not used for anything

      }) //success
    ; //filesListFolder

  }, //firstLoad()

  doAuth: function() { //redirect to dropbox site, then redirects back to this site with querystring "&code=.. "
    dBX.AUTH= new Dropbox.DropboxAuth({clientId: dBX.clientId_str});
    dBX.AUTH.getAuthenticationUrl(dBX.redirectUri_str, undefined, "code", "offline", undefined, undefined, true)
      .then(auth_url => {
        window.sessionStorage.setItem("dbx_codeVerify_key", dBX.AUTH.codeVerifier);
        window.location.href= auth_url; //-->
      })
      .catch(function(err) {
        dBX.msg_err(err);
      })
  }, //doAuth()


  initApi: function() {
    var paramO;
    if (dBX.accessToken_str) paramO= {accessToken:dBX.accessToken_str};
    else paramO= {clientId:dBX.clientId_str, clientSecret:dBX.clientSecret_str, refreshToken:dBX.refreshToken_str};

    dBX.API= new Dropbox.Dropbox(paramO);
    dBX.API.usersGetCurrentAccount()
      .then((response) => {
//console.log(paramO, "Auto-Authentication successful:", response);
        dBX.firstLoad();
      })
      .catch(err => {
        dBX.msg_err(err);

        dBX.API= undefined;
        if (paramO.accessToken) {
          dBX.accessToken_str= undefined;
          TMXu.ls("dbx_accessToken", ""); //ls rem
        } else if (paramO.refreshToken) {
          dBX.refreshToken_str= undefined;
          TMXu.ls("dbx_refreshToken", ""); //ls rem
        }

        if (paramO.accessToken && dBX.refreshToken_str) {
            //accessToken failed (prob error.status 401), try refreshToken
            dBX.initApi(paramO); //recurse (cant go endless)

        } else {
          //refreshToken failed, do auth from the top
          dBX.doAuth();
        }
      })
    ;
  }, //initApi()


  uploadData: function(filePath_str, fileContent_str, cb, err_cb) {
    dBX.API.filesUpload({
      path: filePath_str,
      contents: fileContent_str,
      mode: {".tag": "overwrite"} // Optional: Overwrite if the file already exists
    })
      .then(function(response) {
        if (cb) cb(response);
      })
      .catch(function(err) {
        dBX.msg_err(err);
        if (err_cb) err_cb(err);
      })
    ;
  }, //uploadData()

  downloadData: function(filePath_str, cb) {
    dBX.API.filesDownload({path: filePath_str}) // Use the full path, starting with a '/'
      .then(function(response) {
        //The response contains a 'fileBlob' field with the file data
        const file_blob= response.result.fileBlob;

        //Use FileReader to read the Blob content in the browser
        const reader= new FileReader();
        reader.onloadend= function() {
//console.log(reader.result); //This will print the file content
          if (cb) cb(reader.result);
        };
        reader.readAsText(file_blob); //Read the blob as plain text
      })
      .catch(function(err) {
        dBX.msg_err(err);
      })
    ;
  }, //downloadData()

  BUT: {
    //.IMG
    logo_create: function() {
      TMXu.createCssRule(`
        IMG#dropboxLogo {
          background: lightgray;
          transition: background-color 0.75s ease-out;
          width: 32px; /*scaled*/

          position: fixed;
          bottom: 4px;
          margin: 8px;

          cursor: pointer;

          &.onState {
            background: #0062FF; /*dropbox blue*/
          }

          &.pausedState {
            background: #b3d0ff; /*lighter blue*/
          }

          &.errorState {
            background: red;
          }
        }
      `);

      const IMG= document.createElement("img");
      document.body.appendChild(IMG);
      IMG.id= "dropboxLogo";
      IMG.src= "dropbox_plugin/dropbox_logo-mask64.png";

      dBX.BUT.IMG= IMG;

      IMG.addEventListener("click", evt => {
        var sN= dBX.status_num;
        if (sN>1 && dBX.badSave_flag) TMX.alarms_save(); //fn from main page

        var but_str;
        if (sN == 0) but_str= "Enable";
        else if (sN == 1) but_str= "Unpause";
        else but_str= "Pause";

        var custButO= {OkBut: but_str};
        var jm_type= "confirm";
        if (sN) {
          custButO.NoBut= "Disable";
          jm_type= "boolean";
        }

        var status_str= "off";
        if (sN == 1) status_str= "paused";
        else if (sN > 1) status_str= "on";

        var dropboxLink_str= '<br><br>Also, you can manage your <a href="https://www.dropbox.com/account/connected_apps" target="_blank" rel="noopener noreferrer">connected apps</a> at dropbox.com';

        jm[jm_type]("<p>Dropbox sync</p>Status: <b>" +status_str +"</b>" +dropboxLink_str, "", {
          custButText: custButO,
          end_cb: resp => {
            if (resp == null) return; //null //-->

            var change_str= resp ? custButO.OkBut : custButO.NoBut; //true or false
            var status_n;
            if (change_str == "Disable") status_n= 0;
            else if (change_str == "Pause") status_n= 1;
            else if (change_str=="Enable" || change_str=="Unpause") status_n= 9;

            if (status_n != undefined) dBX.changeStatus(status_n);
          }
        }); //jm.confirm or jm.boolean

      }); //addEventListener

    }, //logo_create()

    logo_glow: function(color_str ="black") {
      dBX.BUT.IMG.style.background= color_str;
      setTimeout(() => {dBX.BUT.IMG.style.background= ""; }, 1500); //1.5 sec
    }, //logo_glow()

    logo_set: function() {
      var state_str= "";
      if (dBX.status_num == 1) state_str= "pausedState";
      else if (dBX.status_num > 1) state_str= dBX.badSave_flag ? "errorState" : "onState";
      dBX.BUT.IMG.classList= state_str;
      var title_str="Dropbox sync";
      if (state_str) title_str+= ": " +state_str.replace("State", "");
      dBX.BUT.IMG.title= title_str;
    } //logo_set
  } //BUT.

}; //dBX


//tmx hooks
tmx.hookers["init"]= function() { //hook fn from main page
  dBX.init();
}; //tmx.hookers["init"]()

tmx.hookers["alarmsSave"]= function(fileContent_str) { //hook fn from main page
  if (dBX.status_num != 9) return; //-->

  dBX.uploadData(dBX.fPath_str, fileContent_str, cb, err_cb);
  function cb(response) {
//console.log("tmx.hookers["alarmsSave"]->dBX.uploadData (json), response",response)
    dBX.BUT.logo_glow("limegreen");
    setFlag(response.status == 200);
  }
  function err_cb(err) {
    setFlag(false);
  }
  function setFlag(ok_flag) {
    if (dBX.badSave_flag == !ok_flag) return; //-->
    dBX.badSave_flag= !ok_flag;
    dBX.BUT.logo_set();
  }
}; //tmx.hookers["alarmsSave"]()
