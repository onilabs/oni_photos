/**
   @summary Main entry point into application; calls main ui ([./main::]).
   @template app-plain
   @template-title Oni Photos
   @template-fluid true
*/

require('/hubs');

@ = require([
  'mho:app',
  'mho:std',
  {id:'mho:surface/api-connection',
   include: ['withResumingAPI']
  },
  {id:'lib:app-info', name:'app_info'}
]);

document.body .. @appendContent(
  @GlobalCSS("
             html {
              height: 100%;
             }
             body { 
              background-color: #1e1e1e; 
              height: 100%; 
              width: 100%;
              margin: 0px;
              font-family: sans-serif;
             }
             ")
);

while (1) {
  @withResumingAPI('./main.api') {
    |api|

    require('./main').main(api);
  }
}
