/* ------------------------------------------------------------------
   zenkai.js — la porta d'entrada i el Drive, un sol cop per a totes les eines.

   Això vivia copiat dins de cada pàgina. El pes era el de menys: el problema
   era que cada arreglament s'havia de fer quatre vegades i que ja havien
   començat a no ser iguals.

   Cada eina defineix ZCFG abans de carregar aquest fitxer:
     jsonName, csvName        els seus fitxers al Drive
     buildCSV()               el CSV de només lectura
     getPayload()             què s'hi desa
     applyPayload(d) -> bool  què en llegeix (cert si hi havia dades)
     boot()                   arrencar l'eina un cop passada la porta
   I, opcionalment:
     compte                   el correu que hi pot entrar
     scopes                   permisos de Google de més
     mergeRemote(d) -> n      fitxes del Drive que no tenia; en torna quantes
     refreshRemote(d) -> bool rellegir-ho tot; cert si ha canviat res
     nomFitxa / nomFitxes     com dir-ne als avisos
   ------------------------------------------------------------------ */
/* Bloc comú a les tres apps. Cada app defineix ZCFG abans d'aquest bloc:
   ZCFG.jsonName, ZCFG.csvName, ZCFG.buildCSV(), ZCFG.getPayload(),
   ZCFG.applyPayload(data) -> bool (si venien dades), ZCFG.boot() */
var CID_KEY="g_client_id", SKIP_KEY="g_skip_login";
/* les eines de casa entren amb un altre correu: ho diu cada una */
var ALLOWED_EMAIL=(window.ZCFG && ZCFG.compte) || "zenkai3dstudio@gmail.com";
var gToken=null, gTokenClient=null, gFileId=null, gCsvId=null, gDriveWriteTimer=null,
    gLastLoad=0, gSaveFailed=false;

function $g(id){ return document.getElementById(id); }
function showSetup(){ $g("gate-setup").hidden=false; $g("gate-login").hidden=true; $g("gate").hidden=false; }

/* El botó d'entrar, bloquejat mentre s'hi entra: un segon toc no ha de tornar a
   demanar el compte. Es deixa anar quan la porta es tanca o quan torna un error,
   i al cap d'un minut i mig per si la finestra de Google s'ha tancat sense dir res. */
var gEntrant = false, gEntrantT = null;
function entraBloqueja() {
  var b = $g("gate-signin");
  if (!b) return;
  gEntrant = true;
  b.dataset.txt = b.dataset.txt || b.textContent;
  b.disabled = true;
  b.textContent = "Entrant\u2026";
  clearTimeout(gEntrantT);
  gEntrantT = setTimeout(entraDeixa, 90000);
}
function entraDeixa() {
  var b = $g("gate-signin");
  gEntrant = false;
  clearTimeout(gEntrantT);
  if (!b) return;
  b.disabled = false;
  if (b.dataset.txt) b.textContent = b.dataset.txt;
}

function showLogin(msg){ entraDeixa(); $g("gate-setup").hidden=true; $g("gate-login").hidden=false; $g("gate").hidden=false; $g("gate-status").textContent=msg||""; }
function hideGate(){ entraDeixa(); $g("gate").hidden=true; }

/* Les fitxes d'un altre aparell que aquí no hi són. Totes les eines tenen
   llistes amb uid, així que serveix per a totes. */
function zFonLlista(meva, remota, esborrades){
  if(!Array.isArray(remota) || !Array.isArray(meva)) return [];
  var tinc={};
  meva.forEach(function(x){ if(x && x.uid) tinc[x.uid]=1; });
  return remota.filter(function(r){
    return r && r.uid && !tinc[r.uid] && !(esborrades && esborrades[r.uid]);
  });
}
function zdeepMerge(base,extra){
  for(var k in extra){
    if(extra[k]&&typeof extra[k]==="object"&&!Array.isArray(extra[k])&&base[k]) zdeepMerge(base[k],extra[k]);
    else base[k]=extra[k];
  }
}

