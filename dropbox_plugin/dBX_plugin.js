function createCssRule(css_str) { //lib fn
  const styleSheet= document.createElement("style");
  styleSheet.type= "text/css";
  styleSheet.innerHTML= css_str;
  document.head.appendChild(styleSheet);
} //createCssRule()


alarmsSave_hook= function(fileContent_str) { //hook to fn in main page
  if (status_num != 9) return; //-->

  dBX.uploadData(dBX.fPath_str, fileContent_str, cb, err_cb);
  function cb(response) {
console.log("response, json",response)
    dBX.BUT.logo_glow("limegreen");
    setFlag(response.status == 200);
  }
  function err_cb(err) {
    setFlag(false);
  }
  function setFlag(ok_flag) {
    if (dBX.badSave_flag == ok_flag) return; //-->
    dBX.badSave_flag= ok_flag;
    dBX.BUT.logo_set();
  }
}; //alarmsSave_hook()


const dBX= {
  clientId_str: "fizj6vrhaqvnlix",
  clientSecret_str: "k1jhpcjaavnwg7m",
  redirectUri_str: "https://chaaad.github.io/TIMECKS/",

  file_str: "alarms.json",

  //status_num, badSave_flag
  //API
  //accessToken_str, refreshToken_str
  //AUTH

  ls: function(key, v) { //localStorage: get, set, v="" to rem
    if (v != undefined) {
      if (v == "") window.localStorage.removeItem(key); //ls rem
      else window.localStorage.setItem(key, v); //ls set
    } else {
      return window.localStorage.getItem(key); //ls get
    }
  }, //ls()

  msg_err: function(err) {
    console.error(err.error || err);
  }, //msg_err()


  init: function() {
    dBX.BUT.logo_create();
    dBX.fPath_str= "/" +dBX.fPath_str;

    var usp= new URLSearchParams(window.location.search);
    var authCode_str= usp.get("code");

    if (authCode_str) { //hasRedirectedFromAuth
      history.replaceState("", document.title, window.location.pathname); //url remove hash
      dBX.AUTH= new Dropbox.DropboxAuth({clientId: dBX.clientId_str});
      dBX.AUTH.setCodeVerifier(window.sessionStorage.getItem("dbx_codeVerify_key"));
      window.sessionStorage.removeItem("dbx_codeVerify_key");
      dBX.AUTH.getAccessTokenFromCode(dBX.redirectUri_str, authCode_str)
        .then((response) => {
          dBX.accessToken_str= response.result.access_token;
          dBX.ls("dbx_accessToken", dBX.accessToken_str); //ls set
          dBX.refreshToken_str= response.result.refresh_token;
          dBX.ls("dbx_refreshToken", dBX.refreshToken_str); //ls set
          dBX.AUTH.setAccessToken(dBX.accessToken_str);
          dBX.API= new Dropbox.Dropbox({
            auth: dBX.AUTH
          });
          dBX.loadFilesList("authRedirect");
        })
        .catch(function(err) {
          dBX.msg_err(err);
        })

    } else { //normal page
      dBX.status_num= dBX.ls("dbx_status") || 0; //ls get
      //0 n/a (or off), 1 disabled (paused), 9 on

      dBX.accessToken_str= dBX.ls("dbx_accessToken"); //ls get
      dBX.refreshToken_str= dBX.ls("dbx_refreshToken"); //ls get

      if (dBX.status_num > 1) dBX.enable();
    }
  }, //init()

  enable: function() {
    if (dBX.accessToken_str || dBX.refreshToken_str) dBX.initApi();
    else dBX.doAuth();
  }, //enable()

  changeStatus: function(status_n) {
    if (dBX.status_num == status_n) return; //-->
//pause, 9.. 1
//disable 1or9.. 0

//enable, 0.. 9
//unpause, 1.. 9
    if (status_n == 9) dBX.enable();
    else dBX.setStatus(status_n);
  }, //changeStatus()

  setStatus: function(status_n) {
    dBX.status_num= status_n;
    dBX.ls("dbx_status", status_n); //ls set
    dBX.BUT.logo_set();
  }, //setStatus()

  loadFilesList: function(authRedirect_flag) {
    dBX.API.filesListFolder({path: ""}) // C:\Users\chaaad\Dropbox\Apps\TIMECKS
      .then(response => {
        var files_arr= response.result.entries;

        dBX.setStatus(9); /////////??????

        if (files_arr.find(file_item => file_item.name == dBX.file_str)) {
          dBX.downloadData(dBX.fPath_str, fileContent_str => {
console.log(fileContent_str);
            dBX.BUT.logo_glow("pink");

            //compare
            var alarmsDBX_arr= xParseJSON(fileContent_str); //fn in main page
            alarmsDBX_arr.sort((a, b) => a.id -b.id);

            var alarmsLS_arr= alarms_getDataArr(); //fn in main page
            alarmsLS_arr.sort((a, b) => a.id -b.id);

            if (JSON.stringify(alarmsLS_arr) != JSON.stringify(alarmsDBX_arr)) { //different
console.log("dif", alarmsLS_arr,alarmsDBX_arr);

              //do prompt???? //////////////
            }
          });

        }

        ////////if (authRedirect_flag) { }  ////need? need authRedirect_flag at all???
      })
    ;
  }, //loadFilesList()

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
        dBX.loadFilesList();
      })
      .catch(err => {
        dBX.msg_err(err);

        dBX.API= undefined;
        if (paramO.accessToken) {
          dBX.accessToken_str= undefined;
          dBX.ls("dbx_accessToken", ""); //ls rem
        } else if (paramO.refreshToken) {
          dBX.refreshToken_str= undefined;
          dBX.ls("dbx_refreshToken", ""); //ls rem
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
    logo_create: function() {
      createCssRule(`
        IMG#dropboxLogo {
          background: lightgray;
          transition: background-color 0.75s ease-out;
          width: 32px; /*scaled*/

          position: fixed;
          bottom: 4px;
          margin: 8px;

          cursor: pointer;

          &.activeState {
            background: #0062FF;
          }

          &.errorState {
            background: red;
          }
        }
      `);

      const dropboxLogo_IMG= document.createElement("img");
      document.body.appendChild(dropboxLogo_IMG);
      dropboxLogo_IMG.id= "dropboxLogo";
      dropboxLogo_IMG.src= "dropbox_logo-mask64.png";
      dropboxLogo_IMG.addEventListener("click", evt => {

        //status_num, buttons
        //0, Enable
        //1, Unpause, Disable
        //9, Pause, Disable

        //////////////stub
        var status_str= prompt("status_num:", dBX.status_num);
        if (status_str == null) return;
        var status_n= Number(status_str) || 0;
        //////////////

        dBX.changeStatus(status_n);
      });
    }, //logo_create()

    logo_glow: function(color_str ="#0062FF") { //dropbox blue
      dropboxLogo_IMG.style.background= color_str;
      setTimeout(() => {dropboxLogo_IMG.style.background= ""; }, 1500); //1.5 sec
    }, //logo_glow()

    logo_set: function() {
      var state_str= "";
      if (dBX.status_num > 1) state_str= dBX.badSave_flag ? "errorState" : "activeState"
      dropboxLogo_IMG.classList= state_str;
      // +class "activeState", "errorState" (if has both, "errorState" will override "activeState")
    } //logo_set
  } //BUT.

}; //dBX

dBX.init(); //self-init
