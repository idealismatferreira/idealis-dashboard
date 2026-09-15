/* =====================================================================
   IDEALIS · MANEQUIM 3D DE DOR — VERSÃO DASHBOARD (LEITURA)

   Port do manequim3d.js do APP IDEALIS. Mesma malha, mesmos HOTSPOTS,
   mesmos pinos, mesma escala de cor. Diferenças em relação ao original,
   todas marcadas com [DASH] no corpo do arquivo:

   [DASH-1] onPick é OPCIONAL. No App ele é obrigatório (é um formulário);
            aqui o padrão é leitura e clicar não faz nada.
   [DASH-2] Aliases legados resolvidos na entrada: uma dor gravada como
            braco_pd / mao_pe NÃO tem hotspot 3D e sumiria calada.
   [DASH-3] Tamanho do palco configurável. O App trava em 320-460px de
            altura (celular); em monitor isso fica um selo.
   [DASH-4] URL do modelo configurável (window.IDEALIS_MANEQUIM_URL).
   [DASH-5] Dica de rodapé some no modo leitura.
   [DASH-6] props.semOclusao — pinos atravessam o corpo, para ver dor de
            costas sem girar. Desligado por padrão (ver nota no código).

   Expõe: window.ManequimDorDashboard = { Manequim3D, HOTSPOTS,
          ALIAS_3D, resolverRegiao, suportado, pronto }

   NÃO USA GLTFLoader: o manequim.glb é uma malha só, sem skin, sem
   animação e sem Draco. O parser abaixo tem 30 linhas e economiza os
   ~15KB do loader oficial.

   ARQUIVOS QUE PRECISAM VIAJAR JUNTO (mesma pasta deste .js):
     three.module.min.js   (importa ./three.core.min.js sozinho)
     three.core.min.js
     manequim.glb
   Não dá para apontar para os arquivos do idealis.app.br: domínio
   diferente, o fetch do .glb bate em CORS.

   Depende de: window.React (com hooks) no escopo global.
   ===================================================================== */
import * as THREE from './three.module.min.js';

const React = window.React;
const e = React.createElement;
const { useState, useEffect, useRef } = React;

/* [DASH-4] a Dashboard pode servir o .glb de outro caminho */
const MODELO_URL = window.IDEALIS_MANEQUIM_URL || './manequim.glb';
const ALTURA_ALVO = 2.45;   // altura do manequim depois de normalizado

/* ---------------------------------------------------------------------
   1. HOTSPOTS

   Derivados da SUPERFÍCIE REAL da malha (não estimados): para cada
   região, o vértice mais externo na altura anatômica correspondente.
   Coordenadas no espaço já normalizado: pés em y=-1.225, topo da
   cabeça em y=+1.225, +Z é a frente, -X é o lado DIREITO do aluno.

   `v` é a vista canônica gravada no banco — o CHECK de dores.vista só
   aceita 'frente' ou 'costas', e cada região pertence a uma só.
   --------------------------------------------------------------------- */