var GSCOPE = ["https://www.googleapis.com/auth/drive.file"]
  .concat((window.ZCFG && ZCFG.scopes) || [])
  .concat(["https://www.googleapis.com/auth/userinfo.email",
           "https://www.googleapis.com/auth/userinfo.profile"]).join(" ");

/* ---------- la sessió de Google, compartida entre les apps ---------- */
/* El testimoni dura una hora i totes les apps són al mateix domini, així que el
   guardo i el torno a fer servir: passar d'una app a l'altra no ha de tornar a
   demanar el compte. Només es reaprofita si és del compte que toca i si porta
   tots els permisos que demana l'app on s'obre. */
/* Una clau per compte: hi ha apps que entren amb el compte de l'estudi i
   altres amb el de casa. Si en compartissin una de sola, cada app rebutjaria
   el testimoni de l'altra i, pitjor, l'hi esborraria. */
var TOK_KEY = "g_token_" + ALLOWED_EMAIL;
function tokDesa(resp, u) {
  try {
    localStorage.setItem(TOK_KEY, JSON.stringify({
      t: resp.access_token,
      fins: Date.now() + (Math.max(60, (+resp.expires_in || 3600)) - 120) * 1000,
      scope: resp.scope || GSCOPE,
      email: (u && u.email) || "",
      foto: (u && u.picture) || ""
    }));
  } catch (e) {}
}
function tokDesat(calen) {
  try {
    var d = JSON.parse(localStorage.getItem(TOK_KEY) || "null");
    if (!d || !d.t || !(d.fins > Date.now())) return null;
    if ((d.email || "").trim().toLowerCase() !== ALLOWED_EMAIL) return null;
    var te = String(d.scope || "").split(/\s+/);
    var falta = String(calen || "").split(/\s+/).filter(Boolean).filter(function (s) {
      return te.indexOf(s) < 0;
    });
    if (falta.length) return null;
    return d;
  } catch (e) { return null; }
}
function tokOblida() { try { localStorage.removeItem(TOK_KEY); } catch (e) {} }

function authOk(email, foto) {
  $g("acct-pic").src = foto || "";
  $g("acct-email").textContent = email || "";
  $g("acctbar").hidden = false;
  hideGate();   /* abans d'anar al Drive: si no, el botó d'entrar es queda a la pantalla */
  afterAuthOk();
}

function gateInit(){
  if(localStorage.getItem(SKIP_KEY)==="1"){ hideGate(); ZCFG.boot(); return; }
  var cid=localStorage.getItem(CID_KEY);
  if(!cid){ showSetup(); return; }
  var desat = tokDesat(GSCOPE);
  if (desat) { gToken = desat.t; hideGate(); authOk(desat.email, desat.foto); }
  else showLogin("");
  waitForGis(function(){
    try{
      gTokenClient=google.accounts.oauth2.initTokenClient({
        client_id: cid,
        scope: GSCOPE,
        callback: onGToken,
        error_callback: function(){ showLogin("No s'ha pogut iniciar sessió. Torna-ho a provar."); }
      });
    }catch(e){ showLogin("El Client ID no sembla vàlid. Comprova'l amb «Canvia el Client ID»."); }
  });
}
function waitForGis(cb,tries){
  tries=tries||0;
  if(typeof google!=="undefined" && google.accounts && google.accounts.oauth2) cb();
  else if(tries<40) setTimeout(function(){ waitForGis(cb,tries+1); },250);
  else showLogin("No s'ha pogut carregar l'inici de sessió de Google (revisa la connexió).");
}
$g("gate-cid-save").onclick=function(){
  var v=$g("gate-cid").value.trim();
  if(!v){ toast("Enganxa primer el Client ID"); return; }
  localStorage.setItem(CID_KEY,v);
  gateInit();
};
$g("gate-skip").onclick=function(){ localStorage.setItem(SKIP_KEY,"1"); hideGate(); ZCFG.boot(); };
$g("gate-skip2").onclick=function(){ localStorage.setItem(SKIP_KEY,"1"); hideGate(); ZCFG.boot(); };
$g("gate-reconfig").onclick=function(){ localStorage.removeItem(CID_KEY); showSetup(); };
$g("gate-signin").onclick=function(){
  if (gEntrant) return;
  if(!gTokenClient){ showLogin("Encara carregant… torna a tocar en un moment."); return; }
  entraBloqueja();
  gTokenClient.requestAccessToken({prompt:""});
};
$g("acct-signout").onclick=function(){
  tokOblida();
  if(gToken && typeof google!=="undefined" && google.accounts && google.accounts.oauth2.revoke){
    google.accounts.oauth2.revoke(gToken,function(){});
  }
  gToken=null; gFileId=null; gCsvId=null;
  localStorage.removeItem(SKIP_KEY);
  $g("acctbar").hidden=true;
  showLogin("");
};

