@ = require([
  'mho:std',
  'mho:app'
]);

var links = [
  {
    url:   './services/',
    descr: 'Configuration of Application Services'
  },
  {
    url:   '/doc/',
    descr: 'Code Documentation'
  },
  {
    url:   './db/',
    descr: 'Database Admin'
  }
]

@mainContent .. @appendContent([
  @PageHeader('Application Administration/Development'),

  @Ul(links .. @map({url, descr} -> @A(descr) .. @Attrib('href', url)))

]);