const HOTSPOTS = {
  // ---- frente ----
  pescoco:     { p:[ 0.000, 0.908, 0.101], v:'frente' },
  ombro_d:     { p:[-0.354, 0.758,-0.115], v:'frente' },
  ombro_e:     { p:[ 0.350, 0.758,-0.115], v:'frente' },
  peitoral:    { p:[ 0.000, 0.584, 0.140], v:'frente' },
  abdome:      { p:[ 0.000, 0.278, 0.124], v:'frente' },
  braco_d:     { p:[-0.404, 0.483,-0.099], v:'frente' },
  braco_e:     { p:[ 0.404, 0.483,-0.099], v:'frente' },
  cotovelo_d:  { p:[-0.434, 0.304,-0.114], v:'frente' },
  cotovelo_e:  { p:[ 0.434, 0.304,-0.114], v:'frente' },
  antebraco_d: { p:[-0.431, 0.167,-0.078], v:'frente' },
  antebraco_e: { p:[ 0.431, 0.167,-0.078], v:'frente' },
  mao_d:       { p:[-0.459,-0.144,-0.012], v:'frente' },
  mao_e:       { p:[ 0.459,-0.144,-0.012], v:'frente' },
  quadril:     { p:[ 0.000, 0.098, 0.103], v:'frente' },
  virilha_d:   { p:[-0.047,-0.034, 0.077], v:'frente' },
  virilha_e:   { p:[ 0.047,-0.034, 0.077], v:'frente' },
  coxa_d:      { p:[-0.154,-0.270, 0.121], v:'frente' },
  coxa_e:      { p:[ 0.154,-0.270, 0.121], v:'frente' },
  joelho_d:    { p:[-0.110,-0.497, 0.098], v:'frente' },
  joelho_e:    { p:[ 0.110,-0.497, 0.098], v:'frente' },
  perna_d:     { p:[-0.145,-0.735, 0.062], v:'frente' },
  perna_e:     { p:[ 0.145,-0.735, 0.062], v:'frente' },
  torn_d:      { p:[-0.126,-1.104, 0.024], v:'frente' },
  torn_e:      { p:[ 0.126,-1.104, 0.024], v:'frente' },
  pe_d:        { p:[-0.150,-1.209, 0.254], v:'frente' },
  pe_e:        { p:[ 0.150,-1.209, 0.254], v:'frente' },
  // ---- costas ----
  cervical:    { p:[ 0.000, 0.851,-0.180], v:'costas' },
  trapezio_d:  { p:[-0.157, 0.803,-0.231], v:'costas' },
  trapezio_e:  { p:[ 0.157, 0.803,-0.231], v:'costas' },
  escapula_d:  { p:[-0.115, 0.629,-0.231], v:'costas' },
  escapula_e:  { p:[ 0.115, 0.629,-0.231], v:'costas' },
  toracica:    { p:[ 0.000, 0.523,-0.219], v:'costas' },
  lombar:      { p:[ 0.000, 0.205,-0.172], v:'costas' },
  gluteo_d:    { p:[-0.088, 0.027,-0.226], v:'costas' },
  gluteo_e:    { p:[ 0.088, 0.027,-0.226], v:'costas' },
  post_coxa_d: { p:[-0.108,-0.259,-0.154], v:'costas' },
  post_coxa_e: { p:[ 0.108,-0.259,-0.154], v:'costas' },
  poplitea_d:  { p:[-0.122,-0.500,-0.078], v:'costas' },
  poplitea_e:  { p:[ 0.122,-0.500,-0.078], v:'costas' },
  panturr_d:   { p:[-0.143,-0.770,-0.118], v:'costas' },
  panturr_e:   { p:[ 0.143,-0.770,-0.118], v:'costas' },
  calc_d:      { p:[-0.112,-1.145,-0.111], v:'costas' },
  calc_e:      { p:[ 0.112,-1.145,-0.111], v:'costas' }
};

const CHAVES = Object.keys(HOTSPOTS);

/* [DASH-2] ALIASES LEGADOS

   O SVG 2D tem 47 slugs; quatro deles (braco_pd, braco_pe, mao_pd,
   mao_pe) são a versão "vista de costas" do mesmo braço/mão e existem
   só porque o 2D desenha duas silhuetas. No 3D existe um braço só.

   Uma linha antiga em `dores` gravada com o slug legado não tem
   hotspot — sem esta tradução o pino simplesmente NÃO APARECE e nada
   avisa. Aplicar em tudo que entra: notas, acompanhadas e ativa. */
const ALIAS_3D = { braco_pd:'braco_d', braco_pe:'braco_e',
                   mao_pd:'mao_d',     mao_pe:'mao_e' };
function resolverRegiao(id){ return ALIAS_3D[id] || id; }

/* traduz {regiao: nota} mantendo a MAIOR nota se dois slugs colidirem
   no mesmo hotspot (braco_d=3 e braco_pd=7 viram braco_d=7) */