function onGToken(resp){
  if(resp.error){ showLogin("Accés no concedit. Torna-ho a provar."); return; }
  gToken=resp.access_token;
  fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:"Bearer "+gToken}})
    .then(function(r){ return r.json(); })
    .then(function(u){
      var email=(u.email||"").trim().toLowerCase();
      if(email!==ALLOWED_EMAIL){
        if(typeof google!=="undefined" && google.accounts && google.accounts.oauth2.revoke){
          google.accounts.oauth2.revoke(gToken,function(){});
        }
        gToken=null;
        showLogin("Aquest compte ("+(u.email||"")+") no hi té accés. Entra-hi amb "+ALLOWED_EMAIL+".");
        return;
      }
      tokDesa(resp, u);
      authOk(u.email, u.picture);
    }).catch(function(){
      gToken=null;
      showLogin("No he pogut confirmar el compte. Torna-ho a provar.");
    });
}
function afterAuthOk(){
  driveFindOrCreate(ZCFG.jsonName,"application/json","{}").then(function(id){
    gFileId=id;
    return driveLoad(id);
  }).then(function(data){
    var had=false; gLastLoad=Date.now();
    try{ had=ZCFG.applyPayload(data||{}); }catch(e){}
    hideGate();
    ZCFG.boot();
    if(!had) scheduleDriveSave();
  }).catch(function(){
    toast("No he pogut connectar amb el Drive; per ara es desarà només en aquest dispositiu.");
    hideGate(); ZCFG.boot();
  });
}

function driveFetch(url,opts){
  opts=opts||{};
  opts.headers=Object.assign({},opts.headers,{Authorization:"Bearer "+gToken});
  return fetch(url,opts).then(function(r){
    if(r.ok) return r;
    /* el número d'error sol no dir res: el missatge de Google, sí */
    return r.text().then(function(t){
      var detail="";
      try{ var j=JSON.parse(t); detail=(j.error&&(j.error.message||j.error.status))||""; }
      catch(e){ detail=(t||"").slice(0,200); }
      if (r.status === 401) tokOblida();
      throw {code:(r.status===401?"g_401":"g_http_"+r.status), status:r.status, detail:detail};
    });
  });
}
function driveFindOrCreate(name,mime,initialBody){
  var q=encodeURIComponent("name='"+name+"' and trashed=false");
  return driveFetch("https://www.googleapis.com/drive/v3/files?q="+q+"&fields=files(id,name)&spaces=drive")
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d.files && d.files.length) return d.files[0].id;
      var boundary="zenkai3dboundary";
      var body="--"+boundary+"\r\nContent-Type: application/json\r\n\r\n"+JSON.stringify({name:name})+
        "\r\n--"+boundary+"\r\nContent-Type: "+mime+"\r\n\r\n"+(initialBody||"")+"\r\n--"+boundary+"--";
      return driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",{
        method:"POST",
        headers:{"Content-Type":"multipart/related; boundary="+boundary},
        body:body
      }).then(function(r){ return r.json(); }).then(function(f){ return f.id; });
    });
}
function driveLoad(fileId){
  return driveFetch("https://www.googleapis.com/drive/v3/files/"+fileId+"?alt=media")
    .then(function(r){ return r.text(); })
    .then(function(t){ try{ return t?JSON.parse(t):{}; }catch(e){ return {}; } });
}
/* El fitxer d'una altra eina. A diferència de driveFindOrCreate, si no hi és
   torna null en comptes de crear-lo: el pressupost no ha de crear l'inventari. */
