/**
   @summary Stuff that will go into conductance
*/

@ = require([
  'mho:std',
  'mho:app',
  {id:'mho:surface/nodes', name:'nodes'},
  {id:'sjs:sjcl', name:'sjcl'}
]);

var cmd = exports.cmd = {};

/**
   @function cmd.Click
   @summary XXX write me
*/
cmd.Click = function(element, cmd, param) {

  var Enabled = @ObservableVar(false);
  var emitter;
  
  var methods = {
    cmd: cmd,
    isActive: function() { return !!emitter },
    setEmitter: function(e) { emitter = e; Enabled.set(!!e); }
  };

  return element ..
    @Attrib('__oni_cmd_emitter', true) ..
    @Mechanism(function(node) {
      // install api with which receivers can bind to us:
      node.__oni_cmd = methods;
      hold(0);
      if (!methods.isActive()) {
        // if we're not bound yet, attempt to find receiver to bind to:
        do {
          if (node.__oni_cmd_receivers) {
            node.__oni_cmd_receivers .. @each {
              |rec|
              if (rec.bound_commands && rec.bound_commands.indexOf(methods.cmd) === -1)
                continue;
              rec.cmd_nodes.push(methods);
              methods.setEmitter(rec.emitter);
              return; // we're bound
            }
          }
          node = node.parentNode;
        } while (node);
      }
    }) ..
    @On('click',
        {handle:@dom.preventDefault},
        ev -> emitter ? emitter.emit([cmd,
                                      param ?
                                      (typeof param === 'function' ? param(ev) : param) :
                                      ev
                                     ])
       ) ..
    @Enabled(Enabled);
};

/**
   @function cmd.stream
   @summary XXX write me
*/
cmd.stream = function(/*[dom_root], [commands]*/) {

  var args = arguments;
  
  return @Stream(function(downstream) {

    // untangle arguments:
    var root, bound_commands;
    if (args.length === 1) {
      if (Array.isArray(args[0]))
        bound_commands = args[0];
    }
    else if (args.length === 2) {
      root = args[0];
      bound_commands = args[1];
    }
    else if (args.length !== 0)
      throw new Error("Surplus arguments supplied to cmd::Stream()");
    
    var emitter = @Emitter();
    var disable_inputs = @Emitter();

    while (1) {
      waitfor {
        try {
          var cmd_nodes = [];

          // install a handler where retrospectively added command emitters can bind themselves:
          var cmd_receiver = {
            bound_commands: bound_commands,
            cmd_nodes: cmd_nodes,
            emitter: emitter
          };
          root .. @nodes.Nodes() .. @each {
            |node|
            var receivers = node.__oni_cmd_receivers;
            if (!receivers)
              receivers = node.__oni_cmd_receivers = [];
            receivers.push(cmd_receiver);
          }

          // proactively bind existing command emitters:
          root .. @nodes.Nodes('[__oni_cmd_emitter]') ..
            @each {
              |node|
              if (node.__oni_cmd.isActive() ||
                  (bound_commands && bound_commands.indexOf(node.__oni_cmd.cmd) === -1))
                continue;
              cmd_nodes.push(node.__oni_cmd);
              node.__oni_cmd.setEmitter(emitter);        
            }

          // keep up bindings until 'disable_inputs' fires
          disable_inputs .. @wait();
          
        }
        finally {
          cmd_nodes .. @each {
            |__oni_cmd|
          __oni_cmd.setEmitter(null);
          }

          root .. @nodes.Nodes() .. @each {
            |node|
            var receivers = node.__oni_cmd_receivers;
            if (receivers)
              receivers .. @remove(cmd_receiver);
          }
        }
      }
      and {
        emitter .. @each {
          |cmd_param|
          var downstream_taking_time = false;
          waitfor {
            downstream(cmd_param);
          }
          or {
            hold(100);
            downstream_taking_time = true;
            disable_inputs.emit();
            hold();
          }
          if (downstream_taking_time)
            break; // force outer loop
        }
      }
    }
  });
};


// helper to display a popup window
/** 
    @function withPopupWindow
    @summary XXX write me
*/
function withPopupWindow(block) {
  var win = window.open('', '', 'width=972,height=660,modal=yes,alwaysRaised=yes');
  waitfor {
    try {
      block(url -> win.location.href = url);
    }
    finally {
      win.close();
    }
  }
  or {
    // poll for window close
    while (1) {
      hold(500);
      if (win.closed) {
        return;
      }
    }
  }
}
exports.withPopupWindow = withPopupWindow;


// replace this duck-typed version with a proper type in vm1.js.in 
function isStratum(x) {
 return x && x.abort && x.value && x.waiting;
}

/**
   @function tailspawn
   @param {Function} [f]
   @return {Function}
   @summary A decorator to allow a call to `f` to be tail-replaced with `exp` by calling `return spawn exp` in `f`. This is useful for chaining surface dialogs, and we should eventually have direct syntax support for this in sjs. 
*/
function tailspawn(f) {
  return function() {
    var rv = f.apply(this, arguments);
    if (rv .. isStratum) {
      try {
        return rv.value();
      }
      retract {
        rv.abort();
      }
    }
    else 
      return rv;
  }
}
exports.tailspawn = tailspawn;