function normalizarNotas(notas){
  const fora = {};
  Object.keys(notas || {}).forEach(function(k){
    const alvo = resolverRegiao(k), v = notas[k];
    if(v == null) return;
    if(fora[alvo] == null || v > fora[alvo]) fora[alvo] = v;
  });
  return fora;
}

/* escala de dor — idêntica à do avaliacao.js. Duplicada de propósito:
   este arquivo pode carregar antes ou depois e não deve depender de
   ordem de execução. Se mudar lá, mude aqui. */
function corDor(v){
  if(v==null || v===0) return null;
  if(v<=3) return 0x3fa38a;
  if(v<=6) return 0xe0b93c;
  if(v<=8) return 0xe0803c;
  return 0xd1495b;
}
const COR_ATIVA = 0x00c9cc;   // --cyan  : dor que o aluno já acompanha
const COR_SELECAO = 0xddff00; // --lime  : região tocada agora

/* ---------------------------------------------------------------------
   2. PARSER GLB MÍNIMO
   Uma malha, POSITION + NORMAL + índices, mode 4. Nada além disso.
   --------------------------------------------------------------------- */
function lerGLB(buf){
  const dv = new DataView(buf);
  if(dv.getUint32(0, true) !== 0x46546C67) throw new Error('não é um glb');
  let off = 12, json = null, bin = null;
  while(off < dv.byteLength){
    const len = dv.getUint32(off, true), tipo = dv.getUint32(off+4, true);
    if(tipo === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off+8, len)));
    else if(tipo === 0x004E4942) bin = { inicio: off+8 };
    off += 8 + len;
  }
  if(!json || !bin) throw new Error('glb sem chunk esperado');

  const prim = json.meshes[0].primitives[0];
  const leitor = (idx, Tipo, comps) => {
    const acc = json.accessors[idx], bv = json.bufferViews[acc.bufferView];
    const inicio = bin.inicio + (bv.byteOffset||0) + (acc.byteOffset||0);
    return new Tipo(buf, inicio, acc.count * comps);
  };
  const pos = leitor(prim.attributes.POSITION, Float32Array, 3);
  const nor = prim.attributes.NORMAL != null ? leitor(prim.attributes.NORMAL, Float32Array, 3) : null;
  const accI = json.accessors[prim.indices];
  const TipoI = accI.componentType === 5125 ? Uint32Array
              : accI.componentType === 5123 ? Uint16Array : Uint8Array;
  const idx = leitor(prim.indices, TipoI, 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if(nor) geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  if(!nor) geo.computeVertexNormals();

  // normaliza: altura ALTURA_ALVO e centro exatamente no pivô, para o
  // giro de 360° não ficar excêntrico
  geo.computeBoundingBox();
  const bb = geo.boundingBox, tam = new THREE.Vector3(), ctr = new THREE.Vector3();
  bb.getSize(tam); bb.getCenter(ctr);
  const s = ALTURA_ALVO / tam.y;
  geo.translate(-ctr.x, -ctr.y, -ctr.z);
  geo.scale(s, s, s);
  return geo;
}

/* uma única promessa de carga por sessão: a geometria é reaproveitada
   se o aluno voltar para o passo do mapa */
let _geo = null;
function carregarGeometria(){
  if(!_geo){
    _geo = fetch(MODELO_URL)
      .then(r => { if(!r.ok) throw new Error('http '+r.status); return r.arrayBuffer(); })
      .then(lerGLB)
      .catch(err => { _geo = null; throw err; });
  }
  return _geo;
}

/* ---------------------------------------------------------------------
   3. WEBGL DISPONÍVEL?
   Testado uma vez e memorizado. Celular sem WebGL cai no SVG 2D e nem
   chega a baixar o three.
   --------------------------------------------------------------------- */