function driveLlegeixDe(nom){
  var q=encodeURIComponent("name='"+nom+"' and trashed=false");
  return driveFetch("https://www.googleapis.com/drive/v3/files?q="+q+"&fields=files(id,name)&spaces=drive")
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(!d.files || !d.files.length) return null;
      return driveLoad(d.files[0].id);
    });
}
function driveSaveCSV(){
  if(!gToken||!ZCFG.csvName||!ZCFG.buildCSV) return Promise.resolve();
  var write=function(id){
    gCsvId=id;
    return driveFetch("https://www.googleapis.com/upload/drive/v3/files/"+id+"?uploadType=media",{
      method:"PATCH",
      headers:{"Content-Type":"text/csv"},
      body:ZCFG.buildCSV()
    });
  };
  if(gCsvId) return write(gCsvId);
  return driveFindOrCreate(ZCFG.csvName,"text/csv","").then(write);
}
/* Abans de desar, rellegeixo el Drive i hi afegeixo el que no tinc. Sense
   això, apuntar una cosa al mòbil i una altra al Mac vol dir que l'últim que
   desa esborra el que havia fet l'altre, i sense dir-ho. */
function scheduleDriveSave(){
  if(!gToken||!gFileId) return;
  clearTimeout(gDriveWriteTimer);
  gDriveWriteTimer=setTimeout(function(){
    var abans = ZCFG.mergeRemote
      ? driveLoad(gFileId).then(function(d){
          var n=0;
          try{ n=ZCFG.mergeRemote(d||{})||0; }catch(e){ n=0; }
          if(n){
            var u=ZCFG.nomFitxa||"fitxa", p=ZCFG.nomFitxes||"fitxes";
            toast(n===1 ? "He afegit 1 "+u+" que hi havia al Drive"
                        : "He afegit "+n+" "+p+" que hi havia al Drive");
          }
        }).catch(function(){})
      : Promise.resolve();
    abans.then(function(){
      return driveFetch("https://www.googleapis.com/upload/drive/v3/files/"+gFileId+"?uploadType=media",{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(ZCFG.getPayload())
      }).then(function(){ gSaveFailed=false; gLastLoad=Date.now(); return driveSaveCSV(); });
    }).catch(function(e){
      gSaveFailed=true;
      if(e&&e.code==="g_401"){
        toast("La sessió de Google ha caducat; torna a entrar-hi.");
        gToken=null; showLogin("Torna a entrar-hi per continuar desant al Drive.");
      } else {
        toast("No s'ha pogut desar al Drive ara mateix; ho torno a provar més tard.");
      }
    });
  },900);
}
/* Si tornes a l'eina després d'una estona (una pestanya que havia quedat
   oberta), rellegeixo el Drive: pot ser que mentrestant hi hagis apuntat coses
   des del telèfon. */
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState!=="visible" || !gToken || !gFileId || gSaveFailed) return;
  if(!ZCFG.refreshRemote) return;
  if(Date.now()-gLastLoad < 5*60*1000) return;
  driveLoad(gFileId).then(function(d){
    gLastLoad=Date.now();
    var canviat=false;
    try{ canviat=!!ZCFG.refreshRemote(d||{}); }catch(e){ canviat=false; }
    if(canviat) toast("Actualitzat amb els últims canvis del Drive");
  }).catch(function(){});
});

gateInit();


/* ---------------- pista de pestanyes que no caben ---------------- */
(function(){
  var w=document.querySelector(".navwrap"), n=w&&w.querySelector("nav");
  if(!w||!n) return;
  function mira(){ w.classList.toggle("hi-ha-mes", n.scrollWidth - n.clientWidth - n.scrollLeft > 6); }
  n.addEventListener("scroll", mira);
  window.addEventListener("resize", mira);
  setTimeout(mira, 60); mira();
})();
