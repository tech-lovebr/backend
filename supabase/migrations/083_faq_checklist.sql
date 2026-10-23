-- 083 — Central de ajuda › Checklist (logo depois de Convite digital).
insert into faq (plataforma, categoria, pergunta, resposta, ordem, ativo)
select v.plataforma, v.categoria, v.pergunta, v.resposta, v.ordem, true
from (values
  ('cliente', 'Checklist', 'O que é o Checklist?', 'É a sua lista de tarefas para organizar o evento do começo ao fim. Ele já vem com tarefas sugeridas para o tipo do seu evento (casamento, aniversário, chá de bebê e outros), cada uma com prazo e categoria, e mostra no topo o progresso, as pendentes e as atrasadas.', 1),
  ('cliente', 'Checklist', 'Como os prazos das tarefas são calculados?', 'A partir da data do evento e do dia em que você criou o evento na Love. Se o evento foi criado com menos tempo que o ideal para aquele tipo, as tarefas são distribuídas entre a criação e o dia do evento. Você pode mudar qualquer prazo pelo menu da tarefa, em Editar prazo.', 2),
  ('cliente', 'Checklist', 'Como adiciono uma tarefa?', 'Clique em Adicionar tarefa, no topo do Checklist. Escreva o que precisa ser feito, escolha a categoria e, se quiser, informe o prazo, o orçamento e notas.', 3),
  ('cliente', 'Checklist', 'Como marco uma tarefa como concluída?', 'Clique no círculo ao lado da tarefa. Ela fica riscada e passa a contar no progresso do evento. Para desmarcar, clique de novo.', 4),
  ('cliente', 'Checklist', 'Posso definir um responsável para cada tarefa?', 'Sim. Clique no quadradinho de responsável da tarefa e escolha você ou um dos fornecedores contratados.', 5),
  ('cliente', 'Checklist', 'O que é o botão Buscar fornecedores?', 'Ele aparece nas tarefas de contratação, como Contratar o buffet. Ao clicar, você vai para Fornecedores › Explorar já filtrado pela categoria da tarefa.', 6),
  ('cliente', 'Checklist', 'Quem vê o meu Checklist?', 'Você e os co-anfitriões do evento. As alterações ficam salvas e aparecem para todos que organizam o evento com você.', 7),
  ('cliente', 'Checklist', 'Posso ver as tarefas por categoria?', 'Sim. No topo da lista, troque Cronograma por Por categoria. Você também pode filtrar por Todas, Pendentes ou Concluídas.', 8)
) as v(plataforma, categoria, pergunta, resposta, ordem)
where not exists (select 1 from faq f where f.plataforma = v.plataforma and f.categoria = v.categoria and f.pergunta = v.pergunta);
