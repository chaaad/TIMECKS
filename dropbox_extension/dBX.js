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
    console.error(err);
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


//to debug, 1/2
//dBX.compareThenFix()
    }
  }, //init()

  enable: function() {
    if (dBX.accessToken_str || dBX.refreshToken_str) dBX.initApi();
    else dBX.doAuth();
  }, //enable()

  initApi: function(reconnected_cb) {
    var paramO;
    if (dBX.accessToken_str) paramO= {accessToken:dBX.accessToken_str};
    else paramO= {clientId:dBX.clientId_str, clientSecret:dBX.clientSecret_str, refreshToken:dBX.refreshToken_str};

    dBX.API= new Dropbox.Dropbox(paramO);
    dBX.API.usersGetCurrentAccount()
      .then((response) => {
//console.log(paramO, "Auto-Authentication successful:", response);
        if (!reconnected_cb) dBX.firstLoad();
        else reconnected_cb();
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
            dBX.initApi(); //recurse (cant go endless)

        } else {
          //no tokens
          //or accessToken failed, no refreshToken
          //or refreshToken failed
          dBX.doAuth();
        }
      })
    ;
  }, //initApi()

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


  firstLoad: function(authRedirect_flag) {
    //loadFilesList
    dBX.API.filesListFolder({path: ""}) // C:\Users\chaaad\Dropbox\Apps\TIMECKS
      .then(response => { //success
        dBX.setStatus(9); //on

        var files_arr= response.result.entries; //list of all files in :<dropbox>/Apps/TIMECKS
        if (files_arr.find(file_item => file_item.name == dBX.file_str)) {
          dBX.downloadData(dBX.fPath_str, fileContent_str => { //get "alarms.json" from dropbox
//console.log("firstLoad->dBX.downloadData", dBX.fPath_str, "loaded");
//console.log(fileContent_str);
            dBX.BUT.logo_glow("cyan");
            dBX.compareThenFix(fileContent_str);
          });

        } else { //no dropbox "alarms.json" //would occur normally with user's very first use of timecks-dropbox-sync
          compareThenFix();
        }

        //if (authRedirect_flag) { } //not used for anything

      }) //success
    ; //filesListFolder

  }, //firstLoad()


  compareThenFix: function(json_str) {
    var alarmsDBX_str, alarmsDBX_arr;
    if (json_str) {
      //cloud
      alarmsDBX_arr= TMXu.parseJSON(json_str); //fn from main page
      alarmsDBX_str= get_alphaAlarmsStr(alarmsDBX_arr);
    }

    //local
    var alarmsLS_arr= TMX.alarms_getDataArr(); //fn from main page
    var alarmsLS_str= get_alphaAlarmsStr(alarmsLS_arr);

    function get_alphaAlarmsStr(arr) {
      if (Array.isArray(arr)) {
        arr.sort((a, b) => (a.n).localeCompare(b.n, undefined, {sensitivity:"base"}));; //arr is sorted (in place)
        return JSON.stringify(arr);
      }
    } //get_alphaAlarmsStr()

/*
//to debug, 2/2
alarmsDBX_arr= structuredClone(alarmsLS_arr);
  alarmsDBX_arr[0].n= "STUB";
  //alarmsDBX_arr[2].t= "whenever";
  //alarmsDBX_arr[4].c= 1;
alarmsDBX_str= get_alphaAlarmsStr(alarmsDBX_arr);
console.log("STUB alarmsLS_arr",alarmsLS_arr)
*/

    if (alarmsLS_str != alarmsDBX_str) { //different
      //instead of comparing objects, just compare the json strs, both were sorted same way before .stringify()
//console.log("dif", alarmsLS_arr,alarmsDBX_arr);
      if (!alarmsDBX_str) return chosen("LS"); //fix not needed //-->

      //fix needed
      var preMerged_arr= structuredClone(alarmsDBX_arr);
      var origBaseL_n= preMerged_arr.length;

      var changeDBX_arr= procArrs(alarmsDBX_arr, alarmsLS_arr);
      var changeLS_arr= procArrs(alarmsLS_arr, alarmsDBX_arr, "preMrg");

      function procArrs(base_arr, comp_arr, preMrg_flag) { //creates changed-arrs, and preMerged_arr
        var change_arr= [];
        base_arr.forEach((base_aO, i) => {
          if (!comp_arr.find(comp_aO => base_aO.n==comp_aO.n && base_aO.t==comp_aO.t && base_aO.l==comp_aO.l)) { //not found
            change_arr[i]= true;
            if (preMrg_flag) preMerged_arr.push(base_aO);
          }
        });
        return change_arr;
      } //procArrs()

      if (!changeDBX_arr.length && !changeLS_arr.length) {
        console.log('Dropbox Sync: minor differences ignored. "Hidden" and/or "Time/Countdown View" on alarm(s)');
        return; //-->
      }


      var custButO;
      var html_str;
      var cont_el;
      var name_str;

      fix("choose"); //kickoff

      function fix(mode_str) {
        html_str= "<p>Dropbox Sync, ";
        if (mode_str == "choose") {
          custButO= {OkBut:"Choose One", NoBut:"Merge instead"},
          html_str+= "difference found between:</p>";
        } else { //"merge"
          custButO= {OkBut:"Merge", NoBut:"Choose One instead"};
          html_str+= "Cloud combined with Local:</p>";
        }
        html_str+= '<br><div id="dbx_conflict">'; //flex will make children into columns
        if (mode_str == "choose") {
          addCol("Local", alarmsLS_arr, changeLS_arr);
          addCol("Cloud", alarmsDBX_arr, changeDBX_arr);
        } else { //"merge"
          addCol("", preMerged_arr);
        }
        html_str+= '</div>'; //end dbx_conflict div

        if (mode_str == "merge") html_str+= '<i class="E">When Merged, unchecked alarms will be discarded</i>';
        else html_str+= '<br><i class="E">When Chosen, one version will be used, other will be discarded</i>';

        function addCol(title_str, arr, change_arr) {
          html_str+= '<div class="columnDiv">';
          if (title_str) html_str+= '<p><label><input type="radio" name="choose">' +title_str +'</label></p>';

          html_str+= "<ul>";
          arr.forEach((alO, i) => {
            name_str= TMXu.escape_html(alO.n);
            if (change_arr) html_str+= `<li><span class="bullet${change_arr[i]?" mark":""}">● </span>${name_str}<br>`;
            else html_str+= `<li><label${i>=origBaseL_n?' class="added"':""}><input type="checkbox"> ${name_str}&nbsp;</label><br>`;

            html_str+= "<sup>" +alO.t +" " +(alO.l||"") +"</sup></li>";
          });
          html_str+= "</ul></div>"; //end col
        } //addCol()

        var inputEls;
        jm.boolean(html_str, true, { //fn from main page
          //jm custom cb object
          custButText: custButO,
          begin_cb: () => {
            TMXu.classEl(jm._ELs.Modal, "mediumWide", true); //fn from main page
            cont_el= jm._ELs.Description.querySelector("div#dbx_conflict");
            if (mode_str == "choose") {
              var prevUl_el;
              inputEls= [];

              cont_el.querySelectorAll("div.columnDiv").forEach((div_el, i) => {
                var inp_el= div_el.querySelector("input");
                inp_el.addEventListener("click", evt => {
                  highlight(inp_el, true); //note: inp_el scoped by the forEach fn
                }); //addEventListener
                inputEls.push(inp_el);

                var ul_el= div_el.querySelector("ul");
                ul_el.addEventListener("click", evt => {
                  highlight(inp_el, true); //note: inp_el scoped by the forEach fn
                }); //addEventListener
              });

              function highlight(inp_el, checked_flag) {
                if (prevUl_el) TMXu.classEl(prevUl_el, "high", false);

                var ul_el= inp_el.closest("div").querySelector("ul");
                TMXu.classEl(ul_el, "high", true);
                prevUl_el= ul_el;

                if (checked_flag != undefined) inp_el.checked= checked_flag;
              } //highlight()

              highlight(inputEls[1], true); //hc, check 2nd radio

            } else { //"merge"
              inputEls= cont_el.querySelectorAll("input");
              inputEls.forEach(inp_el => inp_el.checked= true ); //check all checkboxes
            }
          },
          end_cb: resp => {
            TMXu.classEl(jm._ELs.Modal, "mediumWide", false); //fn from main page
            if (resp == null) {
              jm.confirm("Dropbox Sync conflict needs to be resolved. To do at a later point:<br><br><p>Exit TIMECKS now</p>", false, {
                end_cb: resp => {
                  if (resp) window.close();
                  else fix(mode_str);
                }
              });

            } else if (resp) {
              if (mode_str == "choose") {
                chosen(inputEls[1].checked ? "DBX" : "LS");

              } else { //implement edits (unchecked.. remove)
                var mergedEdited_arr= [];
                var ids_Set= new Set();
                var new_id= 1;
                var aO;
                inputEls.forEach((inp_el, i) => {
                  if (inp_el.checked) {
                    aO= preMerged_arr[i]; //have faith, "i" will be correct
                    if (i < origBaseL_n) { //register id
                      ids_Set.add(aO.id);
                    } else { //create id
                      while (ids_Set.has(new_id)) {
                        new_id++;
                      }
                      aO.id= new_id;
                      ids_Set.add(new_id);
                    }
                    mergedEdited_arr.push(aO);
                  } //checked
                });
                chosen("merged", mergedEdited_arr);
              }

            } else { //fix must be made, no exiting modal
              fix(mode_str=="choose" ? "merge" : "choose");
            }
          }
        }); //modal

      } //fix()


      function chosen(choice_key, merge_arr) {
        var alarmsM_str;
        if (merge_arr) alarmsM_str= get_alphaAlarmsStr(merge_arr);

        if (choice_key=="DBX" || merge_arr) {
          TMX.alarms_start(merge_arr || alarmsDBX_arr); //clear, re-render alarms dom //fn from main page
          TMXu.ls("alarms", alarmsM_str || alarmsDBX_str); //direct save to //fn from main page, ls set
        }

        if (choice_key=="LS" || merge_arr) {
          dBX.uplAlarms(alarmsM_str || alarmsLS_str); //direct save to dropbox
        }
      } //chosen()

    } //is diff
  }, //compareThenFix()

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
    //0 off
    //1 paused
    //8 on, but expired access token
    //9 on
    dBX.status_num= status_n;
    TMXu.ls("dbx_status", status_n); //fn from main page, ls set
    dBX.BUT.logo_set();
  }, //setStatus()


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
        if (err.error && err.error[".tag"]=="expired_access_token") handle_expiredAT();
        dBX.msg_err(err);
        if (err_cb) err_cb(err);
      })
    ;

    function handle_expiredAT() {
      dBX.API= undefined;
      dBX.accessToken_str= undefined;
      TMXu.ls("dbx_accessToken", ""); //ls rem
      dBX.setStatus(8); //expired access token
      //auto try to reconnect
      dBX.initApi(() => { //reconnected_cb
        dBX.setStatus(9); //on
      });
    } //handle_expiredAT()

  }, //uploadData()


  uplAlarms: function(json_str) {
    if (dBX.status_num != 9) return; //-->

    dBX.uploadData(dBX.fPath_str, json_str, cb, err_cb);

    function cb(response) {
//console.log("uplAlarms, response",response)
      dBX.BUT.logo_glow("limegreen");
      setBSFlag(response.status != 200);
    }

    function err_cb(err) {
      setBSFlag(true);
    }

    function setBSFlag(err_flag) {
      if (dBX.badSave_flag == err_flag) return; //-->
      dBX.badSave_flag= err_flag;
      dBX.BUT.logo_set();
    }
  }, //uplAlarms()


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


        div#dbx_conflict {
          display:flex;

          div.columnDiv {
            flex: 1;

            span.bullet {
              font-size: x-large;

              &.mark {
                color: limegreen;
              }
            }

            ul {
              margin: 8px 8px 0 0;
              padding: 16px;
              border-radius: 16px;

              &.high {
                background: lightyellow;
              }

              sup {
                color: chocolate;
              }
            }
          }

          label.added {
            background: #32cd3247;
          }

          input[type="radio"], input[type="checkbox"] {
              width: 2em;
              height: 2em;
              vertical-align: bottom;
              margin-right: 8px;
          }

        }
      `);

      const IMG= document.createElement("img");
      document.body.appendChild(IMG);
      IMG.id= "dropboxLogo";
      IMG.src= "dropbox_extension/dropbox_logo-mask64.png";

      dBX.BUT.IMG= IMG;

      IMG.addEventListener("click", evt => {
        openModal();
      }); //addEventListener

      function openModal() {
        var sN= dBX.status_num; //alias
        var badSave_str= "";
        var begin_cb;
        if (dBX.badSave_flag) {
          badSave_str= '<br><br><span style="color:red; font-size:medium; ">An error occured during a previous <b>Save</b> operation.</span>';
          if (sN > 1) badSave_str+= '<button class="saveAlarms">Save Now</button>';

          begin_cb= function() {
            var saveBut_el= jm._ELs.Description.querySelector("BUTTON.saveAlarms");
            if (saveBut_el) saveBut_el.addEventListener("click", evt => {
              jm.close();
              if (sN == 9) { //on
                TMX.alarms_save(); //fn from main page

              } else if (sN == 8) { //expired access token
                //try to reconnect
                dBX.initApi(() => { //reconnected_cb
                  dBX.setStatus(9); //on
                  TMX.alarms_save(); //fn from main page
                });
              }
            }); //addEventListener
          };

        } //dBX.badSave_flag

        var dropboxLink_str= "";

        var but_str;
        if (sN == 0) but_str= "Enable";
        else if (sN == 1) but_str= "Unpause";
        else but_str= "Pause";

        var custButO= {OkBut: but_str};
        var jm_type= "confirm";
        if (sN) {
          custButO.NoBut= "Disable";
          jm_type= "boolean";
          dropboxLink_str= '<br><br><span style="font-size:small; ">Also, you can manage all your <a href="https://www.dropbox.com/account/connected_apps" target="_blank" rel="noopener noreferrer">connected apps</a> at dropbox.com</span>';
        }

        var status_str= "off";
        if (sN == 1) status_str= "paused";
        else if (sN > 1) status_str= "on";

        if (sN == 8) status_str+= " (expired access token)";

        jm[jm_type]("<p>Dropbox sync</p>Status: <b>" +status_str +"</b>" +badSave_str +dropboxLink_str, true, {
          custButText: custButO,
          begin_cb: begin_cb,
          end_cb: resp => {
            if (resp == null) return; //null //-->

            var change_str= resp ? custButO.OkBut : custButO.NoBut; //true or false
            var new_sN;
            if (change_str == "Disable") new_sN= 0;
            else if (change_str == "Pause") new_sN= 1;
            else if (change_str=="Enable" || change_str=="Unpause") new_sN= 9;

            if (new_sN != undefined) dBX.changeStatus(new_sN);
          }
        }); //jm.confirm or jm.boolean
      } //openModal()

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
TMX.registerHOOK("init", function() { //hook fn from main page
  dBX.init();
}); //TMX.registerHOOK("init"]()

TMX.registerHOOK("alarmsSave", function(json_str) { //hook fn from main page
  dBX.uplAlarms(json_str);
}); //TMX.registerHOOK("alarmsSave"]()