let _webgl = null;
export function suportado(){
  if(_webgl != null) return _webgl;
  try{
    const c = document.createElement('canvas');
    _webgl = !!(window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl')));
  }catch(err){ _webgl = false; }
  return _webgl;
}

/* ---------------------------------------------------------------------
   4. CENA

   RENDER SOB DEMANDA. Nada de requestAnimationFrame eterno: num
   formulário isso só esquenta o aparelho. O loop roda enquanto a
   interpolação está em movimento e para sozinho quando converge.
   --------------------------------------------------------------------- */
function criarCena(canvas){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const cena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  cam.position.set(0, 0, 5.2);

  cena.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xfffaed, 1.35); key.position.set(1.4, 2.2, 2.6);
  const fill = new THREE.DirectionalLight(0xdce7f0, 0.8); fill.position.set(-2.2, 0.4, 1.6);
  const rim  = new THREE.DirectionalLight(0xffffff, 1.15); rim.position.set(0, 1.2, -3.2);
  cena.add(key, fill, rim);

  const corpo = new THREE.Group();
  cena.add(corpo);

  return { renderer, cena, cam, corpo };
}

/* pino: esfera + anel na base, para enxergar mesmo de perfil */
/* ÂNGULO QUE TRAZ UM PONTO PARA A FRENTE DA CÂMERA

   A câmera fica em +Z olhando para a origem. Girando o corpo em θ, um
   ponto local (x,z) vai para z' = -x·senθ + z·cosθ. Maximizar z' (ou
   seja, trazer o ponto para a frente) dá θ = atan2(-x, z).

   O sinal negativo no x é o detalhe que faltava: sem ele, "Perfil D"
   mostrava o lado esquerdo e a região selecionada girava para o lado
   oposto ao que devia. Como o lado DIREITO do aluno é -X, o perfil
   direito é +π/2, não -π/2. */
function anguloPara(p){ return Math.atan2(-p[0], p[2]); }

/* [DASH-6] `atravessa` desliga o depth test: o pino aparece mesmo do
   outro lado do corpo. Resolve "não vejo a lombar de frente" e cria
   outro problema — um pino de costas flutuando sobre o peito é lido
   como dor no peito. Por isso vem desligado; ligue só se você testar
   e achar que compensa. */
function criarPino(cor, ativa, atravessa){
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: cor, depthTest: !atravessa });
  const bola = new THREE.Mesh(new THREE.SphereGeometry(ativa ? 0.052 : 0.044, 14, 12), mat);
  g.add(bola);
  const anel = new THREE.Mesh(
    new THREE.RingGeometry(ativa ? 0.075 : 0.062, ativa ? 0.098 : 0.080, 22),
    new THREE.MeshBasicMaterial({ color: cor, transparent:true, opacity: ativa ? 0.55 : 0.35,
      side: THREE.DoubleSide, depthWrite:false, depthTest: !atravessa })
  );
  g.add(anel);
  if(atravessa) g.renderOrder = 8;
  g.userData.anel = anel;
  return g;
}

/* Marca a região tocada AGORA. Anel maior e lima, por cima do que já
   estiver ali: se a região já tem nota, a bola colorida continua
   aparecendo por dentro do anel e as duas informações convivem. */
function criarSelecao(comBola){
  const g = new THREE.Group();
  const anel = new THREE.Mesh(
    new THREE.RingGeometry(0.088, 0.116, 26),
    new THREE.MeshBasicMaterial({ color: COR_SELECAO, transparent:true, opacity:0.9,
      side: THREE.DoubleSide, depthWrite:false, depthTest:false })
  );
  g.add(anel);
  if(comBola){
    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 12),
      new THREE.MeshBasicMaterial({ color: COR_SELECAO, depthTest:false }));
    g.add(bola);
  }
  g.renderOrder = 10;   // nunca some dentro do corpo
  g.userData.anel = anel;
  return g;
}

