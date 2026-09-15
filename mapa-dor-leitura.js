/* =====================================================================
   IDEALIS · MAPA CORPORAL DE DOR — MÓDULO DE LEITURA (DASHBOARD)

   Extraído VERBATIM de avaliacao.js (APP IDEALIS). Os paths, o viewBox,
   os cx/cy, a escala de cor e as regras de destaque são exatamente os
   mesmos que o aluno vê no questionário. Não "parecido": o mesmo.

   O QUE MUDA EM RELAÇÃO AO APP
   Aqui o mapa é de LEITURA. `onPick` é opcional; sem ele as regiões não
   ficam clicáveis e nem recebem cursor de mão.

   IDS — 47 slugs, 43 regiões canônicas
   REG_FRENTE tem 26, REG_COSTAS tem 21. Quatro slugs de costas
   (braco_pd, braco_pe, mao_pd, mao_pe) são ALIASES do mesmo braço/mão
   da frente: herança de ter duas silhuetas. Ver ALIAS_VISTA abaixo.

   VISTA IMPORTA
   Vários pares compartilham o MESMO path e o MESMO cx/cy em vistas
   diferentes (pescoco/cervical, coxa_d/post_coxa_d, joelho_d/poplitea_d,
   perna_d/panturr_d, torn_d+pe_d/calc_d). Pintar sem olhar a vista
   sobrepõe região errada. Use VISTA_DE[id] para decidir a silhueta.

   Depende de: window.React e das CSS vars do tema (--surface, --surface-2,
   --line, --cyan, --lime).
   ===================================================================== */
