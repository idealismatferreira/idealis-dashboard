/* Histórico do exercício na montagem: regras de EXIBIÇÃO (App e Dashboard).
   Dados: view vw_historico_exercicio_aluno, 1 consulta por aluno.
   Código puro, sem React e sem Supabase: dá para testar sozinho e usar nos dois apps. */
(function(g){
  // Multitenant: estes números viram configuração por treinador. Não espalhar pelo código.
  const CONFIG = {
    dorAlerta: 3,        // dor >= 3/10 acende o ⚠️ (Silbernagel et al., 2007: 0 a 2 = zona segura)
    janelaResolvida: 3   // ⚠️ apaga quando as últimas N sessões registradas ficaram abaixo do corte (a view manda 5)
  };
  const normAcc = (t)=>(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  const maior = (a,b)=> a==null ? b : (b==null ? a : (a>b ? a : b));
  const menor = (a,b)=> a==null ? b : (b==null ? a : (a<b ? a : b));

  /* Mesma regra das correções (corrCasa): cardapio_id quando os DOIS lados têm;
     senão, o nome normalizado. String() porque bigint chega como número ou texto. */
  function casa(row, ex){
    const id = (ex && ex.cardapioId!=null) ? ex.cardapioId : null;
    if(row.cardapio_id!=null && id!=null) return String(row.cardapio_id)===String(id);
    const k = normAcc(ex && ex.nome);
    return !!k && (row.chaves||[]).indexOf(k)>=0;
  }
  // exercício x exercício (para saber se está na fase anterior), mesma regra
  function casaEx(a, b){
    if(a.cardapioId!=null && b.cardapioId!=null) return String(a.cardapioId)===String(b.cardapioId);
    const ka=normAcc(a.nome), kb=normAcc(b.nome);
    return !!ka && ka===kb;
  }

  /* Junta as linhas da view que casam com o exercício. Mais de uma linha é normal:
     "Supino reto" digitado à mão numa fase antiga + Supino Reto do Cardápio hoje. */
  function juntar(rows, ex){
    const rs=(rows||[]).filter(r=>casa(r,ex));
    if(!rs.length) return null;
    const h={ refs:[], nome:null, primeiro_feito:null, ultimo_feito:null, sessoes:0, sessoes_com_registro:0,
      fases_feitas:0, ultima_prescricao:null, fases_prescritas:[], dor_max:null, dor_max_em:null,
      dor_max_local:null, dor_max_lado:null, dores_recentes:[], anamnese:[], correcoes_ativas:0,
      ultima_correcao_em:null };
    const dias={};
    rs.forEach(r=>{
      h.refs.push(r.ref);
      if(!h.nome || r.cardapio_id!=null) h.nome=r.nome;
      h.primeiro_feito=menor(h.primeiro_feito, r.primeiro_feito);
      h.ultimo_feito=maior(h.ultimo_feito, r.ultimo_feito);
      h.sessoes+=r.sessoes||0; h.sessoes_com_registro+=r.sessoes_com_registro||0; h.fases_feitas+=r.fases_feitas||0;
      h.ultima_prescricao=maior(h.ultima_prescricao, r.ultima_prescricao);
      (r.fases_prescritas||[]).forEach(f=>{ if(h.fases_prescritas.indexOf(f)<0) h.fases_prescritas.push(f); });
      if(r.dor_max!=null && (h.dor_max==null || r.dor_max>h.dor_max || (r.dor_max===h.dor_max && r.dor_max_em>h.dor_max_em))){
        h.dor_max=r.dor_max; h.dor_max_em=r.dor_max_em; h.dor_max_local=r.dor_max_local; h.dor_max_lado=r.dor_max_lado;
      }
      (r.dores_recentes||[]).forEach(d=>{
        const cur=dias[d.data];
        if(!cur || (d.dor!=null && (cur.dor==null || d.dor>cur.dor))) dias[d.data]={data:d.data, dor:d.dor};
      });
      (r.anamnese||[]).forEach(a=>{ if(!h.anamnese.some(x=>x.id===a.id)) h.anamnese.push(a); });
      h.correcoes_ativas+=r.correcoes_ativas||0;
      h.ultima_correcao_em=maior(h.ultima_correcao_em, r.ultima_correcao_em);
    });
    h.dores_recentes=Object.values(dias).sort((a,b)=>b.data.localeCompare(a.data)).slice(0,5);
    return h;
  }

  /* Selo. ctx = { alvoId, naFaseAnterior }
     alvoId: id da fase que está sendo montada.
     naFaseAnterior: o exercício está prescrito na fase IMEDIATAMENTE antes da alvo
     (o app/dashboard calcula com os treinos que já tem em memória, usando casaEx).
     Usa a prescrição da fase anterior, e não a data do último registro, porque ela
     existe mesmo quando a fase anterior acabou de começar ou ainda nem começou. */
  function selo(h, ctx){
    const c=ctx||{};
    const feito = !!(h && h.ultimo_feito);
    if(feito) return c.naFaseAnterior ? 'recente' : 'retorno';
    const outras = ((h && h.fases_prescritas)||[]).filter(f=>f!==c.alvoId);
    if(outras.length) return 'sem_registro';
    if(c.naFaseAnterior) return 'planejado';
    return 'novo';
  }

  /* ⚠️. Devolve null (sem símbolo), 'ativo' ou 'apagado', com os motivos para o popover. */
  function alerta(h, cfg){
    const C=Object.assign({}, CONFIG, cfg||{});
    if(!h) return null;
    const corte=(d)=>d && d.dor!=null && d.dor>=C.dorAlerta;
    const rec=(h.dores_recentes||[]).slice(0, C.janelaResolvida);
    const motivos=[];
    if(h.dor_max!=null && h.dor_max>=C.dorAlerta){
      motivos.push({tipo:'dor', ativo:rec.some(corte), dor:h.dor_max, em:h.dor_max_em,
        local:h.dor_max_local, lado:h.dor_max_lado});
    }
    (h.anamnese||[]).forEach(a=>{
      // a anamnese é foto do passado: apaga quando o aluno já fez N sessões registradas
      // DEPOIS dela, todas abaixo do corte (tolerância demonstrada)
      const desde=a.data || String(a.criado_em||'').slice(0,10);
      const depois=(h.dores_recentes||[]).filter(d=>desde && d.data>desde);
      const tolerou=depois.length>=C.janelaResolvida && !depois.slice(0,C.janelaResolvida).some(corte);
      motivos.push({tipo:'anamnese', ativo:!tolerou, secao:a.secao||'', tipoNome:a.tipo||'', cor:a.cor||null,
        texto:a.texto||'', data:a.data||null, dataTexto:a.data_texto||'', regiao:a.regiao||null});
    });
    if(h.correcoes_ativas>0) motivos.push({tipo:'correcao', ativo:true, n:h.correcoes_ativas, em:h.ultima_correcao_em});
    if(!motivos.length) return null;
    return { nivel: motivos.some(m=>m.ativo) ? 'ativo' : 'apagado', motivos };
  }

  g.HistoricoExercicio = { CONFIG, normAcc, casa, casaEx, juntar, selo, alerta, versao:1 };
})(typeof window!=='undefined' ? window : globalThis);