/* ---------------------------------------------------------------------
   5. COMPONENTE REACT

   props:
     notas        {regiao: 0-10}   o que já foi marcado nesta avaliação
     ativa        regiao|null      região com o seletor de nota aberto
     acompanhadas [regiao]         dores JÁ ATIVAS do aluno (destaque ciano)
     onPick(regiao, vista)
     onErro()                      falhou o 3D -> o pai cai para o 2D
   --------------------------------------------------------------------- */
function Manequim3D(props){
  const refCanvas = useRef(null);
  const refCaixa  = useRef(null);
  const refEstado = useRef(null);
  const [carregando, setCarregando] = useState(true);
  const [rotulo, setRotulo] = useState(null);

  /* --- monta a cena uma vez --- */
  useEffect(function(){
    let vivo = true;
    const canvas = refCanvas.current, caixa = refCaixa.current;
    if(!canvas || !caixa) return;

    const ctx = criarCena(canvas);
    const alvo = { giroY: 0, giroX: 0, zoom: 5.2 };
    const atual = { giroY: 0, giroX: 0, zoom: 5.2 };
    const st = { ctx, alvo, atual, malha:null, pinos:new THREE.Group(), rodando:false, morto:false };
    ctx.corpo.add(st.pinos);
    refEstado.current = st;

    /* [DASH-3] no App: 320-460px (celular). Aqui os limites vêm por prop
       e o padrão é maior, porque em monitor 460px de altura para um
       corpo inteiro deixa os pinos do pé do tamanho de um pixel. */
    function dimensionar(){
      const l = caixa.clientWidth || 320;
      const minA = props.alturaMin || 420, maxA = props.alturaMax || 720;
      const a = Math.max(minA, Math.min(maxA, Math.round(l * (props.proporcao || 1.28))));
      ctx.renderer.setSize(l, a, false);
      ctx.cam.aspect = l / a;
      ctx.cam.updateProjectionMatrix();
      pedirQuadro();
    }
    function desenhar(){
      ctx.corpo.rotation.y = atual.giroY;
      ctx.corpo.rotation.x = atual.giroX;
      ctx.cam.position.z = atual.zoom;
      ctx.cam.lookAt(0, 0, 0);
      // os anéis dos pinos sempre de frente para a câmera
      st.pinos.children.forEach(function(p){ p.userData.anel.quaternion.copy(ctx.cam.quaternion); });
      ctx.renderer.render(ctx.cena, ctx.cam);
    }
    function passo(){
      if(st.morto) return;
      let mexeu = false;
      ['giroY','giroX','zoom'].forEach(function(k){
        const d = alvo[k] - atual[k];
        if(Math.abs(d) > 0.0006){ atual[k] += d * 0.16; mexeu = true; }
        else atual[k] = alvo[k];
      });
      desenhar();
      if(mexeu) requestAnimationFrame(passo);
      else st.rodando = false;   // convergiu: para o loop
    }
    function pedirQuadro(){
      if(st.rodando || st.morto) return;
      st.rodando = true; requestAnimationFrame(passo);
    }
    st.pedirQuadro = pedirQuadro;
    st.dimensionar = dimensionar;

    /* --- gestos --- */
    let arrastando = false, x0 = 0, y0 = 0, gy0 = 0, gx0 = 0, dist = 0;
    function pos(ev){
      const t = ev.touches ? ev.touches[0] : ev;
      return { x: t.clientX, y: t.clientY };
    }
    function iniciar(ev){
      const p = pos(ev);
      arrastando = true; dist = 0;
      x0 = p.x; y0 = p.y; gy0 = alvo.giroY; gx0 = alvo.giroX;
    }
    function mover(ev){
      if(!arrastando) return;
      const p = pos(ev);
      const dx = p.x - x0, dy = p.y - y0;
      dist = Math.max(dist, Math.abs(dx) + Math.abs(dy));
      if(dist > 5 && ev.cancelable) ev.preventDefault();
      alvo.giroY = gy0 + dx * 0.011;
      alvo.giroX = Math.max(-0.42, Math.min(0.42, gx0 + dy * 0.006));
      pedirQuadro();
    }
    function soltar(ev){
      if(!arrastando) return;
      arrastando = false;
      if(dist <= 5) tocar(ev.changedTouches ? ev.changedTouches[0] : ev);
    }

    /* toque = raycast na superfície -> hotspot mais próximo do ponto.
       O aluno não precisa acertar a região, só o corpo. */
    const ray = new THREE.Raycaster();
    function tocar(t){
      if(!st.malha) return;
      const r = canvas.getBoundingClientRect();
      const nx = ((t.clientX - r.left) / r.width) * 2 - 1;
      const ny = -((t.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(new THREE.Vector2(nx, ny), ctx.cam);
      const hits = ray.intersectObject(st.malha, false);
      if(!hits.length) return;
      // ponto de impacto no espaço LOCAL do corpo (desfaz a rotação)
      const local = ctx.corpo.worldToLocal(hits[0].point.clone());
      let melhor = null, melhorD = Infinity;
      CHAVES.forEach(function(k){
        const h = HOTSPOTS[k].p;
        const d = (local.x-h[0])*(local.x-h[0]) + (local.y-h[1])*(local.y-h[1]) + (local.z-h[2])*(local.z-h[2]);
        if(d < melhorD){ melhorD = d; melhor = k; }
      });
      /* [DASH-1] leitura por padrão: sem onPick, o clique não faz nada */
      if(melhor && typeof props.onPick === 'function') props.onPick(melhor, HOTSPOTS[melhor].v);
    }

    canvas.addEventListener('touchstart', iniciar, { passive:true });
    canvas.addEventListener('touchmove',  mover,   { passive:false });
    canvas.addEventListener('touchend',   soltar,  { passive:true });
    canvas.addEventListener('mousedown',  iniciar);
    window.addEventListener('mousemove',  mover);
    window.addEventListener('mouseup',    soltar);
    window.addEventListener('resize',     dimensionar);

    /* contexto WebGL perdido (iOS ao voltar do segundo plano): avisa o
       pai, que troca para o 2D em vez de deixar uma tela preta */
    canvas.addEventListener('webglcontextlost', function(ev){
      ev.preventDefault();
      if(props.onErro) props.onErro();
    });

    carregarGeometria().then(function(geo){
      if(!vivo) return;
      const mat = new THREE.MeshStandardMaterial({
        color: 0x98a2ad, roughness: 0.38, metalness: 0.06 });
      st.malha = new THREE.Mesh(geo, mat);
      ctx.corpo.add(st.malha);
      setCarregando(false);
      dimensionar();
    }).catch(function(err){
      console.warn('[manequim3d]', err);
      if(vivo && props.onErro) props.onErro();
    });

    dimensionar();

    return function(){
      vivo = false; st.morto = true;
      canvas.removeEventListener('touchstart', iniciar);
      canvas.removeEventListener('touchmove',  mover);
      canvas.removeEventListener('touchend',   soltar);
      canvas.removeEventListener('mousedown',  iniciar);
      window.removeEventListener('mousemove',  mover);
      window.removeEventListener('mouseup',    soltar);
      window.removeEventListener('resize',     dimensionar);
      st.pinos.children.forEach(function(p){
        p.children.forEach(function(m){ m.geometry.dispose(); m.material.dispose(); });
      });
      ctx.renderer.dispose();
    };
  }, []);

  /* --- pinos: só marcados nesta avaliação + dores já acompanhadas ---
     43 alfinetes na tela viraria almofada de agulhas. Só aparece o que
     significa alguma coisa. */
  useEffect(function(){
    const st = refEstado.current;
    if(!st) return;
    /* [DASH-2] tudo que entra passa pelo tradutor de alias */
    const notas = normalizarNotas(props.notas);
    const acomp = (props.acompanhadas || []).map(resolverRegiao);
    const atravessa = !!props.semOclusao;
    while(st.pinos.children.length){
      const p = st.pinos.children[0];
      p.children.forEach(function(m){ m.geometry.dispose(); m.material.dispose(); });
      st.pinos.remove(p);
    }
    const vistos = {};
    Object.keys(notas).forEach(function(k){
      if(!HOTSPOTS[k] || !(notas[k] > 0)) return;
      vistos[k] = true;
      const g = criarPino(corDor(notas[k]), false, atravessa);
      g.position.fromArray(HOTSPOTS[k].p);
      st.pinos.add(g);
    });
    acomp.forEach(function(k){
      if(!HOTSPOTS[k] || vistos[k]) return;
      const g = criarPino(COR_ATIVA, true, atravessa);
      g.position.fromArray(HOTSPOTS[k].p);
      st.pinos.add(g);
    });
    const sel = props.ativa ? resolverRegiao(props.ativa) : null;
    if(sel && HOTSPOTS[sel]){
      const g = criarSelecao(!vistos[sel]);
      g.position.fromArray(HOTSPOTS[sel].p);
      st.pinos.add(g);
    }
    st.pedirQuadro();
  }, [props.notas, props.acompanhadas, props.ativa]);

  /* --- ao selecionar uma região, gira o corpo para ela e mostra o nome --- */
  useEffect(function(){
    const st = refEstado.current;
    const sel = props.ativa ? resolverRegiao(props.ativa) : null;
    if(!st || !sel || !HOTSPOTS[sel]) { setRotulo(null); return; }
    const h = HOTSPOTS[sel];
    st.alvo.giroY = anguloPara(h.p);
    st.alvo.giroX = 0;
    st.pedirQuadro();
    setRotulo(props.nomeDe ? props.nomeDe(props.ativa) : sel);
  }, [props.ativa]);

  function girar(rad){
    const st = refEstado.current;
    if(!st) return;
    st.alvo.giroY = rad; st.alvo.giroX = 0; st.pedirQuadro();
  }
  function zoom(delta){
    const st = refEstado.current;
    if(!st) return;
    st.alvo.zoom = Math.max(2.6, Math.min(6.4, st.alvo.zoom + delta));
    st.pedirQuadro();
  }

  return e('div', { className:'m3wrap' },
    e('div', { className:'m3presets' },
      e('button', { type:'button', onClick:function(){ girar(0); } }, 'Frente'),
      e('button', { type:'button', onClick:function(){ girar(Math.PI); } }, 'Costas'),
      e('button', { type:'button', onClick:function(){ girar(Math.PI/2); } }, 'Perfil D'),
      e('button', { type:'button', onClick:function(){ girar(-Math.PI/2); } }, 'Perfil E')
    ),
    e('div', { className:'m3palco', ref:refCaixa },
      e('canvas', { ref:refCanvas, className:'m3canvas' }),
      carregando ? e('div', { className:'m3load' }, 'Carregando o corpo…') : null,
      rotulo ? e('div', { className:'m3rotulo' }, rotulo) : null,
      e('div', { className:'m3zoom' },
        e('button', { type:'button', 'aria-label':'Aproximar', onClick:function(){ zoom(-0.7); } }, '+'),
        e('button', { type:'button', 'aria-label':'Afastar',   onClick:function(){ zoom(0.7); } }, '−')
      )
    ),
    /* [DASH-5] a dica é instrução de formulário; no modo leitura ela mente */
    e('div', { className:'m3dica' }, typeof props.onPick === 'function'
      ? 'Arraste para girar. Toque no corpo para marcar.'
      : 'Arraste para girar.')
  );
}

window.ManequimDorDashboard = { Manequim3D, HOTSPOTS, ALIAS_3D,
  resolverRegiao, normalizarNotas, corDor, suportado, pronto:true };
export { Manequim3D, HOTSPOTS, ALIAS_3D, resolverRegiao, normalizarNotas };
