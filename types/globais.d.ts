// Tipos de apoio para a verificação do TypeScript (npm run checar).
// Só servem para o editor/verificador entender o código: não vão para o site.

// Bibliotecas carregadas por <script> no HTML.
declare const Sortable: any;          // SortableJS (arrastar seções no construtor)
declare const YT: any;                // API do player do YouTube (música do convite)
declare const google: any;            // Google Identity Services (login com Google)
declare const PasswordCredential: any; // "Salvar senha" do Chrome/Edge

// Objetos globais criados pelos próprios scripts (window.algumaCoisa).
interface Window {
  [chave: string]: any;
}

// O código lê .value, .checked, .reset(), .select() etc. de elementos achados
// por getElementById/querySelector sem dizer o tipo exato (input, form…).
// Isso é seguro aqui e geraria centenas de avisos sem valor: os elementos
// aceitam qualquer propriedade. Os avisos úteis (nome que não existe, função
// chamada errado, erro de digitação em variáveis) continuam.
interface Element {
  [chave: string]: any;
}
interface EventTarget {
  [chave: string]: any;
}
interface Event {
  [chave: string]: any;
}
