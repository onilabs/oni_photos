@ = require([
  'mho:std',
  'mho:app',
  {id:'mho:services', name:'services'},
  {id:'mho:flux/kv', name:'kv'}
]);

@withAPI('db.api') {
  |api|
  @mainContent .. @appendContent([
    @PageHeader('Database Administration'),

    @H1 :: [ "All Records ", @Small :: "(reload page to refresh)" ],
    
    @Table ::
      @ScrollStream(api.db ..
                    @kv.query(@kv.RANGE_ALL) ..
                    @transform([key,value] ->
                               @Tr ::
                                 [
                                   @Td(key .. JSON.stringify(null, '  ')),
                                   @Td(value .. JSON.stringify(null, '  '))
                                 ]
                              )
                   )

  ]) {
    ||
    hold();
  }
}
