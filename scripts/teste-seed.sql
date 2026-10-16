-- Dados FALSOS pro ambiente de teste local. Nunca rodar em produção.
insert into services(name,price_cents,position) values
 ('Reel editado',45000,0),('Carrossel',28000,1),('Sessão de fotos',120000,2),('Pacote mensal social media',350000,3)
on conflict do nothing;
insert into gallery_clients(slug,name,company_name,contact_name,phone,email,payment_day,status) values
 ('clinica-sorriso','Clínica Sorriso','Clínica Sorriso Ltda','Juliana Prado','11987654321','ju@sorriso.test',10,'published'),
 ('padaria-trigo','Padaria Trigo & Mel','Trigo & Mel ME','Seu Antônio','11912345678',null,5,'published'),
 ('studio-fit','Studio Fit','Studio Fit Academia','Marina Costa','11955554444','marina@studiofit.test',20,'published'),
 ('doce-lar','Doce Lar Imóveis','Doce Lar Imóveis','Rosa Mendes','11933332222',null,null,'draft')
on conflict do nothing;
do $$
declare ent uuid; agu uuid; c record; s uuid; m int; k int; d date; paga boolean;
begin
  select id into ent from backlog_columns where board='entregas' and name='Entregue';
  select id into agu from backlog_columns where board='entregas' and name='Aguardando pagamento';
  select id into s from services where name='Reel editado';
  for c in select id,slug from gallery_clients loop
    for m in 0..5 loop
      for k in 1..(1+(random()*2)::int) loop
        d := (date_trunc('month', date '2026-10-15') - (m||' month')::interval)::date + (2+k*6);
        if d > date '2026-10-15' then continue; end if;
        paga := m >= 2 or (m=1 and random()<0.6) or (m=0 and random()<0.2);
        insert into backlog_cards(column_id,client_id,title,format,post_date,quantity,unit_price_cents,service_id,paid_at,payment_method)
        values (case when paga then ent else agu end, c.id,
                (array['Reel de apresentação','Carrossel dicas','Fotos da equipe','Reel bastidores','Post de promoção'])[1+(random()*4)::int],
                'reel', d, 1, (array[45000,28000,120000,45000])[1+(random()*3)::int], s,
                case when paga then d + 12 end, case when paga then 'pix' end);
      end loop;
    end loop;
  end loop;
end $$;
