/* ------------------------------------------------------------------
   zenkai-nav.js — la barra de dalt, a totes les pàgines.

   Va a part de zenkai.js perquè el porta també la portada i les eines que
   no entren amb Google: carregar tota la maquinària de la sessió per pintar
   un menú no tindria sentit.
   ------------------------------------------------------------------ */

/* ---------------- el saltador d'eines ----------------
   Les eines són pàgines separades, però fer-les servir no ho ha de semblar.
   Això substitueix el "‹ Menú" de la capçalera per la llista sencera, amb la
   que tens oberta marcada. La portada segueix sent-hi, la primera de tot. */
var ZEINES = [
  ["index.html",       "Menú",          "la portada"],
  ["inventari.html",   "Inventari",     "filament"],
  ["pressupost.html",  "Pressupost",    "què costa"],
  ["impressions.html", "Impressions",   "registre"],
  ["collabs.html",     "Col·laboracions", "marques"],
  ["instagram.html",   "Estadístiques", "xarxes"]
];
(function(){
  var bar = document.querySelector(".brandbar");
  if(!bar) return;
  var aqui = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if(!aqui) aqui = "index.html";

  var jo = null;
  ZEINES.forEach(function(e){ if(e[0].toLowerCase()===aqui) jo=e; });

  var caixa = document.createElement("div");
  caixa.className = "toolpick";
  var bo = document.createElement("button");
  bo.type = "button";
  bo.setAttribute("aria-expanded","false");
  bo.setAttribute("aria-haspopup","true");
  bo.innerHTML = (jo && jo[0]!=="index.html" ? jo[1] : "Eines") + ' <span class="ca">▼</span>';
  var menu = document.createElement("div");
  menu.className = "toolmenu";
  menu.hidden = true;
  menu.innerHTML = ZEINES.map(function(e,i){
    var cur = e[0].toLowerCase()===aqui;
    return (i===1 ? '<hr>' : '') +
      '<a href="'+e[0]+'"'+(cur?' aria-current="page"':'')+'>'+e[1]+
      '<small>'+e[2]+'</small></a>';
  }).join("");
  caixa.appendChild(bo); caixa.appendChild(menu);

  /* on hi havia el "‹ Menú", i si no, al final de la capçalera */
  var vell = bar.querySelector(".backlink");
  if(vell) bar.replaceChild(caixa, vell);
  else bar.appendChild(caixa);

  function tanca(){ menu.hidden=true; bo.setAttribute("aria-expanded","false"); }
  bo.onclick = function(ev){
    ev.stopPropagation();
    var obrint = menu.hidden;
    menu.hidden = !obrint;
    bo.setAttribute("aria-expanded", String(obrint));
  };
  document.addEventListener("click", function(ev){
    if(!caixa.contains(ev.target)) tanca();
  });
  document.addEventListener("keydown", function(ev){
    if(ev.key==="Escape") tanca();
  });
})();
