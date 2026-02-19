const pC= {
  init: function() {

    TMXu.createCssRule(`
      div.alarmName {
        .PC_tid {
          color: orangered;
        }
      }
    `);
  } //init()
}; //pC


//tmx hooks

tmx.hookers["init"]= function() { //hook fn from main page
  pC.init();
}; //tmx.hookers["init"]()


tmx.hookers["extAddAlarm"]= function(spl_ar) { //hook fn from main page
  if (spl_ar[2] != "PC") return; //-->
/*
// external|2/19 6:39pm|PC|THU|Hello Kitty|K|1119-12
test "add" in console:
TMX.data_save("externalAlarms", "external|5/5 12:34pm|PC|WED|New York Yankees|K|123-1");
idx:                             0        1           2  3   4                    5 6
*/
  var k_str= spl_ar[5] ? " (K)" : ""; //keeper league
  return `${spl_ar[3]} <br><i>${spl_ar[4]}</i>${k_str} <i class="PC_tid" title="?">${spl_ar[6]}</i>`;
}; //tmx.hookers["extAddAlarm"]()


tmx.hookers["extDeleteAlarm"]= function(spl_ar) { //hook fn from main page
  if (spl_ar[2] != "PC") return; //-->
/*
test "delete" in console:
TMX.data_save("externalAlarms", "externalDelete|123-1|PC");
idx:                             0              1     2
*/
  var tid= spl_ar[1];
  var delTid_EL= [...tmx.alarmsCont_EL.querySelectorAll("i.PC_tid")]
    .find(EL => EL.textContent == tid)
  ;
//console.log("externalDelete tid",tid, "delTid_EL",delTid_EL) //debug
  if (delTid_EL) return delTid_EL.closest("div.alarmInstance");
}; //tmx.hookers["extDeleteAlarm"]


tmx.hookers["alarmNameClick"]= function(targ_el) { //hook fn from main page
  if (targ_el.classList.contains("PC_tid")) {
    var tid= targ_el.textContent;
    var lgid= tid.split("-")[0];
    var tname= targ_el.closest("div.alarmName").querySelector("i").textContent; //tree up then down
    //div.alarmName will contain 2 <i>, 1st will be teamname, 2nd will be tid with <i class="PC_tid">
    jm.alert(`PennantChase<br>lg${lgid} <b>${tname}</b> <a href="https://www.pennantchase.com/lgTeamLineup.aspx?tid=${tid}&lgid=${lgid}" target="_blank">Lineup</a>`);

    return true; //prevent default
  }
}; //tmx.hookers["alarmNameClick"]()