(function(){
"use strict";
var e = React.createElement;

var CABECA = "M80,4 C90,4 97,11 97,22 C97,30 94,35 89,37 L71,37 C66,35 63,30 63,22 C63,11 70,4 80,4 Z";

var REG_FRENTE = [
  { id:"pescoco", nome:"Pescoço", cx:80, cy:52,
    d:"M69,40 C69,37 71,36 80,36 C89,36 91,37 91,40 L92,62 C92,65 89,66 80,66 C71,66 68,65 68,62 Z" },
  { id:"ombro_d", nome:"Ombro direito", cx:42, cy:88,
    d:"M56,70 C46,73 38,80 34,90 C31,97 30,105 31,112 L46,108 C45,98 47,87 52,79 Z" },
  { id:"ombro_e", nome:"Ombro esquerdo", cx:118, cy:88,
    d:"M104,70 C114,73 122,80 126,90 C129,97 130,105 129,112 L114,108 C115,98 113,87 108,79 Z" },
  { id:"peitoral", nome:"Peito", cx:80, cy:90,
    d:"M60,70 C68,67 92,67 100,70 C102,82 102,96 100,108 C90,111 70,111 60,108 C58,96 58,82 60,70 Z" },
  { id:"abdome", nome:"Barriga", cx:80, cy:134,
    d:"M61,112 C70,109 90,109 99,112 C100,128 99,146 97,158 C90,161 70,161 63,158 C61,146 60,128 61,112 Z" },
  { id:"braco_d", nome:"Braço direito", cx:34, cy:134,
    d:"M31,116 L45,112 C43,128 40,142 37,155 L24,158 C25,144 27,129 31,116 Z" },
  { id:"braco_e", nome:"Braço esquerdo", cx:126, cy:134,
    d:"M129,116 L115,112 C117,128 120,142 123,155 L136,158 C135,144 133,129 129,116 Z" },
  { id:"cotovelo_d", nome:"Cotovelo direito", cx:28, cy:171,
    d:"M36,159 L23,162 C22,170 21,176 21,182 L34,180 C34,173 35,166 36,159 Z" },
  { id:"cotovelo_e", nome:"Cotovelo esquerdo", cx:132, cy:171,
    d:"M124,159 L137,162 C138,170 139,176 139,182 L126,180 C126,173 125,166 124,159 Z" },
  { id:"antebraco_d", nome:"Antebraço direito", cx:26, cy:196,
    d:"M34,184 L21,185 C20,193 19,200 18,207 L32,205 C32,198 33,191 34,184 Z" },
  { id:"antebraco_e", nome:"Antebraço esquerdo", cx:134, cy:196,
    d:"M126,184 L139,185 C140,193 141,200 142,207 L128,205 C128,198 127,191 126,184 Z" },
  { id:"mao_d", nome:"Punho / mão dir.", cx:24, cy:221,
    d:"M32,209 L18,210 C17,217 16,223 16,226 C16,231 19,233 24,232 C29,231 31,227 31,219 C31,215 32,212 32,209 Z" },
  { id:"mao_e", nome:"Punho / mão esq.", cx:136, cy:221,
    d:"M128,209 L142,210 C143,217 144,223 144,226 C144,231 141,233 136,232 C131,231 129,227 129,219 C129,215 128,212 128,209 Z" },
  { id:"quadril", nome:"Quadril", cx:80, cy:175,
    d:"M62,162 C70,159 90,159 98,162 C101,170 102,180 101,188 C90,191 70,191 59,188 C58,180 59,170 62,162 Z" },
  { id:"coxa_d", nome:"Coxa direita", cx:67, cy:222,
    d:"M59,192 L78,192 C78,210 77,232 76,250 L57,250 C56,232 57,210 59,192 Z" },
  { id:"coxa_e", nome:"Coxa esquerda", cx:93, cy:222,
    d:"M101,192 L82,192 C82,210 83,232 84,250 L103,250 C104,232 103,210 101,192 Z" },
  { id:"joelho_d", nome:"Joelho direito", cx:67, cy:264,
    d:"M57,252 L76,252 C76,262 76,270 76,274 L57,274 C57,266 57,259 57,252 Z" },
  { id:"joelho_e", nome:"Joelho esquerdo", cx:93, cy:264,
    d:"M103,252 L84,252 C84,262 84,270 84,274 L103,274 C103,266 103,259 103,252 Z" },
  { id:"perna_d", nome:"Perna direita", cx:67, cy:304,
    d:"M57,276 L76,276 C76,294 75,316 74,332 L59,332 C58,316 57,294 57,276 Z" },
  { id:"perna_e", nome:"Perna esquerda", cx:93, cy:304,
    d:"M103,276 L84,276 C84,294 85,316 86,332 L101,332 C102,316 103,294 103,276 Z" },
  { id:"torn_d", nome:"Tornozelo direito", cx:65, cy:340,
    d:"M59,334 L74,334 C74,340 74,344 73,346 L56,346 C56,342 58,338 59,334 Z" },
  { id:"torn_e", nome:"Tornozelo esquerdo", cx:95, cy:340,
    d:"M101,334 L86,334 C86,340 86,344 87,346 L104,346 C104,342 102,338 101,334 Z" },
  { id:"pe_d", nome:"Pé direito", cx:64, cy:352,
    d:"M56,348 L73,348 C72,352 68,354 62,354 C56,354 54,352 55,350 C55,349 55,348 56,348 Z" },
  { id:"pe_e", nome:"Pé esquerdo", cx:96, cy:352,
    d:"M104,348 L87,348 C88,352 92,354 98,354 C104,354 106,352 105,350 C105,349 105,348 104,348 Z" },
  /* virilha DEPOIS da coxa: em SVG o último desenhado ganha o toque na
     área de sobreposição, e é ele que queremos no canto interno. */
  { id:"virilha_d", nome:"Virilha / adutor D", cx:71, cy:197,
    d:"M64,188 C70,187 76,188 79,190 C79,197 78,203 77,207 C71,208 66,207 63,205 C62,199 62,192 64,188 Z" },
  { id:"virilha_e", nome:"Virilha / adutor E", cx:89, cy:197,
    d:"M96,188 C90,187 84,188 81,190 C81,197 82,203 83,207 C89,208 94,207 97,205 C98,199 98,192 96,188 Z" }
];

var REG_COSTAS = [
  { id:"cervical", nome:"Nuca / cervical", cx:80, cy:52,
    d:"M69,40 C69,37 71,36 80,36 C89,36 91,37 91,40 L92,62 C92,65 89,66 80,66 C71,66 68,65 68,62 Z" },
  { id:"trapezio_d", nome:"Trapézio direito", cx:56, cy:84,
    d:"M56,70 C46,73 38,80 34,90 C31,97 30,105 31,112 L46,108 L78,97 L78,68 C70,67 62,68 56,70 Z" },
  { id:"trapezio_e", nome:"Trapézio esquerdo", cx:104, cy:84,
    d:"M104,70 C114,73 122,80 126,90 C129,97 130,105 129,112 L114,108 L82,97 L82,68 C90,67 98,68 104,70 Z" },
  { id:"toracica", nome:"Meio das costas", cx:80, cy:116,
    d:"M66,99 L94,99 C94,111 93,123 92,132 C86,135 74,135 68,132 C67,123 66,111 66,99 Z" },
  { id:"escapula_d", nome:"Escápula direita", cx:57, cy:116,
    d:"M47,100 L64,99 C64,111 65,123 66,132 C60,134 55,133 52,132 C50,123 48,111 47,100 Z" },
  { id:"escapula_e", nome:"Escápula esquerda", cx:103, cy:116,
    d:"M113,100 L96,99 C96,111 95,123 94,132 C100,134 105,133 108,132 C110,123 112,111 113,100 Z" },
  { id:"lombar", nome:"Lombar", cx:80, cy:148,
    d:"M53,134 C64,137 96,137 107,134 C106,144 104,154 102,160 C90,163 70,163 58,160 C56,154 54,144 53,134 Z" },
  { id:"braco_pd", nome:"Braço direito", cx:34, cy:134,
    d:"M31,116 L45,112 C43,128 40,142 37,155 L24,158 C25,144 27,129 31,116 Z" },
  { id:"braco_pe", nome:"Braço esquerdo", cx:126, cy:134,
    d:"M129,116 L115,112 C117,128 120,142 123,155 L136,158 C135,144 133,129 129,116 Z" },
  { id:"mao_pd", nome:"Punho / mão dir.", cx:25, cy:200,
    d:"M37,158 L24,160 C21,178 17,204 16,222 C16,229 19,232 24,231 C29,230 31,226 32,218 C34,198 36,176 37,158 Z" },
  { id:"mao_pe", nome:"Punho / mão esq.", cx:135, cy:200,
    d:"M123,158 L136,160 C139,178 143,204 144,222 C144,229 141,232 136,231 C131,230 129,226 128,218 C126,198 124,176 123,158 Z" },
  { id:"gluteo_d", nome:"Glúteo direito", cx:67, cy:180,
    d:"M59,162 L78,162 C79,174 79,188 78,198 C70,201 60,200 57,196 C56,185 57,172 59,162 Z" },
  { id:"gluteo_e", nome:"Glúteo esquerdo", cx:93, cy:180,
    d:"M101,162 L82,162 C81,174 81,188 82,198 C90,201 100,200 103,196 C104,185 103,172 101,162 Z" },
  { id:"post_coxa_d", nome:"Atrás da coxa D", cx:67, cy:226,
    d:"M57,200 L78,200 C78,216 77,236 76,250 L57,250 C56,234 56,216 57,200 Z" },
  { id:"post_coxa_e", nome:"Atrás da coxa E", cx:93, cy:226,
    d:"M103,200 L82,200 C82,216 83,236 84,250 L103,250 C104,234 104,216 103,200 Z" },
  { id:"poplitea_d", nome:"Atrás do joelho D", cx:67, cy:264,
    d:"M57,252 L76,252 C76,262 76,270 76,274 L57,274 C57,266 57,259 57,252 Z" },
  { id:"poplitea_e", nome:"Atrás do joelho E", cx:93, cy:264,
    d:"M103,252 L84,252 C84,262 84,270 84,274 L103,274 C103,266 103,259 103,252 Z" },
  { id:"panturr_d", nome:"Panturrilha D", cx:67, cy:304,
    d:"M57,276 L76,276 C76,294 75,316 74,332 L59,332 C58,316 57,294 57,276 Z" },
  { id:"panturr_e", nome:"Panturrilha E", cx:93, cy:304,
    d:"M103,276 L84,276 C84,294 85,316 86,332 L101,332 C102,316 103,294 103,276 Z" },
  { id:"calc_d", nome:"Calcanhar D", cx:65, cy:344,
    d:"M59,334 L74,334 C74,340 74,344 73,347 C72,352 68,354 62,354 C56,354 54,352 55,347 C56,342 58,338 59,334 Z" },
  { id:"calc_e", nome:"Calcanhar E", cx:95, cy:344,
    d:"M101,334 L86,334 C86,340 86,344 87,347 C88,352 92,354 98,354 C104,354 106,352 105,347 C104,342 102,338 101,334 Z" }
];

var TODAS = REG_FRENTE.concat(REG_COSTAS);
var NOME = {}; TODAS.forEach(function(r){ NOME[r.id]=r.nome; });

/* escala de dor — tons menos saturados que o vermelho clássico:
   público com risco de hipervigilância não precisa de alarme visual */
function corDor(v){
  if(v==null) return null;
  if(v===0) return null;
  if(v<=3) return "#3fa38a";
  if(v<=6) return "#e0b93c";
  if(v<=8) return "#e0803c";
  return "#d1495b";
}

/* ---------------------------------------------------------------------
   ÍNDICES AUXILIARES
   --------------------------------------------------------------------- */
var TODAS = REG_FRENTE.concat(REG_COSTAS);
var NOME_REGIAO = {}; TODAS.forEach(function(r){ NOME_REGIAO[r.id] = r.nome; });

/* vista canônica de cada slug — igual ao CHECK de dores.vista */
var VISTA_DE = {};
REG_FRENTE.forEach(function(r){ VISTA_DE[r.id] = "frente"; });
REG_COSTAS.forEach(function(r){ VISTA_DE[r.id] = "costas"; });

/* slugs legados de costas que são o MESMO membro da frente */
var ALIAS_VISTA = { braco_pd:"braco_d", braco_pe:"braco_e",
                    mao_pd:"mao_d",     mao_pe:"mao_e" };

/* âncora do rótulo/ponto de cada id, no viewBox 0 0 160 380 */
var ANCORA = {}; TODAS.forEach(function(r){ ANCORA[r.id] = { cx:r.cx, cy:r.cy }; });

/* ---------------------------------------------------------------------
   MAPA DE LEITURA

   props:
     vista         "frente" | "costas"
     notas         {regiao: 0-10}  intensidade a pintar
     acompanhadas  [regiao]        dores.ativa = true -> contorno ciano
     mostrarNumero bool            default true
     onPick(id, vista)             opcional; sem ele o mapa é só leitura
   --------------------------------------------------------------------- */
function MapaDorLeitura(p){
  var vista = p.vista || "frente";
  var regioes = vista === "frente" ? REG_FRENTE : REG_COSTAS;
  var notas = p.notas || {};
  var mostrarNumero = p.mostrarNumero !== false;
  var clicavel = typeof p.onPick === "function";

  var acomp = {};
  (p.acompanhadas || []).forEach(function(k){ acomp[k] = true; });

  /* fill = escala 0-10. Acompanhada NUNCA pinta: o preenchimento é a
     nota, e pintar aqui faria a região parecer nota alta sem nota. */
  function fill(r){
    var c = corDor(notas[r.id]);
    if(c) return c;
    return p.ativa === r.id ? "var(--surface-2)" : "var(--surface)";
  }

  return e("svg", { viewBox:"0 0 160 380", className:"mapasvg", role:"img",
      "aria-label":"Mapa corporal, vista " + vista },
    e("path", { d:CABECA, fill:"var(--surface)", stroke:"var(--line)", strokeWidth:1.2 }),
    regioes.map(function(r){
      var marcada = notas[r.id] != null && notas[r.id] > 0;
      var ativa = p.ativa === r.id;
      var segue = !!acomp[r.id] && !marcada;
      return e("g", { key:r.id },
        e("path", { d:r.d, fill:fill(r),
          stroke: ativa ? "var(--cyan)" : (segue ? "var(--cyan)" : "var(--line)"),
          strokeWidth: ativa ? 2 : (segue ? 1.8 : 1.2),
          strokeDasharray: (segue && !ativa) ? "4 3" : null,
          strokeLinejoin: "round",
          style: clicavel ? { cursor:"pointer" } : null,
          onClick: clicavel ? function(){ p.onPick(r.id, vista); } : null },
          e("title", null, r.nome + (segue ? " — acompanhada" : "")
            + (marcada ? " — " + notas[r.id] + "/10" : ""))),
        (marcada && mostrarNumero) ? e("text", { x:r.cx, y:r.cy + 4, textAnchor:"middle",
          fontSize:11, fontWeight:800, fill:"#0b0f10",
          style:{ pointerEvents:"none" } }, notas[r.id]) : null,
        segue ? e("circle", { cx:r.cx, cy:r.cy, r:3.2, fill:"var(--cyan)",
          style:{ pointerEvents:"none" } }) : null,
        (ativa && !marcada) ? e("circle", { cx:r.cx, cy:r.cy, r:3.6,
          fill:"var(--lime)", style:{ pointerEvents:"none" } }) : null
      );
    })
  );
}

window.MapaDorIdealis = {
  MapaDorLeitura: MapaDorLeitura,
  REG_FRENTE: REG_FRENTE, REG_COSTAS: REG_COSTAS, TODAS: TODAS,
  NOME_REGIAO: NOME_REGIAO, VISTA_DE: VISTA_DE, ALIAS_VISTA: ALIAS_VISTA,
  ANCORA: ANCORA, corDor: corDor, CABECA: CABECA
};
})();
